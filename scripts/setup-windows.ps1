#Requires -Version 5.1
<#
.SYNOPSIS
  Single source of truth for Purchase Web System setup (dev clone from Git).
.PARAMETER ProjectRoot
  Project directory. Defaults to parent of the scripts folder.
.PARAMETER SkipShortcuts
  Skip desktop / start-menu shortcuts.
.PARAMETER InstallAutostart
  Optionally register PM2 Windows autostart after setup.
.PARAMETER SkipHealthCheck
  Skip post-setup artifact verification.
.PARAMETER DryRun
  Validate prerequisites and paths only; do not modify the system.
#>
[CmdletBinding()]
param(
  [string] $ProjectRoot = "",
  [switch] $SkipShortcuts,
  [switch] $InstallAutostart,
  [switch] $SkipHealthCheck,
  [switch] $DryRun
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ProjectRoot) {
  $ProjectRoot = (Resolve-Path (Join-Path $ScriptDir "..")).Path
} else {
  $ProjectRoot = (Resolve-Path $ProjectRoot).Path
}

# Key runtime packages that must be installed (reports export, print, etc.)
$RequiredNpmPackages = @(
  "xlsx",
  "jspdf",
  "docx",
  "@prisma/client",
  "next",
  "next-auth"
)

$RequiredEnvKeys = @(
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL"
)

function Write-Ar {
  param([string]$Message, [ConsoleColor]$Color = [ConsoleColor]::White)
  Write-Host $Message -ForegroundColor $Color
}

function Test-NodeJs {
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Ar "لم يتم العثور على Node.js." Red
    Write-Ar "ثبّت Node.js 20 LTS من: https://nodejs.org/" Yellow
    return $false
  }
  $major = [int](& node -p "process.versions.node.split('.')[0]")
  if ($major -lt 20) {
    Write-Ar "يتطلب Node.js 20 أو أحدث (الحالي: $(node --version))." Red
    return $false
  }
  Write-Ar "Node.js: $(node --version) | npm: $(npm --version)" Green
  return $true
}

function Invoke-ProjectNpm {
  param([string[]]$NpmArgs, [string]$StepLabel)
  if ($DryRun) {
    Write-Ar "[تجربة] $StepLabel -> npm $($NpmArgs -join ' ')" Gray
    return
  }
  Write-Ar ""
  Write-Ar "--- $StepLabel ---" Cyan
  Push-Location $ProjectRoot
  try {
    & npm @NpmArgs
    if ($LASTEXITCODE -ne 0) {
      throw "فشل npm: $($NpmArgs -join ' ') (رمز $LASTEXITCODE)"
    }
  } finally {
    Pop-Location
  }
}

function Invoke-Prisma {
  param([string]$SubCommand, [string]$StepLabel)
  if ($DryRun) {
    Write-Ar "[تجربة] $StepLabel -> npx prisma $SubCommand" Gray
    return
  }
  Write-Ar ""
  Write-Ar "--- $StepLabel ---" Cyan
  Push-Location $ProjectRoot
  try {
    & npx prisma @($SubCommand -split '\s+')
    if ($LASTEXITCODE -ne 0) {
      throw "فشل prisma $SubCommand"
    }
  } finally {
    Pop-Location
  }
}

function Initialize-EnvFile {
  $envExample = Join-Path $ProjectRoot ".env.example"
  $envFile = Join-Path $ProjectRoot ".env"
  if (-not (Test-Path $envExample)) {
    throw "ملف .env.example غير موجود في $ProjectRoot"
  }
  if ($DryRun) {
    Write-Ar "[تجربة] إعداد .env من .env.example" Gray
    return
  }
  if (-not (Test-Path $envFile)) {
    Copy-Item $envExample $envFile
    $secret = & node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    if ($LASTEXITCODE -eq 0 -and $secret) {
      $content = Get-Content $envFile -Raw -Encoding UTF8
      $content = $content -replace "change-this-to-random-secret-in-production", $secret.Trim()
      Set-Content -Path $envFile -Value $content.TrimEnd() -Encoding UTF8
      Write-Ar "تم إنشاء .env مع NEXTAUTH_SECRET عشوائي." Green
    } else {
      Write-Ar "تم نسخ .env — عيّن NEXTAUTH_SECRET يدوياً." Yellow
    }
  } else {
    Write-Ar "ملف .env موجود مسبقاً — لم يتم تعديله." Green
  }
  $envContent = Get-Content $envFile -Raw -Encoding UTF8
  if ($envContent -notmatch 'NEXTAUTH_URL\s*=') {
    Add-Content -Path $envFile -Value 'NEXTAUTH_URL="http://localhost:3000"' -Encoding UTF8
    Write-Ar "أُضيف NEXTAUTH_URL إلى .env" Yellow
  }
}

