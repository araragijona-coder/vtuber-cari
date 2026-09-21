@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Cari-Setup.ps1" %*
set "EXITCODE=%ERRORLEVEL%"
echo.
if not "%EXITCODE%"=="0" (
  echo Cari Studio: el setup encontro un fallo o una advertencia.
  echo Revisar pc-compatibility.txt/json y los logs de validation-evidence.
  pause
  exit /b %EXITCODE%
)
echo Cari Studio: entorno listo.
if not "%~1"=="" (
  echo.
  echo Se detectaron argumentos del setup; no se inicia la aplicacion automaticamente.
  echo Usa Cari-Launch.bat para abrir el Studio.
  pause
  exit /b 0
)
echo Iniciando Cari Studio...
call "%~dp0Cari-Launch.bat"
set "APPEXIT=%ERRORLEVEL%"
echo.
echo Cari Studio termino con codigo %APPEXIT%.
if not "%APPEXIT%"=="0" pause
exit /b %APPEXIT%
