import logo from "@/assets/codemodeco-logo.png";

export function Logo({ className = "h-12 w-auto" }: { className?: string }) {
  return <img src={logo} alt="Polla Mundial Codemodeco 2026" className={className} />;
}
