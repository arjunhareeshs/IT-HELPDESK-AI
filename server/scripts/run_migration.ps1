[CmdletBinding()]
param(
    [string]$EnvFile = "server\.env",
    [string]$MigrationsDir = "db\migrations",
    # Optionally apply a single file instead of every migration in order
    [string]$SqlFile
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $EnvFile)) {
    throw "Environment file not found: $EnvFile"
}

$files = if ($SqlFile) {
    if (-not (Test-Path -LiteralPath $SqlFile)) { throw "SQL file not found: $SqlFile" }
    @(Get-Item -LiteralPath $SqlFile)
} else {
    if (-not (Test-Path -LiteralPath $MigrationsDir)) { throw "Migrations directory not found: $MigrationsDir" }
    @(Get-ChildItem -LiteralPath $MigrationsDir -Filter '*.sql' | Sort-Object Name)
}

$databaseUrl = $null
foreach ($line in Get-Content -LiteralPath $EnvFile) {
    if ($line -match '^\s*DATABASE_URL\s*=\s*["'']?(.*?)["'']?\s*$') {
        $databaseUrl = $Matches[1]
        break
    }
}

if ([string]::IsNullOrWhiteSpace($databaseUrl)) {
    throw 'DATABASE_URL is not set in the environment file.'
}

$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
    throw 'psql was not found. Install PostgreSQL client tools and add psql to PATH.'
}

$env:PGCONNECT_TIMEOUT = '15'
foreach ($file in $files) {
    Write-Output "Applying migration $($file.Name)..."
    & $psql.Source --no-psqlrc --set ON_ERROR_STOP=1 --dbname=$databaseUrl -f $file.FullName
    if ($LASTEXITCODE -ne 0) {
        throw "Migration $($file.Name) failed with exit code $LASTEXITCODE"
    }
}

Write-Output "`nAll migrations applied successfully!"
