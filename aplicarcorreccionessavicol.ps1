# ════════════════════════════════════════════════════════════════════════════
#  APLICAR CORRECCIONES SAVICOL AUDIT PLATFORM
#  Aplica el patch (correo Brevo + eliminar usuarios + RBAC + FK + endpoints),
#  hace commit y push a main → dispara redeploy automático en Railway y Vercel.
# ════════════════════════════════════════════════════════════════════════════
#
#  CÓMO USARLO:
#   1. Pon este archivo (.ps1) y "savicol-v7-final.patch" en la carpeta RAÍZ
#      del proyecto savicol-audit-platform (donde está la carpeta "apps").
#   2. Click derecho sobre el .ps1 → "Ejecutar con PowerShell"
#      (o abre PowerShell ahí y ejecuta:  .\aplicar-correcciones-savicol.ps1 )
#
# ════════════════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

function Paso($n, $txt) { Write-Host "`n[$n] $txt" -ForegroundColor Cyan }
function OK($txt)       { Write-Host "    OK  $txt" -ForegroundColor Green }
function Fallo($txt)    { Write-Host "    ERROR  $txt" -ForegroundColor Red }

Write-Host "==================================================================" -ForegroundColor Yellow
Write-Host "  CORRECCIONES SAVICOL — correo + usuarios + seguridad" -ForegroundColor Yellow
Write-Host "==================================================================" -ForegroundColor Yellow

# ── 0. Ubicar la carpeta del script y verificar que es el repo ──────────────
$repo = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repo

Paso "1/7" "Verificando que estamos en el repositorio correcto..."
if (-not (Test-Path (Join-Path $repo "apps"))) {
    Fallo "No encuentro la carpeta 'apps'. Pon este script en la RAÍZ de savicol-audit-platform."
    Read-Host "`nPresiona ENTER para salir"; exit 1
}
if (-not (Test-Path (Join-Path $repo ".git"))) {
    Fallo "Esta carpeta no es un repositorio git (.git no existe)."
    Read-Host "`nPresiona ENTER para salir"; exit 1
}
OK "Repositorio detectado en: $repo"

# ── 1. Localizar el patch ────────────────────────────────────────────────────
Paso "2/7" "Buscando el archivo del patch..."
$patch = Join-Path $repo "savicol-v7-final.patch"
if (-not (Test-Path $patch)) {
    $patch = Join-Path $env:USERPROFILE "Downloads\savicol-v7-final.patch"
}
if (-not (Test-Path $patch)) {
    Fallo "No encuentro 'savicol-v7-final.patch'."
    Fallo "Ponlo junto a este script o en tu carpeta Descargas."
    Read-Host "`nPresiona ENTER para salir"; exit 1
}
OK "Patch encontrado: $patch"

# ── 2. Cambiar a main y actualizar ───────────────────────────────────────────
Paso "3/7" "Cambiando a la rama main y actualizando desde GitHub..."
git checkout main
git pull origin main
OK "Rama main actualizada"

# ── 3. Verificar que el patch aplica antes de tocar nada ─────────────────────
Paso "4/7" "Comprobando que el patch aplica limpio (sin cambiar archivos aún)..."
$check = git apply --check --3way $patch 2>&1
if ($LASTEXITCODE -ne 0) {
    Fallo "El patch no aplica limpio. Detalle:"
    Write-Host $check -ForegroundColor Red
    Write-Host "`nPosible causa: ya aplicaste parte de estos cambios antes." -ForegroundColor Yellow
    Write-Host "Copia este mensaje y envialo al asistente para resolverlo." -ForegroundColor Yellow
    Read-Host "`nPresiona ENTER para salir"; exit 1
}
OK "El patch aplica sin conflictos"

# ── 4. Aplicar el patch ──────────────────────────────────────────────────────
Paso "5/7" "Aplicando las correcciones..."
git apply --3way --whitespace=fix $patch
OK "Correcciones aplicadas a los archivos"

Write-Host "`n    Archivos modificados:" -ForegroundColor Gray
git --no-pager diff --stat HEAD

# ── 5. Commit ────────────────────────────────────────────────────────────────
Paso "6/7" "Creando commit..."
git add -A
git commit -m "fix: correo Brevo HTTP API + eliminar usuarios + RBAC + FK + endpoints 404"
OK "Commit creado"

# ── 6. Push → dispara el redeploy ────────────────────────────────────────────
Paso "7/7" "Subiendo a GitHub (esto dispara el redeploy en Railway y Vercel)..."
git push origin main
if ($LASTEXITCODE -ne 0) {
    Fallo "El push fallo. Copia el mensaje de arriba y envialo al asistente."
    Read-Host "`nPresiona ENTER para salir"; exit 1
}

Write-Host "`n==================================================================" -ForegroundColor Green
Write-Host "  LISTO. Push exitoso a main." -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Green
Write-Host @"

  QUE PASA AHORA:
  - Railway reconstruye el API (3-5 min) -> el correo Brevo queda activo
  - Vercel reconstruye el frontend (2-3 min)

  COMO VERIFICAR (en 5 minutos):
  - Entra a la plataforma como ADMIN
  - Configuracion -> Notificaciones -> "Estado de correo"
    Debe decir: "Brevo API activo - correos funcionando"
  - Usa el boton de correo de prueba a tu email

  Luego dile al asistente "verificar" y confirmara el deploy en Vercel.

"@ -ForegroundColor White

Read-Host "Presiona ENTER para cerrar"
