$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$native = Join-Path $root "native"
$build = Join-Path $root "..\native-windows\build"
$cmakeSource = Join-Path $root "..\native-windows"

if (-not (Get-Command cmake -ErrorAction SilentlyContinue)) { throw "CMake was not found in PATH." }
cmake -S $cmakeSource -B $build -A x64
cmake --build $build --config Release --parallel
$exe = Join-Path $build "Release\cari-studio-native.exe"
if (-not (Test-Path $exe)) { throw "Native engine build did not produce $exe" }
New-Item -ItemType Directory -Force -Path $native | Out-Null
Copy-Item $exe (Join-Path $native "cari-studio-native.exe") -Force
Write-Host "Native engine copied to $native"
