import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

export const Route = createFileRoute("/pending")({
  component: PendingPage,
});

function PendingPage() {
  const { profile, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!profile) navigate({ to: "/login" });
    else if (profile.status === "approved") navigate({ to: "/dashboard" });
  }, [profile, loading, navigate]);

  const status = profile?.status ?? "pending";
  const messages: Record<string, { title: string; text: string; color: string }> = {
    pending: {
      title: "Cuenta pendiente de aprobación",
      text: "Un administrador revisará tu registro pronto. Vuelve a iniciar sesión más tarde.",
      color: "text-warning",
    },
    rejected: {
      title: "Registro rechazado",
      text: "Tu solicitud fue rechazada. Contacta al administrador para más información.",
      color: "text-destructive",
    },
    blocked: {
      title: "Cuenta bloqueada",
      text: "Tu cuenta ha sido bloqueada. Contacta al administrador.",
      color: "text-destructive",
    },
  };
  const info = messages[status] ?? messages.pending;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--gradient-hero)] px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-[var(--shadow-soft)]">
        <Logo className="mx-auto h-16 w-auto" />
        <Clock className={`mx-auto mt-4 h-12 w-12 ${info.color}`} />
        <h1 className="mt-3 text-xl font-bold text-foreground">{info.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{info.text}</p>
        <Button
          className="mt-6 w-full"
          variant="outline"
          onClick={async () => {
            await signOut();
            navigate({ to: "/login" });
          }}
        >
          Cerrar sesión
        </Button>
      </div>
    </main>
  );
}
