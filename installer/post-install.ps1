# Post-install setup for Purchase Web System (after MSI/EXE install)
param(
  [Parameter(Mandatory = $false)]
  [string] $InstallDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [switch] $SkipShortcuts
)

$ErrorActionPreference = 'Stop'
Set-Location $InstallDir

function Show-NodeRequiredMessage {
  try {
    Add-Type -AssemblyName System.Windows.Forms | Out-Null
    [void][System.Windows.Forms.MessageBox]::Show(
      "Node.js 20 LTS or newer is required.`n`nDownload: https://nodejs.org/`n`nAfter installing Node.js, run:`n  installer\post-install.ps1",
      'Purchase Web System - Node.js required',
      [System.Windows.Forms.MessageBoxButtons]::OK,
      [System.Windows.Forms.MessageBoxIcon]::Warning
    )
  } catch {
    Write-Host 'Node.js 20+ required: https://nodejs.org/'
  }
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Show-NodeRequiredMessage
  exit 1
}

$major = [int](node -p "process.versions.node.split('.')[0]")
if ($major -lt 20) {
  Show-NodeRequiredMessage
  exit 1
}

Write-Host 'Installing npm dependencies (may take several minutes)...'
npm install --production=false
if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }

$envExample = Join-Path $InstallDir '.env.example'
$envFile = Join-Path $InstallDir '.env'
if (-not (Test-Path $envFile) -and (Test-Path $envExample)) {
  Copy-Item $envExample $envFile
  Write-Host 'Created .env from .env.example — change NEXTAUTH_SECRET for production.'
}

Write-Host 'Prisma generate...'
npm run db:generate
if ($LASTEXITCODE -ne 0) { throw 'prisma generate failed' }

Write-Host 'Database push...'
npm run db:push
if ($LASTEXITCODE -ne 0) { throw 'prisma db push failed' }

Write-Host 'Seeding database...'
npm run db:seed
if ($LASTEXITCODE -ne 0) { throw 'db seed failed' }

Write-Host 'Building Next.js...'
npm run build
if ($LASTEXITCODE -ne 0) { throw 'npm run build failed' }

if (-not $SkipShortcuts) {
  $batPath = Join-Path $InstallDir 'installer\start-installed.bat'
  $wsh = New-Object -ComObject WScript.Shell
  $desktop = [Environment]::GetFolderPath('Desktop')
  $shortcutPath = Join-Path $desktop 'نظام المشتريات.lnk'
  $sc = $wsh.CreateShortcut($shortcutPath)
  $sc.TargetPath = $batPath
  $sc.WorkingDirectory = $InstallDir
  $sc.Description = 'Purchase Web System'
  $sc.Save()
  Write-Host "Desktop shortcut: $shortcutPath"

  $startMenuDir = Join-Path ([Environment]::GetFolderPath('Programs')) 'PurchaseWebSystem'
  New-Item -ItemType Directory -Force -Path $startMenuDir | Out-Null
  $menuScPath = Join-Path $startMenuDir 'نظام المشتريات.lnk'
  $sc2 = $wsh.CreateShortcut($menuScPath)
  $sc2.TargetPath = $batPath
  $sc2.WorkingDirectory = $InstallDir
  $sc2.Description = 'Purchase Web System'
  $sc2.Save()
  Write-Host "Start menu: $menuScPath"
}

Write-Host ''
Write-Host 'Setup complete. Run installer\start-installed.bat or the desktop shortcut.'
Write-Host 'Default login after seed: admin / admin123'
