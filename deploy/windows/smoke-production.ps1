$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
node --env-file=.env.production.local scripts/smoke-test.mjs
