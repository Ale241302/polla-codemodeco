import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type ProfileStatus = "pending" | "approved" | "rejected" | "blocked";

export interface ProfileInfo {
  id: string;
  cedula: string;
  full_name: string;
  status: ProfileStatus;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: ProfileInfo | null;
  isAdmin: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const { data: prof, error: profError } = await supabase
      .from("profiles")
      .select("id, cedula, full_name, status")
      .eq("id", uid)
      .maybeSingle();

    if (profError) {
      // eslint-disable-next-line no-console
      console.error("[auth] Error cargando perfil:", profError);
    }
    if (!prof && !profError) {
      // eslint-disable-next-line no-console
      console.warn(
        "[auth] No se encontró fila en public.profiles para el usuario autenticado",
        uid,
      );
    }

    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid);

    if (rolesError) {
      // eslint-disable-next-line no-console
      console.error("[auth] Error cargando roles:", rolesError);
    }

    setProfile((prof as ProfileInfo) ?? null);
    setIsAdmin(!!roles?.some((r) => r.role === "admin"));
  };

  useEffect(() => {
    // Set up listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        // Defer DB calls
        setTimeout(() => {
          loadProfile(newSession.user.id);
        }, 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
    });

    // Then check existing session
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      if (existing?.user) {
        loadProfile(existing.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{ user, session, profile, isAdmin, loading, refreshProfile, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function cedulaToEmail(cedula: string) {
  return `${cedula.trim()}@polla.codemodeco.local`;
}
