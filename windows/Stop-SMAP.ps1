[CmdletBinding()]
param()

. (Join-Path $PSScriptRoot "Common.ps1")
Initialize-SmapRuntimeDirectories
$pidValue = Get-SmapProcessId
if (-not $pidValue) {
  Write-Host "Nessun processo SMAP registrato." -ForegroundColor Yellow
  Clear-SmapRuntimeState
  exit 0
}

$process = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
if (-not $process) {
  Write-Host "Il processo registrato non è più attivo." -ForegroundColor Yellow
  Clear-SmapRuntimeState
  exit 0
}

& taskkill.exe /PID $pidValue /T /F | Out-Host
if ($LASTEXITCODE -ne 0) { throw "Impossibile terminare il processo SMAP $pidValue." }
Clear-SmapRuntimeState
Write-Host "SMAP arrestato." -ForegroundColor Green
