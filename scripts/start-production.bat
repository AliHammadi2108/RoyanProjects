@echo off
setlocal
cd /d E:\Purchase_Web_System
if not exist logs mkdir logs
echo [%date% %time%] start-production.bat >> logs\production-batch.log
call npm run db:generate >> logs\production-batch.log 2>&1
if not exist .next (
  echo Build missing. Run npm run build >> logs\production-batch.log
  exit /b 1
)
set PORT=3000
if not defined NEXTAUTH_URL set NEXTAUTH_URL=http://localhost:3000
set NODE_ENV=production
call npm run start -- -p %PORT% >> logs\production-batch.log 2>&1
