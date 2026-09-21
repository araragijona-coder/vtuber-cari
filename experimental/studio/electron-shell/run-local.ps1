[CmdletBinding()]
param(
    [switch]$NoBuild,
    [switch]$SkipNpm
)

$ErrorActionPreference = "Stop"

$StudioRoot = Split-Path -Parent $PSScriptRoot
$NativeProject = Join-Path $StudioRoot "native-windows"
$BuildDir = Join-Path $NativeProject "build-launch"

function Find-NativeEngine {
    $candidates = @()

    if ($env:CARI_NATIVE_EXECUTABLE) {
        $candidates += $env:CARI_NATIVE_EXECUTABLE
    }

    $candidates += @(
        (Join-Path $NativeProject "build-launch\Release\cari-studio-native.exe"),
        (Join-Path $NativeProject "build\Release\cari-studio-native.exe"),
        (Join-Path $NativeProject "build-validation\Release\cari-studio-native.exe"),
        (Join-Path $StudioRoot "native\cari-studio-native.exe"),
        (Join-Path $StudioRoot "native\CariStudio.exe")
    )

    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) {
            return (Resolve-Path -LiteralPath $candidate).Path
        }
    }

    return $null
}

function Build-NativeEngine {
    if ($NoBuild) {
        return $false
    }

    $cmake = Get-Command cmake.exe -ErrorAction SilentlyContinue
    if (-not $cmake) {
        throw @"
Cari Studio native engine is not built and CMake was not found.

Run the full environment setup first:
  .\..\tools\windows\Cari-Setup.ps1

Or install CMake + Visual Studio C++ Build Tools and run this launcher again.
"@
    }

    if (-not (Test-Path -LiteralPath $NativeProject -PathType Container)) {
        throw "Native project directory not found: $NativeProject"
    }

    Write-Host "Native engine not found; building Release x64 automatically..." -ForegroundColor Cyan
    Write-Host "Source: $NativeProject"
    Write-Host "Build:  $BuildDir"

    & $cmake.Source -S $NativeProject -B $BuildDir -A x64
    if ($LASTEXITCODE -ne 0) {
        throw "CMake configure failed with exit code $LASTEXITCODE."
    }

    & $cmake.Source --build $BuildDir --config Release --parallel
    if ($LASTEXITCODE -ne 0) {
        throw "Native C++ build failed with exit code $LASTEXITCODE."
    }

    return $true
}

function Ensure-ElectronDependencies {
    if ($SkipNpm) {
        return
    }

    $packageJson = Join-Path $PSScriptRoot "package.json"
    $nodeModules = Join-Path $PSScriptRoot "node_modules"

    if (-not (Test-Path -LiteralPath $packageJson -PathType Leaf)) {
        throw "Electron package.json not found: $packageJson"
    }

    if (Test-Path -LiteralPath $nodeModules -PathType Container) {
        return
    }

    $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if (-not $npm) {
        throw "npm.cmd was not found. Run Cari-Setup.ps1 or install Node.js 22."
    }

    Write-Host "Electron dependencies not found; installing npm dependencies..." -ForegroundColor Cyan
    Push-Location $PSScriptRoot
    try {
        if (Test-Path -LiteralPath (Join-Path $PSScriptRoot "package-lock.json")) {
            & $npm.Source ci
        } else {
            & $npm.Source install
        }

        if ($LASTEXITCODE -ne 0) {
            throw "npm dependency installation failed with exit code $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }
}

$Native = Find-NativeEngine

if (-not $Native) {
    [void](Build-NativeEngine)
    $Native = Find-NativeEngine
}

if (-not $Native) {
    throw @"
Cari Studio native engine could not be built or found.

Expected executable:
  $NativeProject\build-launch\Release\cari-studio-native.exe

Useful diagnostics:
  .\..\tools\windows\Cari-Setup.ps1 -CheckOnly
  .\..\native-windows\validate-windows.ps1 -SkipElectron

You can also set:
  CARI_NATIVE_EXECUTABLE=<full path to cari-studio-native.exe>
"@
}

Ensure-ElectronDependencies

$Native = (Resolve-Path -LiteralPath $Native).Path
$env:CARI_NATIVE_EXECUTABLE = $Native

if ($env:CARI_OUTPUT_BACKEND -eq "libav-d3d11") {
    Write-Host "Using experimental D3D11 -> Libav backend."
}

if (-not $env:CARI_FFMPEG_EXECUTABLE) {
    $ffmpeg = Get-Command ffmpeg.exe -ErrorAction SilentlyContinue
    if ($ffmpeg) {
        $env:CARI_FFMPEG_EXECUTABLE = $ffmpeg.Source
    }
}

if (-not $env:CARI_MEDIAPIPE_MODEL_PATH) {
    Write-Host "MediaPipe model not configured; face tracking will remain disabled."
}

if (-not $env:CARI_AVATAR_MODEL_PATH) {
    Write-Host "Avatar model not configured; placeholder/local renderer will be used."
}

Push-Location $PSScriptRoot
try {
    npm start
}
finally {
    Pop-Location
}
