# ZooCode Agency — Orchestration

See .agency/projects/jengabooks/ORCHESTRATION.md for JengaBooks sprints S1-S4

---
### Sprint 5 — Agency Infrastructure: Roo Code Setup (Est. 3.5 days)
**Theme:** CI/CD, Husky, lint-staged, test DB scripts — HIGH priority delta items from Roo Code Setup Guide

| # | Task | Type | Agent | Status | Depends On | Files |
|---|------|------|-------|--------|------------|-------|
| **5.1** | Create `.github/workflows/ci.yml` — basic CI (lint, test, build) | `ci` | `🚀 DevOps` | ✅ DONE | — | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) |
| **5.2** | Install Husky + lint-staged + pre-commit + commit-msg hooks | `devops` | `🚀 DevOps` | ✅ DONE | — | [`.husky/pre-commit`](jengabooks/.husky/pre-commit), [`.husky/commit-msg`](jengabooks/.husky/commit-msg), [`package.json`](jengabooks/package.json) |
| **5.3** | Add lint-staged config to `jengabooks/package.json` | `config` | `🔧 JengaBooks Code` | ✅ DONE | 5.2 | [`package.json`](jengabooks/package.json) |
| **5.4** | Create `test:setup` + `test:cleanup` npm scripts | `config` | `🔧 JengaBooks Code` | ✅ DONE | — | [`package.json`](jengabooks/package.json) |
| **5.5** | Create `.agency/scripts/cleanup-test-db.js` | `script` | `🔧 JengaBooks Code` | ✅ DONE | — | [`.agency/scripts/cleanup-test-db.js`](.agency/scripts/cleanup-test-db.js) |
| **5.6** | Add remaining missing npm scripts to `jengabooks/package.json` | `config` | `🔧 JengaBooks Code` | ✅ DONE | 5.4 | [`package.json`](jengabooks/package.json) |

### Sprint 6 — Agency Infrastructure: MEDIUM Priority Items (Est. 2 days)
**Theme:** Bootstrap script, temp directory, format documentation

| # | Task | Type | Agent | Status | Files |
|---|------|------|-------|--------|-------|
| **6.1** | Create `.agency/scripts/init-project.js` bootstrap script | `script` | `🔧 JengaBooks Code` | ✅ DONE — |
| **6.2** | Add `agency:init` npm script to `jengabooks/package.json` | `config` | `🔧 JengaBooks Code` | ✅ DONE — |
| **6.3** | Create `.agency/temp/` directory (cleanup temp location) | `config` | `🧠 Lead Architect` | ✅ DONE — |
| **6.4** | Document both `.roomodes` formats (ZooCode + Roo Code) | `docs` | `📝 Documentarian` | ✅ DONE | [`.agency/roomodes-formats.md`](.agency/roomodes-formats.md) |

---

**Delta Plan:** [`plans/roo-code-setup-delta-plan.md`](.agency/plans/roo-code-setup-delta-plan.md)

---

## 📚 Reference Documents

| Document | Location | Description |
|----------|----------|-------------|
| Feature Spec v3.0 | *(provided by product team)* | Complete feature spec (15 sections) |
| Sprint Delta Analysis | [`plans/mobile-feature-spec-delta.md`](plans/mobile-feature-spec-delta.md) | Feature spec → sprint plan mapping |
| Architecture Overview | [`plans/mobile-architecture-overview.md`](plans/mobile-architecture-overview.md) | Technical architecture blueprint |
| API Contracts | [`.agency/contracts/`](.agency/contracts/) | **24 API contracts** — all created (11 original + 5 new + 2 extended + 6 SIM-specific) |
| Design System Master Plan | [`plans/design-system-v2-master-plan.md`](plans/design-system-v2-master-plan.md) | UI component overhaul plan |
| Shared Types | [`jengabooks/packages/shared/src/`](jengabooks/packages/shared/src/) | Zod schemas, enums, permissions, theme |
| Prisma Schema | [`jengabooks/apps/api/prisma/schema.prisma`](jengabooks/apps/api/prisma/schema.prisma) | Database schema |
| PROJECT.md | [`jengabooks/PROJECT.md`](jengabooks/PROJECT.md) | Project constraints & context |

