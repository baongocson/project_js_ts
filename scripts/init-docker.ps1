$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $projectRoot '.env.docker'
if (Test-Path -LiteralPath $envPath) {
    Write-Output '.env.docker already exists; keeping the current secret.'
    exit 0
}
$secretBytes = New-Object byte[] 48
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($secretBytes) } finally { $rng.Dispose() }
$secret = [Convert]::ToBase64String($secretBytes)
[System.IO.File]::WriteAllText($envPath, "AUTH_ACCESS_TOKEN_SECRET=$secret`n", (New-Object System.Text.UTF8Encoding($false)))
Write-Output 'Created .env.docker with a random authentication secret (not displayed).'
