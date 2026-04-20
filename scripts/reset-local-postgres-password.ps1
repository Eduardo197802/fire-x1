$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $projectRoot ".env"
$serviceName = "postgresql-x64-17"
$dataDir = "C:\Program Files\PostgreSQL\17\data"
$hbaPath = Join-Path $dataDir "pg_hba.conf"
$psqlPath = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
$createdbPath = "C:\Program Files\PostgreSQL\17\bin\createdb.exe"

if (-not (Test-Path -LiteralPath $envPath)) {
  throw ".env nao encontrado em $envPath"
}

if (-not (Test-Path -LiteralPath $hbaPath)) {
  throw "pg_hba.conf nao encontrado em $hbaPath"
}

$envLines = Get-Content -LiteralPath $envPath
$dbPassword = (($envLines | Where-Object { $_ -match "^DB_PASSWORD=" } | Select-Object -First 1) -replace "^DB_PASSWORD=", "")
$dbName = (($envLines | Where-Object { $_ -match "^DB_NAME=" } | Select-Object -First 1) -replace "^DB_NAME=", "")

if (-not $dbPassword) {
  throw "DB_PASSWORD ausente no .env"
}

if (-not $dbName) {
  $dbName = "firex1db"
}

$backupPath = Join-Path $dataDir ("pg_hba.conf.codex-backup-" + (Get-Date -Format "yyyyMMddHHmmss"))
$originalHba = Get-Content -LiteralPath $hbaPath -Raw

Copy-Item -LiteralPath $hbaPath -Destination $backupPath -Force

try {
  $temporaryTrust = "# Codex temporary local trust for password reset`r`nhost all all 127.0.0.1/32 trust`r`nhost all all ::1/128 trust`r`n"
  Set-Content -LiteralPath $hbaPath -Value ($temporaryTrust + $originalHba) -Encoding ascii

  Restart-Service -Name $serviceName -Force
  Start-Sleep -Seconds 4

  $sqlPassword = $dbPassword.Replace("'", "''")
  & $psqlPath -h 127.0.0.1 -U postgres -d postgres -v ON_ERROR_STOP=1 -c "ALTER USER postgres WITH PASSWORD '$sqlPassword';"

  $safeDbName = $dbName.Replace("'", "''")
  $existsOutput = & $psqlPath -h 127.0.0.1 -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$safeDbName';"
  $exists = String($existsOutput).Trim()

  if ($exists -ne "1") {
    $env:PGPASSWORD = $dbPassword
    & $createdbPath -h 127.0.0.1 -U postgres $dbName
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
  }
}
finally {
  Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
  Set-Content -LiteralPath $hbaPath -Value $originalHba -Encoding ascii
  Restart-Service -Name $serviceName -Force
  Start-Sleep -Seconds 4
}

Write-Output "PostgreSQL local alinhado ao .env e pg_hba.conf restaurado."
