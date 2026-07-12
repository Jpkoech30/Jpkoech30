# HANDOFF Protocol

> Every agent-to-agent transfer follows strict rules defined in `.agency/AGENCY-RULES.md §8`

## Commit Body Requirements

Every commit MUST include these 6 fields in the body:

```
HANDOFF:<next-agent-slug>
ARTIFACTS:<comma-separated-files>
CONTRACT:<contract-id-or-none>
STATUS:passed|failed|blocked
MEMORY:<uuid-from-memory.js-store>
SCOPE:project|global
```

### Field Reference

| Field | Required | Values | Description |
|-------|----------|--------|-------------|
| `HANDOFF` | ✅ | Agent slug | Who gets the task next |
| `ARTIFACTS` | ✅ | File paths | What was produced |
| `CONTRACT` | ✅ | Contract ID or `none` | Which API contract was used |
| `STATUS` | ✅ | `passed`, `failed`, `blocked` | Task outcome |
| `MEMORY` | ✅ | UUID | Memory store reference for traceability |
| `SCOPE` | ✅ | `project`, `global` | Which ORCHESTRATION.md to update |

### STATUS:BLOCKED Escalation

If `STATUS:blocked`, the handoff system automatically:
1. Writes a timestamped entry to `.agency/reports/blocked-tasks.md`
2. Logs a critical-level event to telemetry
3. Creates a traceable record for manual review

## The handoff.js Script

```bash
node .agency/scripts/handoff.js \
  --from    <current-agent-slug> \
  --to      <next-agent-slug> \
  --task    "<task-description>" \
  --status  <PASSED|FAILED|BLOCKED> \
  --artifacts "<comma-separated-files>" \
  --model   <model-used> \
  --contract <contract-id> \
  --scope   <project|global>
```

## Triage Router

Small tasks (≤100 words) and hotfix/patch keywords bypass the Lead Architect:

```bash
node .agency/scripts/handoff.js \
  --from lead-architect \
  --to frontend-lead \        # Bypassed — routed to squad lead
  --task "fix button color" \
  --word-count 4 \            # Triggers triage bypass
  --status PASSED
```

## Related

- [Enforcement gates →](05-enforcement.md)
- [Workflow pipelines →](02-workflow.md)
