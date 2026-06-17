# Post-install wrapper — delegates to scripts\setup-windows.ps1 (single source of truth)
param(
  [Parameter(Mandatory = $false)]
  [string] $InstallDir = "",
  [switch] $SkipShortcuts,
  [switch] $InstallAutostart,
  [switch] $DryRun
)

$ErrorActionPreference = 'Stop'

if (-not $InstallDir) {
  $InstallDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
} else {
  $InstallDir = (Resolve-Path $InstallDir).Path
}

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

if (-not $DryRun) {
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Show-NodeRequiredMessage
    exit 1
  }
  $major = [int](node -p "process.versions.node.split('.')[0]")
  if ($major -lt 20) {
    Show-NodeRequiredMessage
    exit 1
  }
}

$setupScript = Join-Path $InstallDir 'scripts\setup-windows.ps1'
if (-not (Test-Path $setupScript)) {
  throw "setup script not found: $setupScript"
}

$setupArgs = @(
  '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $setupScript,
  '-ProjectRoot', $InstallDir,
  '-InstallerMode'
)
if ($SkipShortcuts) { $setupArgs += '-SkipShortcuts' }
if ($InstallAutostart) { $setupArgs += '-InstallAutostart' }
if ($DryRun) { $setupArgs += '-DryRun' }

Write-Host "Running unified setup: scripts\setup-windows.ps1 -InstallerMode"
& powershell @setupArgs
exit $LASTEXITCODE
