# Agency Enforcement Framework v2 — Full Redesign

**Status:** `PLANNED` | **Lead:** 🧠 Lead Architect | **Created:** 2026-07-11
**Goal:** Fix 12 identified failure points across PFG, PTG, Memory, and Agent Routing

---

## 0. Executive Summary

The current enforcement framework was built incrementally (Sprint 11 → 14 → 16 → 17 → 18), resulting in 4 loosely coupled systems with 12 critical failure points. This plan redesigns them as a **single cohesive enforcement engine** with a unified state machine, shared storage, and cross-cutting validation.

---

## 1. Audit Findings — 12 Failure Points

### 1.1 Pre-Flight Gate (PFG)

| # | Failure | Severity | Current Behavior | Root Cause |
|---|---------|----------|-----------------|------------|
| F1 | **Sentinel has no TTL** | 🔴 | Stale sentinel from yesterday's `backend-service` blocks today's `lead-architect` | Sentinel is a plain JSON file with no expiry; `pass` command overwrites but `check` command only validates agent slug match |
| F2 | **No hard enforcement** | 🔴 | Agents can skip the oath entirely — nothing physically blocks tool execution | `check` is advisory (exits 1 but caller can ignore exit code) |
| F3 | **Telemetry call is fragile** | 🟡 | Uses `execSync` with `stdio: 'ignore'`; silent failures | No retry, no fallback, no logging of telemetry failure |
| F4 | **oathHash not verified** | 🟡 | Hash is computed from `agent:task` but never checked against actual oath text | No mechanism to verify the agent recited the correct oath |

### 1.2 Post-Task Gate (PTG)

| # | Failure | Severity | Current Behavior | Root Cause |
|---|---------|----------|-----------------|------------|
| F5 | **Checks JSON store (Memory v1)** | 🔴 | PTG-C1 checks `store.json`, but Memory v2 is SQLite-only | PTG not updated alongside Memory v2 contract |
| F6 | **Metadata check is manual** | 🟡 | C3 requires CLI flags (`--handoff`, `--artifacts`...); no automatic git log parsing | Designed to be called BEFORE commit, but agents call it without flags |
| F7 | **No integration with handoff.js** | 🔴 | handoff.js was supposed to call PTG before allowing handoff (per contract §Layer 2), but it doesn't | handoff.js has no PTG call — the integration was never wired |
| F8 | **No CI mode** | 🟡 | PTG blocks on C5/C6 even in CI where quality-gate.js isn't available | No `--ci` flag to skip non-blocking checks |

### 1.3 Memory System

| # | Failure | Severity | Current Behavior | Root Cause |
|---|---------|----------|-----------------|------------|
| F9 | **TF-IDF has no semantic understanding** | 🟡 | Query "semantic memory" returns 0% for "vector RAG" because no word overlap | Hash-based keyword embedding; synonyms and concepts don't match |
| F10 | **JSON fallback creates inconsistency** | 🟡 | SQLite and JSON can diverge; PTG checks JSON but agents may write to SQLite | Dual storage path was designed as "fallback" but became parallel |
| F11 | **No metadata tracking** | 🟡 | Can't surface most-frequently-accessed or most-recent memories | No `access_count` or `last_accessed` columns in v1 schema |

### 1.4 Agent Routing

| # | Failure | Severity | Current Behavior | Root Cause |
|---|---------|----------|-----------------|------------|
| F12 | **handoff.js CWD guard is fragile** | 🟡 | Compares `process.cwd()` to `project.rootPath`; fails on case mismatch or trailing slash differences | Path normalization is incomplete; no fallback to relative path matching |

---

## 2. Proposed Architecture — Unified Enforcement Engine

### 2.1 Core Concept: Single State Machine

Replace 4 separate systems with one unified `enforcer.js` that manages a **state machine** in a single SQLite table:

```
┌─────────────────────────────────────────────────────────┐
│                    enforcer.db                           │
│                                                         │
│  enforcement_state                                       │
│  ┌─────────────────────────────────────────────────┐    │
│  │ id │ task_id │ agent_slug │ phase │ status     │    │
│  │────│─────────│────────────│───────│────────────│    │
│  │ 1  │ 19.1    │ code-agent │ PRE   │ PASSED     │    │
│  │ 2  │ 19.1    │ code-agent │ POST  │ IN_PROGRESS│    │
│  │ 3  │ 19.1    │ code-agent │ COMMIT│ PENDING    │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  Phases: PRE → WORK → POST → COMMIT → HANDOFF           │
│  Status: PENDING → IN_PROGRESS → PASSED → FAILED       │
└─────────────────────────────────────────────────────────┘
```

