# Agent Organization Improvements — Justification

> **Scope:** P0 + P1 fixes only
> **Status:** Proposed — awaiting approval before HANDOFF to implementation

---

## P0: Fix Config Slug Mismatch

### Current State
| File | Value |
|------|-------|
| [`.roomodes`](../../.roomodes:25) | `"slug": "code-agent"` |
| [`.agency/config.json`](../../.agency/config.json:39) | `"jengabooks-code"` |

### Problem
The `enabled` array in [`config.json`](../../.agency/config.json:8) references `jengabooks-code`, but no agent with that slug exists in [`.roomodes`](../../.roomodes). The actual agent slug is `code-agent`. This means:

- **Runtime resolution fails** — any workflow or pipeline that references `jengabooks-code` will silently skip or error because the mode slug doesn't exist in `.roomodes`
- **Auto-assignment broken** — scripts like [`auto-assign.js`](../../.agency/scripts/auto-assign.js) that read `config.json` to select agents will never route tasks to the code agent
- **Handoff validation gaps** — [`validate-handoff.js`](../../.agency/scripts/validate-handoff.js) checks agent slugs against `.roomodes`, not `config.json`, so `jengabooks-code` handoffs would fail validation

### Fix
Replace `"jengabooks-code"` → `"code-agent"` on line 39 of [`config.json`](../../.agency/config.json:39).

### Risk
**None.** This is a pure rename — the agent exists, just under a different key. Zero behavioral change.

---

## P1a: Upgrade Lead Models to `deepseek-pro`

### Current State

| Agent | Current Model | Current Cost/Task | Role |
|-------|--------------|-------------------|------|
| `frontend-lead` | `deepseek-flash` | ~KES 33.75 | Frontend architecture, component tree, state design |
| `mobile-lead` | `deepseek-flash` | ~KES 33.75 | Mobile architecture, offline strategy, navigation |
| `devops-lead` | `deepseek-flash` | ~KES 33.75 | Infra architecture, deployment strategy, DR |
| `release-manager` | `deepseek-flash` | ~KES 33.75 | SemVer, changelogs, version bumps, release PRs |

### Why This Matters

**1. Architectural decisions require reasoning depth**

Lead agents make **structural decisions** that cascade through dozens of specialist tasks:

| Decision by | Example | Impact if wrong |
|------------|---------|----------------|
| `frontend-lead` | Component tree design | 20+ components need refactoring |
| `mobile-lead` | Offline sync strategy | Data loss risk |
| `devops-lead` | Rollback plan | Production downtime |
| `release-manager` | SemVer bump | Broken dependencies downstream |

**2. The cost delta is insignificant relative to rework cost**

| Metric | `deepseek-flash` | `deepseek-pro` | Delta |
|--------|-----------------|----------------|-------|
| Input cost/1K tokens | KES 0.0675 | KES 0.2025 | **+KES 0.135** |
| Output cost/1K tokens | KES 0.270 | KES 0.810 | **+KES 0.540** |
| Cost per typical review task (~2K in / ~500 out) | KES 0.27 | KES 0.81 | **+KES 0.54** |
| Cost per architecture plan (~10K in / ~2K out) | KES 1.22 | KES 3.65 | **+KES 2.43** |

A single bad architectural decision costs **1,000–10,000× more** in rework tokens than the model upgrade premium.

**3. Current precedent is inconsistent**

| Similar role | Model | Why the difference? |
|-------------|-------|-------------------|
| `backend-lead` | ✅ `deepseek-pro` | Architecturally equivalent to `frontend-lead` |
| `compliance-guardian` | ✅ `deepseek-pro` | Reviews all code — same reasoning depth needed |
| `security-auditor` | ✅ `deepseek-pro` | Security requires careful reasoning |
| `frontend-lead` | ❌ `deepseek-flash` | **No justification — same architectural weight** |

**4. AGENCY-RULES.md §11.2 mandates cost-awareness for leads**

> "Lead agents (backend-lead, frontend-lead, mobile-lead, devops-lead) use deepseek-pro model for architectural reasoning tasks"

The current config violates this rule for 3 of 4 leads.

### Cost Impact

