# Agency Self-Improvement Architecture

> **Goal:** Reduce LLM dependency for routine improvement — let the agency learn and adapt autonomously
> **Current state:** 41 scripts exist, but 0 automate improvement — all adaptation requires an LLM agent

---

## Current Infrastructure Audit

### ✅ Already Have (Data Collection Layer)

| Script | Collects | Format | Auto-Runs? |
|--------|----------|--------|------------|
| [`telemetry.js`](../scripts/telemetry.js) | Agent invocations, costs, gate failures, durations | NDJSON in `.agency/telemetry/` | On enforcer events |
| [`memory.js`](../scripts/memory.js) | Task context, decisions, summaries | SQLite (FTS5+vec0) | On `store` command |
| [`metrics.js`](../scripts/metrics.js) | Completion rate, error rate, rework rate, avg tokens | Computed from telemetry | Manual only |
| [`cost-report.js`](../scripts/cost-report.js) | Token costs per agent per task | Report to `.agency/reports/` | Post-commit hook |
| [`enforcer.js`](../scripts/enforcer.js) | Phase state machine (PRE/POST/COMMIT/HANDOFF) | SQLite | On each task |
| [`quality-gate.js`](../scripts/quality-gate.js) | 10 checks (hallucination, contract, diff, test, etc.) | CLI output | Manual only |

### ❌ Missing (Improvement Layer)

| Capability | Gap |
|------------|-----|
| **Pattern Detection** | Telemetry data is collected but never mined for recurring failure patterns |
| **Threshold Tuning** | Quality gate thresholds (token limits, TTLs, score minimums) are hardcoded |
| **Auto-Remediation** | Common issues (config drift, stale files, agent routing errors) are detected but never auto-fixed |
| **Experience-Based Routing** | Agent selection is static (`config.json` pipelines) — never optimized from past performance |
| **Rule Evolution** | AGENCY-RULES.md can only be updated via LLM — no data-driven amendment suggestions |
| **Self-Health Check** | No heartbeat/monitoring daemon to detect degraded states |

---

## Proposed Architecture: The Learning Loop

```
┌─────────────────────────────────────────────────────────────────┐
│                    4-Phase Learning Loop                         │
│                                                                  │
│  COLLECT ──→ ANALYZE ──→ ADAPT ──→ VERIFY                       │
│    │            │           │           │                        │
│    ▼            ▼           ▼           ▼                        │
│  telemetry   metrics.js  auto-tune   quality-gate                │
│  memory.js   patterns.js adapt-rules verify-loop.js              │
│  enforcer    health.js   heal.js                                 │
└─────────────────────────────────────────────────────────────────┘
                        │
                        ▼
              Reduced LLM calls
              Fewer repeated failures
              Self-tuning thresholds
```

---

## Component Design

### 1. COLLECT Phase — Already Done

No new scripts needed. Existing pipeline:
- `enforcer.js` writes to `.agency/enforcer/enforcer.db`
- `telemetry.js` appends to `.agency/telemetry/events.ndjson`
- `memory.js` stores to SQLite with FTS5 embeddings

### 2. ANALYZE Phase — NEW

#### 2a. `patterns.js` — Automated Pattern Detection

**Purpose:** Read telemetry + enforcement data, identify recurring failure patterns without an LLM.

**Edge Case Guards (built-in):**
| Guard | Applies To | Implementation |
|-------|-----------|----------------|
| Minimum data threshold | All patterns | Require N≥30 events before computing any pattern; below that output `WAITING_FOR_DATA` |
| Incident deduplication | Failure patterns | Group failures by timestamp proximity (same 5min window = same incident); output per-incident, not per-event |
| Slug alias resolution | Agent patterns | Read slug aliases from `config.json.slug_aliases`; merge events across old/new slugs |
| Confidence scoring | All patterns | Correlation-only patterns get `confidence: LOW`; patterns with causal hypothesis flag get `confidence: HIGH` |
| Cross-source validation | Memory/health | Read from telemetry + enforcer DB + memory stats before declaring a pattern; single-source patterns are flagged `verified: false` |
| Data gap exclusion | Time-series patterns | Detect gaps >24h in telemetry; mark those periods as `EXCLUDED`; report `data_gaps` in output |

