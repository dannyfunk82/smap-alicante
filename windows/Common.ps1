Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$script:ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$script:RuntimeDir = Join-Path $script:ProjectRoot ".smap-runtime"
$script:LogsDir = Join-Path $script:ProjectRoot "logs"
$script:PidFile = Join-Path $script:RuntimeDir "smap-web.pid"
$script:ModeFile = Join-Path $script:RuntimeDir "smap-web.mode"
$script:PortFile = Join-Path $script:RuntimeDir "smap-web.port"
$script:StdOutLog = Join-Path $script:LogsDir "smap-web.out.log"
$script:StdErrLog = Join-Path $script:LogsDir "smap-web.err.log"

function Initialize-SmapRuntimeDirectories {
  New-Item -ItemType Directory -Path $script:RuntimeDir -Force | Out-Null
  New-Item -ItemType Directory -Path $script:LogsDir -Force | Out-Null
}

function Enter-SmapProject {
  Set-Location $script:ProjectRoot
}

function Assert-SmapProject {
  foreach ($relative in @("package.json", "scripts\migrate.mjs", "scripts\seed.mjs")) {
    if (-not (Test-Path (Join-Path $script:ProjectRoot $relative))) {
      throw "File SMAP mancante: $relative. Esegui lo script dalla cartella estratta correttamente."
    }
  }
}

function Assert-SmapCommand([string]$Name, [string]$InstallHint) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Comando '$Name' non trovato. $InstallHint"
  }
}

function Get-SmapEnvFile {
  $path = Join-Path $script:ProjectRoot ".env.local"
  if (-not (Test-Path $path)) {
    throw ".env.local non trovato. Esegui prima windows\Install-SMAP.ps1."
  }
  return $path
}

function Get-SmapPostgresService {
  return Get-Service -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like "postgresql*" -or $_.DisplayName -like "PostgreSQL*" } |
    Select-Object -First 1
}

function Assert-SmapPostgresRunning {
  $service = Get-SmapPostgresService
  if (-not $service) {
    Write-Warning "Servizio PostgreSQL non individuato automaticamente. Verifica che PostgreSQL sia installato e ascolti sulla porta configurata."
    return
  }
  if ($service.Status -ne "Running") {
    throw "PostgreSQL è installato ma non è in esecuzione ($($service.Name)). Avvia PowerShell come amministratore ed esegui: Start-Service '$($service.Name)'"
  }
}

function Get-SmapProcessId {
  if (-not (Test-Path $script:PidFile)) { return $null }
  $raw = (Get-Content $script:PidFile -Raw).Trim()
  if ($raw -notmatch "^\d+$") { return $null }
  return [int]$raw
}

function Get-SmapRunningProcess {
  $pidValue = Get-SmapProcessId
  if (-not $pidValue) { return $null }
  return Get-Process -Id $pidValue -ErrorAction SilentlyContinue
}

function Clear-SmapRuntimeState {
  Remove-Item $script:PidFile, $script:ModeFile, $script:PortFile -Force -ErrorAction SilentlyContinue
}

function Get-SmapConfiguredPort([int]$DefaultPort = 3000) {
  if (Test-Path $script:PortFile) {
    $raw = (Get-Content $script:PortFile -Raw).Trim()
    if ($raw -match "^\d+$") { return [int]$raw }
  }
  return $DefaultPort
}

function Invoke-SmapHealthCheck([int]$Port = 3000, [int]$TimeoutSec = 5) {
  $uri = "http://localhost:$Port/api/health"
  try {
    return Invoke-RestMethod -Uri $uri -Method Get -TimeoutSec $TimeoutSec
  } catch {
    return $null
  }
}

function Wait-SmapReady([int]$Port = 3000, [int]$TimeoutSec = 60) {
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  do {
    $health = Invoke-SmapHealthCheck -Port $Port -TimeoutSec 2
    if ($health) { return $health }
    Start-Sleep -Seconds 2
  } while ((Get-Date) -lt $deadline)
  return $null
}

function Find-SmapPsql {
  $command = Get-Command psql.exe -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }

  $base = Join-Path $env:ProgramFiles "PostgreSQL"
  if (Test-Path $base) {
    $candidate = Get-ChildItem $base -Directory -ErrorAction SilentlyContinue |
      Sort-Object { [version]($_.Name -replace "[^0-9.]", "") } -Descending |
      ForEach-Object { Join-Path $_.FullName "bin\psql.exe" } |
      Where-Object { Test-Path $_ } |
      Select-Object -First 1
    if ($candidate) { return $candidate }
  }
  return $null
}

$script:SupportBundlesDir = Join-Path $script:ProjectRoot "support-bundles"

function Get-SmapTimestamp {
  return (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH-mm-ssZ")
}

function Get-SmapReadyStatus([int]$Port = 3000, [int]$TimeoutSec = 5) {
  try { return Invoke-RestMethod -Uri "http://localhost:$Port/api/ready" -Method Get -TimeoutSec $TimeoutSec } catch { return $null }
}

function Get-SmapPublicStatus([int]$Port = 3000, [int]$TimeoutSec = 5) {
  try { return Invoke-RestMethod -Uri "http://localhost:$Port/api/status" -Method Get -TimeoutSec $TimeoutSec } catch { return $null }
}

function Get-SmapSanitizedEnvironment {
  $envFile = Get-SmapEnvFile
  $result = [ordered]@{}
  foreach ($line in Get-Content $envFile) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#") -or -not $trimmed.Contains("=")) { continue }
    $parts = $trimmed.Split("=", 2)
    $key = $parts[0].Trim()
    $value = $parts[1]
    $sensitive = $key -match "SECRET|PASSWORD|TOKEN|KEY|DATABASE_URL"
    $result[$key] = if ($sensitive) { if ($value) { "<configured>" } else { "<empty>" } } else { $value }
  }
  return $result
}
