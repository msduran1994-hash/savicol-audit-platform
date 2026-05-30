import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Savicol Corporate Obsidian palette
        bg: {
          base: "#070B14",
          surface: "#0D1526",
          elevated: "#1A2540",
          overlay: "#243356",
        },
        border: {
          subtle: "#1E2D4A",
          default: "#2A3F6A",
          strong: "#3B5080",
        },
        accent: {
          gold: "#F59E0B",
          "gold-dim": "#D97706",
          blue: "#3B82F6",
          "blue-dim": "#2563EB",
          cyan: "#06B6D4",
        },
        status: {
          completed: "#10B981",
          "completed-bg": "#064E3B",
          "in-progress": "#F59E0B",
          "in-progress-bg": "#451A03",
          "not-started": "#64748B",
          "not-started-bg": "#1E293B",
          overdue: "#EF4444",
          "overdue-bg": "#450A0A",
        },
        text: {
          primary: "#F8FAFC",
          secondary: "#94A3B8",
          muted: "#475569",
          inverse: "#0A0F1E",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-syne)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-in-left": "slideInLeft 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        shimmer: "shimmer 1.5s infinite linear",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideInLeft: { "0%": { transform: "translateX(-16px)", opacity: "0" }, "100%": { transform: "translateX(0)", opacity: "1" } },
        slideUp: { "0%": { transform: "translateY(8px)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
        pulseSoft: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.6" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
      backdropBlur: { xs: "2px" },
      boxShadow: {
        "glow-gold": "0 0 20px rgba(245,158,11,0.15)",
        "glow-blue": "0 0 20px rgba(59,130,246,0.15)",
        card: "0 4px 24px rgba(0,0,0,0.4)",
        sidebar: "4px 0 24px rgba(0,0,0,0.5)",
      },
    },
  },
  plugins: [],
};

export default config;
