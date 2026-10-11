[CmdletBinding()]
param(
  [switch]$SkipSeed,
  [switch]$SkipTests,
  [switch]$SkipNpmInstall,
  [switch]$ForceEnvTemplate
)

. (Join-Path $PSScriptRoot "Common.ps1")
Assert-SmapProject
Initialize-SmapRuntimeDirectories
Enter-SmapProject

Assert-SmapCommand "node.exe" "Installa Node.js LTS e riapri PowerShell."
Assert-SmapCommand "npm.cmd" "Node.js deve includere npm."
Assert-SmapPostgresRunning

$envPath = Join-Path $script:ProjectRoot ".env.local"
$template = Join-Path $PSScriptRoot ".env.local.example"
if ($ForceEnvTemplate -or -not (Test-Path $envPath)) {
  Copy-Item $template $envPath -Force
  Write-Warning ".env.local creato dal modello. Controlla DATABASE_URL e modifica i segreti prima di un uso non locale."
}

if (-not $SkipNpmInstall) {
  Write-Host "[1/4] Installazione dipendenze npm..." -ForegroundColor Cyan
  & npm.cmd install
  if ($LASTEXITCODE -ne 0) { throw "npm install non riuscito." }
}

Write-Host "[2/4] Applicazione migrazioni..." -ForegroundColor Cyan
& node.exe --env-file=.env.local scripts/migrate.mjs
if ($LASTEXITCODE -ne 0) { throw "Migrazione database non riuscita." }

if (-not $SkipSeed) {
  Write-Host "[3/4] Aggiornamento dati demo..." -ForegroundColor Cyan
  & node.exe --env-file=.env.local scripts/seed.mjs
  if ($LASTEXITCODE -ne 0) { throw "Seed database non riuscito." }
} else {
  Write-Host "[3/4] Seed saltato." -ForegroundColor DarkGray
}

if (-not $SkipTests) {
  Write-Host "[4/4] Validazione e test..." -ForegroundColor Cyan
  & npm.cmd run check
  if ($LASTEXITCODE -ne 0) { throw "I controlli automatici non sono stati superati." }
} else {
  Write-Host "[4/4] Test saltati." -ForegroundColor DarkGray
}

Write-Host "SMAP è installato e aggiornato." -ForegroundColor Green
Write-Host "Avvio: windows\Start-SMAP.ps1 -OpenBrowser" -ForegroundColor Green
