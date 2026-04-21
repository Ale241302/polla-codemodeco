import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cedulaToEmail, useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const schema = z.object({
  cedula: z.string().trim().regex(/^\d{6,15}$/, "Cédula inválida (solo dígitos)"),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [cedula, setCedula] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ cedula, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: cedulaToEmail(parsed.data.cedula),
      password: parsed.data.password,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Cédula o contraseña incorrecta");
      return;
    }
    toast.success("¡Bienvenido!");
    navigate({ to: "/dashboard" });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--gradient-hero)] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center">
          <Link to="/"><Logo className="h-20 w-auto" /></Link>
          <h1 className="mt-4 text-2xl font-bold text-foreground">Iniciar sesión</h1>
          <p className="text-sm text-muted-foreground">Polla Mundial Codemodeco 2026</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="mt-6 space-y-4 rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]"
        >
          <div className="space-y-2">
            <Label htmlFor="cedula">Cédula</Label>
            <Input
              id="cedula"
              inputMode="numeric"
              autoComplete="username"
              placeholder="1020304050"
              value={cedula}
              onChange={(e) => setCedula(e.target.value.replace(/\D/g, ""))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Ingresando..." : "Entrar"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Regístrate
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
