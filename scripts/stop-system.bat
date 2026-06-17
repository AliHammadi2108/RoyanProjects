@echo off
chcp 65001 >nul 2>&1
setlocal
title إيقاف نظام المشتريات
set PORT=3000
echo البحث عن المنفذ %PORT%...
set FOUND=0
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT%" ^| findstr "LISTENING"') do (
  set FOUND=1
  echo إيقاف PID %%a
  taskkill /F /PID %%a >nul 2>&1
)
if "%FOUND%"=="0" echo لا توجد عملية على المنفذ %PORT%.
else echo تم الإيقاف.
pause
