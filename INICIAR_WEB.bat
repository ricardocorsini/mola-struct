@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Instale Node.js 22.12 ou superior para abrir o MolasStruct.
  pause
  exit /b 1
)
start "" http://127.0.0.1:1420
node scripts/serve.mjs
pause
