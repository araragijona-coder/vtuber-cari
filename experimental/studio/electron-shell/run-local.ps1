[CmdletBinding()]
param(
    [switch]$NoBuild,
    [switch]$SkipNpm,
    [switch]$NoSetup
)

$ErrorActionPreference = "Stop"

$StudioRoot = Split-Path -Parent $PSScriptRoot
$NativeProject = Join-Path $StudioRoot "native-windows"
$BuildDir = Join-Path $NativeProject "build-launch"

function Refresh-ProcessPath {
    $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $user = [Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = (($machine -split ';') + ($user -split ';') + ($env:Path -split ';') |
        Where-Object { $_ } |
        Select-Object -Unique) -join ';'
}

function Find-CMake {
    Refresh-ProcessPath

    $command = Get-Command cmake.exe -ErrorAction SilentlyContinue
    if ($command) {
        return $command
    }

    $programFilesX86 = ${env:ProgramFiles(x86)}
    $candidates = @(
        (Join-Path $env:ProgramFiles "CMake\bin\cmake.exe"),
        (Join-Path $programFilesX86 "CMake\bin\cmake.exe"),
        (Join-Path $env:LOCALAPPDATA "Programs\CMake\bin\cmake.exe")
    )

    $vswhere = Join-Path $programFilesX86 "Microsoft Visual Studio\Installer\vswhere.exe"
    if (Test-Path -LiteralPath $vswhere -PathType Leaf) {
        $vsCmake = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Workload.VCTools -find "Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe" 2>$null |
            Select-Object -First 1
        if ($vsCmake) {
            $candidates += $vsCmake
        }
    }

    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) {
            return Get-Item -LiteralPath $candidate
        }
    }

    return $null
}

function Ensure-CMake {
    $cmake = Find-CMake
    if ($cmake) {
        return $cmake
    }

    if ($NoSetup) {
        return $null
    }

    $setup = Join-Path $StudioRoot "tools\windows\Cari-Setup.ps1"
    $winget = Get-Command winget.exe -ErrorAction SilentlyContinue

    if (-not (Test-Path -LiteralPath $setup -PathType Leaf)) {
        return $null
    }

    if (-not $winget) {
        throw @"
Cari Studio needs CMake to build the native engine, but cmake.exe is not installed.

The automatic setup script is present, but WinGet is not available in this Windows session.
Run:
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$setup"

Or install CMake + Visual Studio C++ Build Tools manually.
"@
    }

    Write-Host "CMake was not found. Running Cari-Setup.ps1 for the missing Windows toolchain..." -ForegroundColor Yellow
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $setup -SkipBuild -SkipNpm
    if ($LASTEXITCODE -ne 0) {
        $setupLogDir = Join-Path $StudioRoot "validation-evidence\setup"
        $lastError = Join-Path $setupLogDir "LAST_SETUP_ERROR.txt"
        $lastSetup = Join-Path $setupLogDir "LAST_SETUP.txt"
        throw "Cari-Setup.ps1 failed with exit code $LASTEXITCODE. Setup diagnostics: $lastError ; $lastSetup"
    }

    $cmake = Find-CMake
    if ($cmake) {
        return $cmake
    }

    throw @"
Cari Studio setup completed, but cmake.exe is still unavailable.

Use:
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$setup" -CheckOnly

Then inspect:
  experimental\studio\validation-evidence\pc-audit\pc-compatibility.txt
"@
}
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

    $cmake = Ensure-CMake
    if (-not $cmake) {
        throw "CMake was not found and automatic setup is disabled. Run Cari-Setup.ps1 or remove -NoSetup."
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

if ($NoSetup) {
    Write-Host "Automatic toolchain setup disabled by -NoSetup." -ForegroundColor DarkYellow
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
