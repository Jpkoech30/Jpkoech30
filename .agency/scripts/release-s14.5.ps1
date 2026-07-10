# Update ORCHESTRATION.md - add handoff log entry
$orchestration = Get-Content "ORCHESTRATION.md" -Raw

# Find the last handoff entry and append a new one
$handoffEntry = "| 2026-07-09 | 📦 Release Manager | 🧠 Lead Architect | 14.5 — Release v1.0.2 | HANDOFF:lead-architect | DONE |"
$orchestration = $orchestration -replace "(?m)(\| 2026-07-09 \| 🧪 QA Automator \| 📦 Release Manager \| 14\.4 — QA Frontend Regression \| `HANDOFF:release-manager` \| `DONE` \|)", "`$1`n$handoffEntry"

Set-Content "ORCHESTRATION.md" $orchestration

# Update COST-LEDGER.md - add S14.5 entry
$costLedger = Get-Content "COST-LEDGER.md" -Raw

# Find the last sprint entry and append S14.5
$sprintEntry = "| **S14.5** | Release v1.0.2 (tag, changelog, version bump) | deepseek-v4-flash | 15K / 3K / 8K | \$0.001 | 5m | release-manager | 2026-07-09 |"
