[CmdletBinding()]
param(
  [switch]$SkipBackup,
  [switch]$SkipNpmInstall,
  [switch]$StartAfterRepair
)

. (Join-Path $PSScriptRoot "Common.ps1")
Assert-SmapProject
Initialize-SmapRuntimeDirectories
Enter-SmapProject
Assert-SmapCommand "node.exe" "Installa Node.js LTS e riapri PowerShell."
Assert-SmapCommand "npm.cmd" "Node.js deve includere npm."
Assert-SmapPostgresRunning
Get-SmapEnvFile | Out-Null

if (-not $SkipBackup) {
  Write-Host "[1/7] Backup verificato..." -ForegroundColor Cyan
  & (Join-Path $PSScriptRoot "Backup-SMAP.ps1") -Verify
} else { Write-Host "[1/7] Backup saltato su richiesta." -ForegroundColor Yellow }

Write-Host "[2/7] Arresto applicazione..." -ForegroundColor Cyan
& (Join-Path $PSScriptRoot "Stop-SMAP.ps1") -ErrorAction SilentlyContinue

Write-Host "[3/7] Pulizia cache e stato runtime..." -ForegroundColor Cyan
Remove-Item (Join-Path $script:ProjectRoot ".next") -Recurse -Force -ErrorAction SilentlyContinue
Clear-SmapRuntimeState

if (-not $SkipNpmInstall) {
  Write-Host "[4/7] Ripristino dipendenze npm..." -ForegroundColor Cyan
  if (Test-Path "package-lock.json") { & npm.cmd ci } else { & npm.cmd install }
  if ($LASTEXITCODE -ne 0) { throw "Ripristino dipendenze npm non riuscito." }
} else { Write-Host "[4/7] Installazione npm saltata." -ForegroundColor DarkGray }

Write-Host "[5/7] Verifica migrazioni..." -ForegroundColor Cyan
& node.exe --env-file=.env.local scripts/migrate.mjs
if ($LASTEXITCODE -ne 0) { throw "Migrazioni non riuscite." }

Write-Host "[6/7] Controllo integrità dati..." -ForegroundColor Cyan
& node.exe --env-file=.env.local scripts/data-integrity.mjs --no-fail
if ($LASTEXITCODE -notin @(0,2)) { throw "Controllo integrità non riuscito." }

Write-Host "[7/7] Validazione completa..." -ForegroundColor Cyan
& npm.cmd run check
if ($LASTEXITCODE -ne 0) { throw "Validazione o test non superati." }

Write-Host "Riparazione sicura completata. Nessun dato applicativo è stato eliminato." -ForegroundColor Green
if ($StartAfterRepair) { & (Join-Path $PSScriptRoot "Start-SMAP.ps1") -Mode development -OpenBrowser }
