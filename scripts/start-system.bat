@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion
title نظام المشتريات

set "ROOT=%~dp0.."
cd /d "%ROOT%"
set "ROOT=%CD%"

echo.
echo ========================================
echo   نظام المشتريات - جاري التشغيل
echo   %ROOT%
echo ========================================
echo.

if not exist "%ROOT%\.env" (
  echo [خطأ] ملف .env غير موجود. شغّل setup.bat أولاً.
  pause
  exit /b 1
)

if not exist "%ROOT%\.next" (
  echo [خطأ] لا يوجد بناء (.next). شغّل setup.bat.
  pause
  exit /b 1
)

if not exist "%ROOT%\.next" (
  echo [تحذير] لا يوجد بناء — جاري البناء...
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
if not defined NEXTAUTH_URL set NEXTAUTH_URL=http://localhost:3000

echo تجهيز Prisma...
call npm run db:generate >nul 2>&1

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT%" ^| findstr "LISTENING"') do (
  echo [معلومة] المنفذ %PORT% مستخدم بالفعل.
  start "" "http://localhost:%PORT%"
  pause
  exit /b 0
)

where pm2 >nul 2>&1
if %ERRORLEVEL%==0 if /I not "%USE_PM2%"=="0" (
  echo تشغيل عبر PM2...
  pm2 delete purchase-web-system >nul 2>&1
  pm2 start "%ROOT%\ecosystem.config.cjs"
  pm2 save >nul 2>&1
  timeout /t 3 /nobreak >nul
  start "" "http://localhost:%PORT%"
  echo النظام: http://localhost:%PORT%
  pause
  exit /b 0
)

echo الخادم: http://localhost:%PORT%
echo للإيقاف: أغلق النافذة أو scripts\stop-system.bat
echo.

start "" /b cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:%PORT%"

call npm run start -- -p %PORT%
set ERR=%ERRORLEVEL%
echo.
if not "%ERR%"=="0" echo [خطأ] رمز الخروج: %ERR%
pause
exit /b %ERR%
