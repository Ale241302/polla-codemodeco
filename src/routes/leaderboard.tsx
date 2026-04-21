import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Medal, Award, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/leaderboard")({
  component: LeaderboardPage,
});

interface Row {
  user_id: string;
  full_name: string;
  cedula: string;
  total_points: number;
  exact_count: number;
  partial_count: number;
}

function LeaderboardPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (profile && profile.status !== "approved") navigate({ to: "/pending" });
  }, [user, profile, loading, navigate]);

  const load = async () => {
    const { data } = await supabase
      .from("leaderboard")
      .select("*")
      .order("total_points", { ascending: false });
    setRows((data as Row[]) ?? []);
    setLoadingData(false);
  };

  useEffect(() => {
    if (profile?.status !== "approved") return;
    load();
    // Polling cada 30 segundos para mantener el ranking en tiempo real
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [profile?.status]);

  if (!profile || profile.status !== "approved") {
    return <div className="flex min-h-screen items-center justify-center text-sm">Cargando...</div>;
  }

  const top4 = rows.slice(0, 4);
  const rest = rows.slice(4);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-3 py-6 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-warning" />
            <h1 className="text-2xl font-bold text-foreground">Tabla de posiciones</h1>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loadingData}>
            <RefreshCw className={`mr-1 h-4 w-4 ${loadingData ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Actualizada automáticamente cada 30 s</p>

        {loadingData ? (
          <p className="mt-6 text-sm text-muted-foreground">Cargando...</p>
        ) : rows.length === 0 ? (
          <Card className="mt-6">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Aún no hay puntajes registrados.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* TOP 4 */}
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {top4.map((r, i) => (
                <TopCard key={r.user_id} row={r} position={i + 1} highlight={r.user_id === user?.id} />
              ))}
            </div>

            {/* Tabla completa */}
            {rest.length > 0 && (
              <div className="mt-8 overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-soft)]">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">Jugador</th>
                      <th className="px-3 py-2 text-right">Exactos</th>
                      <th className="px-3 py-2 text-right">Parciales</th>
                      <th className="px-3 py-2 text-right">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rest.map((r, i) => (
                      <tr
                        key={r.user_id}
                        className={`border-t ${r.user_id === user?.id ? "bg-primary/5 font-semibold" : ""}`}
                      >
                        <td className="px-3 py-2 text-muted-foreground">{i + 5}</td>
                        <td className="px-3 py-2">{r.full_name}</td>
                        <td className="px-3 py-2 text-right">{r.exact_count}</td>
                        <td className="px-3 py-2 text-right">{r.partial_count}</td>
                        <td className="px-3 py-2 text-right font-bold text-primary">{r.total_points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function TopCard({ row, position, highlight }: { row: Row; position: number; highlight: boolean }) {
  const styles = [
    { bg: "bg-warning/15", border: "border-warning", icon: <Trophy className="h-5 w-5 text-warning" /> },
    { bg: "bg-muted", border: "border-muted-foreground/40", icon: <Medal className="h-5 w-5 text-muted-foreground" /> },
    { bg: "bg-accent", border: "border-accent-foreground/30", icon: <Award className="h-5 w-5 text-accent-foreground" /> },
    { bg: "bg-card", border: "border-border", icon: <span className="text-sm font-bold text-muted-foreground">4</span> },
  ];
  const s = styles[position - 1];
  return (
    <Card className={`${s.bg} ${highlight ? "ring-2 ring-primary" : ""} border-2 ${s.border}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-muted-foreground">#{position}</span>
          {s.icon}
        </div>
        <p className="mt-2 truncate font-semibold text-foreground">{row.full_name}</p>
        <p className="mt-1 text-2xl font-bold text-primary">{row.total_points} pts</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {row.exact_count} exactos · {row.partial_count} parciales
        </p>
      </CardContent>
    </Card>
  );
}
