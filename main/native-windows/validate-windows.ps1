# Cari Studio — local Windows validation harness
# Run from a Windows developer shell.
[CmdletBinding()]
param(
    [string]$BuildDir = (Join-Path $PSScriptRoot 'build-validation'),
    [string]$EvidenceDir = (Join-Path $PSScriptRoot 'validation-evidence'),
    [switch]$SkipElectron,
    [switch]$SkipCameraRequired
)

$ErrorActionPreference = 'Stop'

function Write-Evidence([string]$Name, [string]$Text) {
    New-Item -ItemType Directory -Force -Path $EvidenceDir | Out-Null
    $path = Join-Path $EvidenceDir $Name
    $Text | Set-Content -Path $path -Encoding UTF8
    return $path
}

function Invoke-Captured([string]$Label, [string]$FilePath, [string[]]$Arguments) {
    Write-Host "== $Label =="
    $output = & $FilePath @Arguments 2>&1
    $exit = $LASTEXITCODE
    Write-Evidence ($Label.Replace(' ', '_') + '.txt') (($output | Out-String)) | Out-Null
    if ($exit -ne 0) {
        throw "$Label failed with exit code $exit"
    }
    return ($output | Out-String)
}

if ($env:OS -ne 'Windows_NT') {
    throw 'Cari Studio native validation requires Windows.'
}

New-Item -ItemType Directory -Force -Path $EvidenceDir | Out-Null
$head = (& git rev-parse HEAD 2>$null | Out-String).Trim()
$branch = (& git branch --show-current 2>$null | Out-String).Trim()

$envText = @(
    "Timestamp: $(Get-Date -Format o)",
    "HEAD: $head",
    "Branch: $branch",
    "OS: $([System.Environment]::OSVersion.VersionString)",
    "PS: $($PSVersionTable.PSVersion)",
    "CMake: $((& cmake --version 2>$null | Select-Object -First 1))",
    "CTest: $((& ctest --version 2>$null | Select-Object -First 1))",
    "FFmpeg env: $($env:CARI_FFMPEG_EXECUTABLE)",
    "FFmpeg PATH: $((& where.exe ffmpeg.exe 2>$null | Out-String).Trim())",
    "FFprobe PATH: $((& where.exe ffprobe.exe 2>$null | Out-String).Trim())"
) -join [Environment]::NewLine
Write-Evidence 'environment.txt' $envText | Out-Null

if (-not (Get-Command cmake -ErrorAction SilentlyContinue)) { throw 'cmake.exe not found' }
if (-not (Get-Command ctest -ErrorAction SilentlyContinue)) { throw 'ctest.exe not found' }
if ($env:CARI_FFMPEG_EXECUTABLE) {
    if (-not (Test-Path $env:CARI_FFMPEG_EXECUTABLE)) { throw "CARI_FFMPEG_EXECUTABLE does not exist: $env:CARI_FFMPEG_EXECUTABLE" }
} elseif (-not (Get-Command ffmpeg.exe -ErrorAction SilentlyContinue)) {
    throw 'FFmpeg executable not found. Set CARI_FFMPEG_EXECUTABLE or put ffmpeg.exe on PATH.'
}

Push-Location $PSScriptRoot
try {
    Invoke-Captured 'cmake-configure' 'cmake' @('-S','.', '-B', $BuildDir, '-A', 'x64') | Out-Null
    Invoke-Captured 'cmake-build' 'cmake' @('--build', $BuildDir, '--config', 'Release', '--parallel') | Out-Null

    $exe = Join-Path $BuildDir 'Release/cari-studio-native.exe'
    if (-not (Test-Path $exe)) { throw "Native executable missing: $exe" }
    Copy-Item $exe (Join-Path $EvidenceDir 'CariStudio.exe') -Force

    if ($SkipCameraRequired) {
        $env:CARI_CAMERA_SMOKE_REQUIRED = '0'
    } elseif (-not $env:CARI_CAMERA_SMOKE_REQUIRED) {
        $env:CARI_CAMERA_SMOKE_REQUIRED = '0'
    }

    Invoke-Captured 'ctest-all' 'ctest' @('--test-dir', $BuildDir, '-C', 'Release', '--output-on-failure') | Out-Null
    Invoke-Captured 'ctest-ffmpeg-e2e' 'ctest' @('--test-dir', $BuildDir, '-C', 'Release', '--output-on-failure', '-R', 'cari-ffmpeg-named-pipe-e2e-smoke') | Out-Null

    if (-not $SkipElectron) {
        $shell = Join-Path $PSScriptRoot '..\electron-shell'
        if (-not (Test-Path (Join-Path $shell 'package.json'))) { throw "Electron shell not found: $shell" }
        Push-Location $shell
        try {
            if (Test-Path 'package-lock.json') {
                Invoke-Captured 'npm-ci' 'npm.cmd' @('ci') | Out-Null
            } else {
                Invoke-Captured 'npm-install' 'npm.cmd' @('install') | Out-Null
            }
            Invoke-Captured 'npm-check' 'npm.cmd' @('run','check') | Out-Null
            Invoke-Captured 'npm-test' 'npm.cmd' @('test') | Out-Null
        } finally {
            Pop-Location
        }
    }

    $summary = @(
        "HEAD=$head",
        "BUILD=PASS",
        "CTEST=PASS",
        "FFMPEG_E2E=PASS",
        "ELECTRON=$([string](-not $SkipElectron))",
        "FFMPEG=$($env:CARI_FFMPEG_EXECUTABLE)",
        "EVIDENCE=$EvidenceDir"
    ) -join [Environment]::NewLine
    Write-Evidence 'SUMMARY.txt' $summary | Out-Null
    Write-Host 'Cari Studio Windows validation: PASS'
} finally {
    Pop-Location
}