# ════════════════════════════════════════════════════════════════════════════
#  LOGO SAVICOL EN TODA LA INTERFAZ
#  Aplica: componente logo reutilizable, sidebar/login/header con logo real,
#          preview dual en Apariencia, header light mode.
# ════════════════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

function Paso($n, $txt) { Write-Host "`n[$n] $txt" -ForegroundColor Cyan }
function OK($txt)       { Write-Host "    OK  $txt" -ForegroundColor Green }
function Fallo($txt)    { Write-Host "    ERROR  $txt" -ForegroundColor Red }

Write-Host "==================================================================" -ForegroundColor Yellow
Write-Host "  LOGO SAVICOL — sidebar + login + apariencia + header" -ForegroundColor Yellow
Write-Host "==================================================================" -ForegroundColor Yellow

$repo = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repo

Paso "1/5" "Verificando repositorio..."
if (-not (Test-Path (Join-Path $repo "apps"))) {
    Fallo "No encuentro la carpeta 'apps'. Pon este script en la RAIZ del proyecto."; Read-Host "`nENTER para salir"; exit 1
}
OK "Repositorio: $repo"

Paso "2/5" "Buscando patch..."
$patch = Join-Path $repo "savicol-logo-ui.patch"
if (-not (Test-Path $patch)) { $patch = Join-Path $env:USERPROFILE "Downloads\savicol-logo-ui.patch" }
if (-not (Test-Path $patch)) { Fallo "No encuentro savicol-logo-ui.patch"; Read-Host "`nENTER para salir"; exit 1 }
OK "Patch: $patch"

Paso "3/5" "Actualizando main y verificando patch..."
git checkout main
git pull origin main
$check = git apply --check --3way $patch 2>&1
if ($LASTEXITCODE -ne 0) {
    Fallo "El patch no aplica limpio:"; Write-Host $check -ForegroundColor Red
    Read-Host "`nENTER para salir"; exit 1
}
OK "Patch aplica sin conflictos"

Paso "4/5" "Aplicando cambios..."
git apply --3way --whitespace=fix $patch
git add -A
git commit -m "feat(ui): logo corporativo SAVICOL en toda la interfaz - sidebar + login + header + apariencia"
OK "Commit creado"

Paso "5/5" "Push a GitHub..."
git push origin main
if ($LASTEXITCODE -ne 0) { Fallo "Push fallido. Copia el error y envialo al asistente."; Read-Host "`nENTER para salir"; exit 1 }

Write-Host "`n==================================================================" -ForegroundColor Green
Write-Host "  LISTO. Logo desplegado. Vercel reconstruye en 2-3 min." -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Green
Write-Host @"

  VERIFICAR EN LA PLATAFORMA:
  - Login: logo SAVICOL (escudo + texto) en panel izquierdo
  - Sidebar: logo SAVICOL corporativo (no icono Shield generico)
  - Configuracion -> Apariencia: preview dual del logo (fondo claro + azul)
  - Subir tu logo PNG en Apariencia -> se aplica en toda la UI al instante

  Luego dile al asistente "verificar".

"@ -ForegroundColor White

Read-Host "Presiona ENTER para cerrar"
