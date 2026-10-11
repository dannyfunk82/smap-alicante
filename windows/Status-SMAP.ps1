[CmdletBinding()]
param([int]$Port = 0)

. (Join-Path $PSScriptRoot "Common.ps1")
Initialize-SmapRuntimeDirectories
if ($Port -le 0) { $Port = Get-SmapConfiguredPort -DefaultPort 3000 }
$process = Get-SmapRunningProcess
$health = Invoke-SmapHealthCheck -Port $Port -TimeoutSec 4

$status = [ordered]@{
  running = [bool]$process
  pid = if ($process) { $process.Id } else { $null }
  port = $Port
  url = "http://localhost:$Port"
  health = if ($health) { $health } else { $null }
  stdoutLog = $script:StdOutLog
  stderrLog = $script:StdErrLog
}
$status | ConvertTo-Json -Depth 8

if (-not $process -or -not $health) { exit 1 }
