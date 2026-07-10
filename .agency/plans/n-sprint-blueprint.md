# 🧠 N-SPRINT v2.0 — Agency Intelligence Upgrade

> **Version:** 2.0  
> **Status:** PLANNED — Ready for implementation  
> **Lead Architect:** 🧠 Lead Architect & Orchestrator  
> **Timeline:** 4 Sprints (8 weeks)  
> **Goal:** Transform the agency from Reactive Tool into Proactive, Self-Optimizing Organism

---

## 📋 Overview

The v2.0 "N-SPRINT" elevates the agency from reactive command-execution into the "Intelligence Era":

| Capability | N-ID | Sprint | Impact |
|---|---|---|---|
| 🔒 Secret Scanning & Pre-commit Security | N5 | Sprint 7 | Non-negotiable security gate |
| 📊 Observability Dashboard (Live Telemetry) | N1 | Sprint 7 | Real-time agent visibility |
| 🧑‍💼 HITL Approval Dashboard | N4 | Sprint 8 | Turns alerts into actions |
| 🤖 Intelligent Model Routing | N6 | Sprint 8 | 20-30% cost savings |
| ⚡ Parallel Agent Execution | N3 | Sprint 9 | 2-5x throughput increase |
| 📝 Self-Updating Documentation | N7 | Sprint 9 | Zero manual doc effort |
| 🧠 Semantic Memory (Vector RAG) | N2 | Sprint 10 | Agents remember past decisions |

---

## 📐 Architecture Overview

```
                    ┌─────────────────────────────────────────┐
                    │           agency.js CLI                   │
                    │  (extended with 7 new commands)           │
                    └──────┬──────┬──────┬──────┬──────────────┘
                           │      │      │      │
              ┌────────────┘      │      │      └──────────────┐
              ▼                   ▼      ▼                     ▼
     ┌────────────────┐  ┌────────────┐  ┌───────────────┐  ┌──────────┐
     │ telemetry.js   │  │ secret-    │  │ memory.js     │  │dispatcher│
     │ (N1: monitor)  │  │ scan.js    │  │ (N2: store/   │  │.js (N3)  │
     │                │  │ (N5)       │  │  recall)      │  │          │
     └────────┬───────┘  └────────────┘  └───────┬───────┘  └────┬─────┘
              │                                   │              │
              ▼                                   ▼              ▼
     ┌────────────────┐  ┌────────────┐  ┌───────────────┐  ┌──────────┐
     │ telemetry.jsonl│  │ .husky/    │  │ .agency/memory│  │ORCHESTRA-│
     │ (event log)    │  │ pre-commit │  │ /store.db     │  │TION.md   │
     └────────────────┘  └────────────┘  └───────────────┘  └──────────┘

     ┌────────────────┐  ┌────────────┐  ┌───────────────┐
     │ hitl-server.js │  │ sync-      │  │ auto-docs.js  │
     │ (N4: Express)  │  │ models.js  │  │ (N7: changelog│
     │                │  │ (N6)       │  │  parser)      │
     └────────┬───────┘  └────────────┘  └───────┬───────┘
              │                                   │
              ▼                                   ▼
     ┌────────────────┐                 ┌───────────────┐
     │ Telegram/Slack │                 │ CHANGELOG.md  │
     │ inline buttons │                 │ AGENCY-RULES  │
     └────────────────┘                 └───────────────┘
```

---

## 📦 API Contracts Created

| Contract | Version | File | Purpose |
|---|---|---|---|
| Agency Telemetry | 1.0.0 | [`.agency/contracts/agency-telemetry.json`](../contracts/agency-telemetry.json) | Event logging pipeline schema |
| Agency Secret Scan | 1.0.0 | [`.agency/contracts/agency-secret-scan.json`](../contracts/agency-secret-scan.json) | Pre-commit security scanning config |
| Agency Memory | 1.0.0 | [`.agency/contracts/agency-memory.json`](../contracts/agency-memory.json) | Semantic vector store schema |
| Agency HITL Webhook | 1.0.0 | [`.agency/contracts/agency-hitl-webhook.json`](../contracts/agency-hitl-webhook.json) | HITL approval webhook contract |
| Agency Model Routing | 1.0.0 | [`.agency/contracts/agency-model-routing.json`](../contracts/agency-model-routing.json) | Per-role model config schema |
| Agency Dispatcher | 1.0.0 | [`.agency/contracts/agency-dispatcher.json`](../contracts/agency-dispatcher.json) | Parallel task dispatcher contract |
| Agency Auto-Docs | 1.0.0 | [`.agency/contracts/agency-auto-docs.json`](../contracts/agency-auto-docs.json) | Self-updating docs contract |

