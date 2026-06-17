# تشغيل نظام المشتريات (Windows)

## أول مرة
- شغّل **setup.bat** من جذر المشروع.

## كل يوم
- اختصار سطح المكتب: **نظام المشتريات**
- أو **scripts/start-system.bat** → http://localhost:3000

## إيقاف / إعادة تشغيل
- **scripts/stop-system.bat**
- **scripts/restart-system.bat** (أو set REBUILD=1 قبلها لإعادة البناء)

## فحص الصحة
`powershell -NoProfile -ExecutionPolicy Bypass -File scripts/health-check.ps1`

## تشغيل تلقائي عند الدخول (اختياري)
PowerShell كمسؤول: **scripts/install-autostart.ps1**

## PM2
`pm2 status` | `pm2 logs purchase-web-system`
