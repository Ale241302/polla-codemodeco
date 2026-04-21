import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, X, Lock, Trash2, Plus, RefreshCw, Save, Crown } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

interface Profile {
  id: string;
  cedula: string;
  full_name: string;
  status: "pending" | "approved" | "rejected" | "blocked";
  created_at: string;
}

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

interface Team {
  id: number;
  name: string;
  confederation: string;
  flag_emoji: string | null;
}

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/dashboard" });
  }, [isAdmin, loading, navigate]);

  if (loading) return <div className="flex min-h-screen items-center justify-center">Cargando...</div>;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-3 py-6 sm:px-6">
        <h1 className="text-2xl font-bold text-foreground">Panel de administración</h1>
        <p className="text-sm text-muted-foreground">Gestión de usuarios, partidos y resultados</p>

        <Tabs defaultValue="users" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">Usuarios</TabsTrigger>
            <TabsTrigger value="matches">Partidos</TabsTrigger>
            <TabsTrigger value="results">Resultados</TabsTrigger>
          </TabsList>
          <TabsContent value="users" className="mt-4"><UsersTab /></TabsContent>
          <TabsContent value="matches" className="mt-4"><MatchesTab /></TabsContent>
          <TabsContent value="results" className="mt-4"><ResultsTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// =============== USERS ===============
