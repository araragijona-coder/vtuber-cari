param(
  [Parameter(Mandatory = $false)][string]$InputFbx = "",
  [Parameter(Mandatory = $false)][string]$OutputVrm = "",
  [string]$Blender = "blender.exe",
  [string]$Config = "$PSScriptRoot\cari_v1_vrm_pipeline.json",
  [string]$Report = "",
  [switch]$Preflight
)
$ErrorActionPreference = "Stop"

$scriptPath = Join-Path $PSScriptRoot "cari_vrm_pipeline.py"
$args = @("--background","--python",$scriptPath,"--")

if ($Preflight) {
  $args += @("--preflight")
  if ($Report) { $args += @("--report",$Report) }
} else {
  if (-not $InputFbx) { throw "InputFbx is required unless -Preflight is used." }
  if (-not $OutputVrm) { throw "OutputVrm is required unless -Preflight is used." }
  if (-not (Test-Path -LiteralPath $InputFbx)) { throw "FBX not found: $InputFbx" }
  $args += @(
    "--input",(Resolve-Path -LiteralPath $InputFbx).Path,
    "--output",$OutputVrm,
    "--config",$Config
  )
  if ($Report) { $args += @("--report",$Report) }
}

& $Blender @args
if ($LASTEXITCODE -ne 0) { throw "Cari VRM pipeline failed with exit code $LASTEXITCODE" }

if ($Preflight) {
  Write-Host "Cari VRM pipeline preflight completed."
} else {
  Write-Host "Cari VRM pipeline completed."
}
