#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Installs Purchase Web System to start automatically on Windows (PM2 + startup).
.DESCRIPTION
  Run setup first: setup.bat or scripts\setup-windows.ps1
  Then run PowerShell as Administrator:
  .\scripts\install-autostart.ps1
#>
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Resolve-Path (Join-Path $ScriptDir "..")).Path
Set-Location $ProjectRoot

if (-not (Test-Path (Join-Path $ProjectRoot ".env"))) {
  throw "ملف .env غير موجود. شغّل setup.bat أولاً."
}
if (-not (Test-Path (Join-Path $ProjectRoot ".next\BUILD_ID"))) {
  throw "لا يوجد build (.next). شغّل setup.bat أولاً."
}

$logDir = Join-Path $ProjectRoot "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$ecoPath = Join-Path $ProjectRoot "ecosystem.config.cjs"
if (-not (Test-Path $ecoPath)) {
  $ecoPath = Join-Path $ProjectRoot "scripts\ecosystem.config.cjs"
}
if (-not (Test-Path $ecoPath)) {
  throw "ecosystem.config.cjs غير موجود"
}

function Free-Port3000 {
  $conns = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
  foreach ($c in $conns) {
    if ($c.OwningProcess -gt 0) {
      Write-Host "Stopping process on port 3000 (PID $($c.OwningProcess))..."
      Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
    }
  }
}

Write-Host "=== Purchase Web System - Auto-start install ===" -ForegroundColor Cyan

$pm2Cmd = Get-Command pm2 -ErrorAction SilentlyContinue
if (-not $pm2Cmd) {
  Write-Host "Installing PM2 globally..."
  npm install -g pm2 pm2-windows-startup
}

Write-Host "Prisma generate..."
npm run db:generate
if ($LASTEXITCODE -ne 0) { throw "prisma generate failed" }

if (-not (Test-Path (Join-Path $ProjectRoot ".next"))) {
  Write-Host "Building production (npm run build)..."
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "build failed" }
}

Free-Port3000
Write-Host "Configuring PM2..."
pm2 delete purchase-web-system 2>$null
pm2 start $ecoPath
pm2 save

$startupCmd = Get-Command pm2-startup -ErrorAction SilentlyContinue
if ($startupCmd) {
  Write-Host "Registering PM2 Windows startup (may require reboot)..."
  pm2-startup install
} else {
  Write-Host "pm2-startup not found; creating Scheduled Task fallback..."
  $taskName = "PurchaseWebSystem-PM2"
  $tr = "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command `"cd '$ProjectRoot'; pm2 resurrect`""
  schtasks /Delete /TN $taskName /F 2>$null
  schtasks /Create /TN $taskName /TR $tr /SC ONLOGON /RL HIGHEST /F | Out-Null
}

# Backup: logon task starts server if PM2 empty
$taskName2 = "PurchaseWebSystem-Start"
$ps1 = Join-Path $ProjectRoot "scripts\start-production.ps1"
$tr2 = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$ps1`""
schtasks /Delete /TN $taskName2 /F 2>$null
# Only create if user wants - actually PM2 handles it. Skip duplicate to avoid double port bind.

Write-Host ""
Write-Host "Done. App should be at http://localhost:3000" -ForegroundColor Green
Write-Host "PM2: pm2 status | pm2 logs purchase-web-system | pm2 restart purchase-web-system"

