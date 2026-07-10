# 🧠 ZooCode Agency — Orchestration

> **Status:** `ACTIVE` | **Lead:** Lead Architect & Orchestrator | **Created:** 2026-07-10

---

## 📋 Project Overview

**Goal:** Maintain and evolve the ZooCode Agency — the multi-agent orchestration framework that powers JengaBooks and other projects.

**Core Assets:**
- 31 agents defined in [`.roomodes`](.roomodes)
- 13 Foundational Principals in [`.agency/AGENCY-RULES.md`](.agency/AGENCY-RULES.md)
- 7 agency infrastructure contracts in [`.agency/contracts/`](.agency/contracts/)
- 14 automation scripts in [`.agency/scripts/`](.agency/scripts/)
- Semantic memory system in [`.agency/memory/`](.agency/memory/)

---

## 🗺️ Sprint Status

| Sprint | Theme | Status |
|--------|-------|--------|
| MP-1 | Multi-Project Isolation | **IN PROGRESS** |

---

### Sprint MP-1 — Multi-Project Isolation (Est. 4 days) — IN PROGRESS

**Theme:** Add Principal 14, create per-project directories, update scripts to be project-aware.

| # | Task | Type | Agent | Est. | Status | Depends On |
|---|------|------|-------|------|--------|------------|
| MP-1.1 | Create per-project directory structure | `config` | `🧠 Lead Architect` | 0.25d | ✅ DONE | — |
| MP-1.2 | Update `projects.json` registry v2.0 | `config` | `🧠 Lead Architect` | 0.25d | ✅ DONE | MP-1.1 |
| MP-1.3 | Create multi-project isolation contract (`agency-multi-project@1.0.0`) | `contract` | `🧠 Lead Architect` | 0.5d | ✅ DONE | — |
| MP-1.4 | Add Principal 14 (PROJECT ISOLATION) to AGENCY-RULES.md | `config` | `🧠 Lead Architect` | 0.5d | ✅ DONE | MP-1.3 |
| MP-1.5 | Migrate contracts to project-scoped directories | `docs` | `📝 Documentarian` | 0.5d | ✅ DONE | MP-1.2 |
| MP-1.6 | Update `.roomodes` with project-aware groups + pre-task oath | `config` | `🔧 JengaBooks Code` | 0.5d | ✅ DONE | MP-1.2 |
| MP-1.7 | Add `--project` flag to `memory.js` | `script` | `🔧 JengaBooks Code` | 1d | ✅ DONE | MP-1.3 |
| MP-1.8 | Add `--project` flag to `validate-commit.js` | `script` | `🔧 JengaBooks Code` | 0.5d | ✅ DONE | MP-1.3 |
| MP-1.9 | Add `--project` flag to `cost-track.js` | `script` | `🔧 JengaBooks Code` | 0.25d | ✅ DONE | MP-1.3 |
| MP-1.10 | Update COMPLIANCE-CHECKLISTS.md (add project isolation check) | `docs` | `🧠 Lead Architect` | 0.25d | ✅ DONE | MP-1.4 |
| MP-1.11 | Update AGENCY.md with multi-project sections | `docs` | `📝 Documentarian` | 0.5d | ✅ DONE | MP-1.4 |
| MP-1.12 | Update FLOW-DOC.md with multi-project handoff | `docs` | `📝 Documentarian` | 0.25d | ✅ DONE | MP-1.3 |
| MP-1.13 | E2E test: multi-project handoff validation | `qa` | `🧪 QA Automator` | 0.5d | ✅ DONE | MP-1.7–MP-1.9 |

---

## 🔗 Handoff Protocol (Multi-Project Edition)

Each handoff MUST include:

```
HANDOFF:<agent-slug>
PROJECT:<project-id>
ARTIFACTS:<comma-separated-file-list>
CONTRACT:<contract-id@version>
CONTEXT:<summary-of-what-was-done>
STATUS:<PENDING|IN_PROGRESS|REVIEW|DONE|BLOCKED>
BACKEND-DEPENDENCY:<optional>
COST-ESTIMATE:~Xk tokens (~KES Y.YY)
```

---

## ✅ Quality Gates

| Gate | Trigger | Pass Criteria |
|------|---------|---------------|
| G1: Project Isolation | Any commit | `PROJECT` field present and valid in `projects.json` |
| G2: File Boundaries | Any commit | All changed files within the project's `rootPath` |
| G3: Contract Prefix | Any contract | Contract ID matches project's `contractPrefix` |
