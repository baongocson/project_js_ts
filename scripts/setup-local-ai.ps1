$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = Join-Path $taskRoot '.artifact-work/ollama'
$version = 'v0.40.16'
$assetName = 'ollama-windows-amd64.zip'
$archive = Join-Path $runtimeRoot $assetName
$runtime = Join-Path $runtimeRoot 'runtime'
New-Item -ItemType Directory -Force -Path $runtimeRoot | Out-Null
if (!(Test-Path -LiteralPath (Join-Path $runtime 'ollama.exe'))) {
  $release = Invoke-RestMethod "https://api.github.com/repos/ollama/ollama/releases/tags/$version"
  $asset = $release.assets | Where-Object name -EQ $assetName
  if (!$asset -or $asset.digest -notmatch '^sha256:([0-9a-f]{64})$') { throw 'Missing official SHA-256 digest.' }
  $expectedHash = $Matches[1]
  if (!(Test-Path -LiteralPath $archive)) {
    & curl.exe -L --fail --retry 3 -o $archive $asset.browser_download_url
    if ($LASTEXITCODE -ne 0) { throw 'Ollama download failed.' }
  }
  if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedHash) { throw 'Ollama archive checksum mismatch. Remove the archive and retry.' }
  Expand-Archive -LiteralPath $archive -DestinationPath $runtime -Force
}
& (Join-Path $PSScriptRoot 'start-local-ai.ps1')
if ($LASTEXITCODE -ne 0) { throw 'Cannot start local Ollama.' }
$env:OLLAMA_HOST = '127.0.0.1:11434'
& (Join-Path $runtime 'ollama.exe') pull qwen3:4b
if ($LASTEXITCODE -ne 0) { throw 'Qwen3 4B download failed.' }
Write-Output 'Qwen3 4B is ready. Start the app with npm run dev.'
