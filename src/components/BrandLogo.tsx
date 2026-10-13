import { withBase } from "@/lib/base-path";

export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <img className="brand-logo brand-logo--light" src={withBase("/logo-light.png")} alt="Diseño Creativo" />
      <img className="brand-logo brand-logo--dark" src={withBase("/logo-dark.png")} alt="Diseño Creativo" />
    </span>
  );
}
