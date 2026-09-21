@echo off
setlocal
set "STUDIO_ROOT=%~dp0..\.."
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%STUDIO_ROOT%\electron-shell\run-local.ps1"
set "EXITCODE=%ERRORLEVEL%"
if not "%EXITCODE%"=="0" (
  echo.
  echo Cari Studio no pudo iniciarse. Codigo %EXITCODE%.
  echo Revisa los mensajes anteriores y validation-evidence si existe.
  pause
)
exit /b %EXITCODE%