---

## 🔗 Dependency Graph

```
Sprint 7 (N5 + N1)          Sprint 8 (N4 + N6)         Sprint 9 (N3 + N7)      Sprint 10 (N2)
─────────────────          ─────────────────          ─────────────────        ─────────────────
N5: secret-scan.js ──────► N4: hitl-server.js         N3: dispatcher.js        N2: memory.js
  (pre-commit hook)          (Express + Telegram)        (parallel engine)        (vector store)
      │                            │                          │                       │
      ▼                            ▼                          ▼                       ▼
N1: telemetry.js ──────────► N4: escalate-lead.js      N3: depends_on schema    N2: .roomodes
  (monitor + jsonl)            wiring                   (ORCHESTRATION.md)         injection
      │                            │                          │                       │
      ▼                            ▼                          ▼                       ▼
N1: hook into all            N6: model_overrides        N7: auto-docs.js         N2: chaos-monkey
  existing scripts           (.zoo/config.json)           (git parser)             extension
```

---

## 🛠️ Implementation Tickets

### Sprint 7 — Security + Observability (Weeks 1-2)

| # | Task | Type | Agent | Est. | Depends On | Contract |
|---|---|---|---|---|---|---|
| **7.1** | Create `.agency/scripts/secret-scan.js` — regex-based secret detector | `script` | 🔧 JengaBooks Code | 1d | — | `agency-secret-scan@1.0.0` |
| **7.2** | Update `.husky/pre-commit` — append secret-scan.js run | `config` | 🚀 DevOps | 0.25d | 7.1 | `agency-secret-scan@1.0.0` |
| **7.3** | Add `secretScan.whitelist` to `.agency/config.json` | `config` | 🧠 Lead Architect | 0.25d | 7.1 | `agency-secret-scan@1.0.0` |
| **7.4** | Create `.agency/scripts/telemetry.js` — JSONL logger + monitor CLI | `script` | 🔧 JengaBooks Code | 2d | — | `agency-telemetry@1.0.0` |
| **7.5** | Hook telemetry into handoff.js (log start/end) | `integration` | 🔧 JengaBooks Code | 0.5d | 7.4 | `agency-telemetry@1.0.0` |
| **7.6** | Hook telemetry into cost-track.js (log cost events) | `integration` | 🔧 JengaBooks Code | 0.5d | 7.4 | `agency-telemetry@1.0.0` |
| **7.7** | Hook telemetry into status.js (log status transitions) | `integration` | 🔧 JengaBooks Code | 0.25d | 7.4 | `agency-telemetry@1.0.0` |
| **7.8** | Hook telemetry into escalate-lead.js (log gate failures) | `integration` | 🔧 JengaBooks Code | 0.25d | 7.4 | `agency-telemetry@1.0.0` |
| **7.9** | Register telemetry + secret-scan commands in `agency.js` | `config` | 🔧 JengaBooks Code | 0.25d | 7.4, 7.1 | — |
| **7.10** | Create telemetry storage directory `.agency/telemetry/` | `config` | 🧠 Lead Architect | 0.1d | 7.4 | — |
| **7.11** | Chaos Monkey validation — test secret scan blocks API_KEY commit | `qa` | 🧪 QA Automator | 0.5d | 7.1-7.10 | — |

### Sprint 8 — HITL + Model Routing (Weeks 3-4)

