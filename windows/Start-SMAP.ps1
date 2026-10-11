[CmdletBinding()]
param(
  [ValidateSet("development", "production")]
  [string]$Mode = "development",
  [ValidateRange(1, 65535)]
  [int]$Port = 3000,
  [switch]$OpenBrowser,
  [switch]$Foreground,
  [switch]$Build
)

. (Join-Path $PSScriptRoot "Common.ps1")
Assert-SmapProject
Initialize-SmapRuntimeDirectories
Enter-SmapProject
Assert-SmapCommand "node.exe" "Installa Node.js LTS."
Get-SmapEnvFile | Out-Null
Assert-SmapPostgresRunning

$existing = Get-SmapRunningProcess
if ($existing) {
  $existingPort = Get-SmapConfiguredPort -DefaultPort $Port
  Write-Host "SMAP è già in esecuzione (PID $($existing.Id), porta $existingPort)." -ForegroundColor Yellow
  if ($OpenBrowser) { Start-Process "http://localhost:$existingPort" }
  exit 0
}
Clear-SmapRuntimeState

$nextBin = Join-Path $script:ProjectRoot "node_modules\next\dist\bin\next"
if (-not (Test-Path $nextBin)) { throw "Dipendenze non installate. Esegui windows\Install-SMAP.ps1." }

if ($Mode -eq "production" -and ($Build -or -not (Test-Path (Join-Path $script:ProjectRoot ".next\BUILD_ID")))) {
  Write-Host "Creazione build di produzione..." -ForegroundColor Cyan
  & node.exe --env-file=.env.local $nextBin build
  if ($LASTEXITCODE -ne 0) { throw "Build Next.js non riuscita." }
}

$nextMode = if ($Mode -eq "production") { "start" } else { "dev" }
$arguments = @("--env-file=.env.local", $nextBin, $nextMode, "-H", "0.0.0.0", "-p", "$Port")

if ($Foreground) {
  Write-Host "SMAP in esecuzione in primo piano su http://localhost:$Port. Premi Ctrl+C per fermare." -ForegroundColor Green
  & node.exe @arguments
  exit $LASTEXITCODE
}

$process = Start-Process -FilePath "node.exe" -ArgumentList $arguments -WorkingDirectory $script:ProjectRoot -RedirectStandardOutput $script:StdOutLog -RedirectStandardError $script:StdErrLog -PassThru -WindowStyle Hidden
Set-Content -Path $script:PidFile -Value $process.Id -Encoding ascii
Set-Content -Path $script:ModeFile -Value $Mode -Encoding ascii
Set-Content -Path $script:PortFile -Value $Port -Encoding ascii

Write-Host "Avvio SMAP (PID $($process.Id), modalità $Mode)..." -ForegroundColor Cyan
$health = Wait-SmapReady -Port $Port -TimeoutSec 75
if (-not $health) {
  Write-Warning "SMAP non ha risposto entro il tempo previsto. Controlla logs\smap-web.err.log."
  & taskkill.exe /PID $process.Id /T /F | Out-Null
  Clear-SmapRuntimeState
  exit 1
}

Write-Host "SMAP pronto: http://localhost:$Port" -ForegroundColor Green
if ($OpenBrowser) { Start-Process "http://localhost:$Port" }
