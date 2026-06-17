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

if not exist "%ROOT%\logs" mkdir "%ROOT%\logs"

set PORT=3000
set NODE_ENV=production
if not defined NEXTAUTH_URL set NEXTAUTH_URL=http://localhost:3000

echo تجهيز Prisma...
call npm run db:generate >nul 2>&1

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
