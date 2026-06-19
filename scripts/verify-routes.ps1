# verify-routes.ps1 — smoke-check dashboard routes (build artifacts + optional HTTP)
param(
  [string]$BaseUrl = "http://localhost:3000",
  [int]$TimeoutSec = 5,
  [switch]$SkipHttp
)

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$routes = @(
  "/purchases/dashboard",
  "/purchases/tracking",
  "/purchases/requests",
  "/purchases/quotations",
  "/purchases/comparisons",
  "/purchases/supplier-selection",
  "/purchases/orders",
  "/purchases/inspections",
  "/purchases/receivings",
  "/purchases/invoices",
  "/purchases/supplier-payments",
  "/approvals/inbox",
  "/notifications",
  "/reports/operations",
  "/reports/quantity-cost",
  "/reports/supplier-balances",
  "/reports/supplier-statement",
  "/reports/approvals",
  "/reports/used-documents",
  "/reports/reorder-alerts",
  "/settings/approval-matrix",
  "/settings/approval-requests",
  "/settings/approval-rules"
)

Write-Host "Checking .next route bundles..."
$missing = @()
foreach ($route in $routes) {
  $rel = ($route.TrimStart("/") -replace "/", [IO.Path]::DirectorySeparatorChar)
  $pattern = Join-Path $root (Join-Path ".next/server/app/(dashboard)" (Join-Path $rel "page.js"))
  if (-not (Test-Path -LiteralPath $pattern)) {
    $missing += $route
  }
}
if ($missing.Count -gt 0) {
  Write-Host "MISSING BUILD:" -ForegroundColor Red
  $missing | ForEach-Object { Write-Host "  $_" }
  exit 1
}
Write-Host "All route bundles present." -ForegroundColor Green

if ($SkipHttp) { exit 0 }

Write-Host ""
Write-Host "HTTP probe (curl, max ${TimeoutSec}s):"
$bad = @()
foreach ($route in $routes) {
  $url = "$BaseUrl$route"
  $code = & curl.exe -s -o NUL -w "%{http_code}" --max-time $TimeoutSec $url 2>$null
  if (-not $code) { $code = "000" }
  $ok = $code -in @("200","301","302","307","308")
  if (-not $ok) { $bad += $route }
  $color = if ($ok) { "Green" } else { "Red" }
  Write-Host ("{0,-40} {1}" -f $route, $code) -ForegroundColor $color
}
if ($bad.Count -gt 0) { exit 1 }
exit 0
