$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = Join-Path $taskRoot '.artifact-work/ollama'
$ollamaExe = Join-Path $runtimeRoot 'runtime/ollama.exe'
try {
  $null = Invoke-RestMethod 'http://127.0.0.1:11434/api/tags' -TimeoutSec 2
  Write-Output 'Ollama is already listening on 127.0.0.1:11434.'
  exit 0
} catch { }
if (!(Test-Path -LiteralPath $ollamaExe)) {
  throw 'Ollama portable is missing. Run npm run ai:setup first.'
}
$env:OLLAMA_HOST = '127.0.0.1:11434'
$env:OLLAMA_MODELS = Join-Path $runtimeRoot 'models'
$env:OLLAMA_NO_CLOUD = '1'
$env:OLLAMA_CONTEXT_LENGTH = '4096'
New-Item -ItemType Directory -Force -Path $env:OLLAMA_MODELS | Out-Null
$process = Start-Process -FilePath $ollamaExe -ArgumentList 'serve' -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimeRoot 'server.out.log') -RedirectStandardError (Join-Path $runtimeRoot 'server.err.log')
for ($attempt = 0; $attempt -lt 20; $attempt++) {
  Start-Sleep -Milliseconds 500
  try {
    $null = Invoke-RestMethod 'http://127.0.0.1:11434/api/tags' -TimeoutSec 1
    Write-Output "Ollama started locally (PID $($process.Id))."
    exit 0
  } catch { if ($process.HasExited) { throw 'Ollama exited; inspect .artifact-work/ollama/server.err.log.' } }
}
throw 'Ollama did not become ready; inspect .artifact-work/ollama/server.err.log.'