---

## 🧠 N-SPRINT v2.0 — Agency Intelligence Upgrade

> **Status:** `SPRINT 7-8 DONE — SPRINT 9 IN PROGRESS` | **Lead:** Lead Architect & Orchestrator | **Created:** 2026-07-10
> **Blueprint:** [`.agency/plans/n-sprint-blueprint.md`](.agency/plans/n-sprint-blueprint.md)
> **Goal:** Transform agency from Reactive Tool into Proactive, Self-Optimizing Organism

### N-SPRINT Contracts Registry

| Contract ID | Version | Path | Status | Sprint |
|---|---|---|---|---|
| `agency-telemetry` | 1.0.0 | [`.agency/contracts/agency-telemetry.json`](.agency/contracts/agency-telemetry.json) | ✅ Created | 7 |
| `agency-secret-scan` | 1.0.0 | [`.agency/contracts/agency-secret-scan.json`](.agency/contracts/agency-secret-scan.json) | ✅ Created | 7 |
| `agency-hitl-webhook` | 1.0.0 | [`.agency/contracts/agency-hitl-webhook.json`](.agency/contracts/agency-hitl-webhook.json) | ✅ Created | 8 |
| `agency-model-routing` | 1.0.0 | [`.agency/contracts/agency-model-routing.json`](.agency/contracts/agency-model-routing.json) | ✅ Created | 8 |
| `agency-dispatcher` | 1.0.0 | [`.agency/contracts/agency-dispatcher.json`](.agency/contracts/agency-dispatcher.json) | ✅ Created | 9 |
| `agency-auto-docs` | 1.0.0 | [`.agency/contracts/agency-auto-docs.json`](.agency/contracts/agency-auto-docs.json) | ✅ Created | 9 |
| `agency-memory` | 1.0.0 | [`.agency/contracts/agency-memory.json`](.agency/contracts/agency-memory.json) | ✅ Created | 10 |

### Sprint 7 — Security + Observability (Weeks 1-2, Est. 6 days)
**Theme:** N5 (Secret Scanning) + N1 (Observability Dashboard)

| # | Task | Type | Agent | Est. | Status | Depends On | Contract |
|---|---|---|---|---|---|---|---|
| **7.1** | Create secret-scan.js | script | 🔧 JengaBooks Code | 1d | ✅ DONE — | agency-secret-scan@1.0.0 |
| **7.2** | Update .husky/pre-commit — append secret-scan | config | 🚀 DevOps | 0.25d | ✅ DONE | 7.1 | agency-secret-scan@1.0.0 |
| **7.3** | Add secretScan.whitelist to .agency/config.json | config | 🧠 Lead Architect | 0.25d | ✅ DONE | 7.1 | agency-secret-scan@1.0.0 |
| **7.4** | Create telemetry.js | script | 🔧 JengaBooks Code | 2d | ✅ DONE — | agency-telemetry@1.0.0 |
| **7.5** | Hook telemetry into handoff.js | integration | 🔧 JengaBooks Code | 0.5d | ✅ DONE | 7.4 | agency-telemetry@1.0.0 |
| **7.6** | Hook telemetry into cost-track.js | integration | 🔧 JengaBooks Code | 0.5d | ✅ DONE | 7.4 | agency-telemetry@1.0.0 |
| **7.7** | Hook telemetry into status.js | integration | 🔧 JengaBooks Code | 0.25d | ✅ DONE | 7.4 | agency-telemetry@1.0.0 |
| **7.8** | Hook telemetry into escalate-lead.js | integration | 🔧 JengaBooks Code | 0.25d | ✅ DONE | 7.4 | agency-telemetry@1.0.0 |
| **7.9** | Register telemetry + secret-scan in agency.js | config | 🔧 JengaBooks Code | 0.25d | ✅ DONE | 7.4, 7.1 | — |
| **7.10** | Create telemetry storage dir + gitkeep | config | 🧠 Lead Architect | 0.1d | ✅ DONE | 7.4 | — |
| **7.11** | Chaos Monkey: test secret scan blocks commit | qa | 🧪 QA Automator | 0.5d | ✅ DONE | 7.1-7.10 | — |

