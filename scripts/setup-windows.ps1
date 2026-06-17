#Requires -Version 5.1
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Resolve-Path (Join-Path $ScriptDir "..")).Path

function Write-Ar {
  param([string]$Message, [ConsoleColor]$Color = [ConsoleColor]::White)
  Write-Host $Message -ForegroundColor $Color
}

function Invoke-ProjectNpm {
  param([string[]]$NpmArgs, [string]$StepLabel)
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

Write-Ar "========================================" Cyan
Write-Ar "  تثبيت نظام المشتريات" Cyan
Write-Ar "  المسار: $ProjectRoot" Gray
Write-Ar "========================================" Cyan

Write-Ar ""
Write-Ar "[1/8] التحقق من Node.js..." Yellow
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Ar "لم يتم العثور على Node.js." Red
  Write-Ar "ثبّت Node.js 20 LTS من: https://nodejs.org/" Yellow
  Write-Ar "بعد التثبيت أعد تشغيل setup.bat" Yellow
  exit 1
}
$nodeVer = & node --version
$npmVer = & npm --version
Write-Ar "Node.js: $nodeVer | npm: $npmVer" Green

Set-Location $ProjectRoot
$envExample = Join-Path $ProjectRoot ".env.example"
$envFile = Join-Path $ProjectRoot ".env"
if (-not (Test-Path $envExample)) {
  Write-Ar "ملف .env.example غير موجود." Red
  exit 1
}

Write-Ar ""
Write-Ar "[2/8] إعداد ملف البيئة .env..." Yellow
if (-not (Test-Path $envFile)) {
  Copy-Item $envExample $envFile
  $secret = & node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  if ($LASTEXITCODE -eq 0 -and $secret) {
    $content = Get-Content $envFile -Raw -Encoding UTF8
    $content = $content -replace "change-this-to-random-secret-in-production", $secret.Trim()
    Set-Content -Path $envFile -Value $content.TrimEnd() -Encoding UTF8
    Write-Ar "تم إنشاء .env مع مفتاح NEXTAUTH_SECRET عشوائي." Green
  } else {
    Write-Ar "تم نسخ .env — عيّن NEXTAUTH_SECRET يدوياً." Yellow
  }
} else {
  Write-Ar "ملف .env موجود مسبقاً — لم يتم تعديله." Green
}

Invoke-ProjectNpm -NpmArgs @("install") -StepLabel "[3/8] تثبيت الحزم (npm install)"

Write-Ar ""
Write-Ar "[4/8] توليد عميل Prisma..." Yellow
Push-Location $ProjectRoot
try {
  & npx prisma generate
  if ($LASTEXITCODE -ne 0) { throw "فشل prisma generate" }
} finally {
  Pop-Location
}

Invoke-ProjectNpm -NpmArgs @("run", "db:push") -StepLabel "[5/8] قاعدة البيانات (db:push)"
Invoke-ProjectNpm -NpmArgs @("run", "db:seed") -StepLabel "[6/8] البيانات الأولية (db:seed)"
Invoke-ProjectNpm -NpmArgs @("run", "build") -StepLabel "[7/8] بناء الإنتاج (npm run build)"

Write-Ar ""
Write-Ar "[8/8] إنشاء اختصار سطح المكتب..." Yellow
$startBat = Join-Path $ProjectRoot "scripts\start-system.bat"
if (-not (Test-Path $startBat)) {
  Write-Ar "تحذير: لم يُعثر على start-system.bat" Yellow
} else {
  $desktop = [Environment]::GetFolderPath("Desktop")
  $shortcutPath = Join-Path $desktop "نظام المشتريات.lnk"
  $wsh = New-Object -ComObject WScript.Shell
  $sc = $wsh.CreateShortcut($shortcutPath)
  $sc.TargetPath = $startBat
  $sc.WorkingDirectory = $ProjectRoot
  $sc.Description = "تشغيل نظام المشتريات على المنفذ 3000"
  $iconDll = Join-Path $env:SystemRoot "System32\imageres.dll"
  if (Test-Path $iconDll) { $sc.IconLocation = "$iconDll,109" }
  $sc.Save()
  Write-Ar "تم إنشاء الاختصار: $shortcutPath" Green
}

$logsDir = Join-Path $ProjectRoot "logs"
if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir | Out-Null }

Write-Ar ""
Write-Ar "========================================" Green
Write-Ar "  اكتمل التثبيت." Green
Write-Ar "  شغّل النظام من اختصار «نظام المشتريات» على سطح المكتب." Green
Write-Ar "========================================" Green
exit 0
