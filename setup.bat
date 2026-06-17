@echo off
chcp 65001 >nul 2>&1
setlocal
cd /d "%~dp0"
title تثبيت نظام المشتريات
echo.
echo ========================================
echo   تثبيت نظام المشتريات
echo   (scripts\setup-windows.ps1)
echo ========================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-windows.ps1" %*
set "ERR=%ERRORLEVEL%"
echo.
if not "%ERR%"=="0" (
  echo [خطأ] انتهى التثبيت بأخطاء. الرمز: %ERR%
) else (
  echo [تم] اكتمل التثبيت. استخدم اختصار نظام المشتريات على سطح المكتب.
  echo PM2 اختياري: powershell -ExecutionPolicy Bypass -File scripts\install-autostart.ps1
)
echo.
pause
exit /b %ERR%
