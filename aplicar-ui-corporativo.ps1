# ════════════════════════════════════════════════════════════════════════════
#  APLICAR IDENTIDAD CORPORATIVA SAVICOL (UI / Design System)
#  Aplica el patch de rediseño visual (Light Mode + módulo Apariencia + logo),
#  hace commit y push a main → dispara redeploy automático en Vercel.
# ════════════════════════════════════════════════════════════════════════════
#
#  CÓMO USARLO:
#   1. Pon este archivo (.ps1) y "savicol-ui-corporativo.patch" en la carpeta
#      RAÍZ del proyecto (donde está la carpeta "apps").
#   2. Abre PowerShell ahí y ejecuta:
#        Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
#        .\aplicar-ui-corporativo.ps1
#
# ════════════════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

function Paso($n, $txt) { Write-Host "`n[$n] $txt" -ForegroundColor Cyan }
function OK($txt)       { Write-Host "    OK  $txt" -ForegroundColor Green }
function Fallo($txt)    { Write-Host "    ERROR  $txt" -ForegroundColor Red }

Write-Host "==================================================================" -ForegroundColor Yellow
Write-Host "  IDENTIDAD CORPORATIVA SAVICOL — Light Mode + Modulo Apariencia" -ForegroundColor Yellow
Write-Host "==================================================================" -ForegroundColor Yellow

$repo = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repo

Paso "1/6" "Verificando repositorio..."
if (-not (Test-Path (Join-Path $repo "apps"))) {
    Fallo "No encuentro la carpeta 'apps'. Pon este script en la RAIZ del proyecto."
    Read-Host "`nPresiona ENTER para salir"; exit 1
}
if (-not (Test-Path (Join-Path $repo ".git"))) {
    Fallo "Esta carpeta no es un repositorio git."
    Read-Host "`nPresiona ENTER para salir"; exit 1
}
OK "Repositorio detectado: $repo"

Paso "2/6" "Buscando el patch..."
$patch = Join-Path $repo "savicol-ui-corporativo.patch"
if (-not (Test-Path $patch)) {
    $patch = Join-Path $env:USERPROFILE "Downloads\savicol-ui-corporativo.patch"
}
if (-not (Test-Path $patch)) {
    Fallo "No encuentro 'savicol-ui-corporativo.patch'. Ponlo junto a este script o en Descargas."
    Read-Host "`nPresiona ENTER para salir"; exit 1
}
OK "Patch encontrado: $patch"

Paso "3/6" "Actualizando rama main..."
git checkout main
git pull origin main
OK "main actualizada"

Paso "4/6" "Comprobando que el patch aplica limpio..."
$check = git apply --check --3way $patch 2>&1
if ($LASTEXITCODE -ne 0) {
    Fallo "El patch no aplica limpio. Detalle:"
    Write-Host $check -ForegroundColor Red
    Read-Host "`nPresiona ENTER para salir"; exit 1
}
OK "El patch aplica sin conflictos"

Paso "5/6" "Aplicando el rediseno corporativo..."
git apply --3way --whitespace=fix $patch
git add -A
git --no-pager diff --stat HEAD
git commit -m "feat(ui): identidad corporativa SAVICOL - design system + light mode + modulo apariencia"
OK "Commit creado"

Paso "6/6" "Subiendo a GitHub (dispara redeploy en Vercel)..."
git push origin main
if ($LASTEXITCODE -ne 0) {
    Fallo "El push fallo. Copia el mensaje y envialo al asistente."
    Read-Host "`nPresiona ENTER para salir"; exit 1
}

Write-Host "`n==================================================================" -ForegroundColor Green
Write-Host "  LISTO. Push exitoso. Vercel reconstruira en 2-3 min." -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Green
Write-Host @"

  QUE VERAS TRAS EL DEPLOY:
  - Login rediseñado: panel azul corporativo + tarjeta blanca
  - Plataforma en Light Mode (fondo claro ejecutivo)
  - Sidebar azul SAVICOL con acento rojo
  - Favicon corporativo en la pestana del navegador
  - Configuracion -> Apariencia: cambiar tema, fuente, logo

  Luego dile al asistente "verificar".

"@ -ForegroundColor White

Read-Host "Presiona ENTER para cerrar"