**What it detects:**
| Pattern | Detection Method | Example Output |
|---------|-----------------|----------------|
| Agent repeatedly hits BLOCKED | Count FAIL statuses per agent slug in last 30d (≥5 unique incidents) | `backend-api has 12 BLOCKED in 30d — 8 are contract gen issues` |
| Task type always requires rework | Tasks with >2 agents touching them (≥30% of that type) | `Type-C workflows have 60% rework rate` |
| Gate failures cluster by time | Count gate failures per hour-of-day (≥3σ above mean hour) | `Enforcer C1 fails 40% of time between 22:00-00:00` |
| Memory gaps | Tasks missing from memory after 24h (≥3 tasks) | `3 tasks from yesterday have no memory record` |
| Cost anomalies | Std deviation >2x of 7-day rolling average | `devops-cicd costs spiked 340% on 2026-07-10` |

**Output:** `.agency/reports/patterns/latest.json`
```json
{
  "generated_at": "2026-07-12T22:00:00Z",
  "events_analyzed": 312,
  "data_gaps": [],
  "patterns": [
    {
      "type": "high_failure",
      "agent": "backend-api",
      "metric": "BLOCKED_count",
      "value": 12,
      "threshold": 5,
      "verified": true,
      "confidence": "HIGH",
      "suggestion": "Review contract generation process"
    }
  ]
}
```

**Error handling:** If telemetry read fails → output `{"status": "ERROR", "message": "Telemetry read failed"}` — never write partial/corrupt patterns file.

#### 2b. `health.js` — Self-Health Check

**Purpose:** Verify all agency subsystems are operational without an LLM.

**Edge Case Guards:**
| Guard | Implementation |
|-------|---------------|
| Stale lockfile detection | If `.agency/.improve-lock` exists >2h, treat as stale and overwrite |
| Orphan file safelist | Only delete files matching BOTH: age >24h AND not in `.gitignore` |
| Additive-only config sync | Only ADD slugs from `.roomodes` to `config.json`; never REMOVE from `.roomodes` |
| Write atomicity | Write config patches to `.json.tmp` then `rename` (atomic on same filesystem) |
| Partial heal recovery | Write each action to `heal-log.ndjson` BEFORE executing; on restart, skip already-applied entries |

**Checks (all pass/fail, no LLM):**
| Check | What It Verifies | Auto-Fix? |
|-------|------------------|-----------|
| Enforcer DB | `.agency/enforcer/enforcer.db` exists, readable, WAL mode | ❌ — report only |
| Memory DB | `.agency/memory/*.db` exists, FTS5 working | ❌ — report only |
| Telemetry dir | `.agency/telemetry/` exists, events.ndjson not stale (>24h) | ❌ — report only |
| Config valid | `.agency/config.json` JSON parseable, slugs match `.roomodes` | ✅ — additive sync |
| Roomodes valid | `.roomodes` JSON parseable, all slugs unique | ✅ — report only (no auto-fix for agent defs) |
| Temp files | No `temp-*`, `*.bak`, `ROO-*` in root (age >24h only) | ✅ — auto-clean with safelist |
| Stale sentinels | No `.agency/.preflight-passed` (deprecated PFG) | ✅ — auto-remove |
| Commit hook | `.husky/post-commit` executable | ❌ — report only |
| Heal-log size | `heal-log.ndjson` < 1000 entries | ✅ — auto-rotate with gzip archive |

**Output:** `.agency/reports/health.json`
```json
{
  "status": "DEGRADED",
  "generated_at": "2026-07-12T22:00:00Z",
  "checks": [
    {"name": "enforcer_db", "passed": true},
    {"name": "config_valid", "passed": false, "detail": "slug drifted", "auto_fixed": true},
    {"name": "temp_files", "passed": true, "files_cleaned": 2}
  ],
  "auto_fixes": 1
}
```

### 3. ADAPT Phase — NEW

#### 3a. `auto-tune.js` — Threshold Self-Tuning

**Purpose:** Adjust quality gate thresholds, TTLs, and limits based on historical data.

**⚠️ Critical Edge Case Guards (baked in):**