| # | Task | Type | Agent | Est. | Depends On | Contract |
|---|---|---|---|---|---|---|
| **8.1** | Create `.agency/scripts/hitl-server.js` — Express server with `/webhook/approve/:taskId` | `script` | 🔧 JengaBooks Code | 2d | — | `agency-hitl-webhook@1.0.0` |
| **8.2** | Create `.agency/scripts/notify-hitl.js` — sends Telegram inline button messages | `script` | 🔧 JengaBooks Code | 0.5d | — | `agency-hitl-webhook@1.0.0` |
| **8.3** | Modify escalate-lead.js to call notify-hitl instead of just logging | `integration` | 🔧 JengaBooks Code | 0.5d | 8.1, 8.2 | `agency-hitl-webhook@1.0.0` |
| **8.4** | Add `hitl.callbackUrl` to `.agency/config.json` | `config` | 🧠 Lead Architect | 0.25d | 8.1 | `agency-hitl-webhook@1.0.0` |
| **8.5** | Update `.zoo/config.json` — add `model_overrides` map | `config` | 🧠 Lead Architect | 0.25d | — | `agency-model-routing@1.0.0` |
| **8.6** | Create `.agency/scripts/sync-models.js` — sync model_overrides into .roomodes | `script` | 🔧 JengaBooks Code | 1d | 8.5 | `agency-model-routing@1.0.0` |
| **8.7** | Add `--model pro` flag to handoff.js | `integration` | 🔧 JengaBooks Code | 0.5d | 8.6 | `agency-model-routing@1.0.0` |
| **8.8** | Register hitl + model commands in `agency.js` | `config` | 🔧 JengaBooks Code | 0.25d | 8.1, 8.6 | — |
| **8.9** | Chaos Monkey validation — simulate gate failure, approve via Telegram callback | `qa` | 🧪 QA Automator | 0.5d | 8.1-8.8 | — |

### Sprint 9 — Parallel Execution + Auto-Docs (Weeks 5-6)

| # | Task | Type | Agent | Est. | Depends On | Contract |
|---|---|---|---|---|---|---|
| **9.1** | Create `.agency/scripts/dispatcher.js` — reads ORCHESTRATION.md, spawns parallel tasks | `script` | 🔧 JengaBooks Code | 3d | — | `agency-dispatcher@1.0.0` |
| **9.2** | Add `Depends On` column to all existing task tables in ORCHESTRATION.md | `config` | 🧠 Lead Architect | 0.5d | — | `agency-dispatcher@1.0.0` |
| **9.3** | Wire dispatcher to handoff.js for task delegation | `integration` | 🔧 JengaBooks Code | 0.5d | 9.1 | `agency-dispatcher@1.0.0` |
| **9.4** | Wire dispatcher to telemetry.js for parallel task tracing | `integration` | 🔧 JengaBooks Code | 0.25d | 9.1, 7.4 | `agency-dispatcher@1.0.0` |
| **9.5** | Create `.agency/scripts/auto-docs.js` — JSDoc parser + Git log reader | `script` | 🔧 JengaBooks Code | 2d | — | `agency-auto-docs@1.0.0` |
| **9.6** | Wire auto-docs into release-manager workflow | `integration` | 📦 Release Manager | 0.5d | 9.5 | `agency-auto-docs@1.0.0` |
| **9.7** | Register dispatcher + auto-docs commands in `agency.js` | `config` | 🔧 JengaBooks Code | 0.25d | 9.1, 9.5 | — |
| **9.8** | Chaos Monkey validation — run `agency dispatch --parallel 3` on test sprint | `qa` | 🧪 QA Automator | 0.5d | 9.1-9.7 | — |

### Sprint 10 — Semantic Memory (Weeks 7-8)

| # | Task | Type | Agent | Est. | Depends On | Contract |
|---|---|---|---|---|---|---|
| **10.1** | Create `.agency/memory/` directory + SQLite schema init script | `config` | 🧠 Lead Architect | 0.25d | — | `agency-memory@1.0.0` |
| **10.2** | Create `.agency/scripts/memory.js` — embed, store, recall, purge commands | `script` | 🔧 JengaBooks Code | 3d | 10.1 | `agency-memory@1.0.0` |
| **10.3** | Integrate sqlite-vec extension for cosine similarity search | `deps` | 🔧 JengaBooks Code | 0.5d | 10.2 | `agency-memory@1.0.0` |
| **10.4** | Inject `memory recall --query <task>` into lead-architect customInstructions in .roomodes | `config` | 🧠 Lead Architect | 0.5d | 10.2 | `agency-memory@1.0.0` |
| **10.5** | Register memory commands in `agency.js` | `config` | 🔧 JengaBooks Code | 0.25d | 10.2 | — |
| **10.6** | Update FLOW-DOC.md with memory recall integration diagram | `docs` | 📝 Documentarian | 0.5d | 10.2 | — |
| **10.7** | Chaos Monkey validation — store decision, clear context, recall successfully | `qa` | 🧪 QA Automator | 0.5d | 10.1-10.6 | — |

