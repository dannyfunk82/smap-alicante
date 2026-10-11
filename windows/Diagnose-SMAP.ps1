[CmdletBinding()]
param(
  [switch]$Quick,
  [switch]$OpenFolder
)

. (Join-Path $PSScriptRoot "Common.ps1")
Assert-SmapProject
Initialize-SmapRuntimeDirectories
Enter-SmapProject
Get-SmapEnvFile | Out-Null

$stamp = Get-SmapTimestamp
$working = Join-Path $script:SupportBundlesDir "SMAP-support-$stamp"
New-Item -ItemType Directory -Path $working -Force | Out-Null

$port = Get-SmapConfiguredPort -DefaultPort 3000
$process = Get-SmapRunningProcess
$postgres = Get-SmapPostgresService
$health = Invoke-SmapHealthCheck -Port $port -TimeoutSec 4
$ready = Get-SmapReadyStatus -Port $port -TimeoutSec 4
$publicStatus = Get-SmapPublicStatus -Port $port -TimeoutSec 4

$nodeVersion = (& node.exe --version 2>$null)
$npmVersion = (& npm.cmd --version 2>$null)
$os = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
$portOwner = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1

$summary = [ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  projectRoot = $script:ProjectRoot
  node = $nodeVersion
  npm = $npmVersion
  windows = if ($os) { $os.Caption + " " + $os.Version } else { [Environment]::OSVersion.VersionString }
  postgres = if ($postgres) { @{ name = $postgres.Name; status = [string]$postgres.Status } } else { $null }
  application = @{ running = [bool]$process; pid = if ($process) { $process.Id } else { $null }; port = $port; listeningPid = if ($portOwner) { $portOwner.OwningProcess } else { $null } }
  health = $health
  readiness = $ready
  publicStatus = $publicStatus
  environment = Get-SmapSanitizedEnvironment
}
$summary | ConvertTo-Json -Depth 12 | Set-Content (Join-Path $working "diagnostic-summary.json") -Encoding UTF8

foreach ($item in @(
  @{ Source = $script:StdOutLog; Name = "smap-web.out.tail.log" },
  @{ Source = $script:StdErrLog; Name = "smap-web.err.tail.log" }
)) {
  if (Test-Path $item.Source) { Get-Content $item.Source -Tail 300 | Set-Content (Join-Path $working $item.Name) -Encoding UTF8 }
}

Write-Host "Controllo integrità dati..." -ForegroundColor Cyan
& node.exe --env-file=.env.local scripts/data-integrity.mjs --no-fail --quiet
if (Test-Path "reports\data-integrity.json") { Copy-Item "reports\data-integrity.json" $working -Force }
if (Test-Path "reports\data-integrity.md") { Copy-Item "reports\data-integrity.md" $working -Force }

if (-not $Quick) {
  Write-Host "Generazione rapporto manutenzione..." -ForegroundColor Cyan
  & node.exe --env-file=.env.local scripts/maintenance-report.mjs *> (Join-Path $working "maintenance-command.log")
  if (Test-Path "reports\maintenance-report.json") { Copy-Item "reports\maintenance-report.json" $working -Force }
  if (Test-Path "reports\maintenance-report.md") { Copy-Item "reports\maintenance-report.md" $working -Force }

  Write-Host "Validazione sorgenti e test..." -ForegroundColor Cyan
  & npm.cmd run check *> (Join-Path $working "automated-checks.log")
}

New-Item -ItemType Directory -Path $script:SupportBundlesDir -Force | Out-Null
$zip = "$working.zip"
Compress-Archive -Path (Join-Path $working "*") -DestinationPath $zip -Force
Remove-Item $working -Recurse -Force
Write-Host "Pacchetto diagnostico creato: $zip" -ForegroundColor Green
if ($OpenFolder) { Start-Process explorer.exe $script:SupportBundlesDir }
