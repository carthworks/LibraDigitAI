@echo off
setlocal
title LibraDigit AI - Backend [Port 5001]
cd /d "%~dp0"

set "PYTHON_EXE=%~dp0..\.venv\Scripts\python.exe"
if not exist "%PYTHON_EXE%" (
    set "PYTHON_EXE=%~dp0.venv\Scripts\python.exe"
)
if not exist "%PYTHON_EXE%" (
    set "PYTHON_EXE=python"
)

echo ================================================================
echo           LibraDigit AI - Backend Server [Port 5001]
echo ================================================================
echo [*] Python: "%PYTHON_EXE%"
echo [*] Directory: "%CD%"
echo.

"%PYTHON_EXE%" server.py
set "EXIT_CODE=%errorlevel%"

if %EXIT_CODE% neq 0 (
    echo.
    echo ================================================================
    echo [ERROR] Backend server stopped with error code %EXIT_CODE%.
    echo ================================================================
    pause
)
