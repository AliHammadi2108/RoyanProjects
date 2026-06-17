param(
  [int]$Port = 3000,
  [string]$Url = "",
  [int]$TimeoutSec = 10
)
if (-not $Url) { $Url = "http://localhost:$Port/login" }
$conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if (-not $conn) {
  Write-Host "FAIL: no listener on port $Port" -ForegroundColor Red
  exit 1
}
try {
  $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec
  if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 400) {
    Write-Host "OK: $Url -> $($resp.StatusCode)" -ForegroundColor Green
    exit 0
  }
  Write-Host "FAIL: HTTP $($resp.StatusCode)" -ForegroundColor Red
  exit 1
} catch {
  Write-Host "FAIL: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
