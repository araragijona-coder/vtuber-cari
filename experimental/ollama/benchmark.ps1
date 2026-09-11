param(
    [string[]]$Models = @("llama3.2:1b", "qwen3:0.6b"),
    [string]$Endpoint = "http://127.0.0.1:11434/api/chat"
)

$ErrorActionPreference = "Stop"

Write-Host "Cari Ollama local benchmark"
Write-Host "Endpoint: $Endpoint"
Write-Host "This script is experimental and does not modify Cari."

try {
    $null = Get-Command ollama -ErrorAction Stop
} catch {
    throw "Ollama executable was not found in PATH. Install Ollama first."
}

foreach ($model in $Models) {
    Write-Host "`n=== $model ==="
    $tags = & ollama list 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to query 'ollama list'."
    }
    if (-not ($tags | Select-String -SimpleMatch $model)) {
        Write-Warning "Model '$model' is not installed; skipping."
        continue
    }

    $payload = @{
        model = $model
        stream = $false
        think = $false
        messages = @(
            @{
                role = "system"
                content = "Eres Cari, una VTuber amistosa. Responde en español, breve y natural."
            },
            @{
                role = "user"
                content = "Di hola, explica en una frase que estás funcionando localmente y termina con una pregunta corta."
            }
        )
        options = @{ temperature = 0.7 }
    } | ConvertTo-Json -Depth 8

    $started = Get-Date
    try {
        $response = Invoke-RestMethod -Uri $Endpoint -Method Post -ContentType "application/json" -Body $payload -TimeoutSec 120
        $elapsed = ((Get-Date) - $started).TotalSeconds
        $text = $response.message.content
        Write-Host ("Elapsed: {0:N2}s" -f $elapsed)
        Write-Host "Response: $text"
    } catch {
        $elapsed = ((Get-Date) - $started).TotalSeconds
        Write-Warning ("Request failed after {0:N2}s: {1}" -f $elapsed, $_.Exception.Message)
    }
}
