[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$PackageZip,
  [string]$DestinationPath,
  [switch]$SkipBackup,
  [switch]$SkipTests,
  [switch]$Force
)

. (Join-Path $PSScriptRoot "Common.ps1")
Assert-SmapProject
Initialize-SmapRuntimeDirectories
Enter-SmapProject
Get-SmapEnvFile | Out-Null

$PackageZip = (Resolve-Path $PackageZip).Path
if (-not $DestinationPath) {
  $parent = Split-Path $script:ProjectRoot -Parent
  $base = [IO.Path]::GetFileNameWithoutExtension($PackageZip)
  $DestinationPath = Join-Path $parent $base
}
$DestinationPath = [IO.Path]::GetFullPath($DestinationPath)
if ($DestinationPath -eq $script:ProjectRoot) { throw "L'aggiornamento in-place non è consentito. Scegli una cartella affiancata." }
if ((Test-Path $DestinationPath) -and -not $Force) { throw "La destinazione esiste già: $DestinationPath. Usa -Force solo se vuoi sostituirla." }

$checksumFile = "$PackageZip.sha256"
if (-not (Test-Path $checksumFile)) {
  $sibling = Join-Path (Split-Path $PackageZip -Parent) (([IO.Path]::GetFileNameWithoutExtension($PackageZip)) + ".sha256")
  if (Test-Path $sibling) { $checksumFile = $sibling }
}
if (Test-Path $checksumFile) {
  $expected = ((Get-Content $checksumFile -Raw).Trim() -split "\s+")[0].ToLowerInvariant()
  $actual = (Get-FileHash $PackageZip -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($expected -ne $actual) { throw "Checksum SHA-256 non valido. Aggiornamento annullato." }
  Write-Host "Checksum del pacchetto verificato." -ForegroundColor Green
} else { Write-Warning "File checksum non trovato. Il pacchetto non può essere autenticato localmente." }

if (-not $SkipBackup) {
  Write-Host "Creazione backup prima dell'aggiornamento..." -ForegroundColor Cyan
  & (Join-Path $PSScriptRoot "Backup-SMAP.ps1") -Verify
}

$temp = Join-Path ([IO.Path]::GetTempPath()) ("smap-update-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $temp -Force | Out-Null
try {
  Expand-Archive -Path $PackageZip -DestinationPath $temp -Force
  $packageFile = Get-ChildItem $temp -Recurse -Filter package.json | Select-Object -First 1
  if (-not $packageFile) { throw "package.json non trovato nel pacchetto." }
  $sourceRoot = $packageFile.DirectoryName
  if (Test-Path $DestinationPath) { Remove-Item $DestinationPath -Recurse -Force }
  New-Item -ItemType Directory -Path $DestinationPath -Force | Out-Null
  Copy-Item (Join-Path $sourceRoot "*") $DestinationPath -Recurse -Force
  Copy-Item (Join-Path $script:ProjectRoot ".env.local") (Join-Path $DestinationPath ".env.local") -Force

  Push-Location $DestinationPath
  try {
    & npm.cmd install
    if ($LASTEXITCODE -ne 0) { throw "npm install non riuscito nella nuova versione." }
    & node.exe --env-file=.env.local scripts/migrate.mjs
    if ($LASTEXITCODE -ne 0) { throw "Migrazioni non riuscite nella nuova versione." }
    if (-not $SkipTests) {
      & npm.cmd run check
      if ($LASTEXITCODE -ne 0) { throw "Test non superati nella nuova versione." }
    }
  } finally { Pop-Location }

  Write-Host "Aggiornamento installato in modo affiancato: $DestinationPath" -ForegroundColor Green
  Write-Host "La versione corrente non è stata eliminata. Avvia la nuova versione da windows\SMAP_CONTROL.cmd." -ForegroundColor Green
} catch {
  if (Test-Path $DestinationPath) { Remove-Item $DestinationPath -Recurse -Force -ErrorAction SilentlyContinue }
  throw
} finally {
  Remove-Item $temp -Recurse -Force -ErrorAction SilentlyContinue
}
