# Handoff Validation Script
# Validates that HANDOFF targets exist in .agency/config.json
# Usage: .agency/scripts/validate-handoff.ps1 -CommitMessage "feat(api): ...`n`nHANDOFF:frontend-web"

param(
    [string]$CommitMessage = ""
)

# If no commit message provided, check the most recent commit
if (-not $CommitMessage) {
    try {
        $CommitMessage = git log -1 --format=%B
    } catch {
        Write-Host "Could not read git commit message. Run manually with -CommitMessage parameter." -ForegroundColor Yellow
        exit 1
    }
}

# Extract HANDOFF target
$handoffMatch = [regex]::Match($CommitMessage, 'HANDOFF:(\S+)')
if (-not $handoffMatch.Success) {
    Write-Host "No HANDOFF tag found in commit message. Skipping validation." -ForegroundColor Yellow
    exit 0
}

$handoffTarget = $handoffMatch.Groups[1].Value

# Read .agency/config.json
$configPath = ".agency/config.json"
if (-not (Test-Path $configPath)) {
    Write-Host "WARNING: .agency/config.json not found. Cannot validate HANDOFF target." -ForegroundColor Yellow
    exit 0
}

try {
    $config = Get-Content $configPath -Raw | ConvertFrom-Json
} catch {
    Write-Host "ERROR: Could not parse .agency/config.json" -ForegroundColor Red
    exit 1
}

# Check if target is in enabled agents
$enabledAgents = $config.agents.enabled
if ($handoffTarget -notin $enabledAgents) {
    Write-Host "ERROR: HANDOFF target '$handoffTarget' is not in .agency/config.json -> agents.enabled" -ForegroundColor Red
    Write-Host "Valid targets: $($enabledAgents -join ', ')" -ForegroundColor Yellow
    exit 1
}

Write-Host "HANDOFF target '$handoffTarget' validated successfully." -ForegroundColor Green
exit 0
