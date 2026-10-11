$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
$envFile = ".env.production.local"
if (-not (Test-Path $envFile)) { throw "Missing $envFile. Copy .env.production.example first." }
node --env-file=$envFile scripts/preflight.mjs
npm.cmd run build
node --env-file=$envFile scripts/release.mjs -- --version=1.0.0 --environment=production --status=deployed
node --env-file=$envFile scripts/production-start.mjs
