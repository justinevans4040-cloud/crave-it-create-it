@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20 or newer is required.
  echo Install it from https://nodejs.org/ and run this file again.
  pause
  exit /b 1
)
start "Crave It Website" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:4173"
npm run dev
endlocal
