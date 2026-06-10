"use client";
import { useEffect } from "react";
import { useSettingsPublic, getSetting } from "@/hooks/useSettings";
import { useAppearanceStore } from "@/store/appearance.store";

export function BrandHydration() {
  const { data: settings } = useSettingsPublic();
  const { setLogoUrl, setCompanyName, companyName } = useAppearanceStore();

  useEffect(() => {
    // Default corporativo siempre presente
    setLogoUrl("/logo-savicol.png");

    if (!settings) return;

    const remoteLogo = getSetting(settings, "brand.logoUrl");
    const remoteName = getSetting(settings, "brand.name");

    // Solo sobreescribe si el admin subio un logo personalizado diferente al default
    if (remoteLogo && remoteLogo.trim() && remoteLogo !== "/logo-savicol.png") {
      setLogoUrl(remoteLogo);
    }

    if (remoteName && remoteName.trim() && remoteName !== companyName) {
      setCompanyName(remoteName.split(" ")[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  return null;
}
