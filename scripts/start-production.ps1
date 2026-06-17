# Production server launcher (used by PM2 and manual runs)
$ErrorActionPreference = "Stop"
$ProjectRoot = "E:\Purchase_Web_System"
Set-Location $ProjectRoot

$logDir = Join-Path $ProjectRoot "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }

$logFile = Join-Path $logDir ("production-{0:yyyy-MM-dd}.log" -f (Get-Date))
function Write-Log([string]$msg) {
  $line = "[{0:yyyy-MM-dd HH:mm:ss}] {1}" -f (Get-Date), $msg
  Add-Content -Path $logFile -Value $line -Encoding UTF8
  Write-Host $line
}

Write-Log "Starting Purchase Web System (production)..."
Write-Log "Working directory: $ProjectRoot"

if (-not (Test-Path (Join-Path $ProjectRoot ".env"))) {
  Write-Log "WARNING: .env not found. Copy .env.example or create .env before production use."
}

if (-not (Test-Path (Join-Path $ProjectRoot ".next"))) {
  Write-Log "ERROR: No production build. Run: npm run build"
  exit 1
}

Write-Log "Running prisma generate..."
& npm run db:generate 2>&1 | ForEach-Object { Write-Log $_ }
if ($LASTEXITCODE -ne 0) { Write-Log "prisma generate failed"; exit $LASTEXITCODE }

$env:PORT = if ($env:PORT) { $env:PORT } else { "3000" }
if (-not $env:NEXTAUTH_URL) { $env:NEXTAUTH_URL = "http://localhost:3000" }

Write-Log "Starting next start on port $env:PORT ..."
& npm run start -- -p $env:PORT 2>&1 | ForEach-Object { Write-Log $_ }
exit $LASTEXITCODE
