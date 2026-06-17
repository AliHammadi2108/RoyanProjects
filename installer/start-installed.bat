@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion
title نظام المشتريات

set "ROOT=%~dp0.."
cd /d "%ROOT%"
set "ROOT=%CD%"

echo.
echo ========================================
echo   نظام المشتريات - تشغيل
echo   %ROOT%
echo ========================================
echo.

if not exist "%ROOT%\.env" (
  echo [خطأ] ملف .env غير موجود.
  echo شغّل: powershell -ExecutionPolicy Bypass -File installer\post-install.ps1
  echo أو: setup.bat
  pause
  exit /b 1
)

if not exist "%ROOT%\.next" (
  echo [تنبيه] لا يوجد build — جاري البناء...
  call npm run build
  if errorlevel 1 (
    echo [خطأ] فشل البناء
    pause
    exit /b 1
  )
)

if not exist "%ROOT%\logs" mkdir "%ROOT%\logs"

set PORT=3000
set NODE_ENV=production
if not defined NEXTAUTH_URL set NEXTAUTH_URL=http://localhost:%PORT%

call npm run db:generate >nul 2>&1

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT%" ^| findstr "LISTENING"') do (
  echo المنفذ %PORT% مستخدم — فتح المتصفح.
  start "" "http://localhost:%PORT%"
  pause
  exit /b 0
)

set "ECO=%ROOT%\ecosystem.config.cjs"
if not exist "%ECO%" set "ECO=%ROOT%\scripts\ecosystem.config.cjs"

where pm2 >nul 2>&1
if %ERRORLEVEL%==0 if /I not "%USE_PM2%"=="0" if exist "%ECO%" (
  pm2 delete purchase-web-system >nul 2>&1
  pm2 start "%ECO%"
  pm2 save >nul 2>&1
  timeout /t 3 /nobreak >nul
  start "" "http://localhost:%PORT%"
  echo التشغيل: http://localhost:%PORT%
  pause
  exit /b 0
)

echo التشغيل: http://localhost:%PORT%
start "" /b cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:%PORT%"
call npm run start -- -p %PORT%
set ERR=%ERRORLEVEL%
pause
exit /b %ERR%