**Benefit:** Single source of truth. No sentinel file. No JSON backup. No parallel state.

### 2.2 Phase Flow

```
┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐
│ PRE  │───▶│ WORK │───▶│ POST │───▶│COMMIT│───▶│HANDOFF│
└──────┘    └──────┘    └──────┘    └──────┘    └──────┘
  │           │           │           │           │
  │ Oath      │ Code      │ Memory    │ Git       │ Update
  │ Recite    │ Changes   │ Store     │ Commit    │ ORCH
    
  │           │           │ Cleanup   │           │
  │ Sentinel  │           │           │           │
```

### 2.3 What Changes

| Current System | v2 Replacement | Key Change |
|---------------|---------------|------------|
| `preflight-gate.js` | Folded into `enforcer.js phase pre` | No standalone script; state in SQLite |
| `post-task-gate.js` | Folded into `enforcer.js phase post` | No standalone script; auto-wired |
| `memory.js` (v1) | `memory.js` (v2) — SQLite-only | Already planned; incorporate here |
| `handoff.js` | `enforcer.js phase handoff` | Validates all prior phases completed |
| `sentinel file` | `enforcement_state` table | No file I/O; single SQLite query |
| `.preflight-passed` | Deleted | Replaced by DB row |

### 2.4 New File: `enforcer.js`

Single script, 4 sub-commands:

```bash
node .agency/scripts/enforcer.js pre --agent <slug> --task <id>
    # Creates enforcement_state row with phase=PRE
    # Records oath hash, agent, task, timestamp
    # Exits 0 if allowed, 1 if blocked

node .agency/scripts/enforcer.js post --agent <slug> --task <id>
    # Validates PRE phase was PASSED
    # Checks memory stored, temp cleaned, metadata valid
    # Exits 0 if all pass, 1 if any fail

node .agency/scripts/enforcer.js commit --agent <slug> --task <id>
    # Validates POST phase was PASSED
    # Generates commit message template with HANDOFF metadata
    # Exits 0 if ready to commit, 1 if blocked

node .agency/scripts/enforcer.js handoff --from <slug> --to <slug> --task <id>
    # Validates COMMIT phase was PASSED
    # Updates ORCHESTRATION.md
    # Updates enforcement_state to DONE
    # Exits 0 on success
```

### 2.5 Sentinel TTL (Replaces F1)

No more sentinel file. Instead, the `enforcement_state` table has a `expires_at` column:

```sql
expires_at INTEGER NOT NULL DEFAULT (unixepoch() + 3600)  -- 1 hour TTL
```

- If `unixepoch() > expires_at` → phase is auto-reset to PENDING
- TTL configurable: `--ttl <seconds>` (default 3600)
- Hotfix: `--ttl 86400` (24 hours for long tasks)

### 2.6 Memory v2 Integration

Memory v2 (`.agency/scripts/memory.js`) is called by `enforcer.js post`:

```
enforcer.js post
  ├── Check: Is memory stored for this task+agent?
  │     └── Calls memory.js check --task <id> --agent <slug>
  ├── Check: Are temp files cleaned?
  │     └── Scans root + e2e/ for temp patterns
  └── Check: Is PFG expired?
        └── Checks enforcement_state.expires_at
```

### 2.7 handoff.js Integration

`handoff.js` is simplified to call `enforcer.js handoff`:

```javascript
// Before allowing handoff:
const result = execSync(`node enforcer.js handoff --from ${from} --to ${to} --task ${task}`);
if (result.status !== 0) {
    console.error('HANDOFF BLOCKED: Complete all prior phases');
    process.exit(1);
}
```

### 2.8 CustomInstructions Update

Every agent's `.roomodes` customInstructions[0] updated to:

```
CRITICAL — FIRST ACTION: You MUST run the enforcement gate BEFORE any tool use:
   node .agency/scripts/enforcer.js pre --agent <slug> --task "<task>"
This records your oath and creates a session. Without it, all subsequent phases will BLOCK.
```

---

## 3. Contract Updates

| Contract | Current | v2 | Change |
|----------|---------|----|--------|
| `agency-preflight-gate` | 1.0.0 | **Deprecated** | Folded into `agency-enforcer@1.0.0` |
| `agency-post-task-gate` | 1.0.0 | **Deprecated** | Folded into `agency-enforcer@1.0.0` |
| `agency-memory` | 1.0.0 | 2.0.0 | SQLite-only, FTS5, vec0, metadata, compaction |
| `agency-enforcer` | — | **1.0.0 (NEW)** | Unified enforcement state machine |
| `agency-handoff` | (in handoff.js) | **1.0.0 (NEW)** | Formal contract for handoff protocol |

