@echo off
setlocal enabledelayedexpansion
title LibraDigit AI

:: If 'stop' argument passed: run-app.bat stop
if /i "%~1"=="stop" goto do_stop
if /i "%~1"=="electron" goto do_electron
goto do_start

:do_stop
echo ================================================================
echo           Stopping LibraDigit AI Services
echo ================================================================
echo [*] Terminating processes on port 5001 - Backend...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5001 ^| findstr LISTENING 2^>nul') do taskkill /f /pid %%a >nul 2>&1
echo [*] Terminating processes on port 3000 - Frontend...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING 2^>nul') do taskkill /f /pid %%a >nul 2>&1
echo [OK] All LibraDigit AI services stopped.
exit /b 0

:do_start
echo ================================================================
echo               L I B R A D I G I T   A I   v1.2.0                
echo       AI-Based Digitization ^& Digital Archive Builder           
echo ================================================================
echo.

:: 1. Detect Python
set "PYTHON_EXE=%~dp0.venv\Scripts\python.exe"
if not exist "%PYTHON_EXE%" (
    set "PYTHON_EXE=%~dp0backend\.venv\Scripts\python.exe"
)
if not exist "%PYTHON_EXE%" (
    set "PYTHON_EXE=python"
)

echo [OK] Python runtime: %PYTHON_EXE%

:: 2. Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js was not found in PATH!
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

:: 3. Check node_modules
if not exist "%~dp0node_modules" (
    echo [*] Installing frontend dependencies...
    cd /d "%~dp0"
    call npm install
)

:: 4. Start Backend Server in dedicated window
echo [*] Freeing port 5001 if occupied...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5001 ^| findstr LISTENING 2^>nul') do taskkill /f /pid %%a >nul 2>&1
echo [*] Starting Backend Server on http://localhost:5001...
start "LibraDigit AI - Backend [Port 5001]" "%~dp0backend\run-server.bat"

:: 5. Wait for backend initialization
ping 127.0.0.1 -n 3 >nul

:: 6. Start Frontend Dev Server and open browser
echo [*] Starting Frontend Dev Server on http://localhost:3000...
echo [*] Press Ctrl+C in this window to stop the frontend.
echo.
cd /d "%~dp0"
call npm run dev -- --open
exit /b 0

:do_electron
echo [*] Freeing port 5001 if occupied...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5001 ^| findstr LISTENING 2^>nul') do taskkill /f /pid %%a >nul 2>&1
echo [*] Starting Backend Server on http://localhost:5001...
start "LibraDigit AI - Backend [Port 5001]" "%~dp0backend\run-server.bat"
ping 127.0.0.1 -n 3 >nul

echo [*] Launching Desktop Electron...
cd /d "%~dp0"
call npm run dev:electron
exit /b 0



