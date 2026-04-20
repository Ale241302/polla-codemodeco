import logo from "@/assets/codemodeco-logo.png";

export function Logo({ className = "h-12 w-auto" }: { className?: string }) {
  return <img src={logo} alt="Codemodeco — Polla Mundial 2026" className={className} />;
}