function UsersTab() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setProfiles((data as Profile[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: Profile["status"]) => {
    const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Actualizado"); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar este usuario y todos sus datos?")) return;
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Eliminado"); load(); }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Cargando...</p>;

  const statusBadge = (s: Profile["status"]) => {
    const map = {
      pending: { label: "Pendiente", v: "secondary" as const },
      approved: { label: "Aprobado", v: "default" as const },
      rejected: { label: "Rechazado", v: "destructive" as const },
      blocked: { label: "Bloqueado", v: "destructive" as const },
    };
    return <Badge variant={map[s].v}>{map[s].label}</Badge>;
  };

  return (
    <div className="space-y-3">
      {profiles.map((p) => (
        <Card key={p.id}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{p.full_name}</p>
              <p className="text-xs text-muted-foreground">
                Cédula: {p.cedula} · {format(new Date(p.created_at), "d MMM yyyy", { locale: es })}
              </p>
              <div className="mt-1">{statusBadge(p.status)}</div>
            </div>
            <div className="flex flex-wrap gap-1">
              {p.status === "pending" && (
                <>
                  <Button size="sm" onClick={() => updateStatus(p.id, "approved")}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => updateStatus(p.id, "rejected")}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
              {p.status === "approved" && (
                <Button size="sm" variant="outline" onClick={() => updateStatus(p.id, "blocked")}>
                  <Lock className="h-4 w-4" />
                </Button>
              )}
              {(p.status === "blocked" || p.status === "rejected") && (
                <Button size="sm" onClick={() => updateStatus(p.id, "approved")}>
                  Reactivar
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => remove(p.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      {profiles.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">Sin usuarios registrados</p>
      )}
    </div>
  );
}

// =============== MATCHES ===============
function MatchesTab() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [date, setDate] = useState("");
  const [phase, setPhase] = useState("Fase de grupos");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [{ data: m }, { data: t }] = await Promise.all([
      supabase.from("matches").select("*").order("match_date"),
      supabase.from("teams").select("*").order("name"),
    ]);
    setMatches((m as Match[]) ?? []);
    setTeams((t as Team[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!home || !away || !date) return toast.error("Completa todos los campos");
    if (home === away) return toast.error("El local y el visitante deben ser distintos");
    const { error } = await supabase.from("matches").insert({
      home_team: home.trim(),
      away_team: away.trim(),
      match_date: new Date(date).toISOString(),
      phase,
    });
    if (error) toast.error(error.message);
    else { toast.success("Partido creado"); setHome(""); setAway(""); setDate(""); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar partido?")) return;
    const { error } = await supabase.from("matches").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Eliminado"); load(); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Nuevo partido</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Equipo local</Label>
            <Select value={home} onValueChange={setHome}>
              <SelectTrigger><SelectValue placeholder="Selecciona equipo" /></SelectTrigger>
              <SelectContent className="max-h-80">
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.name}>
                    <span className="mr-1">{t.flag_emoji}</span>{t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Equipo visitante</Label>
            <Select value={away} onValueChange={setAway}>
              <SelectTrigger><SelectValue placeholder="Selecciona equipo" /></SelectTrigger>
              <SelectContent className="max-h-80">
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.name}>
                    <span className="mr-1">{t.flag_emoji}</span>{t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Fecha y hora</Label>
            <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Fase</Label>
            <Select value={phase} onValueChange={setPhase}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Fase de grupos">Fase de grupos</SelectItem>
                <SelectItem value="Octavos de final">Octavos de final</SelectItem>
                <SelectItem value="Cuartos de final">Cuartos de final</SelectItem>
                <SelectItem value="Semifinal">Semifinal</SelectItem>
                <SelectItem value="Tercer puesto">Tercer puesto</SelectItem>
                <SelectItem value="Final">Final</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Button onClick={create} className="w-full sm:w-auto">
              <Plus className="mr-1 h-4 w-4" /> Crear partido
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : (
        <div className="space-y-2">
          {matches.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold">{m.home_team} vs {m.away_team}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(m.match_date), "EEE d MMM HH:mm", { locale: es })} · {m.phase}
                  </p>
                  <Badge variant="secondary" className="mt-1">{m.status}</Badge>
                </div>
                <Button size="sm" variant="ghost" onClick={() => remove(m.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// =============== RESULTS ===============
function ResultsTab() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tournament, setTournament] = useState({ champion: "", runner_up: "" });

  const load = async () => {
    const [{ data: m }, { data: t }, { data: tms }] = await Promise.all([
      supabase.from("matches").select("*").order("match_date"),
      supabase.from("tournament_result").select("*").eq("id", 1).maybeSingle(),
      supabase.from("teams").select("*").order("name"),
    ]);
    setMatches((m as Match[]) ?? []);
    setTeams((tms as Team[]) ?? []);
    if (t) setTournament({ champion: t.champion ?? "", runner_up: t.runner_up ?? "" });
  };
  useEffect(() => { load(); }, []);

  const saveResult = async (
    matchId: string,
    h: number,
    a: number,
    status: Match["status"],
  ) => {
    const { error } = await supabase
      .from("matches")
      .update({ home_score: h, away_score: a, status })
      .eq("id", matchId);
    if (error) return toast.error(error.message);
    // recalc points
    const { error: e2 } = await supabase.rpc("recalculate_match_points", { p_match_id: matchId });
    if (e2) toast.error(e2.message);
    else toast.success("Resultado y puntajes actualizados");
    load();
  };

  const recalcAll = async () => {
    for (const m of matches.filter((x) => x.status === "finished")) {
      await supabase.rpc("recalculate_match_points", { p_match_id: m.id });
    }
    await supabase.rpc("recalculate_bonus_points");
    toast.success("Recalculado todo");
  };

  const saveTournament = async () => {
    const { error } = await supabase
      .from("tournament_result")
      .update({
        champion: tournament.champion.trim() || null,
        runner_up: tournament.runner_up.trim() || null,
      })
      .eq("id", 1);
    if (error) return toast.error(error.message);
    await supabase.rpc("recalculate_bonus_points");
    toast.success("Bonus actualizado");
  };

  return (
    <div className="space-y-4">
      <Card className="border-warning/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Crown className="h-5 w-5 text-warning" /> Campeón y subcampeón (bonus)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Campeón</Label>
            <Select
              value={tournament.champion}
              onValueChange={(v) => setTournament((t) => ({ ...t, champion: v }))}
            >
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent className="max-h-80">
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.name}>
                    <span className="mr-1">{t.flag_emoji}</span>{t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Subcampeón</Label>
            <Select
              value={tournament.runner_up}
              onValueChange={(v) => setTournament((t) => ({ ...t, runner_up: v }))}
            >
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent className="max-h-80">
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.name}>
                    <span className="mr-1">{t.flag_emoji}</span>{t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Button onClick={saveTournament}>
              <Save className="mr-1 h-4 w-4" /> Guardar y recalcular bonus
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={recalcAll}>
          <RefreshCw className="mr-1 h-4 w-4" /> Forzar recálculo total
        </Button>
      </div>

      <div className="space-y-2">
        {matches.map((m) => (
          <ResultRow key={m.id} match={m} onSave={saveResult} />
        ))}
        {matches.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">No hay partidos</p>
        )}
      </div>
    </div>
  );
}

function ResultRow({
  match,
  onSave,
}: {
  match: Match;
  onSave: (id: string, h: number, a: number, status: Match["status"]) => void;
}) {
  const [h, setH] = useState(match.home_score?.toString() ?? "");
  const [a, setA] = useState(match.away_score?.toString() ?? "");
  const [status, setStatus] = useState<Match["status"]>(match.status);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-semibold">{match.home_team} vs {match.away_team}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(match.match_date), "d MMM HH:mm", { locale: es })} · {match.phase}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="h-9 w-14 text-center"
              inputMode="numeric"
              value={h}
              onChange={(e) => setH(e.target.value.replace(/\D/g, "").slice(0, 2))}
            />
            <span>–</span>
            <Input
              className="h-9 w-14 text-center"
              inputMode="numeric"
              value={a}
              onChange={(e) => setA(e.target.value.replace(/\D/g, "").slice(0, 2))}
            />
            <Select value={status} onValueChange={(v) => setStatus(v as Match["status"])}>
              <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Programado</SelectItem>
                <SelectItem value="live">En juego</SelectItem>
                <SelectItem value="finished">Finalizado</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={() => {
                const hi = parseInt(h, 10);
                const ai = parseInt(a, 10);
                if (status === "finished" && (isNaN(hi) || isNaN(ai))) {
                  toast.error("Ingresa el marcador para finalizar");
                  return;
                }
                onSave(match.id, isNaN(hi) ? 0 : hi, isNaN(ai) ? 0 : ai, status);
              }}
            >
              <Save className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