| Guard | Why | Implementation |
|-------|-----|---------------|
| **Death spiral prevention** | Tightening thresholds can increase failures, which triggers more tightening | Hard upper/lower bounds in `config.json.thresholds.bounds`; 20% max change per cycle; auto-rollback if error rate doubles |
| **Cold start protection** | First run with no data would compute ttl=0 | Minimum N=30 events before computing; write defaults from `config.json.thresholds.defaults` below threshold |
| **Threshold oscillation dampening** | Raw averages bounce each cycle | Use exponential moving average (α=0.3), not raw average |
| **Weekend/weekday separation** | Task durations differ by 4x on weekends | Compute separate weekday/weekend thresholds; `getDay()` picks correct one at runtime |
| **Concurrent write safety** | Two instances writing simultaneously corrupts config | Atomic rename: write to `.json.tmp` → `fs.rename()` |
| **Allowed path enforcement** | Bug could write to `.roomodes` | Runtime `allowedWritePaths = ['.agency/config.json', '.agency/reports/']` check; crash on violation |
| **Min recall score floor** | Raising min_score can break all memory recalls | Never raise above 25th percentile of historical scores; test 5 known queries after change |

**What it tunes:**
| Parameter | Source | Tuning Rule | Hard Bounds |
|-----------|--------|-------------|-------------|
| Quality gate max tokens | Telemetry avg + 2σ (EMA) | `max = min(bound.max, avg + 2*std)` | [500, 10000] |
| Enforcer PRE TTL | Task duration 95th percentile (EMA) | `ttl = min(bound.max, p95 * 1.5)` | [600, 7200]s |
| Memory TTL | Access frequency | If chunk unaccessed >30d → reduce TTL | [7, 365]d |
| Min recall score | Historical score 25th percentile | `min_score = min(bound.max, p25)` | [0.1, 0.8] |

**Implementation flow:**
```javascript
function tuneThresholds() {
  const events = readTelemetry();
  if (events.length < 30) { writeDefaults(); return; }
  
  const recommendations = {
    quality_gate_max_tokens: clamp(round(ema(avgTokens) + 2 * ema(stdTokens)), BOUNDS.max_tokens),
    enforcer_pre_ttl: clamp(round(percentile(durations, 95) * 1.5), BOUNDS.ttl),
    min_recall_score: clamp(percentile(historicalScores, 25), BOUNDS.min_score),
  };
  
  assertWritePath('.agency/config.json');
  atomicWrite('.agency/config.json', { thresholds: recommendations });
}
```

#### 3b. `heal.js` — Auto-Remediation Engine

**Purpose:** Fix common, deterministic issues without an LLM.

**Edge Case Guards:**
| Guard | Implementation |
|-------|---------------|
| False positive deletion | Only delete `temp-*` files that match BOTH: age >24h AND not in `.gitignore` |
| Partial heal recovery | Write each action to `heal-log.ndjson` BEFORE executing; idempotent on restart |
| Heal loop prevention | Never auto-delete files that a running process has open (Windows: exclusive lock test) |
| Additive-only config sync | Only ADD missing slugs from `.roomodes` to `config.json`; never remove |
| Rollback support | `heal.js --rollback <entry-id>` reverses the specified heal-log entry |
| Log rotation | Auto-rotate heal-log at 1000 entries; gzip archive to `.agency/reports/heal-archive/` |

**Actions:**
| Issue | Detection | Action | Safe? |
|-------|-----------|--------|-------|
| Stale `.preflight-passed` sentinel | File exists (any age) | Delete it | ✅ Deterministic |
| Orphaned `temp-*` files >24h old | Glob pattern + age check + safelist | Delete them | ✅ With safelist |
| Config slug drift (missing slugs) | Slugs in `.roomodes` not in `config.json` | Add to config array | ✅ Additive only |
| Stale ORCHESTRATION.md entries | Entries >30d with STATUS=DONE | Archive to `.agency/projects/*/archive/` | ✅ Archive, not delete |
| Heal-log >1000 entries | Count lines in heal-log.ndjson | Rotate + gzip | ✅ Non-destructive |

#### 3c. `adapt-rules.js` — Rule Evolution Suggestions

**Purpose:** Read pattern data and suggest AGENCY-RULES.md amendments. **Suggestions only — never auto-applied.**

**Edge Case Guards:**
| Guard | Implementation |
|-------|---------------|
| Never modifies rules | Output is `.md` file only; no file write API for `.md` outside reports dir |
| Review overhead acknowledged | Estimated 500 tokens/day for Lead Architect review included in net savings |
| Suggestion categorization | Output labels each as: `AUTO-FIXABLE` / `SUGGEST-ONLY` / `ESCALATE` |

**Flow:**
```
patterns.json ──→ adapt-rules.js ──→ .agency/reports/rule-suggestions.md
                                                    │
                                                    ▼
                                         Lead Architect reviews
                                         (~500 tokens/day)
```

