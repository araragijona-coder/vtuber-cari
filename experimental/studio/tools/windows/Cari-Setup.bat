@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Cari-Setup.ps1" %*
set "EXITCODE=%ERRORLEVEL%"
echo.
if "%EXITCODE%"=="0" (
  echo Cari Studio: entorno listo.
) else (
  echo Cari Studio: revisar pc-compatibility.txt/json. Codigo %EXITCODE%.
)
pause
exit /b %EXITCODE%
