"use client";
import { useEffect } from "react";
import { useSettingsPublic, getSetting } from "@/hooks/useSettings";
import { useAppearanceStore } from "@/store/appearance.store";

/**
 * Carga el branding global (logo, nombre, tema) desde el backend (settings públicos)
 * y lo sincroniza en el appearance store. Se monta una vez en Providers.
 *
 * Prioridad: si el Admin guardó un logo en backend → se aplica a TODOS los usuarios.
 * Persiste sobre el localStorage local porque el branding corporativo es global.
 */
export function BrandHydration() {
  const { data: settings } = useSettingsPublic();
  const { setLogoUrl, setCompanyName, logoUrl, companyName } = useAppearanceStore();

  useEffect(() => {
    if (!settings) return;

    const remoteLogo    = getSetting(settings, "brand.logoUrl");
    const remoteName    = getSetting(settings, "brand.name");

    // Logo: el backend manda. Si está vacío en backend, respeta el local (o default SVG).
    if (remoteLogo && remoteLogo.trim() && remoteLogo !== logoUrl) {
      setLogoUrl(remoteLogo);
    }

    if (remoteName && remoteName.trim() && remoteName !== companyName) {
      // brand.name puede traer "Savicol Audit Platform" → usamos solo la 1ª palabra como marca corta
      const shortName = remoteName.split(" ")[0];
      setCompanyName(shortName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  return null;
}