---

## ✅ Architect Sign-Off Checklist

- [ ] **N5 (Secret Scan):** Pre-commit hook blocks test commit containing `API_KEY` literal
- [ ] **N1 (Telemetry):** `telemetry.jsonl` is being generated for every task and agent action
- [ ] **N1 (Monitor):** `agency monitor` displays real-time color-coded event stream
- [ ] **N4 (HITL):** HITL Express server runs and responds to webhook approval callback
- [ ] **N4 (HITL):** `escalate-lead.js` triggers Telegram notification with inline buttons
- [ ] **N6 (Model Routing):** `lead-architect` automatically uses `deepseek-pro` (verify via logs)
- [ ] **N6 (Model Routing):** `code-agent` uses `deepseek-flash` (cost savings)
- [ ] **N3 (Dispatcher):** ORCHESTRATION.md has `Depends On` column populated for all tasks
- [ ] **N3 (Dispatcher):** Dispatcher runs 2-3 independent tasks in parallel without CWD/context collisions
- [ ] **N7 (Auto-Docs):** `agency docs --sync` updates AGENCY-RULES.md without manual edits
- [ ] **N7 (Auto-Docs):** `agency docs --sync` generates CHANGELOG.md entry from Git log
- [ ] **N2 (Memory):** `agency memory recall` returns relevant results for a stored decision
- [ ] **N2 (Memory):** Memory recall auto-invokes at lead-architect task start
- [ ] **All 7 N features** pass Chaos Monkey validation suite

---

## 📊 Cost Estimate

Estimated tokens for full implementation across all 4 sprints:

| Sprint | Tasks | Est. Tokens | Est. Cost (KES) |
|--------|-------|-------------|-----------------|
| Sprint 7 (N5+N1) | 11 | ~8,500 | ~KES 220 |
| Sprint 8 (N4+N6) | 9 | ~9,000 | ~KES 230 |
| Sprint 9 (N3+N7) | 8 | ~10,000 | ~KES 260 |
| Sprint 10 (N2) | 7 | ~8,000 | ~KES 210 |
| **Total** | **35** | **~35,500** | **~KES 920** |

> Using DeepSeek Flash at KSh 19/1M input, KSh 38/1M output.  
> DeepSeek Pro at KSh 270/1M input, KSh 1,080/1M output (only for lead-architect tasks).

---

## 🔗 Reference Documents

| Document | Location | Purpose |
|---|---|---|
| N-SPRINT Blueprint (original) | `jengabooks` strategic doc | Source requirements |
| AGENCY-RULES.md | [`.agency/AGENCY-RULES.md`](../AGENCY-RULES.md) | Agency rules (v5.0) |
| FLOW-DOC.md | [`FLOW-DOC.md`](../../FLOW-DOC.md) | Pipeline stages, handoff graph |
| ORCHESTRATION.md | [`ORCHESTRATION.md`](../../ORCHESTRATION.md) | Live tracking (Sprint 7-10) |
| Agency Telemetry Contract | [`.agency/contracts/agency-telemetry.json`](../contracts/agency-telemetry.json) | N1 contract |
| Agency Secret Scan Contract | [`.agency/contracts/agency-secret-scan.json`](../contracts/agency-secret-scan.json) | N5 contract |
| Agency Memory Contract | [`.agency/contracts/agency-memory.json`](../contracts/agency-memory.json) | N2 contract |
| Agency HITL Webhook Contract | [`.agency/contracts/agency-hitl-webhook.json`](../contracts/agency-hitl-webhook.json) | N4 contract |
| Agency Model Routing Contract | [`.agency/contracts/agency-model-routing.json`](../contracts/agency-model-routing.json) | N6 contract |
| Agency Dispatcher Contract | [`.agency/contracts/agency-dispatcher.json`](../contracts/agency-dispatcher.json) | N3 contract |
| Agency Auto-Docs Contract | [`.agency/contracts/agency-auto-docs.json`](../contracts/agency-auto-docs.json) | N7 contract |
