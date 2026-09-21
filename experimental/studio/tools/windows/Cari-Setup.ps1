[CmdletBinding()]
param(
    [switch]$CheckOnly,
    [switch]$SkipBuild,
    [switch]$SkipNpm,
    [switch]$NoElevation
)
$ErrorActionPreference='Stop'
$repoRoot=(Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$audit=Join-Path $PSScriptRoot 'Cari-PC-Audit.ps1'
$validator=Join-Path $repoRoot 'experimental\studio\native-windows\validate-windows.ps1'
$logDir=Join-Path $repoRoot 'experimental\studio\validation-evidence\setup'
New-Item -ItemType Directory -Force -Path $logDir|Out-Null
$log=Join-Path $logDir ("setup-{0}.log" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))

function Refresh-Path {
    $machine=[Environment]::GetEnvironmentVariable('Path','Machine')
    $user=[Environment]::GetEnvironmentVariable('Path','User')
    $env:Path=(($machine -split ';')+($user -split ';')+($env:Path -split ';')|Where-Object{$_}|Select-Object -Unique)-join ';'
}
function Ensure-Admin {
    if($NoElevation -or $CheckOnly){return}
    $id=[Security.Principal.WindowsIdentity]::GetCurrent()
    $p=[Security.Principal.WindowsPrincipal]::new($id)
    if(-not $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){
        $args=@('-NoProfile','-ExecutionPolicy','Bypass','-File',$PSCommandPath,'-NoElevation')
        if($SkipBuild){$args+='-SkipBuild'}
        if($SkipNpm){$args+='-SkipNpm'}
        $process = Start-Process powershell.exe -Verb RunAs -ArgumentList $args -Wait -PassThru
        exit $process.ExitCode
    }
}
function Invoke-WingetInstall([string]$Id,[string]$Override='') {
    $winget=Get-Command winget.exe -ErrorAction SilentlyContinue
    if($null -eq $winget){throw 'WinGet no está disponible. El setup requiere Windows Package Manager.'}
    $args=@('install','--id',$Id,'--exact','--source','winget','--accept-source-agreements','--accept-package-agreements')
    if($Override){$args+='--override';$args+=$Override}
    & $winget.Source @args
    if($LASTEXITCODE -ne 0){throw "WinGet no pudo instalar $Id. Código $LASTEXITCODE."}
}
Start-Transcript -Path $log -Append|Out-Null
try{
    Ensure-Admin
    if($env:OS -ne 'Windows_NT'){throw 'Cari Studio Setup requires Windows.'}
    $arch=[System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()
    if($arch -ne 'X64'){throw "Cari Studio native target requires Windows x64. Detected $arch."}

    Write-Host '== Auditoría inicial ==' -ForegroundColor Cyan
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $audit
    $initial=$LASTEXITCODE
    if($CheckOnly){exit $initial}

    foreach($pkg in @('Git.Git','OpenJS.NodeJS.22','Kitware.CMake')){
        Write-Host "== Instalar $pkg ==" -ForegroundColor Cyan
        Invoke-WingetInstall $pkg
    }
    Write-Host '== Instalar Visual Studio Build Tools + C++ ==' -ForegroundColor Cyan
    Invoke-WingetInstall 'Microsoft.VisualStudio.BuildTools' '--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended'
    Write-Host '== Instalar FFmpeg ==' -ForegroundColor Cyan
    Invoke-WingetInstall 'Gyan.FFmpeg'
    Refresh-Path

    foreach($tool in @('git.exe','node.exe','npm.cmd','cmake.exe','ctest.exe')){
        if(-not (Get-Command $tool -ErrorAction SilentlyContinue)){throw "No se encontró $tool después de la instalación."}
    }
    if(-not (Get-Command 'ffmpeg.exe' -ErrorAction SilentlyContinue)){
        $wingetRoot=Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages'
        $found=Get-ChildItem $wingetRoot -Filter 'ffmpeg.exe' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        if($found){$env:CARI_FFMPEG_EXECUTABLE=$found.FullName}
        else{throw 'No se encontró ffmpeg.exe después de la instalación.'}
    }
    if(-not (Get-Command 'ffprobe.exe' -ErrorAction SilentlyContinue)){
        $probe=Get-ChildItem (Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages') -Filter 'ffprobe.exe' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        if($probe){$env:Path += ';' + $probe.DirectoryName}
    }

    if(-not $SkipNpm){
        $shell=Join-Path $repoRoot 'experimental\studio\electron-shell'
        Push-Location $shell
        try{
            if(Test-Path 'package-lock.json'){& npm.cmd ci}else{& npm.cmd install}
            if($LASTEXITCODE -ne 0){throw "npm install/ci failed with exit code $LASTEXITCODE."}
            & npm.cmd run check
            if($LASTEXITCODE -ne 0){throw "npm run check failed with exit code $LASTEXITCODE."}
            & npm.cmd test
            if($LASTEXITCODE -ne 0){throw "npm test failed with exit code $LASTEXITCODE."}
        }finally{Pop-Location}
    }

    if(-not $SkipBuild){
        Write-Host '== Compilar y validar Native Windows ==' -ForegroundColor Cyan
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $validator -SkipElectron
        if($LASTEXITCODE -ne 0){throw "Native Windows validation failed with exit code $LASTEXITCODE."}
    }

    Write-Host '== Auditoría final ==' -ForegroundColor Cyan
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $audit
    $final=$LASTEXITCODE
    @(
        "Cari Studio setup: $(Get-Date -Format o)"
        "Initial audit code: $initial"
        "Final audit code: $final"
        "SkipBuild: $SkipBuild"
        "SkipNpm: $SkipNpm"
        "Log: $log"
    )|Set-Content (Join-Path $logDir 'LAST_SETUP.txt') -Encoding UTF8
    if($final -ne 0){
        Write-Host 'Setup completado, pero la auditoría detectó advertencias o fallos.' -ForegroundColor Yellow
        exit $final
    }
    Write-Host 'Cari Studio: entorno preparado y auditoría PASS.' -ForegroundColor Green
    exit 0
}catch{
    $_|Out-String|Tee-Object -FilePath (Join-Path $logDir 'LAST_SETUP_ERROR.txt')|Write-Host
    exit 1
}finally{Stop-Transcript|Out-Null}
