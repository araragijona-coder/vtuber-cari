#requires -Version 5.1
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Root = (Resolve-Path $PSScriptRoot).Path
$ElectronRoot = Join-Path $Root "electron-shell"
$Native = Join-Path $Root "native\cari-studio-native.exe"
$BuiltNative = Join-Path $Root "native-windows\build\Release\cari-studio-native.exe"

if (-not (Test-Path $Native) -and (Test-Path $BuiltNative)) {
    New-Item -ItemType Directory -Force -Path (Split-Path $Native) | Out-Null
    Copy-Item $BuiltNative $Native -Force
}
if (-not (Test-Path $Native)) { throw "Ejecuta INSTALL_WINDOWS.ps1 primero." }

$env:CARI_NATIVE_EXECUTABLE = (Resolve-Path $Native).Path
if (-not $env:CARI_FFMPEG_EXECUTABLE) {
    $ffmpeg = Get-Command ffmpeg.exe -ErrorAction SilentlyContinue
    if ($ffmpeg) { $env:CARI_FFMPEG_EXECUTABLE = $ffmpeg.Source }
}

Push-Location $ElectronRoot
try { npm start }
finally { Pop-Location }