### Sprint 8 — HITL + Model Routing (Weeks 3-4, Est. 5.5 days)

| # | Task | Type | Agent | Est. | Status | Depends On | Contract |
|---|---|---|---|---|---|---|---|
| **8.1** | Create hitl-server.js — Express /webhook | script | 🔧 JengaBooks Code | 2d | ✅ DONE | — | agency-hitl-webhook@1.0.0 |
| **8.2** | Create notify-hitl.js — Telegram buttons | script | 🔧 JengaBooks Code | 0.5d | ✅ DONE | — | agency-hitl-webhook@1.0.0 |
| **8.3** | Modify escalate-lead.js to call notify-hitl | integration | 🔧 JengaBooks Code | 0.5d | ✅ DONE | 8.1, 8.2 | agency-hitl-webhook@1.0.0 |
| **8.4** | Add hitl config to .agency/config.json | config | 🧠 Lead Architect | 0.25d | ✅ DONE | 8.1 | agency-hitl-webhook@1.0.0 |
| **8.5** | Update .zoo/config.json — model_overrides | config | 🧠 Lead Architect | 0.25d | ✅ DONE | — | agency-model-routing@1.0.0 |
| **8.6** | Create sync-models.js — sync overrides to .roomodes | script | 🔧 JengaBooks Code | 1d | ✅ DONE | 8.5 | agency-model-routing@1.0.0 |
| **8.7** | Add --model pro flag to handoff.js | integration | 🔧 JengaBooks Code | 0.5d | ✅ DONE | 8.6 | agency-model-routing@1.0.0 |
| **8.8** | Register hitl + model in agency.js | config | 🔧 JengaBooks Code | 0.25d | ✅ DONE | 8.1, 8.6 | — |
| **8.9** | Chaos Monkey: gate failure → Telegram approve | qa | 🧪 QA Automator | 0.5d | ✅ DONE | 8.1-8.8 | — |

### Sprint 9 — Parallel Execution + Auto-Docs (Weeks 5-6, Est. 7 days)

| # | Task | Type | Agent | Est. | Status | Depends On | Contract |
|---|---|---|---|---|---|---|---|
| **9.1** | Create dispatcher.js | script | 🔧 JengaBooks Code | 3d | ✅ DONE — | agency-dispatcher@1.0.0 |
| **9.2** | Add Depends On to ORCHESTRATION.md | config | 🧠 Lead Architect | 0.5d | ✅ DONE — | agency-dispatcher@1.0.0 |
| **9.3** | Wire dispatcher to handoff.js | integration | 🔧 JengaBooks Code | 0.5d | ✅ DONE 9.1 | agency-dispatcher@1.0.0 |
| **9.4** | Wire dispatcher to telemetry.js | integration | 🔧 JengaBooks Code | 0.25d | ✅ DONE 9.1, 7.4 | agency-dispatcher@1.0.0 |
| **9.5** | Create auto-docs.js | script | 🔧 JengaBooks Code | 2d | ✅ DONE — | agency-auto-docs@1.0.0 |
| **9.6** | Wire auto-docs to release-manager | integration | 📦 Release Manager | 0.5d | ✅ DONE 9.5 | agency-auto-docs@1.0.0 |
| **9.7** | Register in agency.js | config | 🔧 JengaBooks Code | 0.25d | ✅ DONE 9.1, 9.5 | — |
| **9.8** | Chaos Monkey validation | qa | 🧪 QA Automator | 0.5d | ✅ DONE 9.1-9.7 | — |

### Sprint 10 — Semantic Memory (Weeks 7-8, Est. 5.5 days)

