"use client";
import { useEffect } from "react";
import { useSettingsPublic, getSetting } from "@/hooks/useSettings";
import { useAppearanceStore } from "@/store/appearance.store";

export function BrandHydration() {
  const { data: settings } = useSettingsPublic();
  const { setLogoUrl, setCompanyName, companyName } = useAppearanceStore();

  useEffect(() => {
    if (!settings) return;

    const remoteLogo = getSetting(settings, "brand.logoUrl");
    const remoteName = getSetting(settings, "brand.name");

    if (remoteLogo && remoteLogo.trim()) {
      setLogoUrl(remoteLogo);
    } else {
      setLogoUrl("/logo-savicol.png");
    }

    if (remoteName && remoteName.trim() && remoteName !== companyName) {
      setCompanyName(remoteName.split(" ")[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  return null;
}
