@echo off
setlocal
cd /d "%~dp0.."
cmake -S ..\native-windows -B ..\native-windows\build -A x64
if errorlevel 1 exit /b %errorlevel%
cmake --build ..\native-windows\build --config Release --parallel
if errorlevel 1 exit /b %errorlevel%
if not exist native mkdir native
copy /y ..\native-windows\build\Release\cari-studio-native.exe native\cari-studio-native.exe
if errorlevel 1 exit /b %errorlevel%
npm install --no-audit --no-fund
if errorlevel 1 exit /b %errorlevel%
npm run check
if errorlevel 1 exit /b %errorlevel%
npm test
if errorlevel 1 exit /b %errorlevel%
npm run dist
