[CmdletBinding()]
param(
    [switch]$InstallOllama,
    [string]$OllamaModel = "llama3.2:1b"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $root "data\install-logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$log = Join-Path $logDir "install-$stamp.log"

function Write-Step([string]$Name, [scriptblock]$Action) {
    Write-Host ""
    Write-Host "=== $Name ===" -ForegroundColor Cyan
    try {
        & $Action
        if ($LASTEXITCODE -ne 0) { throw "El programa devolvió código $LASTEXITCODE." }
        Write-Host "OK: $Name" -ForegroundColor Green
    } catch {
        $message = "FAILED: $Name`n$($_.Exception.Message)`n`nLog: $log"
        Write-Host $message -ForegroundColor Red
        $message | Set-Content -Encoding UTF8 (Join-Path $root "data\last-install-error.txt")
        Read-Host "La instalación se detuvo. Copia el mensaje anterior y pásamelo. Pulsa ENTER para cerrar"
        exit 1
    }
}

Start-Transcript -Path $log -Append | Out-Null
try {
    Write-Host "Cari - instalación segura y paso a paso" -ForegroundColor Magenta
    Write-Host "No se continúa después de un error. Cada paso se verifica antes del siguiente."

    Write-Step "Comprobar Windows/Python" {
        $python = Get-Command python -ErrorAction Stop
        & $python.Source --version
    }

    Write-Step "Crear entorno virtual" {
        $venv = Join-Path $root ".venv"
        if (-not (Test-Path $venv)) { & python -m venv $venv }
        if (-not (Test-Path (Join-Path $venv "Scripts\python.exe"))) { throw "No apareció .venv\Scripts\python.exe." }
    }

    $venvPython = Join-Path $root ".venv\Scripts\python.exe"

    Write-Step "Actualizar herramientas de empaquetado" {
        & $venvPython -m pip install --upgrade pip
    }

    if (Test-Path (Join-Path $root "requirements.txt")) {
        Write-Step "Instalar dependencias declaradas" {
            & $venvPython -m pip install -r (Join-Path $root "requirements.txt")
        }
    }

    Write-Step "Compilar Python" {
        & $venvPython -m compileall -q (Join-Path $root "app") (Join-Path $root "tests")
    }

    Write-Step "Ejecutar pruebas" {
        & $venvPython -m unittest discover -s (Join-Path $root "tests") -q
    }

    Write-Step "Comprobar Ollama sin arrancarlo a la fuerza" {
        $ollama = Get-Command ollama -ErrorAction SilentlyContinue
        if ($null -eq $ollama) {
            Write-Host "Ollama no está instalado. Se deja sin instalar porque es opcional."
        } else {
            & $ollama.Source --version
            try {
                $tags = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 2
                Write-Host "Ollama responde en localhost:11434."
                $names = @($tags.models | ForEach-Object { $_.name })
                if ($names -contains $OllamaModel) { Write-Host "Modelo encontrado: $OllamaModel" }
                else { Write-Host "Modelo $OllamaModel no está descargado. No se descarga automáticamente." }
            } catch {
                Write-Host "Ollama instalado pero su servicio no responde todavía. No se fuerza el arranque."
            }
        }
    }

    if ($InstallOllama) {
        Write-Step "Instalar Ollama mediante WinGet" {
            $winget = Get-Command winget -ErrorAction Stop
            & $winget.Source install --id Ollama.Ollama --exact --accept-source-agreements --accept-package-agreements
            $ollamaAfter = Get-Command ollama -ErrorAction Stop
            & $ollamaAfter.Source --version
        }
    }

    Write-Host ""
    Write-Host "INSTALACIÓN/VERIFICACIÓN TERMINADA SIN ERRORES." -ForegroundColor Green
    Write-Host "Registro: $log"
} finally {
    Stop-Transcript | Out-Null
}
