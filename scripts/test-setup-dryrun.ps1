#Requires -Version 5.1
<#
.SYNOPSIS
  Dry-run validation for setup scripts (no npm install / build).
#>
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Resolve-Path (Join-Path $ScriptDir "..")).Path

$failures = @()

function Assert-FileExists([string]$Path, [string]$Label) {
  if (-not (Test-Path $Path)) {
    $script:failures += "Missing $Label : $Path"
    return $false
  }
  return $true
}

Write-Host "=== Setup dry-run checks ===" -ForegroundColor Cyan
Write-Host "Project: $ProjectRoot`n"

$requiredFiles = @(
  @{ Path = "setup.bat"; Label = "setup.bat" },
  @{ Path = "scripts\setup-windows.ps1"; Label = "setup-windows.ps1" },
  @{ Path = "installer\post-install.ps1"; Label = "post-install.ps1" },
  @{ Path = "installer\start-installed.bat"; Label = "start-installed.bat" },
  @{ Path = "installer\build-installer.ps1"; Label = "build-installer.ps1" },
  @{ Path = "scripts\install-autostart.ps1"; Label = "install-autostart.ps1" },
  @{ Path = "scripts\restart-system.bat"; Label = "restart-system.bat" },
  @{ Path = "scripts\health-check.ps1"; Label = "health-check.ps1" },
  @{ Path = ".env.example"; Label = ".env.example" },
  @{ Path = "package.json"; Label = "package.json" },
  @{ Path = "prisma\schema.prisma"; Label = "schema.prisma" },
  @{ Path = "prisma\seed.ts"; Label = "seed.ts" }
)

foreach ($f in $requiredFiles) {
  $full = Join-Path $ProjectRoot $f.Path
  if (Assert-FileExists $full $f.Label) {
    Write-Host "  OK $($f.Label)" -ForegroundColor Green
  } else {
    Write-Host "  FAIL $($f.Label)" -ForegroundColor Red
  }
}

$setupBat = Get-Content (Join-Path $ProjectRoot "setup.bat") -Raw
if ($setupBat -notmatch 'setup-windows\.ps1') {
  $failures += "setup.bat does not call setup-windows.ps1"
  Write-Host "  FAIL setup.bat delegation" -ForegroundColor Red
} else {
  Write-Host "  OK setup.bat -> setup-windows.ps1" -ForegroundColor Green
}

$postInstall = Get-Content (Join-Path $ProjectRoot "installer\post-install.ps1") -Raw
if ($postInstall -notmatch 'setup-windows\.ps1') {
  $failures += "post-install.ps1 does not call setup-windows.ps1"
  Write-Host "  FAIL post-install delegation" -ForegroundColor Red
} else {
  Write-Host "  OK post-install -> setup-windows.ps1" -ForegroundColor Green
}

$pkg = Get-Content (Join-Path $ProjectRoot "package.json") -Raw | ConvertFrom-Json
foreach ($script in @("db:push", "db:seed", "build", "db:generate")) {
  if (-not $pkg.scripts.PSObject.Properties.Name.Contains($script)) {
    $failures += "package.json missing script: $script"
    Write-Host "  FAIL npm script: $script" -ForegroundColor Red
  } else {
    Write-Host "  OK npm script: $script" -ForegroundColor Green
  }
}

$envEx = Get-Content (Join-Path $ProjectRoot ".env.example") -Raw
foreach ($key in @("DATABASE_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL")) {
  if ($envEx -notmatch $key) {
    $failures += ".env.example missing $key"
    Write-Host "  FAIL .env.example: $key" -ForegroundColor Red
  } else {
    Write-Host "  OK .env.example: $key" -ForegroundColor Green
  }
}

Write-Host "`n--- Running setup-windows.ps1 -DryRun ---" -ForegroundColor Cyan
$setupScript = Join-Path $ProjectRoot "scripts\setup-windows.ps1"
& powershell -NoProfile -ExecutionPolicy Bypass -File $setupScript -DryRun -SkipHealthCheck
if ($LASTEXITCODE -ne 0) {
  $failures += "setup-windows.ps1 -DryRun failed with exit $LASTEXITCODE"
}

Write-Host ""
if ($failures.Count -gt 0) {
  Write-Host "FAILED ($($failures.Count) issues):" -ForegroundColor Red
  $failures | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
  exit 1
}

Write-Host "All dry-run checks passed." -ForegroundColor Green
exit 0
