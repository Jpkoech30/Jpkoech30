# 🏢 ZooCode Agency — Brainstorming Guide

> **Purpose:** Understand the agency architecture, agent roles, and orchestration workflow  
> **Source files:** [`AGENCY.md`](../AGENCY.md) · [`AGENCY-FLOW.md`](../AGENCY-FLOW.md) · [`ORCHESTRATION.md`](../ORCHESTRATION.md) · [`.agency/AGENCY-RULES.md`](..//.agency/AGENCY-RULES.md) · [`docs/`](../docs/)

---

## 1. The Big Picture — What Is This Agency?

The **ZooCode Agency** is a **multi-agent orchestration framework** for AI coding assistants. Instead of one AI doing everything (and failing at everything), it splits work across **31 specialized agents** with strict domain boundaries, formal handoff protocols, and automated quality enforcement.

**Key innovation:** Agents don't just "talk" to each other — they pass **committed code artifacts** via **structured commit messages** (HANDOFF protocol). The git history IS the coordination layer.

---

## 2. Agent Hierarchy — The 4 Tiers

```
                    ┌──────────────────────────┐
                    │  🧠 Lead Architect        │  ← Tier 1: Orchestration
                    │  (Recall → Plan → Contract│
                    │   → Route → Track)        │
                    └────────────┬─────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
    ┌─────────────────┐ ┌──────────────┐ ┌──────────────────┐
    │  ⚙️ Backend Lead │ │ 🌐 Frontend  │ │  📱 Mobile Lead  │  ← Tier 2: Domain Leads
    │                 │ │   Web Lead   │ │                  │
    └────────┬────────┘ └──────┬───────┘ └────────┬─────────┘
             │                 │                   │
       ┌─────┼─────┐     ┌────┼────┐        ┌────┼─────┐
       ▼     ▼     ▼     ▼    ▼    ▼        ▼    ▼     ▼
    ┌───┐ ┌───┐ ┌───┐ ┌──┐ ┌──┐ ┌──┐  ┌──┐ ┌──┐ ┌───┐
    │API│ │Svc│ │Int│ │UI│ │Pg│ │St│  │UI│ │Sc│ │St │  ← Tier 3: Specialists
    └───┘ └───┘ └───┘ └──┘ └──┘ └──┘  └──┘ └──┘ └───┘
             │                                │
             ▼                                ▼
    ┌────────────────┐              ┌─────────────────┐
    │ 🗄️ Database   │              │  🚀 DevOps Lead │
    └────────────────┘              └────────┬─────────┘
                                             │
                                      ┌──────┼──────┐
                                      ▼      ▼      ▼
                                   ┌───┐  ┌───┐  ┌──┐
                                   │Inf│  │CD │  │DB│  ← Tier 3: DevOps Specialists

    Quality Gates (Tier 4):
       🔒 Security → ⚡ Performance → ♿ Accessibility
       → 🧪 QA Automator → 🛡️ Compliance Guardian → 📦 Release Manager
```

### Tier 1 — Orchestration (3 agents)

| Agent | Slug | Domain | Model |
|-------|------|--------|-------|
| 🧠 **Lead Architect & Orchestrator** | `lead-architect` | `.md \| .json \| .yaml \| .prisma \| .sql` | Flash |
| 📝 **Agency Documentarian** | `documentarian` | `.md` | Flash |
| 🛡️ **Compliance Guardian** | `compliance-guardian` | `.md` | Flash |

**🧠 Lead Architect** is the central brain — it does NOT write application code. It:
1. **Recalls** semantic memory for context
2. **Plans** the sprint / feature breakdown
3. **Contracts** — writes API contracts in `.agency/contracts/`
4. **Routes** — HANDOFFs to the right specialist
5. **Tracks** — updates ORCHESTRATION.md with progress

### Tier 2 — Domain Leads (4 agents)

These are **coordinators**, not implementers. They only touch `.md` and `.json` files.

| Agent | Slugs Supervised |
|-------|-----------------|
| ⚙️ **Backend Lead** | `backend-api`, `backend-service`, `backend-integration`, `backend-logic`, `backend-database` |
| 🌐 **Frontend Web Lead** | `frontend-ui`, `frontend-page`, `frontend-state` |
| 📱 **Mobile Lead** | `mobile-ui`, `mobile-screen`, `mobile-state` |
| 🚀 **DevOps Lead** | `devops-infra`, `devops-cicd`, `devops-db` |

### Tier 3 — Specialists (17 agents)

Each has a **strict file regex** domain — they CANNOT touch files outside it (Principal 5: SWARM):

| Squad | Agent | Slug | File Pattern |
|-------|-------|------|-------------|
| **Backend** | API | `backend-api` | `*.controller.ts`, `*.route.ts`, `*.dto.ts` |
| **Backend** | Service | `backend-service` | `*.service.ts`, `*.provider.ts`, `*.module.ts` |
| **Backend** | Integration | `backend-integration` | `*.integration.ts`, `*.adapter.ts`, `*.client.ts` |
| **Backend** | Logic | `backend-logic` | `*.logic.ts`, `*.business.ts` + `packages/shared` |
| **Backend** | Database | `backend-database` | `prisma/`, `*.sql` |
| **Frontend** | UI | `frontend-ui` | `apps/web/src/components/` |
| **Frontend** | Page | `frontend-page` | `apps/web/src/pages/` |
| **Frontend** | State | `frontend-state` | `stores/`, `hooks/`, `lib/` |
| **Frontend** | Build | `frontend-web` | `apps/web/src/`, `packages/shared` |
| **Mobile** | UI | `mobile-ui` | `apps/mobile/src/components/` |
| **Mobile** | Screen | `mobile-screen` | `apps/mobile/src/app/` |
| **Mobile** | State | `mobile-state` | `stores/`, `hooks/`, `lib/` |
| **Mobile** | Build | `frontend-mobile` | `apps/mobile/src/`, `packages/shared` |
| **DevOps** | Infra | `devops-infra` | `docker-compose`, `Dockerfile`, `scripts/deploy` |
| **DevOps** | CI/CD | `devops-cicd` | `.github/`, `scripts/ci` |
| **DevOps** | DB Admin | `devops-db` | `prisma/`, `scripts/db`, `*.sql` |
| **DevOps** | General | `devops` | `scripts/`, `docker-compose`, `Dockerfile`, `.github/` |

### Tier 4 — Quality & Support (7 agents)

| Agent | Slug | Responsibility | Model |
|-------|------|---------------|-------|
| 🧪 **QA Automator** | `qa-automator` | E2E tests, regression, contract validation | Flash |
| 🔒 **Security Auditor** | `security-auditor` | npm audit, secret detection, OWASP Top 10 | Pro |
| ⚡ **Performance Auditor** | `performance-auditor` | Lighthouse, bundle size, Core Web Vitals | Flash |
| ♿ **Accessibility Auditor** | `accessibility-auditor` | axe-core, color contrast, keyboard nav | Flash |
| 🎨 **Design System Keeper** | `design-keeper` | Design tokens, WCAG AA enforcement | Flash |
| 📦 **Release Manager** | `release-manager` | SemVer, CHANGELOG, release PRs | Pro |
| 🔧 **JengaBooks Code (Fixer)** | `jengabooks-code` | User-supervised fixes, scope-constrained | Flash |

---

## 3. The 14 Foundational Principals

These are **enforceable rules** — not guidelines. Compliance Guardian blocks anything that violates them.

| # | Principal | Core Idea |
|---|-----------|-----------|
| **1** | **VERIFICATION** | No TODO/FIXME, no hardcoded secrets, no SQL injection, no XSS |
| **2** | **TIME-TRAVEL** | No `new Date()` in business logic — use DB `NOW()` |
| **3** | **SOCRATIC** | Plan before code: list files, 3-sentence approach, 2+ edge cases |
| **4** | **GROUNDING** | Read context first (PROJECT.md, ORCHESTRATION.md) |
| **5** | **SWARM** | Never touch files outside your `fileRegex` domain |
| **6** | **FEATURE-CREEP** | Zero scope additions — modify ONLY what's in the task spec |
| **7** | **UNIT TEST** | Coverage targets: Services 95%, Controllers 80%, Utils 100% |
| **8** | **GIT HANDSHAKE** | Conventional commits + HANDOFF metadata in commit body |
| **9** | **TOKEN-OPTIMIZED RETRIEVAL** | Use `rg`/`find`/`head` before Read tool (last resort) |
| **10** | **HOTFIX EXCEPTION** | Prod fixes skip pipeline but need follow-up PR within 24h |
| **11** | **COST AWARENESS** | Pre-task cost estimate, <500 tokens/task target |
| **12** | *(reserved)* | — |
| **13** | **FILE CLUTTER PREVENTION** | One-location rule, clean up temps, no orphan files |
| **14** | **PROJECT ISOLATION** | All work scoped to one project; handoffs include `PROJECT:<id>` |

---

## 4. The HANDOFF Protocol — How Agents Pass Work

This is the **core innovation**. Every agent-to-agent transfer is encoded in the **commit message body**:

```
feat(api): add invoice creation endpoint with Zod validation

HANDOFF:backend-service
PROJECT:jengabooks
ARTIFACTS:apps/api/src/invoice/invoice.controller.ts,apps/api/src/invoice/invoice.dto.ts
CONTRACT:mobile-invoices@1.0.0
STATUS:DONE
COST-ESTIMATE:~2.5k tokens (~KES 0.07)
```

### The 6 Required Fields

| Field | Required | Values | Purpose |
|-------|----------|--------|---------|
| `HANDOFF` | ✅ | Agent slug | Who gets the task next |
| `ARTIFACTS` | ✅ | File paths | What was produced |
| `CONTRACT` | ✅ | Contract ID or `none` | Which API contract was used |
| `STATUS` | ✅ | `passed`/`failed`/`blocked` | Task outcome |
| `MEMORY` | ✅ | UUID | Memory store reference |
| `SCOPE` | ✅ | `project`/`global` | Which ORCHESTRATION.md to update |

### Handoff Flow

```
Lead Architect ──HANDOFF──→ Specialist Agent
                                  │
                                  ▼
                           Does work, commits
                                  │
                                  ▼
                           Runs enforcer POST→MIDDLE→COMMIT
                                  │
                                  ▼
                           Did they run handoff.js?
                                  │
                         ┌────────┴────────┐
                        YES                NO
                         │                  │
                         ▼                  ▼
                   Normal path         Lead Architect fallback
                                       (task-closer.js creates
                                        commit on their behalf)
                         │                  │
                         └────────┬─────────┘
                                  ▼
                         Lead Architect integrates,
                         stores memory, continues
```

---

## 5. Pipeline Types — A Through H

When a task arrives, the Lead Architect classifies it and routes through the appropriate pipeline:

| Type | Name | Pipeline (ordered) |
|------|------|--------------------|
| **A** | UI-only | `frontend-ui` → `frontend-page` → `frontend-state` → `frontend-lead` |
| **B** | API+UI | `backend-api` → `backend-service` → `backend-integration` → `backend-lead` → `frontend-ui` → `frontend-page` → `frontend-state` → `frontend-lead` |
| **C** | DB+API+UI | `backend-database` → `backend-api` → `backend-service` → `backend-integration` → `backend-lead` → `frontend-ui` → `frontend-page` → `frontend-state` → `frontend-lead` |
| **D** | Backend-only | `backend-api` → `backend-service` → `backend-integration` → `backend-lead` |
| **E** | Mobile-only | `mobile-ui` → `mobile-screen` → `mobile-state` → `mobile-lead` |
| **F** | Full-stack+mobile | Full backend → full frontend → full mobile (13 agents) |
| **G** | Infrastructure | `devops-infra` → `devops-cicd` → `devops-db` → `devops-lead` |
| **H** | Hotfix | `jengabooks-code` (direct user supervision) |

---

## 6. Quality Gates (Post-Implementation)

After each specialist's work, these gates run in order:

```
Order  Gate                    Trigger          Blocking?
────── ─────────────────────── ──────────────── ─────────
  1    🔒 Security & Verification  Implementation  YES
  2    ♿ Accessibility          Frontend impl    HIGH (blocking)
  3    ⚡ Performance            Frontend impl    Regression (warn)
  4    🧪 Unit Tests             Implementation  Test fail (block)
  5    ⚠️ Error Handling         All code        Any (block)
  6    🛡️ Compliance             All gates pass  Any (block)
```

---

## 7. The Full Development Pipeline (End-to-End)

```
RECALL → PLAN → CONTRACT → IMPLEMENT → REVIEW → DEPLOY
  │        │        │           │           │         │
  │        │        │           │           │         └── Release Manager
  │        │        │           │           └── Quality Gates (6 stages)
  │        │        │           └── Specialist Agent (HANDOFF-assigned)
  │        │        └── API Contract (.agency/contracts/<feature>.json)
  │        └── Lead Architect (plan, route, track)
  └── Semantic Memory recall (memory.js)
```

---

## 8. Enforcement Phases (enforcer.js)

A 5-phase state machine that EVERY task must pass through:

```
PRE ──→ POST ──→ MIDDLE ──→ COMMIT ──→ HANDOFF
 │        │         │          │          │
 ▼        ▼         ▼          ▼          ▼
oath    memory    contract   message    logged to
check   stored?   schema     has all    enforcement
session temp      valid?     required   DB + next
created clean?               fields?    agent
         sentinel
         gone?
```

Plus an automated **pre-commit hook** (`.husky/pre-commit`) that blocks `git commit` if no PRE session exists.

---

## 9. Key Scripts (33 in Total)

| Script | Purpose |
|--------|---------|
| [`memory.js`](../.agency/scripts/memory.js) | Semantic memory RAG — store/recall decisions |
| [`handoff.js`](../.agency/scripts/handoff.js) | Handoff payload + commit + push (blocking) |
| [`dispatcher.js`](../.agency/scripts/dispatcher.js) | Parallel task dispatcher |
| [`enforcer.js`](../.agency/scripts/enforcer.js) | 5-phase enforcement state machine |
| [`preflight-gate.js`](../.agency/scripts/preflight-gate.js) | Pre-task oath enforcement |
| [`post-task-gate.js`](../.agency/scripts/post-task-gate.js) | Post-task cleanup verification |
| [`quality-gate.js`](../.agency/scripts/quality-gate.js) | 8 quality checks (C1-C8) |
| [`secret-scan.js`](../.agency/scripts/secret-scan.js) | Secret detection |
| [`telemetry.js`](../.agency/scripts/telemetry.js) | Event logging and cost tracking |
| [`chaos-monkey.js`](../.agency/scripts/chaos-monkey.js) | Validation suite |
| [`task-closer.js`](../.agency/scripts/task-closer.js) | Fallback for agents that don't run handoff.js |

---

## 10. API Contracts (37 Total)

- **9 global agency contracts** — memory, dispatcher, HITL, model routing, secret scan, telemetry, auto-docs, multi-project, cost ledger
- **24 feature contracts** — per-project (mobile-* features for JengaBooks)
- **4 templates/schemas**

Contracts live in [`.agency/contracts/`](../.agency/contracts/) (global) and [`.agency/projects/<id>/contracts/`](../.agency/projects/jengabooks/contracts/) (per-project).

---

## 11. Cost Model

| Model | Input (KES/1M tokens) | Output (KES/1M tokens) | Used By |
|-------|----------------------|-----------------------|---------|
| **DeepSeek Flash** | KSh 19 | KSh 38 | 22 agents (specialists) |
| **DeepSeek Pro** | KSh 270 | KSh 1,080 | 7 agents (leads + principals) |

**Target:** < 500 tokens per task. **Monthly cost:** ~KES 384 (~$2.84).

---

## 12. Multi-Project Awareness

The agency can manage **multiple projects simultaneously** via [`.agency/projects.json`](../.agency/projects.json). Each project has:
- Its own `ORCHESTRATION.md` at `.agency/projects/<id>/ORCHESTRATION.md`
- Its own contracts directory
- Its own memory namespace
- Its own file root path

Every HANDOFF **must** include `PROJECT:<id>` to isolate work.

---

## 13. Memory System (Semantic RAG)

- **Storage:** SQLite with FTS5 BM25 + vec0 384-dim embeddings
- **Recall:** `node .agency/scripts/memory.js recall --query "<desc>" --limit 3`
- **Store:** `node .agency/scripts/memory.js store --project <id> --task "<id>" --content "..."`

Prevents repeated mistakes, previously rejected approaches, and known antipatterns.

---

## 14. Brainstorming Prompts

Here are some angles to explore further:

### 🔧 Structural Questions
- **Agent overlap:** `frontend-web` (regex: `apps/web/src/`) overlaps with `frontend-ui` (`apps/web/src/components/`), `frontend-page` (`apps/web/src/pages/`). Is this intentional or a bug?
- **Missing agents:** Are there any roles not covered? (e.g., dedicated "Product Owner" agent, "UX Researcher" agent)
- **Triage bypass:** The triage router bypasses the Lead Architect for tasks ≤100 words. Should this threshold be higher/lower?

### 🔄 Workflow Questions
- **Parallel execution:** The dispatcher enables parallel tasks, but how do we prevent file conflicts when 2 agents touch related files?
- **Hotfix speed:** The hotfix pipeline skips quality gates. Is that safe for financial software (JengaBooks)?
- **Handoff reliability:** What happens when `handoff.js` fails mid-way? Session state recovery covers VSCode restarts, but what about network failures?

### 📊 Quality Questions
- **Quality gate order:** Should security come BEFORE or AFTER unit tests? Current order has security first.
- **QA Automator scope:** QA writes tests but never fixes code. Should there be a "auto-fix" mode for known patterns?
- **Compliance overload:** 14 principals + 10 backend checks + 10 frontend checks + 6 security checks. Is this too much overhead for simple tasks?

### 💰 Cost Questions
- **Token budget:** <500 tokens/task is ambitious. Is this realistic for complex features?
- **Pro vs Flash:** When exactly should tasks escalate to DeepSeek Pro? Current rule: "2 retries on Flash failure." Should we add a complexity classifier?
- **Self-improvement savings:** ~KES 6,075/month savings claimed. How is this measured?

### 🏗️ Architecture Questions
- **Monorepo vs multi-repo:** The agency assumes a monorepo structure. Could it work with microservices in separate repos?
- **Contract versioning:** Major version bumps for backward-incompatible changes — but who decides what's "backward-incompatible"?
- **Memory decay:** Old memories might become irrelevant. Should there be a TTL on stored memories?
- **Project isolation:** Principal 14 says agents only modify files within their project's rootPath. But the `.agency/` directory is shared. Is this a loophole?

---

## 15. Quick Reference — CLI Commands

```bash
# Start a task
node .agency/scripts/enforcer.js pre --agent <slug> --task "<desc>"

# Recover context after VSCode restart
npm run recap

# Store what you learned
node .agency/scripts/memory.js store --project <id> --task "<id>" --content "..."

# Handoff to next agent
node .agency/scripts/handoff.js --from <me> --to <next> --task "<desc>"

# Task-closer fallback (when agent returns text instead of handoff.js)
node .agency/scripts/task-closer.js --agent <slug> --task "<id>" --artifacts "<files>"

# Complete the enforcement cycle
node .agency/scripts/enforcer.js post --agent <slug> --task "<id>" --project <id>
node .agency/scripts/enforcer.js middle --agent <slug> --task "<id>" --project <id>
node .agency/scripts/enforcer.js commit --agent <slug> --task "<id>" --msg "..."
```

---

> **Generated:** 2026-07-13 | **Source:** Consolidated from [`AGENCY.md`](../AGENCY.md), [`AGENCY-FLOW.md`](../AGENCY-FLOW.md), [`ORCHESTRATION.md`](../ORCHESTRATION.md), [`docs/`](../docs/), and [`.agency/AGENCY-RULES.md`](../.agency/AGENCY-RULES.md)
