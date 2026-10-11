@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto browseronly
node server.cjs --open
pause
exit /b
:browseronly
start "QuietLab" "%~dp0dist\index.html"