**Output format with categories:**
```markdown
## Rule Adaptation Suggestions — 2026-07-12

### [SUGGEST-ONLY] Add §18 about weekend deployments
**Evidence:** 4 deployment failures on Sundays in last 30 days
**Pattern:** devops-lead → BLOCKED on weekend (p=0.003)
**Category:** SUGGEST-ONLY — requires AGENCY-RULES.md amendment (human/LLM only)

### [AUTO-FIXABLE] Reduce PRE TTL from 3600s to 2400s
**Evidence:** 95th percentile task duration is 22 minutes
**Category:** AUTO-FIXABLE — handled by auto-tune.js

### [ESCALATE] High error rate in auto-tune.js
**Evidence:** auto-tune.js has 40% failure rate (script bug)
**Category:** ESCALATE — requires Lead Architect for code fix
```

### 4. VERIFY Phase — Enhanced

#### `verify-loop.js` — Closing the Loop

**Purpose:** Run after ADAPT to confirm changes had intended effect.

**Edge Case Guards:**
| Guard | Implementation |
|-------|---------------|
| Incomparable time windows | Both snapshots must cover same duration (±10%); skip and retry next cycle if mismatch |
| Confounded variables | Run one adaptation per cycle; serialize queued changes across cycles |
| No baseline | First 3 runs are observation-only; baseline established after 3 stable readings |
| Verification failure | If key metric degrades >10%, auto-rollback all changes from that cycle |

**Flow:**
1. First 3 runs: observe only (build baseline)
2. Run 4+: snapshot → adapt → wait 24h → snapshot → compare
3. If any metric degrades >10%: auto-rollback, log to `adapt-history.json`
4. If all metrics same or better: commit changes, log success

---

## Critical Path: Prerequisites for Implementation

These 6 guards must be designed into the scripts from day 1 — they cannot be retrofitted:

1. **Runtime allowed-write-path enforcement** — every adaptation script checks `allowedWritePaths` before file I/O
2. **Death spiral prevention** — hard bounds + 20% rate limit + auto-rollback on error rate doubling
3. **Min recall score floor** — never above 25th percentile of historical scores
4. **Atomic config writes** — write to `.json.tmp` then `fs.rename()`
5. **Concurrent run lockfile** — `.agency/.improve-lock` with stale detection (>2h)
6. **Cold start defaults** — N<30 events → use `config.json.thresholds.defaults`

---

## Implementation Plan (Revised with Edge Cases)

### Phase 1: Analysis (LLM-Free)

| Script | Lines | Deps | Edge Cases Handled | Effort |
|--------|-------|------|-------------------|--------|
| `patterns.js` | ~250 | None | E1, E2, E3, E4, E5, E21 | 2.5h |
| `health.js` | ~200 | None | E12, E13, E14, E15, E20, E23 | 2h |

### Phase 2: Adaptation (Config-Only Changes)

| Script | Lines | Deps | Edge Cases Handled | Effort |
|--------|-------|------|-------------------|--------|
| `auto-tune.js` | ~250 | None | E6, E7, E8, E9, E10, E11, E22 | 3h |
| `heal.js` | ~250 | None | E12, E13, E14, E15, E23, E24 | 2.5h |
| `adapt-rules.js` | ~120 | patterns.js | E22, E26, E28 | 1h |

### Phase 3: Verification + Scheduling

| Item | Lines | Edge Cases Handled | Effort |
|------|-------|-------------------|--------|
| `verify-loop.js` | ~150 | E16, E17, E18 | 1.5h |
| GitHub Actions workflow | ~60 | E19, E20 | 1h |
| Lockfile + atomic write utilities | ~80 | E11, E20 | 1h |

### Phase 4: Scheduling

`.github/workflows/self-improve.yml`
```yaml
name: Self-Improvement Pipeline
on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight UTC
  workflow_dispatch:      # Manual trigger

jobs:
  improve:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Health Check
        run: node .agency/scripts/health.js
      - name: Pattern Detection
        run: node .agency/scripts/patterns.js
      - name: Auto-Tune
        run: node .agency/scripts/auto-tune.js
      - name: Heal
        run: node .agency/scripts/heal.js
      - name: Rule Suggestions
        run: node .agency/scripts/adapt-rules.js
      - name: Commit Reports
        run: |
          git add .agency/reports/
          git commit -m "chore: self-improvement cycle $(date -u +%Y-%m-%d)" || true
```

