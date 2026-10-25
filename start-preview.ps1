param([switch]$OpenBrowser)

$ErrorActionPreference = 'Stop'
$previewUrl = 'http://127.0.0.1:8080/'

function Test-Preview {
    try {
        $response = Invoke-WebRequest -Uri $previewUrl -UseBasicParsing -TimeoutSec 2
        return $response.StatusCode -eq 200 -and $response.Content.Contains('Sakura Floating Island')
    } catch { return $false }
}

if (Test-Preview) {
    Write-Output "Preview already running: $previewUrl"
    if ($OpenBrowser) { Start-Process $previewUrl }
    exit 0
}

# Keep the server attached to the user's terminal instead of launching a hidden
# child of an agent command. The Run action owns this long-lived terminal.
Write-Output "Starting preview: $previewUrl"
Write-Output 'Leave this terminal running. Ctrl+C stops the preview.'
$serverArguments = @('-u', (Join-Path $PSScriptRoot 'preview_server.py'))
if ($OpenBrowser) { $serverArguments += '--open' }
& python @serverArguments
exit $LASTEXITCODE
