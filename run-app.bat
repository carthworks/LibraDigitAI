@echo off
title LibraDigit AI

echo ================================================================
echo               L I B R A D I G I T   A I                         
echo       AI-Based Digitization ^& Digital Archive Builder           
echo ================================================================
echo.

:: 1. Detect Python
set "PYTHON_EXE=%~dp0.venv\Scripts\python.exe"
if not exist "%PYTHON_EXE%" (
    set "PYTHON_EXE=python"
)

echo [OK] Python: %PYTHON_EXE%

:: 2. Start Backend Server in a new window
echo [*] Starting Backend Server on http://localhost:5001...
start "LibraDigit AI - Backend [Port 5001]" cmd /k "cd /d "%~dp0backend" && "%PYTHON_EXE%" server.py"

:: 3. Wait for backend initialization
ping 127.0.0.1 -n 4 >nul

:: 4. Launch default browser
echo [*] Opening LibraDigit AI in browser (http://localhost:3000)...
start http://localhost:3000

:: 5. Start Frontend Dev Server in current window
echo [*] Starting Frontend Dev Server on http://localhost:3000...
echo.
cd /d "%~dp0"
npm run dev
