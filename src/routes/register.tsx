import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cedulaToEmail } from "@/lib/auth-context";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

const schema = z
  .object({
    cedula: z.string().trim().regex(/^\d{6,15}$/, "Cédula inválida (solo dígitos, 6-15)"),
    full_name: z.string().trim().min(3, "Ingresa tu nombre completo").max(100),
    password: z.string().min(6, "Mínimo 6 caracteres").max(72),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Las contraseñas no coinciden",
    path: ["confirm"],
  });

function RegisterPage() {
  const navigate = useNavigate();
  const [cedula, setCedula] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ cedula, full_name: fullName, password, confirm });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);

    // Pre-check duplicate cedula
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("cedula", parsed.data.cedula)
      .maybeSingle();
    if (existing) {
      setSubmitting(false);
      toast.error("Esa cédula ya está registrada");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: cedulaToEmail(parsed.data.cedula),
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { cedula: parsed.data.cedula, full_name: parsed.data.full_name },
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message.includes("registered") ? "Cédula ya registrada" : error.message);
      return;
    }
    // Sign out in case auto-confirm logged us in (we want admin approval flow)
    await supabase.auth.signOut();
    setDone(true);
  };

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--gradient-hero)] px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-[var(--shadow-soft)]">
          <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
          <h1 className="mt-4 text-2xl font-bold text-foreground">¡Registro recibido!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tu cuenta queda en estado <strong>pendiente</strong>. Un administrador debe aprobarla
            antes de que puedas ingresar.
          </p>
          <Button asChild className="mt-6 w-full">
            <Link to="/login">Ir al login</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--gradient-hero)] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center">
          <Link to="/"><Logo className="h-20 w-auto" /></Link>
          <h1 className="mt-4 text-2xl font-bold text-foreground">Crear cuenta</h1>
          <p className="text-sm text-muted-foreground">Te aprobará un administrador</p>
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
              value={cedula}
              onChange={(e) => setCedula(e.target.value.replace(/\D/g, ""))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nombre completo</Label>
            <Input
              id="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmar contraseña</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Registrando..." : "Crear cuenta"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Inicia sesión
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
