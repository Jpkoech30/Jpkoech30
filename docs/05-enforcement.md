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
