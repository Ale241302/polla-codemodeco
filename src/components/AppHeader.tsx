import { Link, useNavigate } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { LogOut, Shield, Trophy, Calendar, Users } from "lucide-react";

export function AppHeader() {
  const { profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card/80 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between gap-2 px-3 sm:px-6">
        <Link to="/dashboard" className="flex items-center gap-2 min-w-0">
          <Logo className="h-9 w-auto sm:h-10" />
          <span className="hidden text-sm font-semibold text-foreground sm:inline">
            Polla Mundial 2026
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm" className="px-2 sm:px-3">
            <Link to="/dashboard">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Partidos</span>
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="px-2 sm:px-3">
            <Link to="/leaderboard">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Tabla</span>
            </Link>
          </Button>
          {isAdmin && (
            <Button asChild variant="ghost" size="sm" className="px-2 sm:px-3">
              <Link to="/admin">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Admin</span>
              </Link>
            </Button>
          )}
          <Button onClick={handleLogout} variant="ghost" size="sm" className="px-2 sm:px-3" title={profile?.full_name}>
            <LogOut className="h-4 w-4" />
          </Button>
        </nav>
      </div>
    </header>
  );
}