---

## 4. Migration Path

### Phase A: Create enforcer.js + enforcer.db
1. Create `.agency/scripts/enforcer.js` with 4 sub-commands
2. Create `enforcement_state` table in `.agency/enforcer/store.db`
3. Wire `pre` phase to replace `preflight-gate.js`
4. Wire `post` phase to replace `post-task-gate.js`
5. Wire `handoff` phase to integrate with `handoff.js`

### Phase B: Update memory.js to v2
1. Implement the existing [`memory-v2-plan.md`](.agency/plans/memory-v2-plan.md)
2. `enforcer.js post` calls `memory.js check` instead of reading JSON

### Phase C: Update Routing
1. Simplify `handoff.js` to delegate to `enforcer.js handoff`
2. Remove sentinel file dependency
3. Deprecate old PFG/PTG scripts (keep for backward compat, mark DEPRECATED)

### Phase D: Cleanup
1. Delete `.agency/.preflight-passed` (no longer needed)
2. Update `.gitignore` to add `.agency/enforcer/`
3. Update AGENCY-RULES.md to reference `enforcer.js` instead of PFG/PTG
4. Store memory of the migration

---

## 5. Rollback Plan

If v2 breaks:
1. Old `preflight-gate.js` and `post-task-gate.js` are kept (not deleted) for 30 days
2. Set `AGENCY_ENFORCER_DISABLED=true` env var to fall back to old scripts
3. `enforcer.js` reads this env var and exits 0 for all phases (pass-through mode)

---

## 6. Edge Cases

| # | Edge Case | Handling |
|---|-----------|----------|
| EC1 | Agent crashes mid-phase (e.g., after `pre` but before `post`) | `expires_at` TTL auto-resets after 1h; next agent call sees PENDING |
| EC2 | Parallel agents for same task (dispatcher) | `enforcement_state` has `agent_slug` column; parallel calls with different slugs use different rows |
| EC3 | CI/CD environment (no interactive oath) | `--ci` flag skips `pre` phase; `post` phase validates against CI-only checklist |
| EC4 | Hotfix needs to skip phases | `--hotfix` flag allows commit without full enforcement; logged in enforcement_state as SKIPPED |
| EC5 | enforcer.db doesn't exist | `enforcer.js` auto-creates the DB and table on first invocation (same pattern as memory.js) |
| EC6 | Old sentinel file left behind | `enforcer.js pre` checks for and deletes `.agency/.preflight-passed` if it exists, with a warning |
| EC7 | Multiple projects | `enforcement_state` includes `project` column; enforcer uses same `--project` flag as memory.js |

---

## 7. Files Changed

| File | Action | Description |
|------|--------|-------------|
| `.agency/scripts/enforcer.js` | **CREATE** | Unified enforcement engine (replaces PFG + PTG) |
| `.agency/scripts/memory.js` | **REWRITE** | Memory v2 (SQLite-only, FTS5, vec0, metadata, compaction) |
| `.agency/scripts/handoff.js` | **MODIFY** | Delegate to enforcer.js handoff phase |
| `.agency/scripts/preflight-gate.js` | **DEPRECATE** | Add DEPRECATED banner; delegate to enforcer.js |
| `.agency/scripts/post-task-gate.js` | **DEPRECATE** | Add DEPRECATED banner; delegate to enforcer.js |
| `.agency/contracts/agency-enforcer.json` | **CREATE** | New contract for unified enforcement |
| `.agency/contracts/agency-memory.json` | **UPDATE** | Bump to v2.0.0 |
| `.agency/contracts/agency-handoff.json` | **CREATE** | New contract for handoff protocol |
| `.agency/contracts/agency-preflight-gate.json` | **DEPRECATE** | Mark DEPRECATED |
| `.agency/contracts/agency-post-task-gate.json` | **DEPRECATE** | Mark DEPRECATED |
| `.agency/memory/schema.sql` | **REWRITE** | Memory v2 schema |
| `.roomodes` | **UPDATE** | Update customInstructions to reference enforcer.js |
| `.gitignore` | **UPDATE** | Add `.agency/enforcer/` |
| `ORCHESTRATION.md` | **UPDATE** | Add Sprint 20 |
| `.agency/plans/enforcement-v2-redesign.md` | **CREATE** | This file |
