import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark";
export type FontSize  = "sm" | "md" | "lg";

export interface AppearanceState {
  theme:     ThemeMode;
  fontSize:  FontSize;
  logoUrl:   string | null;
  faviconUrl:string | null;
  companyName: string;
  setTheme:      (t: ThemeMode) => void;
  setFontSize:   (s: FontSize)  => void;
  setLogoUrl:    (url: string | null) => void;
  setFaviconUrl: (url: string | null) => void;
  setCompanyName:(name: string) => void;
  reset: () => void;
}

const DEFAULTS = {
  theme:       "light" as ThemeMode,
  fontSize:    "md"    as FontSize,
  logoUrl:     null    as string | null,
  faviconUrl:  null    as string | null,
  companyName: "Savicol",
};

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setTheme:       (theme)       => set({ theme }),
      setFontSize:    (fontSize)    => set({ fontSize }),
      setLogoUrl:     (logoUrl)     => set({ logoUrl }),
      setFaviconUrl:  (faviconUrl)  => set({ faviconUrl }),
      setCompanyName: (companyName) => set({ companyName }),
      reset: () => set(DEFAULTS),
    }),
    { name: "savicol-appearance" }
  )
);
