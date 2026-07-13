# Enforcement Gates — enforcer.js

> 4-phase state machine that every task must pass through.

## The 4 Phases

```
PRE ──→ POST ──→ MIDDLE ──→ COMMIT ──→ HANDOFF
 │        │         │          │          │
 ▼        ▼         ▼          ▼          ▼
oath    memory    contract   message    logged to
check   stored?   schema     has all    enforcement
session temp      valid?     required   DB, next
created clean?               fields?    agent
        sentinel
        gone?
```

## Phase Details

### PRE — Task Start

```bash
node .agency/scripts/enforcer.js pre \
  --agent <slug> \
  --task "<description>" \
  --project <id> \
  --embed "<agent-interpreted-task-summary>"
```

**Checks:**
- Agent recites the canonical oath
- Semantic verification via trigram cosine similarity (threshold: 0.65)
- Enforcement session created in `.agency/enforcer/enforcer.db`
- `.active-sessions.lock` touched (prevents cron collision)

### POST — Quality Check

```bash
node .agency/scripts/enforcer.js post \
  --agent <slug> \
  --task "<id>" \
  --project <id>
```

**Checks (C1–C3):**
- **C1:** Memory stored via `memory.js check`
- **C2:** No temp files (`temp-*`, `*.bak`, `ROO-*`)
- **C3:** No stale sentinels (`.preflight-passed` removed)

### MIDDLE — Contract Validation

```bash
node .agency/scripts/enforcer.js middle \
  --agent <slug> \
  --task "<id>" \
  --project <id> \
  --contract <contract-id>
```

**Checks:**
- All `.agency/contracts/*.json` files parsed and validated
- Each requires: `contractId`, `version`
- Endpoints require: `method` + `path`
- Types require: `name` or `typeName`
- **Fails → blocks COMMIT** with specific error messages

### COMMIT — Message Validation

```bash
node .agency/scripts/enforcer.js commit \
  --agent <slug> \
  --task "<id>" \
  --project <id> \
  --msg "<commit-message>"
```

**Checks:**
- Message contains all 6 required fields:
  `HANDOFF`, `ARTIFACTS`, `CONTRACT`, `STATUS`, `MEMORY`, `SCOPE`
- Rejects with specific missing fields if incomplete

### HANDOFF — Transfer

```bash
node .agency/scripts/enforcer.js handoff \
  --from <agent> \
  --to <next-agent> \
  --task "<id>" \
  --project <id>
```

**Actions:**
- Logs handoff to enforcement DB
- Removes `.active-sessions.lock`
- Next agent receives the task

## Pre-Commit Hook — Oath Enforcement

The [`pre-commit`](.husky/pre-commit) hook (Husky v9) blocks `git commit` if the agent hasn't recited the oath first.

### How It Works

```
agent runs enforcer.js pre
  ─→ writes .agency/.agent-slug with agent slug
  ─→ creates enforcement session in enforcer.db

agent runs git commit
  ─→ pre-commit hook reads .agent-slug
  ─→ runs enforcer.js check --agent <slug>
  ─→ blocks (exit 1) if no PRE session found
  ─→ allows commit if PRE session verified
```

### The `.agent-slug` File

| Aspect | Detail |
|--------|--------|
| **Location** | [`.agency/.agent-slug`](.agency/.agent-slug) |
| **Created by** | `enforcer.js pre` ([`enforcer.js:260-268`](.agency/scripts/enforcer.js:260)) |
| **Content** | The current agent's slug (e.g. `documentarian`) |
| **Purpose** | Allows `pre-commit` hook to know **which agent** is working (not which ran `git`) |
| **Blocking** | Failure to write → PRE phase fails → `process.exit(1)` |

### The Pre-Commit Hook

Located at [`.husky/pre-commit`](.husky/pre-commit):

```js
// Pseudocode
const agent = fs.readFileSync('.agency/.agent-slug', 'utf-8').trim();
execSync(`node .agency/scripts/enforcer.js check --agent "${agent}"`);
// → exit 0: PRE verified → commit proceeds
// → exit 1: PRE missing → commit blocked
```

**Edge cases:**
- **No `.agent-slug` file** — Hook warns but does NOT block (allows manual commits)
- **Stale slug** — `enforcer.js check` respects TTL (1 hour), auto-resets expired sessions
- **Hook not installed** — `npm run prepare` (Husky install) must be run after clone

## Telemetry Integration

Every enforcement phase logs to telemetry via [`telemetry.js`](.agency/scripts/telemetry.js). Logging is **blocking** — if telemetry fails, the phase fails.

| Phase | Telemetry Event | Code Location |
|-------|----------------|---------------|
| **PRE** | `agent_invocation — start` | [`enforcer.js:270-276`](.agency/scripts/enforcer.js:270) |
| **POST** | `agent_invocation — complete` | [`enforcer.js:422-428`](.agency/scripts/enforcer.js:422) |
| **COMMIT** | `agent_invocation — commit` | [`enforcer.js:555-561`](.agency/scripts/enforcer.js:555) |
| **HANDOFF** | `handoff — <from>→<to>` | [`enforcer.js:587-593`](.agency/scripts/enforcer.js:587) |

```bash
# Manual telemetry test
node .agency/scripts/telemetry.js log \
  --event agent_invocation \
  --agent documentarian \
  --task "doc-update" \
  --status IN_PROGRESS \
  --subEvent start
```

## Session State

After a successful handoff (commit + push), [`handoff.js`](.agency/scripts/handoff.js) writes a session state snapshot to [`.agency/session-state.json`](.agency/session-state.json):

```json
{
  "lastHandoff": "2026-07-13T00:14:00.000Z",
  "fromAgent": "lead-architect",
  "toAgent": "documentarian",
  "task": "Update docs for Sprint 20",
  "status": "PASSED",
  "scope": "project",
  "project": "zoocode-agency",
  "commitHash": "a1b2c3d"
}
```

This file is read by [`recap.js`](.agency/scripts/recap.js) to display "Last Session" context after VSCode restart.

## Special Modes

```bash
# Hotfix — skip PRE phase entirely
node .agency/scripts/enforcer.js pre \
  --agent code-agent \
  --task "hotfix: critical bug" \
  --hotfix --reason "production outage"

# CI mode — skip memory check
node .agency/scripts/enforcer.js post \
  --agent qa-automator \
  --task "ci-test" \
  --ci
```

## Circuit Breaker Integration

The circuit breaker (Issue #9) tracks task failures per agent in `.agency/circuit-breaker/`:

| Condition | Action |
|-----------|--------|
| ≥5 failures in 24h | Breaker OPEN → task demoted to flash |
| ≥3 failures same task | Breaker OPEN → simplified reimplementation |
| 1 successful run | Breaker RESET → normal operation resumes |

## Related

- [Self-improvement loop →](06-self-improvement.md)
- [Handoff protocol →](04-handoff.md)
- [Session recap →](02-workflow.md#session-context-recovery)
