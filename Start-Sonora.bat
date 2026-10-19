@echo off
setlocal
cd /d "%~dp0"
title Sonora - Windows Audio Receiver

rem Prefer the files in the project root, matching the simple local setup.
set "SONORA_SCRIPT="
if exist "%~dp0sonora_companion.py" set "SONORA_SCRIPT=%~dp0sonora_companion.py"
if not defined SONORA_SCRIPT if exist "%~dp0windows-companion\sonora_companion.py" set "SONORA_SCRIPT=%~dp0windows-companion\sonora_companion.py"

set "SONORA_PYTHON="
if exist "%~dp0.venv\Scripts\python.exe" set "SONORA_PYTHON=%~dp0.venv\Scripts\python.exe"
if not defined SONORA_PYTHON if exist "%~dp0windows-companion\.venv\Scripts\python.exe" set "SONORA_PYTHON=%~dp0windows-companion\.venv\Scripts\python.exe"

if not defined SONORA_SCRIPT (
  echo ERROR: Could not find sonora_companion.py.
  echo Put this launcher in your Project-sound folder.
  pause
  exit /b 1
)

if not defined SONORA_PYTHON (
  echo ERROR: Could not find the project's .venv Python.
  echo Create the virtual environment and install windows-companion\requirements.txt first.
  pause
  exit /b 1
)

echo Starting Sonora...
echo Type START when prompted to allow local audio capture.
echo Press Ctrl+C to stop Sonora and close this window.
echo.
"%SONORA_PYTHON%" "%SONORA_SCRIPT%"
exit
