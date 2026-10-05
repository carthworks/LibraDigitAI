@echo off
setlocal enabledelayedexpansion
title LibraDigit AI

echo ================================================================
echo               L I B R A D I G I T   A I   v1.2.0                
echo       AI-Based Digitization ^& Digital Archive Builder           
echo ================================================================
echo.

:: 1. Detect Python
set "PYTHON_EXE="
if exist "%~dp0.venv\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0.venv\Scripts\python.exe"
) else if exist "%~dp0backend\.venv\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0backend\.venv\Scripts\python.exe"
) else (
    python --version >nul 2>&1
    if !errorlevel! equ 0 (
        set "PYTHON_EXE=python"
    )
)

if "%PYTHON_EXE%"=="" (
    echo [ERROR] Python was not found!
    echo Please install Python 3.8+ or configure a virtual environment in .venv
    echo Download: https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

echo [OK] Python runtime detected: %PYTHON_EXE%

:: 2. Check Node.js and npm
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js was not found in PATH!
    echo Please install Node.js 18+ to run the frontend interface.
    echo Download: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js environment detected.

:: 3. Check node_modules
if not exist "%~dp0node_modules" (
    echo [*] node_modules not found. Running npm install...
    cd /d "%~dp0"
    call npm install
    if !errorlevel! neq 0 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

:: 4. Start Backend Server in a new window
echo [*] Starting Flask backend server on http://localhost:5001...
start "LibraDigit AI - Backend Server [Port 5001]" cmd /k "cd /d "%~dp0backend" && "%PYTHON_EXE%" server.py"

:: 5. Wait for backend initialization
ping 127.0.0.1 -n 3 >nul

:: 6. Launch browser asynchronously after frontend starts listening
start "" cmd /c "ping 127.0.0.1 -n 3 >nul && start http://localhost:3000"

:: 7. Start Frontend Dev Server in current window
echo [*] Starting Vite frontend server on http://localhost:3000...
echo [*] Press Ctrl+C in this window to stop the frontend dev server.
echo.
cd /d "%~dp0"
call npm run dev

