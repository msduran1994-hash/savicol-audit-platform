"use client";
import Image from "next/image";
import { Shield } from "lucide-react";
import { useAppearanceStore } from "@/store/appearance.store";
import { cn } from "@/lib/utils";

interface SavicolLogoProps {
  /** "full" = escudo + texto, "mark" = solo escudo, "text" = solo texto */
  variant?: "full" | "mark" | "text";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Invertir colores (para fondos oscuros) */
  inverted?: boolean;
}

const SIZE_MAP = {
  sm: { mark: 28, text: "text-sm" },
  md: { mark: 36, text: "text-base" },
  lg: { mark: 48, text: "text-xl"  },
  xl: { mark: 64, text: "text-2xl" },
};

export function SavicolLogo({ variant = "full", size = "md", className, inverted = false }: SavicolLogoProps) {
  const { logoUrl, companyName } = useAppearanceStore();
  const s = SIZE_MAP[size];

  if (logoUrl && variant !== "text") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={companyName}
        style={{ height: s.mark, width: "auto", objectFit: "contain" }}
        className={cn("shrink-0", className)}
      />
    );
  }

  return (
    <div className={cn("flex items-center gap-2.5 shrink-0", className)}>
      {/* Shield mark */}
      {variant !== "text" && (
        <div
          className="rounded-xl flex items-center justify-center shrink-0 relative"
          style={{
            width: s.mark,
            height: s.mark,
            background: inverted ? "rgba(255,255,255,0.12)" : "#1A3A8F",
            border: inverted ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(26,58,143,0.3)",
          }}
        >
          <Shield
            style={{
              width: s.mark * 0.5,
              height: s.mark * 0.5,
              color: "white",
            }}
          />
          {/* Red dot accent */}
          <span
            className="absolute -bottom-0.5 -right-0.5 rounded-full"
            style={{
              width: s.mark * 0.28,
              height: s.mark * 0.28,
              background: "#C41230",
              border: "1.5px solid white",
            }}
          />
        </div>
      )}

      {/* Text */}
      {variant !== "mark" && (
        <div className="leading-none">
          <p
            className={cn("font-black tracking-tight leading-none", s.text)}
            style={{ color: inverted ? "#FFFFFF" : "#1A3A8F" }}
          >
            {companyName.toUpperCase()}
          </p>
          <p
            className="text-[10px] font-bold tracking-[0.18em] uppercase mt-0.5"
            style={{ color: inverted ? "#C41230" : "#C41230", opacity: inverted ? 0.9 : 1 }}
          >
            Audit Platform
          </p>
        </div>
      )}
    </div>
  );
}
