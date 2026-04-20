import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { Trophy, Users, ShieldCheck, Clock } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  return (
    <main className="min-h-screen bg-[var(--gradient-hero)]">
      <div className="container mx-auto px-4 py-10 sm:py-16">
        <div className="flex flex-col items-center text-center">
          <Logo className="h-24 w-auto sm:h-32" />
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            Polla Mundial 2026
          </h1>
          <p className="mt-2 text-lg font-semibold text-primary">Codemodeco</p>
          <p className="mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
            Plataforma privada para predecir resultados, competir con tus compañeros y coronar al
            mejor pollero del Mundial.
          </p>

          <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="shadow-[var(--shadow-elegant)]">
              <Link to="/login">Iniciar sesión</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/register">Registrarme</Link>
            </Button>
          </div>
        </div>

        <section className="mx-auto mt-16 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={<Trophy className="h-5 w-5" />}
            title="Puntaje"
            text="5 pts marcador exacto · 2 pts ganador o empate"
          />
          <FeatureCard
            icon={<Clock className="h-5 w-5" />}
            title="Cierre 3h antes"
            text="Edita tus pronósticos hasta 3 horas antes del partido"
          />
          <FeatureCard
            icon={<Users className="h-5 w-5" />}
            title="Acceso privado"
            text="Solo usuarios aprobados por el administrador"
          />
          <FeatureCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Bonus"
            text="+10 pts campeón · +10 pts subcampeón"
          />
        </section>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Comercio y Logística de Colombia Ltda.
        </p>
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 text-left shadow-[var(--shadow-soft)]">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-3 font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
