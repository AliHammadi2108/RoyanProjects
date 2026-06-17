@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion
title إعادة تشغيل نظام المشتريات

set "ROOT=%~dp0.."
cd /d "%ROOT%"
set "ROOT=%CD%"

echo.
echo ========================================
echo   إعادة تشغيل نظام المشتريات
echo ========================================
echo.

call "%~dp0stop-system.bat" nopause

echo تجهيز Prisma...
call npm run db:generate
if errorlevel 1 (
  echo [خطأ] فشل prisma generate
  pause
  exit /b 1
)

if not exist "%ROOT%\.next" set "DO_BUILD=1"
if /I "%REBUILD%"=="1" set "DO_BUILD=1"

if defined DO_BUILD (
  echo بناء الإنتاج...
  call npm run build
  if errorlevel 1 (
    echo [خطأ] فشل البناء
    pause
    exit /b 1
  )
)

set "ECO=%ROOT%\ecosystem.config.cjs"
if not exist "%ECO%" set "ECO=%ROOT%\scripts\ecosystem.config.cjs"

where pm2 >nul 2>&1
if %ERRORLEVEL%==0 (
  echo تشغيل عبر PM2...
  pm2 delete purchase-web-system >nul 2>&1
  pm2 start "%ECO%"
  pm2 save >nul 2>&1
  timeout /t 3 /nobreak >nul
  start "" "http://localhost:3000"
  echo النظام يعمل: http://localhost:3000
  pause
  exit /b 0
)

set PORT=3000
set NODE_ENV=production
if not defined NEXTAUTH_URL set NEXTAUTH_URL=http://localhost:3000
start "" /b cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"
call npm run start -- -p %PORT%
exit /b %ERRORLEVEL%
