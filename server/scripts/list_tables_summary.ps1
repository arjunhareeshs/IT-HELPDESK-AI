[CmdletBinding()]
param(
    [string]$EnvFile = "server\.env"
)

$ErrorActionPreference = 'Stop'
$databaseUrl = $null
foreach ($line in Get-Content -LiteralPath $EnvFile) {
    if ($line -match '^\s*DATABASE_URL\s*=\s*["'']?(.*?)["'']?\s*$') {
        $databaseUrl = $Matches[1]
        break
    }
}

$psql = (Get-Command psql).Source

$query = @"
SELECT 
    c.relname AS table_or_view,
    CASE c.relkind 
        WHEN 'r' THEN 'Table'
        WHEN 'v' THEN 'View'
        ELSE c.relkind::text 
    END AS kind,
    count(a.attnum) AS column_count
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'v')
  AND a.attnum > 0
  AND NOT a.attisdropped
GROUP BY c.relname, c.relkind
ORDER BY kind DESC, c.relname;
"@

& $psql --no-psqlrc --set ON_ERROR_STOP=1 --dbname=$databaseUrl --command $query

