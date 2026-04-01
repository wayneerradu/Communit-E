param(
  [string]$BaseUrl = "http://localhost:3010",
  [string]$Token = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Token)) {
  $envPath = Join-Path $PSScriptRoot "..\\.env"
  if (Test-Path $envPath) {
    $tokenLine = Get-Content $envPath | Where-Object { $_ -match '^JOB_RUNNER_TOKEN=' } | Select-Object -First 1
    if ($tokenLine) {
      $Token = (($tokenLine -split '=', 2)[1]).Trim().Trim('"')
    }
  }
}

if ([string]::IsNullOrWhiteSpace($Token)) {
  Write-Output "JOB_RUNNER_TOKEN missing. Skipping deferred Telegram job."
  exit 1
}

$uri = "$($BaseUrl.TrimEnd('/'))/api/jobs/telegram-deferred"
$headers = @{
  "x-job-token" = $Token
}

$response = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -TimeoutSec 30
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Output "[$timestamp] Deferred Telegram job ok. Processed=$($response.deferred.processed) Sent=$($response.deferred.sent) Failed=$($response.deferred.failed) Pending=$($response.deferred.pending)"
