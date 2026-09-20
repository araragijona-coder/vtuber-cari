#requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$NoFfmpegInstall,
    [switch]$SkipLaunch
)
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Root = (Resolve-Path $PSScriptRoot).Path
$NativeSource = Join-Path $Root "native-windows"
$NativeBuild = Join-Path $NativeSource "build"
$NativeExe = Join-Path $NativeBuild "Release\cari-studio-native.exe"
$NativeRuntimeDir = Join-Path $Root "native"
$NativeRuntimeExe = Join-Path $NativeRuntimeDir "cari-studio-native.exe"
$ElectronRoot = Join-Path $Root "electron-shell"

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}
function Has-Command([string]$Name) {
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}
function Invoke-Winget([string[]]$Arguments) {
    if (-not (Has-Command "winget")) { throw "winget no esta disponible." }
    & winget @Arguments
    if ($LASTEXITCODE -ne 0) { throw "winget fallo con codigo $LASTEXITCODE." }
}
function Refresh-Path {
    $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $user = [Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$machine;$user"
}
function Require-Command([string]$Name, [string]$Hint) {
    if (-not (Has-Command $Name)) { throw "$Name no esta disponible. $Hint" }
}

function Ensure-DeveloperTools {
    Write-Step "Node.js"
    if (-not (Has-Command "node")) {
        Invoke-Winget @("install","--id","OpenJS.NodeJS.LTS","--exact","--accept-source-agreements","--accept-package-agreements")
        Refresh-Path
    }
    Require-Command "node" "Instala Node.js LTS."
    Require-Command "npm" "npm viene con Node.js."

    Write-Step "CMake"
    if (-not (Has-Command "cmake")) {
        Invoke-Winget @("install","--id","Kitware.CMake","--exact","--accept-source-agreements","--accept-package-agreements")
        Refresh-Path
    }
    Require-Command "cmake" "Instala CMake 3.25+."

    Write-Step "MSVC / Windows SDK"
    $programFilesX86 = [Environment]::GetEnvironmentVariable("ProgramFiles(x86)")
    $vswhere = Join-Path $programFilesX86 "Microsoft Visual Studio\Installer\vswhere.exe"
    if (-not (Test-Path $vswhere)) {
        Invoke-Winget @(
            "install","--id","Microsoft.VisualStudio.2022.BuildTools","--exact",
            "--override","--wait --passive --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended",
            "--accept-source-agreements","--accept-package-agreements"
        )
        Refresh-Path
    }
    if (-not (Test-Path $vswhere)) {
        throw "Visual Studio Build Tools no quedo instalado."
    }
    $vsPath = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
    if ([string]::IsNullOrWhiteSpace($vsPath)) {
        throw "No se encontro MSVC x64 / workload Desktop development with C++."
    }
}

function Ensure-Ffmpeg {
    Write-Step "FFmpeg"
    if (Has-Command "ffmpeg.exe") { return }
    if ($NoFfmpegInstall) { throw "FFmpeg no esta instalado." }
    Invoke-Winget @("install","--id","Gyan.FFmpeg","--exact","--accept-source-agreements","--accept-package-agreements")
    Refresh-Path
    if (-not (Has-Command "ffmpeg.exe")) {
        throw "FFmpeg fue instalado pero no aparece en PATH. Reinicia PowerShell."
    }
}

function Build-Native {
    Write-Step "CMake configure"
    cmake -S $NativeSource -B $NativeBuild -A x64
    if ($LASTEXITCODE -ne 0) { throw "CMake configure fallo." }

    Write-Step "CMake build Release"
    cmake --build $NativeBuild --config Release --parallel
    if ($LASTEXITCODE -ne 0) { throw "Build nativo fallo." }

    if (-not (Test-Path $NativeExe)) { throw "No se produjo $NativeExe" }

    New-Item -ItemType Directory -Force -Path $NativeRuntimeDir | Out-Null
    Copy-Item $NativeExe $NativeRuntimeExe -Force
}

function Test-Native {
    Write-Step "CTest"
    ctest --test-dir $NativeBuild -C Release --output-on-failure
    if ($LASTEXITCODE -ne 0) { throw "Uno o mas smoke tests nativos fallaron." }
}

function Install-Electron {
    Push-Location $ElectronRoot
    try {
        Write-Step "npm install"
        npm install --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) { throw "npm install fallo." }

        Write-Step "Electron checks"
        npm run check
        if ($LASTEXITCODE -ne 0) { throw "npm run check fallo." }

        npm test
        if ($LASTEXITCODE -ne 0) { throw "npm test fallo." }
    }
    finally { Pop-Location }
}

function Configure-Runtime {
    $env:CARI_NATIVE_EXECUTABLE = $NativeRuntimeExe
    $ffmpeg = Get-Command ffmpeg.exe -ErrorAction SilentlyContinue
    if ($ffmpeg) { $env:CARI_FFMPEG_EXECUTABLE = $ffmpeg.Source }

    [Environment]::SetEnvironmentVariable("CARI_NATIVE_EXECUTABLE",$NativeRuntimeExe,"User")
    if ($ffmpeg) {
        [Environment]::SetEnvironmentVariable("CARI_FFMPEG_EXECUTABLE",$ffmpeg.Source,"User")
    }

    @"
Cari Studio local installation
Date: $(Get-Date -Format s)
Native: $NativeRuntimeExe
FFmpeg: $($env:CARI_FFMPEG_EXECUTABLE)
"@ | Set-Content -Path (Join-Path $Root "INSTALL_SUMMARY.txt") -Encoding UTF8
}

Write-Step "Cari Studio installer"
Ensure-DeveloperTools
Ensure-Ffmpeg
Build-Native
Test-Native
Install-Electron
Configure-Runtime

Write-Host ""
Write-Host "Cari Studio instalado y compilado localmente." -ForegroundColor Green
if (-not $SkipLaunch) { & (Join-Path $Root "RUN_CARI_STUDIO.ps1") }
