param(
  [Parameter(Mandatory = $true)][string]$InputFbx,
  [Parameter(Mandatory = $true)][string]$OutputVrm,
  [string]$Blender = "blender.exe",
  [string]$Config = "$PSScriptRoot\cari_v1_vrm_pipeline.json",
  [string]$Report = ""
)
$ErrorActionPreference = "Stop"
if (-not (Test-Path -LiteralPath $InputFbx)) { throw "FBX not found: $InputFbx" }
$scriptPath = Join-Path $PSScriptRoot "cari_vrm_pipeline.py"
$args = @("--background","--python",$scriptPath,"--","--input",(Resolve-Path -LiteralPath $InputFbx).Path,"--output",$OutputVrm,"--config",$Config)
if ($Report) { $args += @("--report",$Report) }
& $Blender @args
if ($LASTEXITCODE -ne 0) { throw "Cari VRM pipeline failed with exit code $LASTEXITCODE" }
Write-Host "Cari VRM pipeline completed."