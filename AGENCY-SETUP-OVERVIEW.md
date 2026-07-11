# 🏢 ZooCode Agency — Complete Setup Overview

> **Generated:** 2026-07-11  
> **Purpose:** Comprehensive snapshot of the entire agency setup — copy-paste friendly  
> **Source Files:** [`AGENCY.md`](AGENCY.md) · [`.agency/AGENCY-RULES.md`](.agency/AGENCY-RULES.md) · [`.roomodes`](.roomodes) · [`.agency/config.json`](.agency/config.json) · [`.agency/projects.json`](.agency/projects.json) · [`ORCHESTRATION.md`](ORCHESTRATION.md) · [`FLOW-DOC.md`](FLOW-DOC.md)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Active Project](#2-active-project)
3. [Agent Hierarchy — 31 Agents in 4 Tiers](#3-agent-hierarchy--31-agents-in-4-tiers)
4. [The 14 Foundational Principals](#4-the-14-foundational-principals)
5. [Handoff Protocol](#5-handoff-protocol)
6. [Feature Pipeline & Quality Gates](#6-feature-pipeline--quality-gates)
7. [API Contracts Inventory (37 Total)](#7-api-contracts-inventory-37-total)
8. [Scripts Inventory (33 Scripts)](#8-scripts-inventory-33-scripts)
9. [Directory Structure Map](#9-directory-structure-map)
10. [npm Scripts Quick Reference](#10-npm-scripts-quick-reference)
11. [Pre-Task Oath](#11-pre-task-oath)
12. [Cost Model](#12-cost-model)

---

## 1. Executive Summary

| Property | Value |
|----------|-------|
| **Agency Name** | ZooCode Agency |
| **Version** | 5.0 |
| **Target Stack** | ZooCode + DeepSeek Flash (with DeepSeek Pro escalation) |
| **Currency** | Kenyan Shillings (KES) — 1 USD = 135 KES |
| **Total Agents** | **31** (3 Orchestration · 4 Domain Leads · 17 Specialists · 7 Quality/Support) |
| **Foundational Principals** | **14** enforceable rules |
| **API Contracts** | **37** (9 global agency + 24 feature + 4 templates/schemas) |
| **Scripts** | **33** Node.js scripts in `.agency/scripts/` |
| **Projects Managed** | **1** — `jengabooks` (Kenyan accounting SaaS) |
| **Backend Stack** | NestJS + Prisma + PostgreSQL |
| **Frontend Web** | React (Vite) + TailwindCSS |
| **Mobile** | Expo (React Native) + NativeWind |
| **Orchestration File** | [`ORCHESTRATION.md`](ORCHESTRATION.md) (root) |

---

## 2. Active Project

**`activeProject`:** `jengabooks` (from [`.agency/projects.json`](.agency/projects.json))

| Field | Value |
|-------|-------|
| **ID** | `jengabooks` |
| **Name** | JengaBooks |
| **Description** | Kenyan accounting SaaS — NestJS + Postgres + React/Expo |
| **Root Path** | `projects/jengabooks/` |
| **Repo URL** | `https://github.com/Jpkoech30/jengabooks.git` |
| **Default Branch** | `main` |
| **Contract Prefix** | `jengabooks-` |
| **Memory Tag** | `jengabooks` |

**Leads assigned:**
- `🧠 lead-architect` — Lead Architect & Orchestrator
- `⚙️ backend-lead` — Backend Lead
- `🌐 frontend-lead` — Frontend Web Lead
- `📱 mobile-lead` — Mobile Lead
- `🚀 devops-lead` — DevOps Lead

> **Note:** [`.agency/.active-project`](.agency/.active-project) currently contains `zoocode-agency` — this is a legacy value that may need updating to match `projects.json`.

---

## 3. Agent Hierarchy — 31 Agents in 4 Tiers

### Tier 1: Orchestration Layer

| Agent | Slug | Domain (`fileRegex`) | Model |
|-------|------|---------------------|-------|
| 🧠 **Lead Architect & Orchestrator** | `lead-architect` | `.md\|json\|yaml\|prisma\|sql` | Flash |
| 📝 **Agency Documentarian** | `documentarian` | `.md` | Flash |
| 🛡️ **Compliance Guardian** | `compliance-guardian` | `.md` | Flash |

### Tier 2: Domain Leads (Coordinators)

| Agent | Slug | Domain (`fileRegex`) | Supervises |
|-------|------|---------------------|------------|
| ⚙️ **Backend Lead** | `backend-lead` | `.md\|json` | API, Service, Integration, Logic, Database |
| 🌐 **Frontend Web Lead** | `frontend-lead` | `.md\|json` | UI, Page, State |
| 📱 **Mobile Lead** | `mobile-lead` | `.md\|json` | UI, Screen, State |
| 🚀 **DevOps Lead** | `devops-lead` | `.md\|json` | Infra, CI/CD, DB Admin |

### Tier 3: Specialist Agents (Implementers)

| Domain | Agent | Slug | File Regex |
|--------|-------|------|------------|
| **Backend** | ⚙️ Backend API | `backend-api` | `apps/api/src/*.controller.ts`, `.route.ts`, `.dto.ts` |
| **Backend** | ⚙️ Backend Service | `backend-service` | `apps/api/src/*.service.ts`, `.provider.ts`, `.module.ts` |
| **Backend** | ⚙️ Backend Integration | `backend-integration` | `apps/api/src/*.integration.ts`, `.adapter.ts`, `.client.ts` |
| **Backend** | ⚙️ Backend Logic | `backend-logic` | `apps/api/src/*.logic.ts`, `.business.ts` + `packages/shared` |
| **Backend** | 🗄️ Database | `backend-database` | `apps/api/prisma/`, `*.sql` |
| **Frontend Web** | 🌐 Frontend UI | `frontend-ui` | `apps/web/src/components/` |
| **Frontend Web** | 🌐 Frontend Page | `frontend-page` | `apps/web/src/pages/` |
| **Frontend Web** | 🌐 Frontend State | `frontend-state` | `stores/`, `hooks/`, `lib/` |
| **Frontend Web** | 🌐 Frontend Web | `frontend-web` | `apps/web/src/`, `packages/shared` |
| **Mobile** | 📱 Mobile UI | `mobile-ui` | `apps/mobile/src/components/` |
| **Mobile** | 📱 Mobile Screen | `mobile-screen` | `apps/mobile/src/app/` |
| **Mobile** | 📱 Mobile State | `mobile-state` | `stores/`, `hooks/`, `lib/` |
| **Mobile** | 📱 Frontend Mobile | `frontend-mobile` | `apps/mobile/src/`, `packages/shared` |
| **DevOps** | 🚀 DevOps Infra | `devops-infra` | `docker-compose`, `Dockerfile`, `scripts/deploy` |
| **DevOps** | 🚀 DevOps CI/CD | `devops-cicd` | `.github/`, `scripts/ci` |
| **DevOps** | 🚀 DevOps DB Admin | `devops-db` | `prisma/`, `scripts/db`, `*.sql` |
| **DevOps** | 🚀 DevOps | `devops` | `scripts/`, `docker-compose`, `Dockerfile`, `.github/` |

### Tier 4: Quality & Support

| Role | Agent | Slug | Responsibility |
|------|-------|------|---------------|
| 🧪 QA | QA Automator | `qa-automator` | E2E tests, regression, contract validation |
| 🔒 Security | Security Auditor | `security-auditor` | npm audit, secret detection, OWASP Top 10 |
| ⚡ Performance | Performance Auditor | `performance-auditor` | Lighthouse, bundle size, Core Web Vitals |
| ♿ Accessibility | Accessibility Auditor | `accessibility-auditor` | axe-core, color contrast, keyboard nav |
| 🎨 Design | Design System Keeper | `design-keeper` | Design tokens, WCAG AA enforcement |
| 📦 Release | Release Manager | `release-manager` | SemVer, CHANGELOG, release PRs |
| 🔧 Fixer | Code Agent | `code-agent` | User-supervised fixes, scope-constrained |

### Agent Hierarchy Diagram

```
                    ┌──────────────────────────┐
                    │  🧠 Lead Architect        │
                    │  (Recall → Plan → Contract│
                    │   → Route → Track)        │
                    └────────────┬─────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
    ┌─────────────────┐ ┌──────────────┐ ┌──────────────────┐
    │  ⚙️ Backend Lead │ │ 🌐 Frontend  │ │  📱 Mobile Lead  │
    │                 │ │   Web Lead   │ │                  │
    └────────┬────────┘ └──────┬───────┘ └────────┬─────────┘
             │                 │                   │
       ┌─────┼─────┐     ┌────┼────┐        ┌────┼─────┐
       ▼     ▼     ▼     ▼    ▼    ▼        ▼    ▼     ▼
    ┌───┐ ┌───┐ ┌───┐ ┌──┐ ┌──┐ ┌──┐  ┌──┐ ┌──┐ ┌───┐
    │API│ │Svc│ │Int│ │UI│ │Pg│ │St│  │UI│ │Sc│ │St │
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
                                   │Inf│  │CD │  │DB│
                                   └───┘  └───┘  └──┘

    Quality Gates (post-implementation):
       🔒 Security → ⚡ Performance → ♿ Accessibility
       → 🧪 QA Automator → 🛡️ Compliance Guardian → 📦 Release Manager
```

---

## 4. The 14 Foundational Principals

| # | Principal | Summary | Enforcement |
|---|-----------|---------|-------------|
| **1** | **VERIFICATION** | Anti-hallucination + security: No TODO/FIXME, no hardcoded secrets, no SQL injection, no XSS | Compliance Guardian blocks on any occurrence |
| **2** | **TIME-TRAVEL** | No `new Date()` in financial logic, audit logs, or persisted timestamps — use DB `NOW()` | Automated scan in CI |
| **3** | **SOCRATIC** | Plan before code: list files-to-change, 3-sentence approach, 2+ edge cases | Lead Architect gate |
| **4** | **GROUNDING** | Read context first: PROJECT.md + ORCHESTRATION.md, use `rg`/`find`/`head` before Read tool | Token-usage auditor |
| **5** | **SWARM** | Never touch files outside your `fileRegex` domain — request reassignment | File-level enforcement in `.roomodes` |
| **6** | **FEATURE-CREEP** | Zero scope additions — modify ONLY files in the task spec | Compliance check |
| **7** | **UNIT TEST** | Services: 95%, Controllers/UI: 80%, Utils: 100% coverage | CI gate |
| **8** | **GIT HANDSHAKE** | Conventional commits + HANDOFF metadata in commit body | `validate-commit.js` hook |
| **9** | **TOKEN-OPTIMIZED RETRIEVAL** | Use `rg`/`sed`/`head` before Read tool — Read is last resort | Cost tracker |
| **10** | **HOTFIX EXCEPTION** | Critical prod fixes skip full pipeline but require follow-up PR within 24h | Lead Architect approval |
| **11** | **COST AWARENESS** | Pre-task cost estimate, <500 tokens/task target, KES-based tracking | Automatic cost reporting |
| **12** | *(reserved)* | — | — |
| **13** | **FILE CLUTTER PREVENTION** | One-location rule, clean up temps, no orphan files | Compliance Guardian scan |
| **14** | **PROJECT ISOLATION** | All work scoped to one project; handoffs include `PROJECT:<id>`; agents only modify files within their project's `rootPath` | `validate-commit.js` + Compliance Guardian |

---

## 5. Handoff Protocol

### Commit Body Format

```
HANDOFF:<next-agent-slug>
PROJECT:<project-id>
ARTIFACTS:<comma-separated-file-list>
CONTRACT:<contract-id@version>
STATUS:<status>
BACKEND-DEPENDENCY:<optional-description>
COST-ESTIMATE:~Xk tokens (~KES Y.YY)
```

### Status Values

| Status | Meaning |
|--------|---------|
| `PENDING` | Not yet started |
| `IN_PROGRESS` | Actively working |
| `REVIEW` | Implementation done, awaiting review |
| `DONE` | Completed and committed |
| `BLOCKED` | Cannot proceed (reason required) |
| `HOTFIX` | Emergency production fix |

### Example

```
feat(api): add invoice creation endpoint with Zod validation

HANDOFF:backend-service
PROJECT:jengabooks
ARTIFACTS:apps/api/src/invoice/invoice.controller.ts,apps/api/src/invoice/invoice.dto.ts
CONTRACT:mobile-invoices@1.0.0
STATUS:DONE
COST-ESTIMATE:~2.5k tokens (~KES 0.07)
```

### Cross-Agent Artifacts

| Artifact | Producer | Consumer | Location |
|----------|----------|----------|----------|
| Semantic Memory | Lead Architect | Lead Architect | `.agency/memory/store.db` |
| Orchestration Plan | Lead Architect | All agents | `ORCHESTRATION.md` |
| API Contract | Lead Architect | Specialist agents | `.agency/contracts/<feature>.json` |
| HANDOFF Payload | Producer agent | Consumer agent | Commit message body |

---

## 6. Feature Pipeline & Quality Gates

### Full Development Pipeline

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

### Feature Types (Pipeline Routing)

| Type | Name | Pipeline |
|------|------|----------|
| A | UI-only | Frontend Lead → Frontend specialists |
| B | API+UI | Backend Lead → Frontend Lead |
| C | DB+API+UI | Database → Backend Lead → Frontend Lead |
| D | Backend-only | Backend Lead → Backend specialists |

### Quality Gates Order

| Order | Gate | Trigger | Blocking? | Pass Criteria |
|-------|------|---------|-----------|---------------|
| 1 | 🔒 Security & Verification | Implementation | YES | No hallucinations, no OWASP |
| 2 | ♿ Accessibility | Frontend impl | HIGH | WCAG 2.1 AA, 48px targets |
| 3 | ⚡ Performance | Frontend impl | Regression | Lighthouse >=90, LCP <2.5s |
| 4 | 🧪 Unit Tests | Implementation | Test fail | All pass, coverage targets met |
| 5 | ⚠️ Error Handling | All code | Any | All errors caught, user-friendly |
| 6 | 🛡️ Compliance | All gates pass | Any | All 13 principals satisfied |

---

## 7. API Contracts Inventory (37 Total)

### Global Agency Contracts (9)

| Contract | Version | Purpose |
|----------|---------|---------|
| [`agency-memory`](.agency/contracts/agency-memory.json) | 1.0.0 | Semantic memory vector RAG system |
| [`agency-dispatcher`](.agency/contracts/agency-dispatcher.json) | 1.0.0 | Agent-to-agent task dispatch protocol |
| [`agency-hitl-webhook`](.agency/contracts/agency-hitl-webhook.json) | 1.0.0 | Human-in-the-loop webhook integration |
| [`agency-model-routing`](.agency/contracts/agency-model-routing.json) | 1.0.0 | LLM model routing (Flash → Pro escalation) |
| [`agency-secret-scan`](.agency/contracts/agency-secret-scan.json) | 1.0.0 | Secret scanning configuration |
| [`agency-telemetry`](.agency/contracts/agency-telemetry.json) | 1.0.0 | Telemetry and cost tracking |
| [`agency-auto-docs`](.agency/contracts/agency-auto-docs.json) | 1.0.0 | Auto-documentation generation |
| [`agency-multi-project`](.agency/contracts/agency-multi-project.json) | 1.0.0 | Multi-project isolation rules |
| [`cost-ledger.schema`](.agency/contracts/cost-ledger.schema.json) | 1.0.0 | Cost ledger schema definition |

### JengaBooks Feature Contracts (24)

📍 Location: [`.agency/projects/jengabooks/contracts/`](.agency/projects/jengabooks/contracts/)

| Contract | Description | SIM Feature |
|----------|-------------|-------------|
| `mobile-auth` | Authentication & authorization | — |
| `mobile-backup` | Cloud backup & restore | — |
| `mobile-barcode` | Barcode scanning | SIM #14 |
| `mobile-biometric` | Biometric authentication | — |
| `mobile-client-portal` | Client portal access | — |
| `mobile-clients` | Client management CRUD | SIM #5, #12 |
| `mobile-credit-notes` | Credit notes management | SIM #8 |
| `mobile-dashboard` | Dashboard summaries | — |
| `mobile-documents` | Document upload & management | — |
| `mobile-etims` | KRA eTIMS integration | SIM #2, #7 |
| `mobile-expenses` | Expense tracking | — |
| `mobile-export` | Data export (PDF, CSV) | SIM #11 |
| `mobile-gamification` | XP bar & gamification | — |
| `mobile-hitl` | Human-in-the-loop approvals | — |
| `mobile-ledger` | General ledger view | — |
| `mobile-mpesa` | M-Pesa payment integration | — |
| `mobile-payments` | Payment processing | SIM #10 |
| `mobile-payroll` | Payroll management | — |
| `mobile-products` | Product/Service catalog | SIM #6 |
| `mobile-receipts` | Receipt management | SIM #9 |
| `mobile-reports` | Financial reports | — |
| `mobile-share` | WhatsApp sharing | SIM #4 |
| `mobile-sms-import` | SMS import for transactions | — |
| `mobile-sync` | Offline sync protocol | — |

### Other

| File | Description |
|------|-------------|
| [`TEMPLATE.api.json`](.agency/contracts/TEMPLATE.api.json) | Contract template for new features |
| [`MOBILE-CONTRACTS-MOVED.md`](.agency/contracts/MOBILE-CONTRACTS-MOVED.md) | Pointer to new contract location |

---

## 8. Scripts Inventory (33 Scripts)

All scripts live in [`.agency/scripts/`](.agency/scripts/):

### Core Agency Scripts

| Script | Purpose |
|--------|---------|
| [`agency.js`](.agency/agency.js) | Central agency CLI — entry point for all agency commands |
| [`memory.js`](.agency/scripts/memory.js) | Semantic memory RAG — store/recall decisions |
| [`handoff.js`](.agency/scripts/handoff.js) | Handoff payload validation |
| [`dispatcher.js`](.agency/scripts/dispatcher.js) | Parallel task dispatcher |
| [`validate-commit.js`](.agency/scripts/validate-commit.js) | Commit message validation (HANDOFF, PROJECT, format) |
| [`validate-handoff.js`](.agency/scripts/validate-handoff.js) | Handoff-specific validation |
| [`validate-handoff.ps1`](.agency/scripts/validate-handoff.ps1) | PowerShell handoff validator |

### Security & Compliance

| Script | Purpose |
|--------|---------|
| [`secret-scan.js`](.agency/scripts/secret-scan.js) | Secret scanning (API keys, tokens, passwords) |
| [`compliance-guardian`] *(enforced by rules)* | Block on violations |

### Telemetry & Cost

| Script | Purpose |
|--------|---------|
| [`telemetry.js`](.agency/scripts/telemetry.js) | Event telemetry logging |
| [`cost-track.js`](.agency/scripts/cost-track.js) | Token cost tracking |
| [`cost-report.js`](.agency/scripts/cost-report.js) | Cost report generation |

### HITL (Human-in-the-Loop)

| Script | Purpose |
|--------|---------|
| [`hitl-server.js`](.agency/scripts/hitl-server.js) | Express webhook server for approvals |
| [`notify-hitl.js`](.agency/scripts/notify-hitl.js) | Telegram notification with inline buttons |
| [`notify-telegram.js`](.agency/scripts/notify-telegram.js) | Generic Telegram messenger |

### Model Routing

| Script | Purpose |
|--------|---------|
| [`sync-models.js`](.agency/scripts/sync-models.js) | Sync model overrides to `.roomodes` |
| [`escalate-lead.js`](.agency/scripts/escalate-lead.js) | Escalate to human when Flash fails 2x |

### Documentation & Automation

| Script | Purpose |
|--------|---------|
| [`auto-docs.js`](.agency/scripts/auto-docs.js) | Auto-documentation from contracts + Git log |
| [`version-check.js`](.agency/scripts/version-check.js) | Version consistency checker |

### Project Management

| Script | Purpose |
|--------|---------|
| [`projects-manager.js`](.agency/scripts/projects-manager.js) | Register/switch/list projects |
| [`init-project.js`](.agency/scripts/init-project.js) | Bootstrap new project structure |
| [`init-project.ps1`](.agency/scripts/init-project.ps1) | PowerShell bootstrap |

### Testing & Chaos

| Script | Purpose |
|--------|---------|
| [`chaos-monkey.js`](.agency/scripts/chaos-monkey.js) | Chaos testing — validate all N features pass |
| [`cleanup-test-db.js`](.agency/scripts/cleanup-test-db.js) | Clean test database |
| [`cleanup.js`](.agency/scripts/cleanup.js) | General cleanup |

### Cleanup

| Script | Purpose |
|--------|---------|
| [`clean-temp.js`](.agency/scripts/clean-temp.js) | Temp file cleanup (Principal 13) |
| [`cleanup-jengaprojects.ps1`](.agency/scripts/cleanup-jengaprojects.ps1) | PowerShell project cleanup |

### Utilities

| Script | Purpose |
|--------|---------|
| [`status.js`](.agency/scripts/status.js) | Agent status dashboard |
| [`terminal-session.js`](.agency/scripts/terminal-session.js) | Terminal session manager |
| [`client-bot.js`](.agency/scripts/client-bot.js) | Client simulation bot |
| [`update-roomodes.js`](.agency/scripts/update-roomodes.js) | Update `.roomodes` from config |
| [`fix-roomodes.js`](.agency/scripts/fix-roomodes.js) | Fix `.roomodes` formatting issues |
| [`github.js`](.agency/scripts/github.js) | GitHub API integration (init repo, push, PR) |

---

## 9. Directory Structure Map

```
/
├── AGENCY.md                          ← Agency profile for LLM evaluation
├── AGENCY-SETUP-OVERVIEW.md           ← This file
├── .roomodes                          ← 31 agent definitions, fileRegex, model config
├── ORCHESTRATION.md                   ← Task tracking (Sprints 1-10 + N-Sprint)
├── FLOW-DOC.md                        ← Pipeline, feature types, handoff graph
├── COMPLIANCE-CHECKLISTS.md           ← Full platform-specific checklists
├── COST-LEDGER.md                     ← Cost tracking ledger
├── CHANGELOG.md                       ← Release changelog
├── package.json                       ← Agency npm scripts
│
├── .agency/                           ← Agency root
│   ├── AGENCY-RULES.md                ← Single source of truth (v5.0, 900 lines)
│   ├── config.json                    ← Agency configuration (31 agents, handoff, contracts)
│   ├── projects.json                  ← Registered projects (jengabooks)
│   ├── .active-project                ← Current active project pointer
│   ├── roomodes-formats.md            ← .roomodes format reference
│   │
│   ├── contracts/                     ← Global agency contracts (9 files)
│   │   ├── TEMPLATE.api.json          ← Contract template
│   │   ├── agency-*.json              ← 8 agency infrastructure contracts
│   │   └── MOBILE-CONTRACTS-MOVED.md  ← Pointer to new location
│   │
│   ├── projects/                      ← Multi-project registry
│   │   └── jengabooks/
│   │       ├── ORCHESTRATION.md       ← Project-scoped tracking
│   │       ├── contracts/             ← 24 mobile feature contracts
│   │       ├── memory/                ← Project-scoped memory
│   │       ├── plans/                 ← Project-specific plans
│   │       └── notes/                 ← Project-specific notes
│   │
│   ├── memory/                        ← Semantic memory system
│   │   ├── schema.sql                 ← Memory DB schema (pgvector)
│   │   └── store.json                 ← Current memory store
│   │
│   ├── scripts/                       ← 33 agency scripts
│   │   ├── memory.js                  ← Semantic memory RAG
│   │   ├── handoff.js                 ← Handoff validation
│   │   ├── dispatcher.js              ← Task dispatcher
│   │   ├── cost-track.js              ← Cost tracking
│   │   ├── secret-scan.js             ← Secret scanning
│   │   ├── validate-commit.js         ← Commit validation
│   │   ├── chaos-monkey.js            ← Chaos testing
│   │   ├── clean-temp.js              ← Temp file cleanup
│   │   └── ... (25 more scripts)
│   │
│   ├── plans/                         ← Planning documents
│   ├── notes/                         ← Temporary notes
│   ├── reports/                       ← Reports (violations, cost, security)
│   ├── sessions/                      ← Session management
│   ├── telemetry/                     ← Telemetry events
│   ├── templates/                     ← Templates
│   └── temp/                          ← Temporary storage
│
├── projects/jengabooks/               ← JengaBooks application code
│   ├── apps/api/                      ← NestJS backend
│   ├── apps/web/                      ← React web app
│   └── apps/mobile/                   ← Expo mobile app
│
├── e2e/                               ← E2E tests
├── .github/                           ← CI/CD workflows
├── .vscode/                           ← VS Code settings
└── .zoo/                              ← ZooCode configuration
```

---

## 10. npm Scripts Quick Reference

From [`package.json`](package.json):

| Command | Action |
|---------|--------|
| `npm run agency` | Central agency CLI entry point |
| `npm run agency:init` | Bootstrap new project structure |
| `npm run agency:clean` | Clean temporary files |
| `npm run agency:report` | Generate cost report |
| `npm run agent:handoff` | Validate handoff payload |
| `npm run agent:status` | Show agent status dashboard |
| `npm run agent:cost` | Track token costs |
| `npm run docs:sync` | Auto-sync documentation from contracts |
| `npm run telegram:test` | Test Telegram notification |
| `npm run terminal` | Start terminal session |
| `npm run terminal:cost` | Show terminal session costs |
| `npm run terminal:stats` | Show terminal session stats |
| `npm run project:register` | Register new project |
| `npm run project:switch` | Switch active project |
| `npm run project:list` | List all registered projects |
| `npm run clean:temp` | Clean up temporary files |
| `npm run prepare` | Install Husky git hooks |

---

## 11. Pre-Task Oath

Every agent **must** output before any work:

> 🧠 Bound by AGENCY-RULES v5.0. Pre-flight passed. Cost estimate: ~X,XXX tokens (~KES Y.YY). Sections: [list applicable sections].

### Per-Section Reading Guide

| Agent Type | Sections to Read |
|------------|-----------------|
| **All Agents (Mandatory)** | File Priority, Pre-Task Oath, Principals 1-12, Section 14 (File Clutter Prevention), Handoff, Quality Gates |
| **Frontend / UI / Mobile** | + Section 9 (Error Handling), Section 13 (Frontend), Tailwind Rules |
| **Backend / API** | + Section 12 (Backend), Backend Checklist |
| **DevOps / Infrastructure** | + Section 8 (Cross-Platform), skip frontend/backend |
| **Compliance Guardian** | Read the entire file |
| **Documentarian** | + Section 6 (Dynamic Context) |

---

## 12. Cost Model

### Pricing (DeepSeek Flash)

| Item | Rate (KES) |
|------|-----------|
| Input tokens | KSh 19 / 1M tokens |
| Output tokens | KSh 38 / 1M tokens |

### Token Budget Rules

| Rule | Limit | Consequence |
|------|-------|-------------|
| Target per task | < 500 tokens | Efficiency goal |
| Warning per turn | > 5,000 tokens | Logged in handoff |
| Flag per task | > 20,000 tokens | Auto-reviewed |
| Max conversation turns | 20 | Summarise + break into pieces |

### Cost Benchmark Comparison

| Model | Input/1M | Output/1M | 1M Input (KES) | 1M Output (KES) |
|-------|----------|-----------|----------------|-----------------|
| **DeepSeek Flash** | $0.14 | $0.28 | KSh 19 | KSh 38 |
| **DeepSeek Pro** | $2.00 | $8.00 | KSh 270 | KSh 1,080 |
| (Ref) Claude Opus | $30.00 | $150.00 | KSh 4,050 | KSh 20,250 |

### Cost Formula

```
Cost (KES) = (input_tokens × 19 + output_tokens × 38) / 1,000,000
```

For DeepSeek Pro: `(input_tokens × 270 + output_tokens × 1080) / 1,000,000`

---

> **Generated by:** 🧠 Lead Architect & Orchestrator  
> **Source files:** [`AGENCY.md`](AGENCY.md) · [`.agency/AGENCY-RULES.md`](.agency/AGENCY-RULES.md) · [`.roomodes`](.roomodes) · [`.agency/config.json`](.agency/config.json) · [`.agency/projects.json`](.agency/projects.json) · [`ORCHESTRATION.md`](ORCHESTRATION.md) · [`FLOW-DOC.md`](FLOW-DOC.md)  
> **Purpose:** Complete agency setup overview for copy-paste reference
