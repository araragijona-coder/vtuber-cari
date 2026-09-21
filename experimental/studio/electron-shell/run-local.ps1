$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$StudioRoot = $Root
$Native = $env:CARI_NATIVE_EXECUTABLE

if (-not $Native) {
    $candidates = @(
        (Join-Path $StudioRoot "native-windows\build\Release\cari-studio-native.exe"),
        (Join-Path $StudioRoot "native-windows\build-validation\Release\cari-studio-native.exe"),
        (Join-Path $StudioRoot "native\cari-studio-native.exe"),
        (Join-Path $StudioRoot "native\CariStudio.exe")
    )
    $Native = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
}

if (-not $Native -or -not (Test-Path $Native)) {
    throw "Native engine not found. Set CARI_NATIVE_EXECUTABLE to cari-studio-native.exe."
}

$Native = (Resolve-Path $Native).Path
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
    Write-Host "Avatar model not configured; placeholder renderer will be used."
}

Push-Location $PSScriptRoot
try {
    npm start
}
finally {
    Pop-Location
}
