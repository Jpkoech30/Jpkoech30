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

## Task-Closer.js — Lead Architect Fallback

When a subtask agent returns **text** (a summary) instead of running [`handoff.js`](.agency/scripts/handoff.js), the Lead Architect uses [`task-closer.js`](.agency/scripts/task-closer.js) to close the loop on their behalf.

### Usage

```bash
node .agency/scripts/task-closer.js \
  --agent <slug> \
  --task "<task-id>" \
  --artifacts "<comma-separated-files>" \
  --status <passed|failed|blocked> \
  --project <id> \
  --scope <project|global>

# Dry run — shows what would happen without making changes
node .agency/scripts/task-closer.js --dry-run
```

### What It Does

```
1. Check if git commit already exists for agent/task pair
   ├─ YES → skip commit, proceed to enforcement
   └─ NO  → create commit on behalf of agent
             git add -A
             git commit -m "feat(<task>): task completed by <agent>"
             with HANDOFF body fields

2. Run enforcement gates (POST → MIDDLE → COMMIT)
   enforcer.js post --agent <slug> --task <task> --project <id>
   enforcer.js middle --agent <slug> --task <task> --project <id>
   enforcer.js commit --agent <slug> --task <task> --msg "..."
```

### Why It Exists

- **Prevents orphan tasks** — Agents that "talk" instead of "do" still get their work committed
- **Enforcement chain preserved** — POST/MIDDLE/COMMIT gates run regardless of delivery method
- **Idempotent** — Duplicate-safe: if commit already exists, skips and just runs enforcement

## Blocking Git Operations

Since Sprint 20, [`handoff.js`](.agency/scripts/handoff.js) uses **blocking** (not silent/non-blocking) git operations. Both commit and push must succeed for a handoff to complete.

| Operation | Before Sprint 20 | After Sprint 20 | Code Location |
|-----------|-----------------|-----------------|---------------|
| **git add + commit** | Non-blocking | ⛔ **Blocking** — exit 1 on failure | [`handoff.js:401-403`](.agency/scripts/handoff.js:401) |
| **git push** | Non-blocking | ⛔ **Blocking** — exit 1 on failure | [`handoff.js:408-411`](.agency/scripts/handoff.js:408) |
| **Session state write** | N/A | ⛔ **Blocking** — exit 1 on failure | [`handoff.js:414-429`](.agency/scripts/handoff.js:414) |

### Failure Messages

```bash
# Commit failure
❌ Git commit FAILED (blocking):
   The handoff CANNOT proceed without a git commit.

# Push failure
❌ Git push FAILED (blocking):
   The handoff CANNOT proceed without a successful push.
   Check your remote credentials and network, then retry.
```

### Session State

After a successful push, [`handoff.js`](.agency/scripts/handoff.js) writes [`.agency/session-state.json`](.agency/session-state.json):

```json
{
  "lastHandoff": "2026-07-13T00:14:00.000Z",
  "fromAgent": "lead-architect",
  "toAgent": "documentarian",
  "task": "Update docs for Sprint 20",
  "status": "PASSED",
  "commitHash": "a1b2c3d"
}
```

This is read by `npm run recap` ([`recap.js`](.agency/scripts/recap.js)) to display "Last Session" context after VSCode restart.

## Related

- [Enforcement gates →](05-enforcement.md)
- [Workflow pipelines →](02-workflow.md)
- [Session recap →](02-workflow.md#session-context-recovery)
