import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format, differenceInMilliseconds } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { asUtcLocal } from "@/lib/utils";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trophy, Lock, Save, Crown, AlertCircle } from "lucide-react";

interface Team {
  id: number;
  name: string;
  confederation: string;
  flag_emoji: string | null;
}

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

interface Match {
  id: string;
  home_team: string;
  away_team: string;
  match_date: string;
  phase: string;
  status: "scheduled" | "live" | "finished";
  home_score: number | null;
  away_score: number | null;
}

interface Prediction {
  id: string;
  match_id: string;
  home_score: number;
  away_score: number;
  points: number;
}

const DEADLINE_MS = 3 * 60 * 60 * 1000;

function DashboardPage() {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [bonus, setBonus] = useState<{ champion: string; runner_up: string }>({
    champion: "",
    runner_up: "",
  });
  const [bonusPoints, setBonusPoints] = useState(0);
  const [bonusLocked, setBonusLocked] = useState(false);
  const [bonusEnabled, setBonusEnabled] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (!profile) {
      // Usuario autenticado pero sin fila en public.profiles
      // (puede pasar si el admin borró el perfil manualmente).
      // No redirigimos: el render mostrará un mensaje con botón de logout.
      return;
    }
    if (profile.status !== "approved") {
      navigate({ to: "/pending" });
    }
  }, [user, profile, loading, navigate]);

  useEffect(() => {
    if (!user || profile?.status !== "approved") return;
    const load = async () => {
      setDataLoading(true);
      const [{ data: m }, { data: p }, { data: b }, { data: t }, { data: s }] = await Promise.all([
        supabase.from("matches").select("*").order("match_date", { ascending: true }),
        supabase.from("predictions").select("*").eq("user_id", user.id),
        supabase.from("bonus_predictions").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("teams").select("*").order("name"),
        supabase.from("app_settings").select("value").eq("key", "bonus_enabled").maybeSingle(),
      ]);
      setMatches((m as Match[]) ?? []);
      setTeams((t as Team[]) ?? []);
      // Si el setting no existe, default = true (bonus habilitado).
      if (s && s.value != null) {
        setBonusEnabled(s.value === true || s.value === "true");
      } else {
        setBonusEnabled(true);
      }
      const map: Record<string, Prediction> = {};
      ((p as Prediction[]) ?? []).forEach((pr) => (map[pr.match_id] = pr));
      setPredictions(map);
      if (b) {
        setBonus({ champion: b.champion ?? "", runner_up: b.runner_up ?? "" });
        setBonusPoints((b.champion_points ?? 0) + (b.runner_up_points ?? 0));
        setBonusLocked(!!(b.champion_points || b.runner_up_points));
      } else {
        setBonusPoints(0);
      }
      setDataLoading(false);
    };
    load();
  }, [user, profile?.status]);

  const totalPoints = useMemo(
    () => Object.values(predictions).reduce((s, p) => s + p.points, 0) + bonusPoints,
    [predictions, bonusPoints],
  );

  // Partidos que cierran en las próximas 6 horas y no tienen predicción aún
  const closingSoon = useMemo(() => {
    const now = Date.now();
    return matches.filter((m) => {
      if (m.status !== "scheduled") return false;
      const kickoff = new Date(m.match_date).getTime();
      const deadline = kickoff - DEADLINE_MS;
      const msToDeadline = deadline - now;
      return msToDeadline > 0 && msToDeadline < 6 * 60 * 60 * 1000 && !predictions[m.id];
    });
  }, [matches, predictions]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Cargando...
      </div>
    );
  }

  if (user && !profile) {
    // Autenticado, pero el perfil no existe en public.profiles.
    // Mostramos un mensaje claro y dejamos cerrar sesión.
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <AlertCircle className="h-10 w-10 text-warning" />
        <div className="max-w-md">
          <h1 className="text-lg font-semibold text-foreground">
            No se encontró tu perfil
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tu sesión está activa pero no hay datos asociados en la base de datos.
            Cierra sesión y contacta al administrador.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            await signOut();
            navigate({ to: "/login" });
          }}
        >
          Cerrar sesión
        </Button>
      </div>
    );
  }

  if (!profile || profile.status !== "approved") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Cargando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-3 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Hola, {profile.full_name.split(" ")[0]}</h1>
            <p className="text-sm text-muted-foreground">Tus predicciones del Mundial 2026</p>
          </div>
          <div className="rounded-xl border bg-card px-4 py-2 shadow-[var(--shadow-soft)]">
            <p className="text-xs text-muted-foreground">Mis puntos</p>
            <p className="text-2xl font-bold text-primary">{totalPoints}</p>
          </div>
        </div>

        {/* Alerta cierre próximo */}
        {closingSoon.length > 0 && (
          <Card className="mt-6 border-warning bg-warning/10">
            <CardContent className="flex items-start gap-3 p-4">
              <AlertCircle className="h-5 w-5 shrink-0 text-warning" />
              <div className="text-sm">
                <p className="font-semibold text-foreground">
                  ¡Atención! {closingSoon.length}{" "}
                  {closingSoon.length === 1 ? "partido cierra" : "partidos cierran"} pronto
                </p>
                <p className="mt-1 text-muted-foreground">
                  Aún no has registrado predicción para:{" "}
                  {closingSoon
                    .slice(0, 3)
                    .map((m) => `${m.home_team} vs ${m.away_team}`)
                    .join(", ")}
                  {closingSoon.length > 3 ? " y más." : "."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bonus */}
        <Card className="mt-6 border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="h-5 w-5 text-warning" />
              Bonus: campeón y subcampeón (+10 c/u)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!bonusEnabled && (
              <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground">
                El administrador ha deshabilitado temporalmente las predicciones de campeón y
                subcampeón.
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Campeón</label>
                <Select
                  value={bonus.champion}
                  onValueChange={(v) => setBonus((b) => ({ ...b, champion: v }))}
                  disabled={bonusLocked || !bonusEnabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona campeón" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.name}>
                        <span className="mr-1">{t.flag_emoji}</span>{t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Subcampeón</label>
                <Select
                  value={bonus.runner_up}
                  onValueChange={(v) => setBonus((b) => ({ ...b, runner_up: v }))}
                  disabled={bonusLocked || !bonusEnabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona subcampeón" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.name}>
                        <span className="mr-1">{t.flag_emoji}</span>{t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              size="sm"
              disabled={bonusLocked || !bonusEnabled}
              onClick={async () => {
                if (!bonusEnabled) {
                  toast.error("Las predicciones bonus están deshabilitadas por el administrador");
                  return;
                }
                const champion = bonus.champion.trim();
                const runner_up = bonus.runner_up.trim();
                if (!champion || !runner_up) {
                  toast.error("Ingresa ambos equipos");
                  return;
                }
                const { error } = await supabase
                  .from("bonus_predictions")
                  .upsert({ user_id: user!.id, champion, runner_up }, { onConflict: "user_id" });
                if (error) toast.error(error.message);
                else toast.success("Bonus guardado");
              }}
            >
              <Save className="mr-1 h-4 w-4" /> Guardar bonus
            </Button>
          </CardContent>
        </Card>

        {/* Matches */}
        <h2 className="mt-8 mb-3 text-lg font-semibold text-foreground">Partidos</h2>
        {dataLoading ? (
          <p className="text-sm text-muted-foreground">Cargando partidos...</p>
        ) : matches.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Aún no hay partidos publicados.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {matches.map((m) => (
              <MatchRow
                key={m.id}
                match={m}
                userId={user!.id}
                prediction={predictions[m.id]}
                onSaved={(p) => setPredictions((prev) => ({ ...prev, [m.id]: p }))}
              />
            ))}
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <Button asChild variant="outline">
            <Link to="/leaderboard">
              <Trophy className="mr-2 h-4 w-4" /> Ver tabla de posiciones
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

function MatchRow({
  match,
  userId,
  prediction,
  onSaved,
}: {
  match: Match;
  userId: string;
  prediction?: Prediction;
  onSaved: (p: Prediction) => void;
}) {
  const [home, setHome] = useState<string>(prediction?.home_score?.toString() ?? "");
  const [away, setAway] = useState<string>(prediction?.away_score?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  const matchTime = new Date(match.match_date);
  const msToMatch = differenceInMilliseconds(matchTime, new Date());
  const locked = match.status !== "scheduled" || msToMatch < DEADLINE_MS;

  const save = async () => {
    const h = parseInt(home, 10);
    const a = parseInt(away, 10);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0 || h > 30 || a > 30) {
      toast.error("Marcador inválido");
      return;
    }
    setSaving(true);
    const payload = { user_id: userId, match_id: match.id, home_score: h, away_score: a };
    const { data, error } = await supabase
      .from("predictions")
      .upsert(payload, { onConflict: "user_id,match_id" })
      .select()
      .single();
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar (¿menos de 3h al partido?)");
      return;
    }
    toast.success("Predicción guardada");
    onSaved(data as Prediction);
  };

  return (
    <Card className={locked ? "opacity-90" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary" className="text-[10px]">{match.phase}</Badge>
          <span className="text-xs text-muted-foreground">
            {format(asUtcLocal(matchTime), "EEE d MMM, HH:mm", { locale: es })}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="text-right">
            <p className="font-semibold text-foreground">{match.home_team}</p>
          </div>
          <div className="flex items-center gap-1">
            <Input
              className="h-10 w-12 text-center text-base"
              inputMode="numeric"
              value={home}
              onChange={(e) => setHome(e.target.value.replace(/\D/g, "").slice(0, 2))}
              disabled={locked}
            />
            <span className="text-muted-foreground">–</span>
            <Input
              className="h-10 w-12 text-center text-base"
              inputMode="numeric"
              value={away}
              onChange={(e) => setAway(e.target.value.replace(/\D/g, "").slice(0, 2))}
              disabled={locked}
            />
          </div>
          <div>
            <p className="font-semibold text-foreground">{match.away_team}</p>
          </div>
        </div>

        {match.status === "finished" && match.home_score !== null && (
          <div className="mt-3 rounded-md bg-muted px-3 py-2 text-center text-sm">
            Resultado real:{" "}
            <span className="font-bold text-primary">
              {match.home_score} – {match.away_score}
            </span>
            {prediction && (
              <span className="ml-2 font-semibold text-success">
                +{prediction.points} pts
              </span>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-2">
          {locked ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              {match.status === "finished"
                ? "Partido finalizado"
                : match.status === "live"
                  ? "En juego"
                  : "Cerrado (faltan menos de 3h)"}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              Cierra: {format(asUtcLocal(new Date(matchTime.getTime() - DEADLINE_MS)), "d MMM HH:mm", { locale: es })}
            </span>
          )}
          {!locked && (
            <Button size="sm" onClick={save} disabled={saving}>
              <Save className="mr-1 h-4 w-4" />
              {saving ? "Guardando..." : prediction ? "Actualizar" : "Guardar"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
