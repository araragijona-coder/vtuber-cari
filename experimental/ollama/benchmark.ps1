param(
    [string[]]$Models = @("llama3.2:1b-instruct-q4_0", "llama3.2:1b", "qwen3:0.6b"),
    [string]$Endpoint = "http://127.0.0.1:11434/api/chat",
    [int]$Runs = 2
)

$ErrorActionPreference = "Stop"

Write-Host "Cari Ollama local benchmark"
Write-Host "Endpoint: $Endpoint"
Write-Host "Runs per model: $Runs"
Write-Host "This script is experimental and does not modify Cari."
Write-Host "Metrics: wall time, Ollama duration, generated tokens and tokens/sec when available."

if ($Runs -lt 1) { throw "Runs must be at least 1." }

try {
    $null = Get-Command ollama -ErrorAction Stop
} catch {
    throw "Ollama executable was not found in PATH. Install Ollama first."
}

$tags = & ollama list 2>$null
if ($LASTEXITCODE -ne 0) {
    throw "Unable to query 'ollama list'."
}

$prompt = "Eres Cari, una VTuber amistosa. Responde en español, breve y natural. Di hola, explica en una frase que estás funcionando localmente y termina con una pregunta corta."

foreach ($model in $Models) {
    Write-Host "`n=== $model ==="
    if (-not ($tags | Select-String -SimpleMatch $model)) {
        Write-Warning "Model '$model' is not installed; skipping."
        continue
    }

    $durations = @()
    $tokenRates = @()

    for ($run = 1; $run -le $Runs; $run++) {
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
                    content = $prompt
                }
            )
            options = @{ temperature = 0.2 }
        } | ConvertTo-Json -Depth 8

        $started = Get-Date
        try {
            $response = Invoke-RestMethod -Uri $Endpoint -Method Post -ContentType "application/json" -Body $payload -TimeoutSec 120
            $elapsed = ((Get-Date) - $started).TotalSeconds
            $durations += $elapsed
            $text = $response.message.content

            $serverDuration = if ($response.total_duration) { [double]$response.total_duration / 1e9 } else { $null }
            $evalTokens = if ($response.eval_count) { [int]$response.eval_count } else { $null }
            $evalSeconds = if ($response.eval_duration) { [double]$response.eval_duration / 1e9 } else { $null }
            $tokenRate = if ($evalTokens -and $evalSeconds -and $evalSeconds -gt 0) { $evalTokens / $evalSeconds } else { $null }
            if ($tokenRate) { $tokenRates += $tokenRate }

            Write-Host ("Run {0}: wall={1:N2}s" -f $run, $elapsed)
            if ($serverDuration) { Write-Host ("  Ollama total={0:N2}s" -f $serverDuration) }
            if ($evalTokens) { Write-Host ("  generated tokens={0}" -f $evalTokens) }
            if ($tokenRate) { Write-Host ("  generation speed={0:N2} tok/s" -f $tokenRate) }
            Write-Host "  Response: $text"
        } catch {
            $elapsed = ((Get-Date) - $started).TotalSeconds
            Write-Warning ("Run {0} failed after {1:N2}s: {2}" -f $run, $elapsed, $_.Exception.Message)
        }
    }

    if ($durations.Count -gt 0) {
        $avgWall = ($durations | Measure-Object -Average).Average
        Write-Host ("Summary: successful runs={0}/{1}, avg wall={2:N2}s" -f $durations.Count, $Runs, $avgWall)
    }
    if ($tokenRates.Count -gt 0) {
        $avgRate = ($tokenRates | Measure-Object -Average).Average
        Write-Host ("Average generation speed={0:N2} tok/s" -f $avgRate)
    }
}
