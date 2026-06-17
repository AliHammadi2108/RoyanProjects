@echo off
chcp 65001 >nul 2>&1
setlocal
cd /d "%~dp0"
title تثبيت نظام المشتريات
echo.
echo ========================================
echo   تثبيت نظام المشتريات
echo ========================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-windows.ps1"
set "ERR=%ERRORLEVEL%"
echo.
if not "%ERR%"=="0" (
  echo [خطأ] انتهى التثبيت بأخطاء. الرمز: %ERR%
) else (
  echo [تم] اكتمل التثبيت. استخدم اختصار نظام المشتريات على سطح المكتب.
)
echo.
pause
exit /b %ERR%