function New-SetupShortcuts {
  if ($SkipShortcuts) {
    Write-Ar "تخطي إنشاء الاختصارات (SkipShortcuts)." Gray
    return
  }
  if ($DryRun) {
    Write-Ar "[تجربة] إنشاء اختصار سطح المكتب" Gray
    return
  }
  $wsh = New-Object -ComObject WScript.Shell
  $desktop = [Environment]::GetFolderPath("Desktop")
  $shortcutPath = Join-Path $desktop "نظام المشتريات.lnk"

  $startBat = Join-Path $ProjectRoot "scripts\start-system.bat"
  if (-not (Test-Path $startBat)) {
    Write-Ar "تحذير: لم يُعثر على scripts\start-system.bat" Yellow
    return
  }
  $sc = $wsh.CreateShortcut($shortcutPath)
  $sc.TargetPath = $startBat
  $sc.WorkingDirectory = $ProjectRoot
  $sc.Description = "تشغيل نظام المشتريات على المنفذ 3000"
  $iconDll = Join-Path $env:SystemRoot "System32\imageres.dll"
  if (Test-Path $iconDll) { $sc.IconLocation = "$iconDll,109" }
  $sc.Save()
  Write-Ar "اختصار سطح المكتب: $shortcutPath" Green

}

function Install-Pm2Autostart {
  if (-not $InstallAutostart) { return }
  if ($DryRun) {
    Write-Ar "[تجربة] تثبيت PM2 autostart" Gray
    return
  }
  $autostartScript = Join-Path $ProjectRoot "scripts\install-autostart.ps1"
  if (-not (Test-Path $autostartScript)) {
    Write-Ar "تحذير: install-autostart.ps1 غير موجود — تخطي PM2." Yellow
    return
  }
  Write-Ar ""
  Write-Ar "--- تثبيت التشغيل التلقائي (PM2) ---" Cyan
  Write-Ar "قد يتطلب صلاحيات مسؤول — شغّل يدوياً إن فشل:" Yellow
  Write-Ar "  powershell -ExecutionPolicy Bypass -File scripts\install-autostart.ps1" Gray
  try {
    & powershell -NoProfile -ExecutionPolicy Bypass -File $autostartScript
  } catch {
    Write-Ar "تعذّر تثبيت PM2 تلقائياً: $($_.Exception.Message)" Yellow
  }
}

