[CmdletBinding()]
param([switch]$Verify)

. (Join-Path $PSScriptRoot "Common.ps1")
Assert-SmapProject
Enter-SmapProject
Get-SmapEnvFile | Out-Null

& node.exe --env-file=.env.local scripts/backup.mjs
if ($LASTEXITCODE -ne 0) { throw "Backup SMAP non riuscito." }

$latest = Get-ChildItem (Join-Path $script:ProjectRoot "backups") -Filter "smap-backup-*.json" -File |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1
if (-not $latest) { throw "Backup creato ma file JSON non trovato." }

Write-Host "Backup: $($latest.FullName)" -ForegroundColor Green
if ($Verify) {
  & node.exe scripts/verify-backup.mjs $latest.FullName
  if ($LASTEXITCODE -ne 0) { throw "Verifica backup non riuscita." }
}
