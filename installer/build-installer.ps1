# Build Purchase Web System MSI (WiX) or EXE (Inno Setup)
# Run from repo root or installer folder: .\installer\build-installer.ps1

[CmdletBinding()]
param(
  [switch] $SkipStage,
  [switch] $PreferWix
)

$ErrorActionPreference = 'Stop'
$InstallerRoot = $PSScriptRoot
$ProjectRoot = (Resolve-Path (Join-Path $InstallerRoot '..')).Path
$StageRoot = Join-Path $InstallerRoot 'staging\app'
$DistDir = Join-Path $InstallerRoot 'dist'

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }

function Invoke-StageProject {
  Write-Step 'Staging project files (excluding node_modules, .next, .git, secrets)...'
  if (Test-Path $StageRoot) {
    Remove-Item -LiteralPath $StageRoot -Recurse -Force
  }
  New-Item -ItemType Directory -Force -Path $StageRoot | Out-Null

  $excludeDirs = @(
    'node_modules', '.next', '.git', 'installer\dist', 'installer\staging'
  )
  $xd = ($excludeDirs | ForEach-Object { Join-Path $ProjectRoot $_ }) -join ' '

  $robolog = Join-Path $InstallerRoot 'staging\robocopy.log'
  $null = robocopy $ProjectRoot $StageRoot /MIR /NFL /NDL /NJH /NJS /NP `
    /XD node_modules .next .git (Join-Path $InstallerRoot 'dist') (Join-Path $InstallerRoot 'staging') (Join-Path $InstallerRoot 'obj') `
    /XF .env dev.db prisma\dev.db *.log

  if ($LASTEXITCODE -ge 8) { throw "robocopy failed with exit code $LASTEXITCODE" }

  # Ensure installer helpers exist in staged copy (setup core lives in scripts/setup-windows.ps1 via robocopy)
  $helperFiles = @('post-install.ps1', 'start-installed.bat', 'PurchaseSystem.iss', 'PurchaseSystem.wxs', 'build-installer.ps1', 'README.md')
  foreach ($f in $helperFiles) {
    $src = Join-Path $InstallerRoot $f
    if (Test-Path $src) {
      Copy-Item $src (Join-Path $StageRoot "installer\$f") -Force
    }
  }
  Copy-Item (Join-Path $InstallerRoot 'assets') (Join-Path $StageRoot 'installer\assets') -Recurse -Force -ErrorAction SilentlyContinue

  Write-Host "Staged to: $StageRoot"
}

function Find-Tool($names) {
  foreach ($n in $names) {
    $c = Get-Command $n -ErrorAction SilentlyContinue
    if ($c) { return $c.Source }
  }
  $paths = @(
    "${env:ProgramFiles(x86)}\WiX Toolset v3.11\bin",
    "${env:ProgramFiles}\WiX Toolset v3.14\bin",
    "${env:ProgramFiles(x86)}\WiX Toolset v3.14\bin",
    "${env:ProgramFiles(x86)}\Inno Setup 6",
    "${env:ProgramFiles(x86)}\Inno Setup 7",
    "$env:LOCALAPPDATA\Programs\Inno Setup 6"
  )
  foreach ($p in $paths) {
    foreach ($n in $names) {
      $full = Join-Path $p "$n.exe"
      if (Test-Path $full) { return $full }
    }
  }
  return $null
}

function Build-WixInstaller {
  $heat = Find-Tool @('heat')
  $candle = Find-Tool @('candle')
  $light = Find-Tool @('light')
  if (-not ($heat -and $candle -and $light)) {
    return $false
  }

  Write-Step 'Building MSI with WiX Toolset...'
  $generated = Join-Path $InstallerRoot 'ProductComponents.wxs'
  $wxsMain = Join-Path $InstallerRoot 'PurchaseSystem.wxs'
  $objDir = Join-Path $InstallerRoot 'obj'
  New-Item -ItemType Directory -Force -Path $objDir, $DistDir | Out-Null

  $sourceVar = $StageRoot
  & $heat dir $StageRoot `
    -cg ProductComponents `
    -dr INSTALLFOLDER `
    -gg -g1 -sfrag -srd `
    -var var.SourceDir `
    -out $generated

  if ($LASTEXITCODE -ne 0) { throw 'heat failed' }

  $candleArgs = @(
    '-nologo', '-ext', 'WixUIExtension', '-ext', 'WixUtilExtension',
    "-dSourceDir=$sourceVar",
    "-dInstallerRoot=$InstallerRoot",
    '-out', (Join-Path $objDir '\'),
    $wxsMain, $generated
  )
  & $candle @candleArgs
  if ($LASTEXITCODE -ne 0) { throw 'candle failed' }

  $wixobjMain = Join-Path $objDir 'PurchaseSystem.wixobj'
  $wixobjComp = Join-Path $objDir 'ProductComponents.wixobj'
  $msiOut = Join-Path $DistDir 'PurchaseSystem-Setup.msi'

  & $light -nologo -ext WixUIExtension -ext WixUtilExtension `
    -out $msiOut $wixobjMain $wixobjComp
  if ($LASTEXITCODE -ne 0) { throw 'light failed' }

  Write-Host "MSI created: $msiOut" -ForegroundColor Green
  return $true
}

function Build-InnoInstaller {
  $iscc = Find-Tool @('ISCC', 'iscc')
  if (-not $iscc) { return $false }

  Write-Step 'Building EXE with Inno Setup...'
  New-Item -ItemType Directory -Force -Path $DistDir | Out-Null
  $iss = Join-Path $InstallerRoot 'PurchaseSystem.iss'
  Push-Location $InstallerRoot
  try {
    & $iscc $iss
    if ($LASTEXITCODE -ne 0) { throw 'iscc failed' }
  } finally {
    Pop-Location
  }

  $exe = Join-Path $DistDir 'PurchaseSystem-Setup.exe'
  if (-not (Test-Path $exe)) {
    throw "Expected output not found: $exe"
  }
  Write-Host "Setup EXE created: $exe" -ForegroundColor Green
  return $true
}

if (-not $SkipStage) { Invoke-StageProject }

$built = $false
if (-not $PreferInno) {
  $built = Build-WixInstaller
}
if (-not $built) {
  $built = Build-InnoInstaller
}

if (-not $built) {
  Write-Host ''
  Write-Host 'Neither WiX (heat/candle/light) nor Inno Setup (iscc) was found.' -ForegroundColor Yellow
  Write-Host 'Install one of:' -ForegroundColor Yellow
  Write-Host '  winget install WiXToolset.WiXToolset'
  Write-Host '  winget install JRSoftware.InnoSetup'
  Write-Host 'Staging folder is ready; re-run this script after installing a tool.'
  exit 2
}

Write-Host "`nDone. Give end users the file in installer\dist\" -ForegroundColor Green


