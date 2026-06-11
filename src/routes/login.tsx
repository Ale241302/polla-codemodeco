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
import { Eye, EyeOff } from "lucide-react";

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
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Estados para el flujo de recuperación de contraseña
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState(1); // 1: Cédula, 2: Nueva contraseña
  const [recoveryCedula, setRecoveryCedula] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validatingCedula, setValidatingCedula] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

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

  const onRecoverySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (recoveryStep === 1) {
      const parsed = z
        .string()
        .trim()
        .regex(/^\d{6,15}$/, "Cédula inválida (solo dígitos, 6-15)")
        .safeParse(recoveryCedula);
      if (!parsed.success) {
        toast.error(parsed.error.issues[0].message);
        return;
      }
      setValidatingCedula(true);
      try {
        const { data: exists, error } = await supabase.rpc("check_cedula_exists" as any, {
          p_cedula: parsed.data,
        });
        if (error) {
          toast.error("Error al validar la cédula");
          // eslint-disable-next-line no-console
          console.error(error);
          return;
        }
        if (!exists) {
          toast.error("La cédula no está registrada");
          return;
        }
        setRecoveryStep(2);
        toast.success("Cédula encontrada. Ingresa tu nueva contraseña.");
      } catch (err) {
        toast.error("Ocurrió un error inesperado");
        // eslint-disable-next-line no-console
        console.error(err);
      } finally {
        setValidatingCedula(false);
      }
    } else {
      if (newPassword.length < 6) {
        toast.error("La contraseña debe tener al menos 6 caracteres");
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error("Las contraseñas no coinciden");
        return;
      }
      setResettingPassword(true);
      try {
        const { data: success, error } = await supabase.rpc("reset_password_by_cedula" as any, {
          p_cedula: recoveryCedula,
          p_new_password: newPassword,
        });
        if (error) {
          toast.error("Error al restablecer la contraseña");
          // eslint-disable-next-line no-console
          console.error(error);
          return;
        }
        if (!success) {
          toast.error("No se pudo restablecer la contraseña. Usuario no encontrado.");
          return;
        }
        toast.success("Contraseña restablecida correctamente. Ya puedes iniciar sesión.");
        setIsRecovering(false);
        setRecoveryStep(1);
        setRecoveryCedula("");
        setNewPassword("");
        setConfirmPassword("");
      } catch (err) {
        toast.error("Ocurrió un error inesperado");
        // eslint-disable-next-line no-console
        console.error(err);
      } finally {
        setResettingPassword(false);
      }
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--gradient-hero)] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center">
          <Link to="/">
            <Logo className="h-20 w-auto" />
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-foreground">
            {isRecovering ? "Recuperar cuenta" : "Iniciar sesión"}
          </h1>
          <p className="text-sm text-muted-foreground">Polla Mundial Codemodeco 2026</p>
        </div>

        {isRecovering ? (
          <form
            onSubmit={onRecoverySubmit}
            className="mt-6 space-y-4 rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)] animate-fade-in"
          >
            <h2 className="text-base font-semibold text-foreground text-center">
              {recoveryStep === 1 ? "Validar Identificación" : "Crear Nueva Contraseña"}
            </h2>
            <p className="text-xs text-muted-foreground text-center">
              {recoveryStep === 1
                ? "Ingresa tu número de cédula registrado para comenzar."
                : `Ingresa tu nueva contraseña para la cédula ${recoveryCedula}.`}
            </p>

            {recoveryStep === 1 ? (
              <div className="space-y-2">
                <Label htmlFor="recoveryCedula">Cédula</Label>
                <Input
                  id="recoveryCedula"
                  inputMode="numeric"
                  placeholder="1020304050"
                  value={recoveryCedula}
                  onChange={(e) => setRecoveryCedula(e.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nueva contraseña</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((s) => !s)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                      aria-label={showNewPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Repite la contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((s) => !s)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                      aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            <Button
              type="submit"
              className="w-full mt-2"
              disabled={validatingCedula || resettingPassword}
            >
              {recoveryStep === 1
                ? validatingCedula
                  ? "Validando..."
                  : "Validar cédula"
                : resettingPassword
                  ? "Guardando..."
                  : "Establecer nueva contraseña"}
            </Button>

            <button
              type="button"
              onClick={() => {
                setIsRecovering(false);
                setRecoveryStep(1);
                setRecoveryCedula("");
                setNewPassword("");
                setConfirmPassword("");
              }}
              className="w-full text-center text-sm text-primary hover:underline mt-2 block cursor-pointer"
            >
              Volver al inicio de sesión
            </button>
          </form>
        ) : (
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
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsRecovering(true)}
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
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
        )}
      </div>
    </main>
  );
}

