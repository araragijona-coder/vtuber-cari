$ErrorActionPreference = "Stop"

# Experimental only: this script never changes Cari's main runtime.
# It checks whether Ollama is installed, reachable, and has the selected model.
# Usage:
#   .\experimental\ollama\smoke.ps1
#   $env:CARI_OLLAMA_MODEL = "llama3.2:1b"
#   .\experimental\ollama\smoke.ps1

$model = if ($env:CARI_OLLAMA_MODEL) { $env:CARI_OLLAMA_MODEL } else { "qwen3:0.6b" }
$endpoint = if ($env:CARI_OLLAMA_ENDPOINT) { $env:CARI_OLLAMA_ENDPOINT } else { "http://127.0.0.1:11434" }

if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
    Write-Error "Ollama no está instalado o no está en PATH."
}

Write-Host "[1/3] Comprobando Ollama en $endpoint ..."
try {
    $tags = Invoke-RestMethod -Uri "$endpoint/api/tags" -Method Get -TimeoutSec 5
} catch {
    Write-Error "Ollama no responde en $endpoint. Inícialo antes de ejecutar esta prueba."
}

$found = $tags.models | Where-Object { $_.name -eq $model -or $_.model -eq $model }
if (-not $found) {
    Write-Error "El modelo '$model' no está instalado. Ejecuta: ollama pull $model"
}

Write-Host "[2/3] Modelo encontrado: $model"
$body = @{
    model = $model
    stream = $false
    think = $false
    messages = @(@{ role = "user"; content = "Responde solamente: CARI_LOCAL_OK" })
} | ConvertTo-Json -Depth 5

Write-Host "[3/3] Ejecutando una inferencia local ..."
$response = Invoke-RestMethod -Uri "$endpoint/api/chat" -Method Post -ContentType "application/json" -Body $body -TimeoutSec 60
$content = $response.message.content
if ([string]::IsNullOrWhiteSpace($content)) {
    Write-Error "Ollama respondió sin contenido."
}

Write-Host "OK: Ollama funciona localmente con '$model'."
Write-Host "Respuesta: $content"
