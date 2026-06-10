"use client";
import { useEffect } from "react";
import { useAppearanceStore } from "@/store/appearance.store";

const FONT_SIZE_MAP = { sm: "13px", md: "15px", lg: "17px" };

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, fontSize } = useAppearanceStore();

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    root.style.setProperty("--base-font-size", FONT_SIZE_MAP[fontSize]);
  }, [theme, fontSize]);

  return <>{children}</>;
}