| Agent | Est. Tasks/Month | Current Cost/Mo | Proposed Cost/Mo | Delta/Mo |
|-------|-----------------|----------------|-----------------|----------|
| `frontend-lead` | ~30 | KES 8.10 | KES 24.30 | +KES 16.20 |
| `mobile-lead` | ~15 | KES 4.05 | KES 12.15 | +KES 8.10 |
| `devops-lead` | ~10 | KES 2.70 | KES 8.10 | +KES 5.40 |
| `release-manager` | ~5 | KES 1.35 | KES 4.05 | +KES 2.70 |
| **Total** | **~60** | **KES 16.20** | **KES 48.60** | **+KES 32.40/month** |

That's **~$0.24/month** to ensure architectural quality across all leads.

### Risk
- **Token cost increases ~3× per lead task** — but this is KES 32.40/month total
- **No functional risk** — model swap is a config change only

---

## P1b: Fix Handoff Protocol Fields in Config

### Current State

[`config.json`](../../.agency/config.json:82-89):
```json
"requiredCommitBodyFields": [
    "HANDOFF",
    "ARTIFACTS",
    "CONTRACT",
    "CONTEXT",
    "STATUS"
]
```

### What the System Actually Requires

The enforcement system ([`enforcer.js`](../../.agency/scripts/enforcer.js:378)) validates against:
```json
["HANDOFF", "ARTIFACTS", "CONTRACT", "STATUS", "MEMORY", "SCOPE"]
```

And [`validate-handoff.js`](../../.agency/scripts/validate-handoff.js:68) checks:
```json
["HANDOFF", "ARTIFACTS", "CONTRACT", "STATUS", "MEMORY", "SCOPE"]
```

### Problems with Current State

| Field in Config | Actually Used? | Notes |
|----------------|---------------|-------|
| `HANDOFF` | ✅ Yes | Core routing field |
| `ARTIFACTS` | ✅ Yes | Tracks output files |
| `CONTRACT` | ✅ Yes | API contract reference |
| `CONTEXT` | ❌ **No** | **Renamed to MEMORY (v2 memory system)** |
| `STATUS` | ✅ Yes | PASSED/FAILED/BLOCKED |
| ❌ **Missing** `MEMORY` | ✅ Required | Memory ID for traceability |
| ❌ **Missing** `SCOPE` | ✅ Required | project/global routing |

### Why MEMORY Replaced CONTEXT

In Sprint 20a, the memory system was upgraded from JSON file storage to SQLite-based v2 (FTS5 + vec0 embeddings). The handoff protocol was updated to reference memory IDs for traceability. The `MEMORY` field stores the UUID returned by `memory.js store`, enabling:
- Cross-session context retrieval
- Enforcer C1 validation (checks that memory was stored)
- Post-task auditing

The `CONTEXT` field was a legacy concept from the pre-Sprint 20 system and was replaced.

### Why SCOPE Was Added

[`config.json`](../../.agency/config.json:83) 

In Sprint 12, ORCHESTRATION.md was split per Principal 14 (Project Isolation). The `SCOPE` field (values: `project` | `global`) determines which ORCHESTRATION.md to update. Without it, the handoff system doesn't know which project's tracking file to modify.

### Fix

Replace `CONTEXT` with `MEMORY` and `SCOPE`:

```json
"requiredCommitBodyFields": [
    "HANDOFF",
    "ARTIFACTS",
    "CONTRACT",
    "STATUS",
    "MEMORY",
    "SCOPE"
]
```

### Risk
**None.** This brings config in line with what the system already enforces. No behavioral change — tasks are currently failing validation because config advertises the wrong fields.

---

## Summary of Changes

| # | File | Change | Risk | Est. Time |
|---|------|--------|------|-----------|
| P0 | [`config.json`](../../.agency/config.json:39) | `jengabooks-code` → `code-agent` | None | 30s |
| P1a | [`.roomodes`](../../.roomodes) (4 agents) | model: `deepseek-flash` → `deepseek-pro` | Low | 2 min |
| P1b | [`config.json`](../../.agency/config.json:83) | `CONTEXT` → `MEMORY`, add `SCOPE` | None | 1 min |

### Approval

Once approved, HANDOFF to `code-agent` for implementation.
