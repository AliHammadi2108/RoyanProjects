#Requires -Version 5.1
<#
.SYNOPSIS
  Installs Node.js LTS via winget (OpenJS.NodeJS.LTS).
.DESCRIPTION
  Helper for Purchase Web System setup when Node.js is not installed.
  After install, close and reopen the terminal, then run setup.bat from project root.
#>
[CmdletBinding()]
param(
  [switch] $AcceptAgreements
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

function Write-Ar {
  param([string]$Message, [ConsoleColor]$Color = [ConsoleColor]::White)
  Write-Host $Message -ForegroundColor $Color
}

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
  Write-Ar "winget غير متوفر على هذا الجهاز." Red
  Write-Ar "ثبّت Node.js 20 LTS يدوياً من: https://nodejs.org/" Yellow
  Write-Ar "ثم شغّل setup.bat من جذر المشروع." Yellow
  exit 1
}

Write-Ar "تثبيت Node.js LTS عبر winget (OpenJS.NodeJS.LTS)..." Cyan
$wingetArgs = @(
  "install",
  "--id", "OpenJS.NodeJS.LTS",
  "-e",
  "--accept-source-agreements",
  "--accept-package-agreements"
)
if (-not $AcceptAgreements) {
  $wingetArgs = @("install", "--id", "OpenJS.NodeJS.LTS", "-e")
}

& winget @wingetArgs
$code = $LASTEXITCODE
if ($code -ne 0) {
  Write-Ar "فشل التثبيت (رمز: $code)." Red
  exit $code
}

Write-Ar ""
Write-Ar "تم التثبيت. أغلق نافذة الأوامر وافتحها من جديد." Green
Write-Ar "من جذر المشروع شغّل: setup.bat" Green
exit 0
