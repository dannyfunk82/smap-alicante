[CmdletBinding()]
param(
  [string]$AdminUser = "postgres",
  [string]$Database = "smap",
  [string]$AppUser = "smap",
  [string]$AppPassword = "smap_dev_password",
  [string]$Server = "localhost",
  [int]$Port = 5432,
  [SecureString]$AdminPassword
)

. (Join-Path $PSScriptRoot "Common.ps1")
Assert-SmapProject
$psql = Find-SmapPsql
if (-not $psql) { throw "psql.exe non trovato. Installa PostgreSQL con Command Line Tools oppure aggiungi la cartella bin al PATH." }
$createdb = Join-Path (Split-Path $psql) "createdb.exe"
if (-not (Test-Path $createdb)) { throw "createdb.exe non trovato accanto a psql.exe." }

foreach ($value in @($Database, $AppUser, $AdminUser)) {
  if ($value -notmatch "^[A-Za-z_][A-Za-z0-9_-]*$") { throw "Nome PostgreSQL non valido: $value" }
}
if ($AppPassword.Contains("'")) { throw "Per questo script la password applicativa non può contenere apostrofi singoli." }

if (-not $AdminPassword) {
  $AdminPassword = Read-Host "Password PostgreSQL dell'utente $AdminUser" -AsSecureString
}
$credential = New-Object System.Management.Automation.PSCredential($AdminUser, $AdminPassword)
$plainAdminPassword = $credential.GetNetworkCredential().Password
$previousPassword = $env:PGPASSWORD
$env:PGPASSWORD = $plainAdminPassword

try {
  $roleExists = (& $psql -h $Server -p $Port -U $AdminUser -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$AppUser'" 2>&1).ToString().Trim()
  if ($LASTEXITCODE -ne 0) { throw "Connessione PostgreSQL non riuscita: $roleExists" }

  if ($roleExists -eq "1") {
    & $psql -h $Server -p $Port -U $AdminUser -d postgres -v ON_ERROR_STOP=1 -c "ALTER ROLE $AppUser WITH LOGIN PASSWORD '$AppPassword';" | Out-Host
  } else {
    & $psql -h $Server -p $Port -U $AdminUser -d postgres -v ON_ERROR_STOP=1 -c "CREATE ROLE $AppUser WITH LOGIN PASSWORD '$AppPassword';" | Out-Host
  }
  if ($LASTEXITCODE -ne 0) { throw "Impossibile creare o aggiornare il ruolo $AppUser." }

  $databaseExists = (& $psql -h $Server -p $Port -U $AdminUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$Database'" 2>&1).ToString().Trim()
  if ($LASTEXITCODE -ne 0) { throw "Impossibile verificare il database: $databaseExists" }

  if ($databaseExists -ne "1") {
    & $createdb -h $Server -p $Port -U $AdminUser -O $AppUser $Database | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "Impossibile creare il database $Database." }
  }

  Write-Host "PostgreSQL pronto: database '$Database', utente '$AppUser'." -ForegroundColor Green
} finally {
  if ($null -eq $previousPassword) { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
  else { $env:PGPASSWORD = $previousPassword }
  $plainAdminPassword = $null
}
