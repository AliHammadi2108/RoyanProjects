# Remove PM2 auto-start and stop the app
$ErrorActionPreference = "SilentlyContinue"
$ProjectRoot = "E:\Purchase_Web_System"
Set-Location $ProjectRoot

pm2 delete purchase-web-system
pm2 save
pm2-startup uninstall
schtasks /Delete /TN "PurchaseWebSystem-PM2" /F
schtasks /Delete /TN "PurchaseWebSystem-Start" /F

Write-Host "Auto-start removed. App stopped."