**Pipeline:**
```
health.js ──→ patterns.js ──→ auto-tune.js ──→ heal.js ──→ adapt-rules.js
    │              │               │              │              │
    ▼              ▼               ▼              ▼              ▼
 report       report          config update   auto-fix     suggestions.md
 ──→ commit all reports ──→ next cycle in 24h
```

---

## Reduction in LLM Dependency (Revised)

| Currently | After | Gross Reduction | Review Overhead | Net Reduction |
|-----------|-------|----------------|-----------------|---------------|
| Lead Architect manually audits patterns | `patterns.js` detects them | ~500 tokens/day | — | ~500 tokens/day |
| Lead Architect manually fixes config drift | `heal.js` auto-fixes | ~300 tokens/incident | — | ~300 tokens/incident |
| Lead Architect sets quality gate thresholds | `auto-tune.js` tunes them | ~200 tokens/week | — | ~200 tokens/week |
| Lead Architect writes retro reports | `patterns.js` + `adapt-rules.js` generates draft | ~1,000 tokens/sprint | 500 tokens/day review | ~500 tokens/sprint |
| Lead Architect checks system health | `health.js` runs daily | ~400 tokens/day | — | ~400 tokens/day |
| Lead Architect debugs self-improvement bugs | Better test coverage | — | One-off sessions | Variable (net positive over time) |
| **Total** | | **~2,200 tokens/day** | **~70 tokens/day** | **~1,500 tokens/day net ≈ KES 202.50/day ≈ KES 6,075/month** |

---

## Safety & Guardrails (Revised)

1. **Runtime allowed-write-path enforcement** — every adaptation script has `allowedWritePaths = ['.agency/config.json', '.agency/reports/']` checked before any file write; violation crashes with clear error
2. **No script writes to `.roomodes` or AGENCY-RULES.md** — enforced at runtime, not just documentation
3. **All changes are reversible** — `heal.js` logs every action to heal-log; `--rollback` flag supported
4. **Death spiral protection** — hard bounds + 20% rate-of-change limit + auto-rollback on error rate doubling
5. **Cold start protection** — minimum N=30 events before computing thresholds; defaults used below that
6. **Concurrent run safety** — lockfile with stale detection, atomic writes via rename
7. **Adapt rules are suggestions only** — `adapt-rules.js` generates `.md` files for review, never applies them

---

## Edge Case Reference

Full edge case analysis with 28 identified cases across 8 categories is documented at:
[`self-improvement-edge-cases.md`](./self-improvement-edge-cases.md)

Critical path items (must be built into scripts from day 1):
| ID | Edge Case | Guard |
|----|-----------|-------|
| E6 | Threshold collapse | Never raise min_recall_score above 25th percentile |
| E7 | Death spiral | Hard bounds + 20% rate limit + auto-rollback |
| E9 | Cold start | Minimum N=30 events before computing |
| E11 | Concurrent writes | Atomic rename (tmp + rename) |
| E20 | Concurrent runs | Lockfile with stale detection |
| E22 | Text-only guardrail broken | Runtime allowedWritePaths enforcement |

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| LLM tokens spent on routine maintenance | ~2,000/day | 0 (fully automated) |
| Config drift detection time | Hours (manual) | Minutes (auto) |
| Threshold relevance | Static, never tuned | Dynamic, tuned weekly |
| Pattern detection | None | Real-time |

---

## Appendix: Data Flow Diagram

```
                    ┌──────────────────┐
                    │  Agent executes  │
                    │      task        │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   enforcer.js    │
                    │  (PRE→POST→HAND)│
                    └────────┬─────────┘
                             │
               ┌─────────────┼─────────────┐
               ▼             ▼             ▼
        ┌───────────┐ ┌───────────┐ ┌───────────┐
        │ telemetry │ │  memory   │ │ enforcer  │
        │ .ndjson   │ │ SQLite    │ │ DB        │
        └─────┬─────┘ └─────┬─────┘ └─────┬─────┘
              │             │             │
              └─────────────┼─────────────┘
                            ▼
                   ┌──────────────────┐
                   │   patterns.js    │  ← Daily cron
                   │  (no LLM)        │
                   └────────┬─────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │  auto-tune.js    │  ← Adjusts config.json
                   │  heal.js         │  ← Auto-fixes deterministically
                   │  adapt-rules.js  │  ← Generates suggestions
                   └────────┬─────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │  verify-loop.js  │  ← Confirms improvement
                   └────────┬─────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │   Less LLM work  │
                   │   Fewer failures │
                   │   Self-tuning    │
                   └──────────────────┘
```