| # | Task | Type | Agent | Est. | Status | Depends On | Contract |
|---|---|---|---|---|---|---|---|
| **10.1** | Create .agency/memory/ + SQLite | config | 🧠 Lead Architect | 0.25d | ✅ DONE — | agency-memory@1.0.0 |
| **10.2** | Create memory.js | script | 🔧 JengaBooks Code | 3d | ✅ DONE 10.1 | agency-memory@1.0.0 |
| **10.3** | Integrate sqlite-vec for cosine similarity | deps | 🔧 JengaBooks Code | 0.5d | ✅ DONE | 10.2 | agency-memory@1.0.0 |
| **10.4** | Inject memory recall into lead-architect .roomodes | config | 🧠 Lead Architect | 0.5d | ✅ DONE | 10.2 | agency-memory@1.0.0 |
| **10.5** | Register memory commands in agency.js | config | 🔧 JengaBooks Code | 0.25d | ✅ DONE | 10.2 | — |
| **10.6** | Update FLOW-DOC.md with memory diagram | docs | 📝 Documentarian | 0.5d | ✅ DONE | 10.2 | — |
| **10.7** | Chaos Monkey: store → clear → recall | qa | 🧪 QA Automator | 0.5d | ✅ DONE | 10.1-10.6 | — |

---

### N-SPRINT Handoff Protocol

| Handoff | From | To | Artifacts |
|---|---|---|---|
| **H7** | 🧠 Lead Architect | 🔧 JengaBooks Code | Sprint 7 contracts + n-sprint-blueprint.md |
| **H8** | 🧠 Lead Architect | 🔧 JengaBooks Code | Sprint 8 contracts (hitl, model-routing) |
| **H9** | 🧠 Lead Architect | 🔧 JengaBooks Code | Sprint 9 contracts (dispatcher, auto-docs) |
| **H10** | 🧠 Lead Architect | 🔧 JengaBooks Code | Sprint 10 contract (memory) |
| **HV** | 🧪 QA Automator | 🧠 Lead Architect | Chaos Monkey validation reports |

### N-SPRINT Quality Gates

| Gate | Trigger | Pass Criteria |
|---|---|---|
| **G11: Secret Scan** | Pre-commit | Blocks API_KEY commit |
| **G12: Telemetry** | Script invocation | Events logged to telemetry.jsonl |
| **G13: HITL Response** | Gate failure >3 | Telegram inline buttons sent |
| **G14: Model Correctness** | Agent start | lead-architect uses deepseek-pro |
| **G15: Parallel Safety** | Dispatch | No CWD collisions |
| **G16: Docs Sync** | agency docs --sync | CHANGELOG.md auto-updates |
| **G17: Memory Recall** | agency memory recall | Top-3 results returned |
| **G18: Chaos Monkey** | Sprint end | All N features pass |

---

### ✅ N-SPRINT Architect Sign-Off Checklist

- [ ] N5 (Secret Scan): Pre-commit blocks test commit containing API_KEY literal
- [ ] N1 (Telemetry): telemetry.jsonl generated for every task and agent action
- [ ] N1 (Monitor): agency monitor displays real-time color-coded event stream
- [ ] N4 (HITL): Express server runs and responds to webhook approval callback
- [ ] N4 (HITL): escalate-lead.js triggers Telegram with inline buttons
- [ ] N6 (Model Routing): lead-architect uses deepseek-pro (verify via logs)
- [ ] N6 (Model Routing): code-agent uses deepseek-flash (cost savings)
- [ ] N3 (Dispatcher): ORCHESTRATION.md has Depends On column for all tasks
- [ ] N3 (Dispatcher): 2-3 tasks run in parallel without CWD collisions
- [ ] N7 (Auto-Docs): agency docs --sync updates AGENCY-RULES.md without manual edits
- [ ] N7 (Auto-Docs): agency docs --sync generates CHANGELOG.md entry from Git log
- [x] N2 (Memory): agency memory recall returns relevant results for stored decision
- [x] N2 (Memory): Memory recall auto-invokes at lead-architect task start
- [x] All 7 N features pass Chaos Monkey validation suite

---

## 🚨 Sprint MP — Critical Infrastructure Patches

