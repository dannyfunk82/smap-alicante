[CmdletBinding()]
param(
  [string]$ZipPath,
  [string]$TransitlandApiKey,
  [int]$MaxRoutes = 100,
  [int]$SimulateBuses = 6
)

. (Join-Path $PSScriptRoot "Common.ps1")
Enter-SmapProject
Initialize-SmapRuntimeDirectories

if (-not (Test-Path ".env.local")) { throw ".env.local non trovato. Configura prima SMAP." }
if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) { throw "Node.js non trovato." }

$dataRoot = Join-Path $script:ProjectRoot "data\alicante_gtfs"
$extractDir = Join-Path $dataRoot "extracted"
$downloadZip = Join-Path $dataRoot "alicante_gtfs.zip"
New-Item -ItemType Directory -Path $dataRoot -Force | Out-Null

if (-not $ZipPath) {
  if (-not $TransitlandApiKey) { $TransitlandApiKey = $env:TRANSITLAND_API_KEY }
  if (-not $TransitlandApiKey) {
    Write-Host "Puoi usare una chiave gratuita Transitland oppure un file ZIP scaricato dal NAP." -ForegroundColor Cyan
    $choice = Read-Host "Premi 1 per Transitland, 2 per indicare un ZIP locale"
    if ($choice -eq "2") { $ZipPath = Read-Host "Percorso completo del file GTFS ZIP" }
    else { $TransitlandApiKey = Read-Host "Chiave API Transitland" }
  }
}

if (-not $ZipPath) {
  if (-not $TransitlandApiKey) { throw "Chiave Transitland non fornita." }
  Write-Host "Download del GTFS ufficiale di Alicante..." -ForegroundColor Cyan
  $headers = @{ apikey = $TransitlandApiKey; "User-Agent" = "SMAP/1.1 Alicante GTFS importer" }
  $url = "https://transit.land/api/v2/rest/feeds/f-autobuses~urbanos~de~alicante/download_latest_feed_version"
  Invoke-WebRequest -Uri $url -Headers $headers -OutFile $downloadZip -UseBasicParsing
  $ZipPath = $downloadZip
}

$ZipPath = (Resolve-Path $ZipPath).Path
$bytes = [System.IO.File]::ReadAllBytes($ZipPath)
if ($bytes.Length -lt 4 -or $bytes[0] -ne 0x50 -or $bytes[1] -ne 0x4B) { throw "Il file selezionato non Ã¨ un archivio ZIP valido." }

if (Test-Path $extractDir) { Remove-Item $extractDir -Recurse -Force }
New-Item -ItemType Directory -Path $extractDir -Force | Out-Null
Expand-Archive -Path $ZipPath -DestinationPath $extractDir -Force

foreach ($required in @("routes.txt","stops.txt","trips.txt","stop_times.txt")) {
  if (-not (Test-Path (Join-Path $extractDir $required))) { throw "Feed GTFS non valido: manca $required" }
}

Write-Host "Applicazione delle migrazioni..." -ForegroundColor Cyan
& node.exe --env-file=.env.local scripts/migrate.mjs
if ($LASTEXITCODE -ne 0) { throw "Migrazione database non riuscita." }

Write-Host "Importazione di linee, fermate, corse e orari reali..." -ForegroundColor Cyan
& node.exe --env-file=.env.local scripts/import-alicante-gtfs.mjs --dir $extractDir --maxRoutes $MaxRoutes --simulateBuses $SimulateBuses --activate true
if ($LASTEXITCODE -ne 0) { throw "Importazione GTFS non riuscita." }

Write-Host "Verifica della sorgente importata..." -ForegroundColor Cyan
& node.exe --env-file=.env.local scripts/alicante-gtfs-status.mjs
if ($LASTEXITCODE -ne 0) { throw "Verifica GTFS non riuscita." }

Write-Host "" 
Write-Host "Rete urbana reale di Alicante importata correttamente." -ForegroundColor Green
Write-Host "Linee, fermate e orari: reali. GPS, ETA dinamici e affollamento: simulati." -ForegroundColor Yellow
Write-Host "Attribution: Powered by MITRAMS - https://www.transportes.gob.es/" -ForegroundColor DarkGray
