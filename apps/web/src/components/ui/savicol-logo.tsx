"use client";
import { useAppearanceStore } from "@/store/appearance.store";
import { cn } from "@/lib/utils";

interface SavicolLogoProps {
  variant?: "full" | "mark" | "text";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  inverted?: boolean;
}

const SIZE_MAP = {
  sm: { full: 28, mark: 28 },
  md: { full: 40, mark: 36 },
  lg: { full: 56, mark: 48 },
  xl: { full: 72, mark: 64 },
};

export function SavicolLogo({ variant = "full", size = "md", className, inverted = false }: SavicolLogoProps) {
  const { logoUrl, companyName } = useAppearanceStore();
  const s = SIZE_MAP[size];

  const imgSrc = logoUrl || (variant !== "text" ? "/logo-savicol.svg" : null);

  if (imgSrc && variant !== "text") {
    const h = variant === "mark" ? s.mark : s.full;
    return (
      <img
        src={imgSrc}
        alt={companyName}
        style={{
          height: h,
          width: "auto",
          objectFit: "contain",
          filter: inverted ? "brightness(0) invert(1)" : undefined,
        }}
        className={cn("shrink-0", className)}
      />
    );
  }

  return (
    <div className={cn("flex flex-col leading-none shrink-0", className)}>
      <p className="font-black tracking-tight" style={{ color: inverted ? "#FFFFFF" : "#8B0000", fontSize: s.full * 0.45 }}>
        {companyName.toUpperCase()}
      </p>
      <p className="font-semibold uppercase" style={{ color: "#2D6B9E", fontSize: s.full * 0.18, letterSpacing: "0.12em", marginTop: 2 }}>
        Auditoria y Control
      </p>
    </div>
  );
}
