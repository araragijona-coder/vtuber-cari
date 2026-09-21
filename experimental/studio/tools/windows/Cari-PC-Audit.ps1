[CmdletBinding()]
param(
    [string]$OutputDir = (Join-Path $PSScriptRoot '..\..\..\validation-evidence\pc-audit'),
    [switch]$JsonOnly
)
$ErrorActionPreference = 'Stop'
function Add-Check {
    param([System.Collections.Generic.List[object]]$List,[string]$Area,[string]$Name,
          [ValidateSet('PASS','WARN','FAIL')][string]$Status,[string]$Details)
    $List.Add([pscustomobject]@{area=$Area;name=$Name;status=$Status;details=$Details}) | Out-Null
}
function Get-Tool([string]$Name,[string[]]$Args=@('--version')) {
    $cmd=Get-Command $Name -ErrorAction SilentlyContinue
    if($null -eq $cmd){return [pscustomobject]@{name=$Name;found=$false;version='';path='';status='MISSING'}}
    $v=''
    try{$v=((& $cmd.Source @Args 2>&1|Select-Object -First 1)|Out-String).Trim()}catch{$v=$_.Exception.Message}
    [pscustomobject]@{name=$Name;found=$true;version=$v;path=$cmd.Source;status='PASS'}
}
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$checks=[System.Collections.Generic.List[object]]::new()
if($env:OS -ne 'Windows_NT'){
    Add-Check $checks 'OS' 'Windows' 'FAIL' 'Windows is required.'
}else{
    Add-Check $checks 'OS' 'Windows' 'PASS' 'Windows detected.'
    $os=Get-CimInstance Win32_OperatingSystem
    $cs=Get-CimInstance Win32_ComputerSystem
    $cpu=Get-CimInstance Win32_Processor|Select-Object -First 1
    $gpus=@(Get-CimInstance Win32_VideoController)
    $ramGb=[math]::Round($cs.TotalPhysicalMemory/1GB,1)
    $systemDrive=Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$($env:SystemDrive)'"
    $freeGb=if($systemDrive){[math]::Round($systemDrive.FreeSpace/1GB,1)}else{0}
    $arch=[System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()
    if($arch -eq 'X64'){Add-Check $checks 'Hardware' 'Windows architecture' 'PASS' 'x64 detected.'}
    else{Add-Check $checks 'Hardware' 'Windows architecture' 'FAIL' "Detected $arch; native target is x64."}
    if($ramGb -ge 16){Add-Check $checks 'Hardware' 'RAM' 'PASS' "$ramGb GB."}
    elseif($ramGb -ge 8){Add-Check $checks 'Hardware' 'RAM' 'WARN' "$ramGb GB; less headroom for complete streaming/VTuber workloads."}
    else{Add-Check $checks 'Hardware' 'RAM' 'FAIL' "$ramGb GB; below current engineering baseline."}
    if($gpus.Count -gt 0){
        foreach($gpu in $gpus){Add-Check $checks 'Hardware' 'GPU' 'PASS' "$($gpu.Name) | Driver $($gpu.DriverVersion)"}
    }else{Add-Check $checks 'Hardware' 'GPU' 'FAIL' 'No Windows display adapter was reported.'}
    $d3d11=Join-Path $env:SystemRoot 'System32\d3d11.dll'
    if(Test-Path $d3d11){Add-Check $checks 'Windows Graphics' 'D3D11' 'PASS' $d3d11}
    else{Add-Check $checks 'Windows Graphics' 'D3D11' 'FAIL' 'd3d11.dll not found.'}
    try{
        $build=[int]$os.BuildNumber
        if($build -ge 17763){Add-Check $checks 'Windows Graphics' 'Windows build' 'PASS' "$($os.Caption) build $build"}
        else{Add-Check $checks 'Windows Graphics' 'Windows build' 'WARN' "Build $build is old for this target."}
    }catch{Add-Check $checks 'Windows Graphics' 'Windows build' 'WARN' $_.Exception.Message}
}
foreach($tool in @(
    (Get-Tool 'git.exe'),
    (Get-Tool 'node.exe'),
    (Get-Tool 'npm.cmd' @('--version')),
    (Get-Tool 'cmake.exe'),
    (Get-Tool 'ctest.exe'),
    (Get-Tool 'ffmpeg.exe'),
    (Get-Tool 'ffprobe.exe'),
    (Get-Tool 'winget.exe')
)){Add-Check $checks 'Toolchain' $tool.name $(if($tool.found){'PASS'}else{'WARN'}) $(if($tool.found){"$($tool.version) [$($tool.path)]"}else{'Not found in PATH.'})}

$vswhere=Join-Path $env:ProgramFiles 'Microsoft Visual Studio\Installer\vswhere.exe'
if(Test-Path $vswhere){
    $instances=((& $vswhere -products * -requires Microsoft.VisualStudio.Workload.VCTools -format json 2>$null)|Out-String).Trim()
    if($instances){Add-Check $checks 'Toolchain' 'Visual Studio C++ workload' 'PASS' 'Microsoft.VisualStudio.Workload.VCTools detected.'}
    else{Add-Check $checks 'Toolchain' 'Visual Studio C++ workload' 'FAIL' 'Visual Studio is present but required C++ workload was not detected.'}
}else{Add-Check $checks 'Toolchain' 'Visual Studio C++ workload' 'FAIL' 'vswhere.exe not found.'}

$root=(Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$nativeCandidates=@(
    (Join-Path $root 'experimental\studio\native-windows\build\Release\cari-studio-native.exe'),
    (Join-Path $root 'experimental\studio\native-windows\build-validation\Release\cari-studio-native.exe')
)
$native=$nativeCandidates|Where-Object{Test-Path $_}|Select-Object -First 1
if($native){Add-Check $checks 'Cari Studio' 'Native executable' 'PASS' $native}
else{Add-Check $checks 'Cari Studio' 'Native executable' 'WARN' 'Not built yet.'}
$shell=Join-Path $root 'experimental\studio\electron-shell'
if(Test-Path (Join-Path $shell 'package.json')){Add-Check $checks 'Cari Studio' 'Electron manifest' 'PASS' 'package.json detected.'}
else{Add-Check $checks 'Cari Studio' 'Electron manifest' 'FAIL' 'package.json missing.'}
if(Test-Path (Join-Path $shell 'node_modules')){Add-Check $checks 'Cari Studio' 'Electron dependencies' 'PASS' 'node_modules detected.'}
else{Add-Check $checks 'Cari Studio' 'Electron dependencies' 'WARN' 'node_modules missing.'}

$ffmpeg=Get-Command ffmpeg.exe -ErrorAction SilentlyContinue
if($ffmpeg){
    $encoders=(& $ffmpeg.Source -hide_banner -encoders 2>&1|Out-String)
    foreach($codec in @('libx264','aac')){
        if($encoders -match [regex]::Escape($codec)){Add-Check $checks 'FFmpeg' "Encoder $codec" 'PASS' 'Encoder reported by FFmpeg.'}
        else{Add-Check $checks 'FFmpeg' "Encoder $codec" 'WARN' "Encoder $codec not reported."}
    }
}
try{
    $cams=@(Get-PnpDevice -Class Camera -ErrorAction Stop|Where-Object Status -eq 'OK')
    if($cams.Count -gt 0){foreach($cam in $cams){Add-Check $checks 'Capture' 'Camera' 'PASS' $cam.FriendlyName}}
    else{Add-Check $checks 'Capture' 'Camera' 'WARN' 'No camera reported; tracking camera is optional.'}
}catch{Add-Check $checks 'Capture' 'Camera' 'WARN' 'Camera enumeration unavailable.'}
try{
    $media=@(Get-PnpDevice -Class Media -ErrorAction Stop|Where-Object Status -eq 'OK')
    if($media.Count -gt 0){Add-Check $checks 'Audio' 'Windows media devices' 'PASS' "$($media.Count) active Media-class device(s)."}
    else{Add-Check $checks 'Audio' 'Windows media devices' 'WARN' 'No active Media-class device reported.'}
}catch{Add-Check $checks 'Audio' 'Windows media devices' 'WARN' 'Audio enumeration unavailable.'}

$obs=Join-Path $env:ProgramFiles 'obs-studio\bin\64bit\obs64.exe'
if(Test-Path $obs){Add-Check $checks 'Optional' 'OBS Studio' 'PASS' "Installed at $obs; OBS is optional."}
else{Add-Check $checks 'Optional' 'OBS Studio' 'WARN' 'OBS not installed; this is allowed.'}
foreach($item in @(
    @{name='MediaPipe model';value=$env:CARI_MEDIAPIPE_MODEL_PATH},
    @{name='Avatar model';value=$env:CARI_AVATAR_MODEL_PATH}
)){
    if($item.value -and (Test-Path $item.value)){Add-Check $checks 'Optional' $item.name 'PASS' $item.value}
    else{Add-Check $checks 'Optional' $item.name 'WARN' 'No local model path configured.'}
}

$fail=@($checks|Where-Object status -eq 'FAIL').Count
$warn=@($checks|Where-Object status -eq 'WARN').Count
$pass=@($checks|Where-Object status -eq 'PASS').Count
$report=[pscustomobject]@{
    timestamp=(Get-Date).ToUniversalTime().ToString('o')
    computer=$env:COMPUTERNAME
    checks=$checks
    summary=@{
        pass=$pass;warn=$warn;fail=$fail
        result=if($fail -eq 0){if($warn -eq 0){'READY'}else{'READY_WITH_WARNINGS'}}else{'NOT_READY'}
    }
    hardware=@{
        cpu=if($cpu){$cpu.Name}else{''}
        cores=if($cpu){$cpu.NumberOfLogicalProcessors}else{0}
        ram_gb=$ramGb
        system_drive_free_gb=$freeGb
        gpu_names=@($gpus|ForEach-Object Name)
    }
    os=@{
        caption=if($os){$os.Caption}else{'Windows'}
        version=if($os){$os.Version}else{''}
        build=if($os){$os.BuildNumber}else{''}
        architecture=if($arch){$arch}else{$env:PROCESSOR_ARCHITECTURE}
    }
}
$json=Join-Path $OutputDir 'pc-compatibility.json'
$txt=Join-Path $OutputDir 'pc-compatibility.txt'
$report|ConvertTo-Json -Depth 8|Set-Content $json -Encoding UTF8
@(
    'Cari Studio — PC compatibility audit'
    "RESULT: $($report.summary.result)"
    "PASS=$pass WARN=$warn FAIL=$fail"
    "CPU=$($report.hardware.cpu)"
    "RAM=$($report.hardware.ram_gb) GB"
    "GPU=$($report.hardware.gpu_names -join ', ')"
    "OS=$($report.os.caption) build $($report.os.build) $($report.os.architecture)"
    ''
    'CHECKS:'
)+@($checks|ForEach-Object{"[$($_.status)] [$($_.area)] $($_.name) — $($_.details)"})|Set-Content $txt -Encoding UTF8
if(-not $JsonOnly){
    Write-Host ''
    Write-Host "Cari Studio — PC Compatibility: $($report.summary.result)" -ForegroundColor Cyan
    foreach($c in $checks){
        $color=switch($c.status){'PASS'{'Green'}'WARN'{'Yellow'}default{'Red'}}
        Write-Host "[$($c.status)] $($c.area) / $($c.name): $($c.details)" -ForegroundColor $color
    }
    Write-Host "JSON: $json"
    Write-Host "TXT:  $txt"
}
exit $(if($fail -eq 0){0}else{2})
