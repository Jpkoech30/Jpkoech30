# Self-Improvement Loop

> Autonomous learning system — all 6 scripts are LLM-free, pure Node.js

## The Pipeline

Runs daily at 00:00 UTC via GitHub Actions (`.github/workflows/self-improve.yml`):

```
START → Session Lock Check → Cron Lock Check
  → health.js → patterns.js → auto-tune.js 
  → heal.js → compact-memory.js → adapt-rules.js 
  → verify-loop.js → Remove Locks → Commit Reports
```

## Script Details

### Phase 1a: `health.js` — Diagnostic Check

```bash
node .agency/scripts/health.js           # report only
node .agency/scripts/health.js --fix     # auto-fix issues
node .agency/scripts/health.js --fix --dry-run  # preview
```

**10 checks:** enforcer DB, memory DB, telemetry staleness, config validity (auto-fix), roomodes validity, temp files (auto-clean), stale sentinels (auto-remove), commit hook, heal-log size (auto-rotate), lockfile (auto-remove stale)

### Phase 1b: `patterns.js` — Pattern Detection

```bash
node .agency/scripts/patterns.js
```

Reads telemetry and detects:
- **High failure** — agents with ≥5 BLOCKED/FAILED events (incident-deduplicated)
- **High rework** — ≥30% of tasks touched by >1 agent
- **Cost anomalies** — daily cost >2σ from rolling average
- **Memory gaps** — tasks without memory records

**Guards:** Minimum N=30 events, incident dedup (5min window), slug aliases, confidence scoring (HIGH/MEDIUM/LOW), data gap exclusion

### Phase 2a: `auto-tune.js` — Threshold Self-Tuning

```bash
node .agency/scripts/auto-tune.js
node .agency/scripts/auto-tune.js --dry-run
```

Tunes 4 thresholds in `config.json`:

| Threshold | Range | Tuning Rule |
|-----------|-------|-------------|
| `quality_gate_max_tokens` | [500, 10000] | EMA(avg + 2σ) |
| `enforcer_pre_ttl` | [600, 7200]s | EMA(P95 duration × 1.5) |
| `memory_ttl_days` | [7, 365] | Based on access frequency |
| `min_recall_score` | [0.1, 0.8] | 25th percentile (never higher) |

**Safety:** Hard bounds, 20% rate-of-change limit, EMA dampening (α=0.3), weekend/weekday separation, auto-rollback if error rate doubles

### Phase 2b: `heal.js` — Remediation Engine

```bash
node .agency/scripts/heal.js
node .agency/scripts/heal.js --dry-run
node .agency/scripts/heal.js --rollback <entry-id>
```

Auto-fixes: temp files (age + safelist), stale sentinels, config slug drift (additive only), stale lockfiles, ORCHESTRATION.md archiving

**Safety:** Log-before-execute, heal-log rotation at 1000 entries, `--rollback` support, exclusive lock test before file deletion

### Phase 2c: `compact-memory.js` — Async Memory Compaction

```bash
node .agency/scripts/compact-memory.js
node .agency/scripts/compact-memory.js --project <id>
```

Runs `memory.js compact` asynchronously in cron. Prevents 5-15s LLM summarization hang during live tasks. When compaction is needed during a live task, a `MEMORY:PENDING` flag is stored instead.

### Phase 2d: `adapt-rules.js` — Rule Suggestions

```bash
node .agency/scripts/adapt-rules.js
```

Reads `patterns.json` and generates categorized suggestions:
- **AUTO-FIXABLE** — handled by auto-tune.js or heal.js
- **SUGGEST-ONLY** — requires Lead Architect to modify rules
- **ESCALATE** — infrastructure or code issue requiring DevOps

### Phase 3: `verify-loop.js` — Verification

```bash
node .agency/scripts/verify-loop.js
```

Closes the loop:
1. First 3 runs: observation only (build baseline)
2. Run 4+: compare current metrics vs 3-day sliding window average
3. If degradation >10%: auto-rollback thresholds
4. If stable: update baseline, commit

## Lockfile Safety

Two lockfiles prevent concurrent execution:

| Lock | Created By | Purpose |
|------|-----------|---------|
| `.active-sessions.lock` | enforcer.js PRE | Prevents cron during active agent tasks |
| `.improve-lock` | self-improve.yml | Prevents concurrent cron runs |

If a lock is >2h old, it's treated as stale and removed.

## Related

- [Memory system →](07-memory.md)
- [Cost model →](08-costs.md)
