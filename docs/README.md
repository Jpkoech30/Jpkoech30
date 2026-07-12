# ZooCode Agency — Documentation

> **Version:** 2.1  
> **Agents:** 29 across 9 squads  
> **Last updated:** 2026-07-12  

## 📚 Table of Contents

| Section | Description |
|---------|-------------|
| [`01-architecture.md`](01-architecture.md) | Agent team structure, squads, model routing |
| [`02-workflow.md`](02-workflow.md) | Task lifecycle, 8 pipeline types, routing |
| [`03-agents.md`](03-agents.md) | All 29 agent personas with style, expertise, vibe |
| [`04-handoff.md`](04-handoff.md) | HANDOFF protocol, commit body requirements |
| [`05-enforcement.md`](05-enforcement.md) | enforcer.js 4-phase state machine, MIDDLE gate |
| [`06-self-improvement.md`](06-self-improvement.md) | 6-script autonomous learning loop |
| [`07-memory.md`](07-memory.md) | memory.js — SQLite, FTS5 BM25, vec0 embeddings |
| [`08-costs.md`](08-costs.md) | KES pricing, savings estimates, circuit breaker |

## 🔗 Quick Links

| Resource | Location |
|----------|----------|
| Master Rules | [`.agency/AGENCY-RULES.md`](../.agency/AGENCY-RULES.md) |
| Agent Registry | [`.agency/config.json`](../.agency/config.json) |
| Agent Definitions | [`.roomodes`](../.roomodes) |
| API Contracts | [`.agency/contracts/`](../.agency/contracts/) |
| Sprint Tracking | [`.agency/projects/jengabooks/ORCHESTRATION.md`](../.agency/projects/jengabooks/ORCHESTRATION.md) |
| Agent Flow Overview | [`AGENCY-FLOW.md`](../AGENCY-FLOW.md) |

## 🏗️ Architecture at a Glance

```
USER REQUEST
     │
     ▼
┌───────────────────────────────────────────────────────────────┐
│  LEAD ARCHITECT                                               │
│  → Recite oath (enforcer PRE)                                │
│  → Recall memory (memory.js recall)                           │
│  → Classify task → pick pipeline (A-H)                       │
│  → HANDOFF to specialist                                     │
└───────────────────┬───────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────────────────┐
│  SPECIALIST AGENT                                             │
│  → Read contracts from .agency/contracts/                     │
│  → Implement (code/config/docs)                               │
│  → Quality gates (compliance, security, QA)                   │
│  → Submit with HANDOFF commit body                            │
└───────────────────┬───────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────────────────┐
│  ENFORCER GATES                                               │
│  POST: memory stored? temps clean? sentinels gone?            │
│  MIDDLE: contracts valid? (schema check)                      │
│  COMMIT: handoff body has all 6 required fields               │
│  HANDOFF: logged to enforcement DB                            │
└───────────────────┬───────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────────────────────┐
│  SELF-IMPROVEMENT (daily 00:00 UTC)                          │
│  health → patterns → auto-tune → heal → adapt-rules → verify │
│  All 6 scripts LLM-free, pure Node.js                        │
└───────────────────────────────────────────────────────────────┘
```
