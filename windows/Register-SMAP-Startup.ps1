[CmdletBinding()]
param(
  [ValidateSet("development", "production")]
  [string]$Mode = "production",
  [int]$Port = 3000,
  [string]$TaskName = "SMAP Web"
)

. (Join-Path $PSScriptRoot "Common.ps1")
Assert-SmapProject
$startScript = Join-Path $PSScriptRoot "Start-SMAP.ps1"
$taskCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$startScript`" -Mode $Mode -Port $Port"

& schtasks.exe /Create /F /SC ONLOGON /TN $TaskName /TR $taskCommand | Out-Host
if ($LASTEXITCODE -ne 0) { throw "Registrazione dell'avvio automatico non riuscita." }
Write-Host "Attività '$TaskName' registrata. Verrà eseguita al prossimo accesso Windows." -ForegroundColor Green
