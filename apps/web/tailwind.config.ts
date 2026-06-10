import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── SAVICOL Corporate Identity ─────────────────────────────
        savicol: {
          red:        "#C41230",
          "red-dark": "#9B0E25",
          "red-light":"#E8193C",
          blue:       "#1A3A8F",
          "blue-dark":"#122970",
          "blue-light":"#2652C9",
          white:      "#FFFFFF",
          gray:       "#F4F6FA",
        },
        // ── Semantic tokens (CSS-var driven — switches light/dark) ──
        bg: {
          base:     "var(--bg-base)",
          surface:  "var(--bg-surface)",
          elevated: "var(--bg-elevated)",
          overlay:  "var(--bg-overlay)",
        },
        border: {
          subtle:  "var(--border-subtle)",
          default: "var(--border-default)",
          strong:  "var(--border-strong)",
        },
        accent: {
          primary:   "var(--accent-primary)",
          secondary: "var(--accent-secondary)",
          gold:      "#F59E0B",
          "gold-dim":"#D97706",
          blue:      "#3B82F6",
          "blue-dim":"#2563EB",
          cyan:      "#06B6D4",
        },
        status: {
          completed:        "#10B981",
          "completed-bg":   "#DCFCE7",
          "in-progress":    "#F59E0B",
          "in-progress-bg": "#FEF9C3",
          "not-started":    "#64748B",
          "not-started-bg": "#F1F5F9",
          overdue:          "#EF4444",
          "overdue-bg":     "#FEE2E2",
        },
        text: {
          primary:   "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted:     "var(--text-muted)",
          inverse:   "var(--text-inverse)",
        },
      },
      fontFamily: {
        sans:    ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono:    ["var(--font-jetbrains)", "'JetBrains Mono'", "monospace"],
      },
      animation: {
        "fade-in":       "fadeIn 0.3s ease-in-out",
        "fade-in-up":    "fadeInUp 0.4s ease-out",
        "slide-in-left": "slideInLeft 0.3s ease-out",
        "slide-up":      "slideUp 0.3s ease-out",
        "pulse-soft":    "pulseSoft 2s ease-in-out infinite",
        shimmer:         "shimmer 1.5s infinite linear",
        "scale-in":      "scaleIn 0.2s ease-out",
      },
      keyframes: {
        fadeIn:      { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        fadeInUp:    { "0%": { opacity: "0", transform: "translateY(16px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        slideInLeft: { "0%": { transform: "translateX(-16px)", opacity: "0" }, "100%": { transform: "translateX(0)", opacity: "1" } },
        slideUp:     { "0%": { transform: "translateY(8px)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
        pulseSoft:   { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.6" } },
        shimmer:     { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        scaleIn:     { "0%": { transform: "scale(0.95)", opacity: "0" }, "100%": { transform: "scale(1)", opacity: "1" } },
      },
      backdropBlur: { xs: "2px" },
      boxShadow: {
        "glow-red":     "0 0 24px rgba(196,18,48,0.20)",
        "glow-blue":    "0 0 24px rgba(26,58,143,0.20)",
        "glow-gold":    "0 0 20px rgba(245,158,11,0.15)",
        card:           "0 2px 12px rgba(0,0,0,0.08)",
        "card-dark":    "0 4px 24px rgba(0,0,0,0.40)",
        sidebar:        "4px 0 16px rgba(0,0,0,0.08)",
        "sidebar-dark": "4px 0 24px rgba(0,0,0,0.50)",
        elevated:       "0 8px 32px rgba(0,0,0,0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
