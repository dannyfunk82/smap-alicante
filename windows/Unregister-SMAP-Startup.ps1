[CmdletBinding()]
param([string]$TaskName = "SMAP Web")

& schtasks.exe /Delete /F /TN $TaskName | Out-Host
if ($LASTEXITCODE -ne 0) { throw "Rimozione dell'attività '$TaskName' non riuscita." }
Write-Host "Attività '$TaskName' rimossa." -ForegroundColor Green