function Test-SetupArtifacts {
  param([switch]$Strict)
  $failures = @()

  $envFile = Join-Path $ProjectRoot ".env"
  if (-not (Test-Path $envFile)) {
    $failures += ".env غير موجود"
  } else {
    $envText = Get-Content $envFile -Raw -Encoding UTF8
    foreach ($key in $RequiredEnvKeys) {
      if ($envText -notmatch "(?m)^\s*$key\s*=") {
        $failures += "متغير البيئة $key مفقود في .env"
      }
    }
    if ($envText -match 'change-this-to-random-secret-in-production') {
      $failures += "NEXTAUTH_SECRET لا يزال القيمة الافتراضية"
    }
  }

  $nodeModules = Join-Path $ProjectRoot "node_modules"
  if (-not (Test-Path $nodeModules)) {
    $failures += "node_modules غير موجود"
  } else {
    foreach ($pkg in $RequiredNpmPackages) {
      $pkgPath = Join-Path $nodeModules $pkg
      if (-not (Test-Path $pkgPath)) {
        $failures += "حزمة npm مفقودة: $pkg"
      }
    }
  }

  $prismaClient = Join-Path $ProjectRoot "node_modules\.prisma\client"
  if (-not (Test-Path $prismaClient)) {
    $failures += "Prisma Client غير مُولَّد"
  }

  $nextBuild = Join-Path $ProjectRoot ".next\BUILD_ID"
  if (-not (Test-Path $nextBuild)) {
    $failures += "بناء Next.js (.next) غير موجود"
  }

  $dbCandidates = @(
    (Join-Path $ProjectRoot "prisma\dev.db"),
    (Join-Path $ProjectRoot "dev.db")
  )
  $dbUrl = $null
  if (Test-Path $envFile) {
    $line = Get-Content $envFile | Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } | Select-Object -First 1
    if ($line -match 'file:\./(.+)"') {
      $dbCandidates = @((Join-Path $ProjectRoot "prisma\$($Matches[1].Trim('\"'))")) + $dbCandidates
    }
  }
  $dbFound = $false
  foreach ($db in $dbCandidates) {
    if (Test-Path $db) { $dbFound = $true; break }
  }
  if (-not $dbFound) {
    $failures += "ملف قاعدة البيانات SQLite غير موجود بعد db:push/seed"
  }

  if ($failures.Count -gt 0) {
    foreach ($f in $failures) { Write-Ar "  ✗ $f" Red }
    if ($Strict) { throw "فشل التحقق من الإعداد ($($failures.Count) مشكلة)" }
    return $false
  }

  Write-Ar "  ✓ .env و NEXTAUTH" Green
  Write-Ar "  ✓ npm (xlsx, jspdf, docx, prisma, next)" Green
  Write-Ar "  ✓ Prisma Client + قاعدة البيانات + build" Green
  return $true
}

# --- Main ---
Write-Ar "========================================" Cyan
Write-Ar "  تثبيت نظام المشتريات" Cyan
if ($DryRun) { Write-Ar "  [وضع التجربة — DryRun]" Yellow }
Write-Ar "  المسار: $ProjectRoot" Gray
Write-Ar "========================================" Cyan

Write-Ar ""
Write-Ar "[1/9] التحقق من Node.js..." Yellow
if (-not (Test-NodeJs)) { exit 1 }

Write-Ar ""
Write-Ar "[2/9] إعداد ملف البيئة .env..." Yellow
Initialize-EnvFile

Invoke-ProjectNpm -NpmArgs @("install") -StepLabel "[3/9] تثبيت الحزم (npm install — جميع التبعيات)"
Invoke-Prisma -SubCommand "generate" -StepLabel "[4/9] توليد عميل Prisma (prisma generate)"
Invoke-ProjectNpm -NpmArgs @("run", "db:push") -StepLabel "[5/9] قاعدة البيانات (prisma db push)"
Invoke-ProjectNpm -NpmArgs @("run", "db:seed") -StepLabel "[6/9] البيانات الأولية (db:seed — صلاحيات، ثيم، مستخدم)"
Invoke-ProjectNpm -NpmArgs @("run", "build") -StepLabel "[7/9] بناء الإنتاج (npm run build)"

if (-not $DryRun) {
  $logsDir = Join-Path $ProjectRoot "logs"
  if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir | Out-Null }
}

Write-Ar ""
Write-Ar "[8/9] إنشاء الاختصارات..." Yellow
New-SetupShortcuts

Write-Ar ""
Write-Ar "[9/9] التحقق من الإعداد..." Yellow
if (-not $SkipHealthCheck) {
  if ($DryRun) {
    Write-Ar "[تجربة] سيتم التحقق من الملفات بعد التثبيت الفعلي." Gray
  } else {
    $ok = Test-SetupArtifacts
    if (-not $ok) {
      Write-Ar "تحذير: بعض عناصر التحقق ناقصة — راجع الرسائل أعلاه." Yellow
    }
  }
} else {
  Write-Ar "تخطي التحقق (SkipHealthCheck)." Gray
}

Install-Pm2Autostart

Write-Ar ""
Write-Ar "========================================" Green
Write-Ar "  اكتمل التثبيت." Green
Write-Ar "  URL: http://localhost:3000" Green
Write-Ar "  بعد seed: admin / admin123" Green
  Write-Ar "  شغّل: اختصار «نظام المشتريات» أو scripts\start-system.bat" Green

Write-Ar "  PM2 اختياري: scripts\install-autostart.ps1 (كمسؤول)" Gray
Write-Ar "========================================" Green
exit 0