> **Status:** `IN PROGRESS` | **Lead:** 🧠 Lead Architect & Orchestrator | **Created:** 2026-07-11
> **Priority:** CRITICAL
> **Plan:** [`.agency/plans/critical-patches-plan.md`](.agency/plans/critical-patches-plan.md)

### Problem Summary

Two critical issues were identified during agency setup review:

1. **Patch 1 — Project Switching Mismatch:** `.agency/.active-project` contains `zoocode-agency` (legacy) while `.agency/projects.json` declares `activeProject: "jengabooks"`. The `cmdRegister()` function in [`projects-manager.js`](.agency/scripts/projects-manager.js) does not update `.active-project`, and [`init-project.js`](.agency/scripts/init-project.js) does not create it at all.

2. **Patch 2 — FileRegex Overlap (Swarm Rule #5):** `frontend-web` has `apps/web/src/` which is a parent of `frontend-ui`'s `apps/web/src/components/`, `frontend-page`'s `apps/web/src/pages/`, and `frontend-state`'s sub-paths. Same issue with `frontend-mobile` vs mobile specialists. Also `packages/shared/src/` is claimed by both `frontend-web` and `backend-logic`.

### Sprint MP Task Board

| # | Task | Type | Agent | Est. | Status | Depends On | Plan Ref |
|---|------|------|-------|------|--------|------------|----------|
| **MP-1** | Sync `.active-project` + fix `cmdRegister()` + `init-project.js` | `script-fix` | 🔧 JengaBooks Code | 0.5d | ✅ `DONE` | — | §Patch 1 |
| **MP-2** | Fix agent fileRegex overlaps in `.roomodes` | `config-fix` | 🔧 JengaBooks Code | 0.5d | ✅ `DONE` | — | §Patch 2 |
| **MP-3** | One-time sync: overwrite `.active-project` to `jengabooks` | `manual` | 🧠 Lead Architect | 0.1d | ✅ `DONE` | MP-1 | §Patch 1 |
| **MP-V** | Post-implementation verification | `qa` | 🧪 QA Automator | 0.25d | ✅ `DONE` | MP-1, MP-2 | §Verification |

### Handoff Chain

| Handoff | From | To | Artifacts |
|---------|------|----|-----------|
| **H-MP1** | 🧠 Lead Architect | 🔧 JengaBooks Code | [`.agency/scripts/projects-manager.js`](.agency/scripts/projects-manager.js), [`.agency/scripts/init-project.js`](.agency/scripts/init-project.js), [`.agency/plans/critical-patches-plan.md`](.agency/plans/critical-patches-plan.md) |
| **H-MP2** | 🔧 JengaBooks Code | 🧠 Lead Architect | Updated scripts |
| **H-MP3** | 🧠 Lead Architect | (self) | `.agency/.active-project` |
| **H-MP4** | 🔧 JengaBooks Code | 🧠 Lead Architect | Updated `.roomodes` |
| **H-MPV** | 🧠 Lead Architect | 🧪 QA Automator | Verification checklist |

---

### Sprint 11 — Pre-Flight Gate Enforcement (Est. 3 days)
> **Status:** `IN_PROGRESS` | **Lead:** 🧠 Lead Architect | **Contract:** `agency-preflight-gate@1.0.0`
> **Priority:** CRITICAL — Fixes the fundamental protocol compliance gap
> **Plan:** [`.agency/plans/pfg-implementation-plan.md`](.agency/plans/pfg-implementation-plan.md)
>
> **Problem:** The pre-task oath at AGENCY-RULES.md §42 is voluntary. No agent can be forced to follow it — proven by the Lead Architect skipping it on the first turn of this session.
>
> **Solution:** 3-layer enforcement system that makes the oath technically unskippable.

| # | Task | Type | Agent | Est. | Status | Depends On | Contract |
|---|------|------|-------|------|--------|------------|----------|
| **11.1** | Create `.agency/scripts/preflight-gate.js` — 4 commands (pass/check/reset/status) with sentinel file | `script` | 🔧 JengaBooks Code | 1d | ✅ `DONE` | — | `agency-preflight-gate@1.0.0` |
| **11.2** | Update `.roomodes` — inject PFG oath instruction as `customInstructions[0]` for ALL 31 agents | `config` | 🔧 JengaBooks Code | 1d | ✅ `DONE` | 11.1 | `agency-preflight-gate@1.0.0` |
| **11.3** | Update `.agency/scripts/validate-commit.js` — add advisory `PREFLIGHT:PASSED` field check | `script` | 🔧 JengaBooks Code | 0.25d | ✅ `DONE` | 11.1 | `agency-preflight-gate@1.0.0` |
| **11.4** | Add `.agency/.preflight-passed` to `.gitignore` | `config` | 🔧 JengaBooks Code | 0.1d | ✅ `DONE` | 11.1 | — |
| **11.5** | 🧪 Validate PFG-G1 through PFG-G7 quality gates | `qa` | 🧪 QA Automator | 0.5d | ✅ `DONE` | 11.1-11.4 | `agency-preflight-gate@1.0.0` |
| **11.5a** | 🐛 Fix PFG-G5: Add `preflight-gate:pass` to telemetry.js validEvents array + add event handler | `script-fix` | 🔧 JengaBooks Code | 0.1d | ✅ `DONE` | 11.5 | `agency-preflight-gate@1.0.0` |
| **11.6** | 🐛 **PRE-REQUISITE: Fix .roomodes accessibility** — no agent's fileRegex matches `.roomodes` (no extension). Use `node .agency/scripts/update-roomodes.js` approach to widen `code-agent` or `devops` regex to include extensionless config files. | `config-fix` | 🔧 JengaBooks Code | 0.25d | ✅ `DONE` | — | — |

### Sprint 11 Task Details

| # | Task | Design Principles | Edge Cases |
|---|------|-------------------|------------|
| **11.1** | **preflight-gate.js** — Node script with 4 commands. Sentinel file at `.agency/.preflight-passed` stores agent slug, timestamp, task, oathHash. Calls telemetry.js for event logging. | None (infra) | Sentinel corrupted → fail-safe exit 1; Parallel agents → slug matching; Hotfix → --hotfix flag bypasses sentinel check |
| **11.2** | **Inject PFG oath in .roomodes** — For each of 31 agents, prepend to customInstructions: `"CRITICAL — FIRST ACTION: You MUST recite the pre-task oath from AGENCY-RULES.md v5.0 §PRE-TASK OATH BEFORE executing ANY tool. Output: \"🧠 Bound by AGENCY-RULES v5.0. Pre-flight passed. Cost estimate: ~X,XXX tokens (~KES Y.YY). Sections: [applicable sections].\" Then run: node .agency/scripts/preflight-gate.js pass --agent <slug> --task \"<brief description>\".\n\n"` | None (config) | Preserve ALL existing customInstructions content after line 1 |
| **11.3** | **validate-commit.js update** — Add `PREFLIGHT` to optional fields. Advisory warning (non-blocking) if missing. | None (config) | CI/CD commits may not have PREFLIGHT; use NOT_REQUIRED value |
| **11.4** | **Gitignore update** — Add `.agency/.preflight-passed` | None (config) | Ensure file is in correct location |
| **11.6** | **Fix .roomodes fileRegex gap** — No agent can edit `.roomodes` because it has no file extension. Options: (a) Add `code-agent` regex to include files without extension in root; (b) Create a `config-editor` agent with `.*` regex for config files; (c) Add loose regex to `devops` or `release-manager`. | None (config) | Must not create security loophole (wildcard regex) |

### Handoff Chain

| Handoff | From | To | Artifacts |
|---------|------|----|-----------|
| **H11.0** | 🧠 Lead Architect | 🔧 JengaBooks Code | Fix .roomodes fileRegex accessibility + implement PFG script + inject oaths |
| **H11.1** | 🔧 JengaBooks Code | 🧪 QA Automator | All PFG artifacts for validation |
| **H11.2** | 🧪 QA Automator | 🧠 Lead Architect | PFG validation report — all 7 gates (PFG-G1 through PFG-G7) PASS |

### Quality Gates

| Gate | Trigger | Pass Criteria |
|------|---------|---------------|
| **PFG-G1** | 11.1 complete | `node preflight-gate.js pass` → `.preflight-passed` exists with valid JSON |
| **PFG-G2** | 11.1 complete | After pass → `node preflight-gate.js check --agent X` → exit 0 |
| **PFG-G3** | 11.1 complete | After reset → `node preflight-gate.js check --agent X` → exit 1 |
| **PFG-G4** | 11.1 complete | Sentinel with agent=A → `check --agent B` → exit 1 |
| **PFG-G5** | 11.1 complete | Telemetry contains `preflight-gate:pass` event |
| **PFG-G6** | 11.2 complete | Every mode in .roomodes has PFG instruction as `customInstructions[0]` |
| **PFG-G7** | 11.6 complete | At least one agent's fileRegex matches `.roomodes` filename |

---

### Sprint 12 — ORCHESTRATION.md Per-Project Split (Principal 14 Compliance)
> **Status:** `PLANNED` | **Lead:** 🧠 Lead Architect | **Plan:** [`.agency/plans/orch-split-plan.md`](.agency/plans/orch-split-plan.md)
> **Priority:** HIGH — Root ORCHESTRATION.md violates Principal 14 by mixing agency + jengabooks content
>
> **Problem:** Root ORCHESTRATION.md contains BOTH agency-level sprints (S5-S11, MP) AND jengabooks-specific sprints (S1-S4). Per Principal 14.7, each project must have its own ORCHESTRATION.md in `.agency/projects/<id>/`.

| # | Task | Type | Agent | Est. | Status | Files |
|---|------|------|-------|------|--------|-------|
| **12.1** | Split root ORCHESTRATION.md — migrate S1-S4, Design Principles, Personas, File Structure, Known Risks, API Contracts to `.agency/projects/jengabooks/ORCHESTRATION.md` | `config` | 🧠 Lead Architect | 0.5d | ✅ `DONE` | [`ORCHESTRATION.md`](ORCHESTRATION.md), [`.agency/projects/jengabooks/ORCHESTRATION.md`](.agency/projects/jengabooks/ORCHESTRATION.md) |
| **12.2** | Update root ORCHESTRATION.md — remove jengabooks content, add cross-reference link to project file | `config` | 🧠 Lead Architect | 0.25d | ✅ `DONE` | 12.1 |
| **12.3** | Update all handoff chains in both files to reference correct ORCHESTRATION.md | `config` | 🧠 Lead Architect | 0.1d | ✅ `DONE` | 12.1, 12.2 |
| **12.4** | Verify no content duplication between root and per-project ORCHESTRATION.md | `qa` | 🧪 QA Automator | 0.25d | `IN_PROGRESS` | 12.1-12.3 |

### Handoff Chain

| Handoff | From | To | Artifacts |
|---------|------|----|-----------|
| **H12.0** | 🧠 Lead Architect | (self) | Split ORCHESTRATION.md — Tasks 12.1-12.3 |
| **H12.1** | 🧠 Lead Architect | 🧪 QA Automator | Both ORCHESTRATION.md files for dedup verification |

---

### Sprint 13 — Memory & Compliance Hardening (Est. 2 days)
> **Status:** `PLANNED` | **Lead:** 🧠 Lead Architect
> **Trigger:** Post-Sprint 12 audit identified 4 gaps

| # | Task | Priority | Agent | Est. | Status |
|---|------|----------|-------|------|--------|
| **13.1** | Add `MEMORY` field validation to `.agency/scripts/validate-commit.js` | 🔴 P0 | 🔧 JengaBooks Code | 0.25d | ✅ `DONE` |
| **13.2** | Fix memory recall to support `--project jengabooks` flag for per-project storage | 🟡 P1 | 🔧 JengaBooks Code | 0.5d | ✅ `DONE` |
| **13.3** | Tune memory recall sqlite-vec cosine similarity threshold for better relevance scores | 🟢 P2 | 🔧 JengaBooks Code | 0.5d | ✅ `DONE` |
| **13.4** | 🧪 Validate all 4 fixes | `qa` | 🧪 QA Automator | 0.25d | ✅ `DONE` |

### Handoff Chain

| Handoff | From | To | Artifacts |
|---------|------|----|-----------|
| **H13.0** | 🧠 Lead Architect | 🔧 JengaBooks Code | Sprint 13 tasks 13.1-13.3 |
| **H13.1** | 🔧 JengaBooks Code | 🧪 QA Automator | Updated scripts for verification |

---

### Sprint 14 — Post-Task Gate Enforcement (Est. 2 days)
> **Status:** `IN_PROGRESS` | **Lead:** 🧠 Lead Architect | **Contract:** `agency-post-task-gate@1.0.0`
> **Plan:** [`.agency/plans/ptg-implementation-plan.md`](.agency/plans/ptg-implementation-plan.md)
> **Priority:** CRITICAL — Sprint 13 proved PFG only enforces task START, not task END
>
> **Problem:** JengaBooks Code agent skipped memory storage, left temp files, made no commit, generated no telemetry. No post-task enforcement exists.

| # | Task | Type | Agent | Est. | Status | Depends On | Contract |
|---|------|------|-------|------|--------|------------|----------|
| **14.1** | Create `.agency/scripts/post-task-gate.js` — 4 checkpoints (C1: memory, C2: cleanup, C3: metadata, C4: sentinel) | `script` | 🔧 JengaBooks Code | 1d | ✅ `DONE` | — | `agency-post-task-gate@1.0.0` |
| **14.2** | Modify `.agency/scripts/handoff.js` — call PTG check before allowing handoff, block on failure | `integration` | 🔧 JengaBooks Code | 0.5d | ✅ `DONE` | 14.1 | `agency-post-task-gate@1.0.0` |
| **14.2a** | 🐛 Fix handoff.js bugs: name/id mismatch (line 70) + wrong property name (line 77) | `script-fix` | 🔧 JengaBooks Code | 0.25d | ✅ `DONE` | 14.2 | `agency-post-task-gate@1.0.0` |
| **14.3** | 🧪 Validate PTG-G1 through PTG-G6 | `qa` | 🧪 QA Automator | 0.5d | ✅ `DONE` | 14.1, 14.2, 14.2a | `agency-post-task-gate@1.0.0` |

### Sprint 14 Task Details

| # | Task | Edge Cases |
|---|------|------------|
| **14.1** | **post-task-gate.js** — 4 checkpoints. `--task` and `--agent` required. Outputs pass/fail per checkpoint. Telemetry logged. | CI mode → --ci flag skips non-blocking checks; Hotfix → --hotfix allows partial pass |
| **14.2** | **handoff.js integration** — `handoff()` calls `post-task-gate.js check` before updating ORCHESTRATION.md. If PTG fails → exit 1, no handoff. | First handoff (no prior history) → PTG skipped; Already-checked flag → don't re-check |

### Quality Gates

| Gate | Trigger | Pass Criteria |
|------|---------|---------------|
| **PTG-G1** | 14.1 complete | PTG-C1 passes after memory.js store, fails without |
| **PTG-G2** | 14.1 complete | PTG-C2 passes with clean dir, fails with temp files |
| **PTG-G3** | 14.1 complete | PTG-C3 passes with valid commit msg, fails without MEMORY |
| **PTG-G4** | 14.1 complete | PTG-C4 resets sentinel automatically |
| **PTG-G5** | 14.1 complete | Full workflow passes end-to-end |
| **PTG-G6** | 14.2 complete | handoff.js blocks when PTG check fails |

### Handoff Chain

| Handoff | From | To | Artifacts |
|---------|------|----|-----------|
| **H14.0** | 🧠 Lead Architect | 🔧 JengaBooks Code | Sprint 14 tasks 14.1-14.2 |
| **H14.1** | 🔧 JengaBooks Code | 🧪 QA Automator | PTG artifacts for validation |
