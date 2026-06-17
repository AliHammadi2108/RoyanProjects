# Post-install — calls scripts\setup-windows.ps1 (single source of truth)
#Requires -Version 5.1
param(
  [string] $InstallDir = "",
  [switch] $SkipShortcuts,
  [switch] $InstallAutostart,
  [switch] $DryRun
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

if (-not $InstallDir) {
  $InstallDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
} else {
  $InstallDir = (Resolve-Path $InstallDir).Path
}

function Update-ShellPathFromRegistry {
  $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  if ($machinePath -or $userPath) {
    $env:Path = ($machinePath, $userPath) -join ";"
  }
}

function Test-NodeOk {
  Update-ShellPathFromRegistry
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { return $false }
  try {
    $major = [int](& node -p "process.versions.node.split('.')[0]")
    return ($major -ge 20)
  } catch {
    return $false
  }
}

function Show-NodeDialog {
  param([string]$Message, [switch]$OfferWinget)
  try {
    Add-Type -AssemblyName System.Windows.Forms | Out-Null
    Add-Type -AssemblyName System.Drawing | Out-Null
    if ($OfferWinget -and (Get-Command winget -ErrorAction SilentlyContinue)) {
      $result = [System.Windows.Forms.MessageBox]::Show(
        $Message,
        "نظام المشتريات — Node.js مطلوب",
        [System.Windows.Forms.MessageBoxButtons]::YesNo,
        [System.Windows.Forms.MessageBoxIcon]::Warning
      )
      return ($result -eq [System.Windows.Forms.DialogResult]::Yes)
    }
    [void][System.Windows.Forms.MessageBox]::Show(
      $Message,
      "نظام المشتريات — Node.js مطلوب",
      [System.Windows.Forms.MessageBoxButtons]::OK,
      [System.Windows.Forms.MessageBoxIcon]::Warning
    )
    return $false
  } catch {
    Write-Host $Message
    if ($OfferWinget) {
      $a = Read-Host "تثبيت Node.js عبر winget؟ (Y/N)"
      return ($a -match "^(y|yes|Y|نعم|ن)$")
    }
    return $false
  }
}

function Ensure-NodeForInstall {
  if ($DryRun) {
    Write-Host "[DryRun] Node.js check skipped."
    return $true
  }
  if (Test-NodeOk) { return $true }

  $msg = @"
Node.js 20 LTS أو أحدث مطلوب لتشغيل الإعداد.

• التحميل: https://nodejs.org/
• أو: winget install OpenJS.NodeJS.LTS

هل تريد تثبيت Node.js الآن عبر winget؟
(بعد التثبيت سيُكمل الإعداد تلقائياً)
"@

  $tryWinget = Show-NodeDialog -Message $msg -OfferWinget
  if (-not $tryWinget) {
    Write-Host ""
    Write-Host "ثبّت Node.js ثم شغّل من مجلد التثبيت:" -ForegroundColor Yellow
    Write-Host "  powershell -ExecutionPolicy Bypass -File `"$InstallDir\installer\post-install.ps1`"" -ForegroundColor Gray
    Write-Host "  أو: `"$InstallDir\setup.bat`"" -ForegroundColor Gray
    return $false
  }

  $installScript = Join-Path $InstallDir "scripts\install-node.ps1"
  if (Test-Path $installScript) {
    & powershell -NoProfile -ExecutionPolicy Bypass -File $installScript -AcceptAgreements
  } else {
    & winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
  }
  if ($LASTEXITCODE -ne 0) {
    Write-Host "فشل تثبيت Node.js." -ForegroundColor Red
    return $false
  }

  Update-ShellPathFromRegistry
  Start-Sleep -Seconds 3
  if (-not (Test-NodeOk)) {
    Write-Host "Node.js مثبت لكنه غير ظاهر في PATH. أغلق أي نافذة وافتح post-install.ps1 أو setup.bat مرة أخرى." -ForegroundColor Yellow
    return $false
  }
  return $true
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  إعداد نظام المشتريات (بعد التثبيت)" -ForegroundColor Cyan
Write-Host "  $InstallDir" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan

if (-not (Ensure-NodeForInstall)) { exit 1 }

$setupScript = Join-Path $InstallDir "scripts\setup-windows.ps1"
if (-not (Test-Path $setupScript)) {
  throw "لم يُعثر على: $setupScript"
}

$setupArgs = @(
  "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $setupScript,
  "-ProjectRoot", $InstallDir,
  "-InstallerMode"
)
if ($SkipShortcuts) { $setupArgs += "-SkipShortcuts" }
if ($InstallAutostart) { $setupArgs += "-InstallAutostart" }
if ($DryRun) { $setupArgs += "-DryRun" }

Write-Host "تشغيل: scripts\setup-windows.ps1 ..." -ForegroundColor Cyan
& powershell @setupArgs
exit $LASTEXITCODE