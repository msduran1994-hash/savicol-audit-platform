# ═══════════════════════════════════════════════════════════════════
#  LOGO CORPORATIVO SAVICOL — Predeterminado en toda la interfaz
#  favicon.svg + logo-savicol.svg + SavicolLogo component
# ═══════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

function Paso($n, $txt) { Write-Host "`n[$n] $txt" -ForegroundColor Cyan }
function OK($txt)        { Write-Host "    OK  $txt"    -ForegroundColor Green }
function Fallo($txt)     { Write-Host "    ERROR  $txt" -ForegroundColor Red }

Write-Host "══════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "  LOGO CORPORATIVO SAVICOL — favicon + logo + component" -ForegroundColor Yellow
Write-Host "══════════════════════════════════════════════════════" -ForegroundColor Yellow

$repo = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repo

Paso "1/4" "Verificando repositorio..."
if (-not (Test-Path (Join-Path $repo "apps"))) {
    Fallo "No encuentro la carpeta 'apps'. Pon este script en la RAIZ del proyecto."; Read-Host "`nENTER para salir"; exit 1
}
OK "Repositorio: $repo"

Paso "2/4" "Buscando patch..."
$patch = Join-Path $repo "savicol-logo-corporativo.patch"
if (-not (Test-Path $patch)) {
    Fallo "No encuentro savicol-logo-corporativo.patch en: $repo"
    Read-Host "`nENTER para salir"; exit 1
}
OK "Patch: $patch"

Paso "3/4" "Aplicando cambios..."
git apply --3way --whitespace=fix $patch
if ($LASTEXITCODE -ne 0) {
    Fallo "El patch no aplicó correctamente. Verifica que estás en la rama main actualizada."
    Read-Host "`nENTER para salir"; exit 1
}
git add apps/web/public/favicon.svg apps/web/public/logo-savicol.svg apps/web/src/components/ui/savicol-logo.tsx
git commit -m "feat(branding): logo corporativo SAVICOL como predeterminado - favicon + mark SVG + extended layout"
OK "Commit creado"

Paso "4/4" "Push a GitHub..."
git push origin main
if ($LASTEXITCODE -ne 0) {
    Fallo "Push fallido."
    Read-Host "`nENTER para salir"; exit 1
}

Write-Host "`n══════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  LISTO. Vercel reconstruye en 2-3 min." -ForegroundColor Green
Write-Host "══════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host @"

  QUE VERIFICAR:
  - Pestaña del navegador: icono rojo con arcos circulares + check azul
  - Sidebar: logo SAVICOL corporativo (arcos rojos + circulo azul + texto)
  - Login: logo SAVICOL extendido en el panel izquierdo
  - Configuracion > Apariencia: preview con logo corporativo real
  - Al subir un logo propio, reemplaza el predeterminado

"@ -ForegroundColor White

Read-Host "Presiona ENTER para cerrar"
