<#
.SYNOPSIS
    Verifies the configured PostgreSQL/Supabase database and prints its schema.

.DESCRIPTION
    Reads DATABASE_URL from server/.env, connects with psql, and returns every
    user table in the public schema with each column's type, nullability,
    default, and primary-key status. Credentials are never written to output.
#>

[CmdletBinding()]
param(
    [string]$EnvFile = (Join-Path $PSScriptRoot '..\.env')
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $EnvFile)) {
    throw "Environment file not found: $EnvFile"
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

$schemaQuery = @'
WITH public_tables AS (
    SELECT c.oid, c.relname AS table_name
    FROM pg_catalog.pg_class AS c
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
), primary_key_columns AS (
    SELECT con.conrelid, att.attname
    FROM pg_catalog.pg_constraint AS con
    JOIN pg_catalog.pg_attribute AS att
      ON att.attrelid = con.conrelid
     AND att.attnum = ANY (con.conkey)
    WHERE con.contype = 'p'
)
SELECT
    t.table_name AS "table",
    a.attnum AS "position",
    a.attname AS "column",
    pg_catalog.format_type(a.atttypid, a.atttypmod) AS "data_type",
    CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END AS "nullable",
    COALESCE(pg_catalog.pg_get_expr(d.adbin, d.adrelid), '') AS "default",
    CASE WHEN pk.attname IS NULL THEN 'NO' ELSE 'YES' END AS "primary_key"
FROM public_tables AS t
JOIN pg_catalog.pg_attribute AS a
  ON a.attrelid = t.oid
LEFT JOIN pg_catalog.pg_attrdef AS d
  ON d.adrelid = a.attrelid
 AND d.adnum = a.attnum
LEFT JOIN primary_key_columns AS pk
  ON pk.conrelid = t.oid
 AND pk.attname = a.attname
WHERE a.attnum > 0
  AND NOT a.attisdropped
ORDER BY t.table_name, a.attnum;
'@

$previousTimeout = $env:PGCONNECT_TIMEOUT
$env:PGCONNECT_TIMEOUT = '10'

try {
    Write-Output 'Checking Supabase/PostgreSQL connection...'
    & $psql.Source --no-psqlrc --set ON_ERROR_STOP=1 --dbname=$databaseUrl --command 'SELECT 1 AS connection_ok;' | Out-Host
    if ($LASTEXITCODE -ne 0) {
        throw "Database connection failed (psql exited with code $LASTEXITCODE). Check that DATABASE_URL has a current Supabase host and valid credentials."
    }

    Write-Output "`nPublic-schema tables and columns:"
    & $psql.Source --no-psqlrc --set ON_ERROR_STOP=1 --pset border=2 --pset null='(none)' --dbname=$databaseUrl --command $schemaQuery
    if ($LASTEXITCODE -ne 0) {
        throw "psql exited with code $LASTEXITCODE."
    }
}
finally {
    if ($null -eq $previousTimeout) {
        Remove-Item Env:PGCONNECT_TIMEOUT -ErrorAction SilentlyContinue
    }
    else {
        $env:PGCONNECT_TIMEOUT = $previousTimeout
    }
}
