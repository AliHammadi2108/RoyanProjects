@echo off
chcp 65001 >nul 2>&1
setlocal
cd /d "%~dp0"
title إعداد نظام المشتريات
echo.
echo ========================================
echo   إعداد نظام المشتريات
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 goto node_fail

node -e "var m=parseInt(process.versions.node.split('.')[0],10);if(isNaN(m)||m<20)process.exit(1)" >nul 2>&1
if errorlevel 1 goto node_old
goto node_ok

:node_fail
echo [خطأ] Node.js غير مثبت أو غير موجود في PATH.
goto node_help

:node_old
echo [خطأ] يتطلب Node.js 20 LTS أو أحدث. الإصدار الحالي:
node --version
goto node_help

:node_help
echo.
echo ثبّت Node.js 20 LTS من: https://nodejs.org/
echo أو: winget install OpenJS.NodeJS.LTS
echo أو: powershell -ExecutionPolicy Bypass -File "%~dp0scripts\install-node.ps1"
echo.
echo بعد التثبيت أغلق هذه النافذة وشغّل setup.bat مرة أخرى من جذر المشروع.
echo ملاحظة: PurchaseSystem-Setup.exe القديم ^(Inno Setup^) لم يعد مدعوماً — استخدم setup.bat بعد git clone.
echo.
set "ERR=1"
goto end

:node_ok
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-windows.ps1"
set "ERR=%ERRORLEVEL%"

:end
echo.
if not "%ERR%"=="0" (
  echo [تنبيه] انتهى الإعداد بأخطاء. رمز: %ERR%
) else (
  echo [تم] اكتمل الإعداد. شغّل النظام من اختصار سطح المكتب أو scripts\start-system.bat
)
echo.
pause
exit /b %ERR%