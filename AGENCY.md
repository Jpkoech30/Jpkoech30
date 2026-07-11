# 🏢 ZooCode Agency — Multi-Agent Orchestration Framework

> **Version:** 5.0  
> **Generated:** 2026-07-10  
> **Purpose:** Self-contained agency profile for LLM evaluation, rating, and benchmarking  
> **Target Stack:** ZooCode + DeepSeek Flash (with DeepSeek Pro escalation)  
> **Currency:** All costs in Kenyan Shillings (KES) — 1 USD = 135 KES

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Agent Hierarchy & Role Matrix](#2-agent-hierarchy--role-matrix)
3. [The 14 Foundational Principals](#3-the-14-foundational-principals)
4. [Handoff Protocol](#4-handoff-protocol)
5. [API Contract System](#5-api-contract-system)
6. [Feature Pipeline & Quality Gates](#6-feature-pipeline--quality-gates)
7. [Quality Assurance Layer](#7-quality-assurance-layer)
8. [Cost Awareness & Token Discipline](#8-cost-awareness--token-discipline)
9. [Semantic Memory Integration](#9-semantic-memory-integration)
10. [Contract Inventory](#10-contract-inventory)
11. [Compliance Checklists](#11-compliance-checklists)
12. [Model Routing Strategy](#12-model-routing-strategy)
13. [File Clutter Prevention](#13-file-clutter-prevention)
14. [Directory Structure Map](#14-directory-structure-map)
15. [LLM Evaluation Criteria](#15-llm-evaluation-criteria)

---

## 1. Executive Summary

The **ZooCode Agency** is a purpose-built multi-agent orchestration framework designed for [ZooCode](https://zoocode.ai) users. It provides 31 specialised agents, 14 enforceable principals, formal handoff protocols, and automated quality gates — all running on DeepSeek Flash with optional Pro escalation.

Unlike generic AI coding setups, this agency provides:

| Feature | Detail |
|---------|--------|
| **31 specialized agents** | Each with strict file-regex domain boundaries |
| **14 Foundational Principals** | Enforceable rules covering security, quality, cost, discipline, and project isolation |
| **37 API contracts** | Versioned, typed API definitions in `.agency/contracts/` |
| **Formal handoff protocol** | Commit-body-based agent-to-agent task routing |
| **6-stage quality gates** | Security → Accessibility → Performance → Tests → Error Handling → Compliance |
| **Semantic memory** | Vector RAG recall prevents repeated mistakes |
| **Cost-aware execution** | Token budget per task, KES-based cost tracking |
| **Cross-platform** | PowerShell-native, Node.js scripts, Windows-compatible |

---

## 2. Agent Hierarchy & Role Matrix

The agency follows a **Lead → Specialist → Quality → Support** hierarchy with 31 agents organized into 4 tiers:

> **🏗️ Multi-Project Awareness:** Agents are now project-aware via [`projects.json`](.agency/projects.json) and per-project groups in [`.roomodes`](.roomodes). Each agent's `fileRegex` domain is scoped to their assigned project. The `PROJECT` field is mandatory in all handoffs (see [§4 Handoff Protocol](#4-handoff-protocol)).

### Tier 1: Orchestration Layer

| Agent | Slug | Domain (fileRegex) | Model |
|-------|------|-------------------|-------|
| **🧠 Lead Architect & Orchestrator** | `lead-architect` | `.md\|json\|yaml\|prisma\|sql` | Flash |
| **📝 Agency Documentarian** | `documentarian` | `.md` | Flash |
| **🛡️ Compliance Guardian** | `compliance-guardian` | `.md` | Flash |

### Tier 2: Domain Leads (Coordinators)

| Agent | Slug | Domain (fileRegex) | Specialists Supervised |
|-------|------|-------------------|----------------------|
| **⚙️ Backend Lead** | `backend-lead` | `.md\|json` | API, Service, Integration, Logic, Database |
| **🌐 Frontend Web Lead** | `frontend-lead` | `.md\|json` | UI, Page, State |
| **📱 Mobile Lead** | `mobile-lead` | `.md\|json` | UI, Screen, State |
| **🚀 DevOps Lead** | `devops-lead` | `.md\|json` | Infra, CI/CD, DB Admin |

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
| 🔧 Fixer | JengaBooks Code | `jengabooks-code` | User-supervised fixes, scope-constrained |

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

## 3. The 14 Foundational Principals

These principals are **enforceable rules** — not guidelines. The Compliance Guardian blocks any PR that violates them.

| # | Principal | Summary | Enforcement |
|---|-----------|---------|-------------|
| 1 | **VERIFICATION** | Anti-hallucination + security: No TODO/FIXME, no hardcoded secrets, no SQL injection, no XSS | Compliance Guardian blocks on any occurrence |
| 2 | **TIME-TRAVEL** | No `new Date()` in financial logic, audit logs, or persisted timestamps — use DB `NOW()` | Automated scan in CI |
| 3 | **SOCRATIC** | Plan before code: list files-to-change, 3-sentence approach, 2+ edge cases | Lead Architect gate |
| 4 | **GROUNDING** | Read context first: PROJECT.md + ORCHESTRATION.md, use `rg`/`find`/`head` before Read tool | Token-usage auditor |
| 5 | **SWARM** | Never touch files outside your `fileRegex` domain — request reassignment | File-level enforcement in `.roomodes` |
| 6 | **FEATURE-CREEP** | Zero scope additions — modify ONLY files in the task spec | Compliance check |
| 7 | **UNIT TEST** | Services: 95%, Controllers/UI: 80%, Utils: 100% coverage | CI gate |
| 8 | **GIT HANDSHAKE** | Conventional commits + HANDOFF metadata in commit body | `validate-commit.js` hook |
| 9 | **TOKEN-OPTIMIZED RETRIEVAL** | Use `rg`/`sed`/`head` before Read tool — Read is last resort | Cost tracker |
| 10 | **HOTFIX EXCEPTION** | Critical prod fixes skip full pipeline but require follow-up PR within 24h | Lead Architect approval |
| 11 | **COST AWARENESS** | Pre-task cost estimate, <500 tokens/task target, KES-based tracking | Automatic cost reporting |
| 12 | **(reserved)** | — | — |
| 13 | **FILE CLUTTER PREVENTION** | One-location rule, clean up temps, no orphan files | Compliance Guardian scan |
| 14 | **PROJECT ISOLATION** | All work scoped to one project; handoffs include `PROJECT:<id>`; agents only modify files within their project's `rootPath` | `validate-commit.js` + Compliance Guardian |

### Principal 1 Detail: Verification Checklist

- [ ] No `TODO`, `FIXME`, `MISSING_API_DATA` placeholders
- [ ] No invented endpoints not in `.agency/contracts/`
- [ ] No hardcoded secrets (API keys, JWT secrets, passwords)
- [ ] No SQL injection (concatenated user input)
- [ ] No XSS (unsanitised user input in HTML/JSX)
- [ ] No mass assignment (accepting all fields)
- [ ] Missing auth/authorisation checks present
- [ ] No insecure deserialisation
- [ ] No `new Date()` in business logic (Principal 2)

---

## 4. Handoff Protocol

Every agent-to-agent task transfer is encoded in the **commit message body** using structured metadata:

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

## 5. API Contract System

All APIs are defined in `.agency/contracts/` as versioned JSON files following a strict template.

### Contract Template Structure

```json
{
  "contractId": "<feature-name>",
  "version": "1.0.0",
  "description": "Brief description",
  "featureType": "A | B | C | D",
  "endpoints": [
    {
      "method": "GET | POST | PATCH | DELETE",
      "path": "/api/v1/<resource>/<action>",
      "auth": "JWT | Public | Optional",
      "rateLimit": "requests/minute",
      "request": {
        "headers": { "Authorization": "Bearer <token>", "X-Tenant-Id": "uuid" },
        "query": { "companyId": { "type": "string", "required": true } },
        "body": { "contentType": "application/json", "schema": {} }
      },
      "response": {
        "200": { "description": "Success", "body": {} },
        "400": { "description": "Bad Request" },
        "401": { "description": "Unauthorized" },
        "402": { "description": "Payment Required" },
        "403": { "description": "Forbidden" },
        "404": { "description": "Not Found" },
        "413": { "description": "Payload Too Large" },
        "429": { "description": "Too Many Requests" }
      }
    }
  ],
  "types": { "<TypeName>": { "description": "...", "fields": { ... } } },
  "changelog": [{ "version": "1.0.0", "date": "2026-07-09", "changes": ["Initial contract"] }]
}
```

### Contract Lifecycle

1. **Creation** — Lead Architect creates contract from template
2. **Versioning** — Strict semver (`major.minor.patch`)
3. **Updates** — Backward-incompatible changes must bump major version
4. **Deprecation** — Set `"deprecated": true` with replacement reference
5. **Mock Expiry** — Mocks expire 30 days after backend is live

### Feature Types (Pipeline Routing)

| Type | Name | Pipeline |
|------|------|----------|
| A | UI-only | Frontend Lead → Frontend specialists |
| B | API+UI | Backend Lead → Frontend Lead |
| C | DB+API+UI | Database → Backend Lead → Frontend Lead |
| D | Backend-only | Backend Lead → Backend specialists |

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

### Stage Details

| Stage | Owner | Artifact | Principal Gate |
|-------|-------|----------|----------------|
| **RECALL** | Lead Architect | Semantic Memory | Vector RAG recall via `memory.js` |
| **PLAN** | Lead Architect | `ORCHESTRATION.md` | Socratic (Principal 3) |
| **CONTRACT** | Lead Architect | `.agency/contracts/<feature>.json` | Contract versioned (semver) |
| **IMPLEMENT** | Specialist Agent | Source code + tests | SWARM (Principal 5) |
| **REVIEW** | Lead / Compliance | PR + violations-report.md | All Quality Gates (6 stages) |
| **DEPLOY** | Release Manager | Release PR + CHANGELOG.md | Git Handshake (Principal 8) |

### Quality Gates Order

```
Order │ Gate                    │ Trigger          │ Blocking? │ Pass Criteria
──────┼─────────────────────────┼──────────────────┼───────────┼──────────────────────────────
  1   │ 🔒 Security & Verification │ Implementation  │ YES       │ No hallucinations, no OWASP
  2   │ ♿ Accessibility         │ Frontend impl    │ HIGH      │ WCAG 2.1 AA, 48px targets
  3   │ ⚡ Performance           │ Frontend impl    │ Regression│ Lighthouse >=90, LCP <2.5s
  4   │ 🧪 Unit Tests            │ Implementation  │ Test fail │ All pass, coverage targets met
  5   │ ⚠️ Error Handling        │ All code        │ Any       │ All errors caught, user-friendly
  6   │ 🛡️ Compliance            │ All gates pass  │ Any       │ All 13 principals satisfied
```

### Hotfix Pipeline (Expedited)

```
1. Lead Architect approves verbally
2. Agent implements minimal fix (exempt from FEATURE-CREEP)
3. Run security scan + smoke tests only
4. Commit with STATUS:HOTFIX and HANDOFF:release-manager
5. Within 24h: follow-up PR adds tests + refactors
```

---

## 7. Quality Assurance Layer

### 7.1 Security Auditor (`security-auditor`)

- Runs `npm audit` — CRITICAL/HIGH vulnerabilities **BLOCK pipeline**
- Secret detection (regex patterns for API keys, tokens, passwords)
- OWASP Top 10 checks: SQL injection, XSS, mass assignment, insecure deserialisation
- DTO validation enforcement (Zod schemas)
- Output: `.md` or `.yaml` security report

### 7.2 Performance Auditor (`performance-auditor`)

- Lighthouse score >= 90
- LCP < 2.5s
- JS bundle < 200KB
- API P95 latency < 500ms
- No render-blocking resources
- Images optimised (WebP, lazy loading)

### 7.3 Accessibility Auditor (`accessibility-auditor`)

- Color contrast ratio >= 4.5:1
- ARIA labels valid and descriptive
- Heading hierarchy logical (h1 → h2 → h3)
- Touch targets >= 48px (web) / >= 44px (mobile)
- Keyboard navigable (Tab, Enter, Escape)
- Focus indicators visible

### 7.4 QA Automator (`qa-automator`)

- Writes and runs E2E tests (Playwright)
- Runs regression suites
- Validates API responses against `.agency/contracts/`
- Never fixes source code — halts and reports diagnostics

### 7.5 Compliance Guardian (`compliance-guardian`)

- Validates ALL 13 Foundational Principals
- Checks backend checklist (10 items)
- Checks frontend checklist (10 items)
- Scans for orphan files
- Output: `violations-report.md` → BLOCKED or commit with PASS

### 7.6 Release Manager (`release-manager`)

- Scans conventional commits
- Determines SemVer bump
- Updates `CHANGELOG.md`
- Bumps version in `package.json`
- Creates release PR
- Never force-pushes

---

## 8. Cost Awareness & Token Discipline

### 8.1 Pricing (DeepSeek Flash)

| Item | Rate (KES) |
|------|-----------|
| Input tokens | KSh 19 / 1M tokens |
| Output tokens | KSh 38 / 1M tokens |

### 8.2 Pre-Task Oath

Every agent **must** output before any work:

> 🧠 Bound by AGENCY-RULES v5.0. Pre-flight passed. Cost estimate: ~X,XXX tokens (~KES Y.YY). Sections: [list applicable sections].

### 8.3 Token Budget Rules

| Rule | Limit | Consequence |
|------|-------|-------------|
| Target per task | < 500 tokens | Efficiency goal |
| Warning per turn | > 5,000 tokens | Logged in handoff |
| Flag per task | > 20,000 tokens | Auto-reviewed |
| Max conversation turns | 20 | Summarise + break into pieces |

### 8.4 Tool Cost Comparison

| Tool | Token Cost | Usage Rule |
|------|-----------|------------|
| `rg "pattern" --type ts` | 0 | Use first |
| `find . -name "*.service.ts"` | 0 | Use first |
| `head -n 50 file.ts` | 0 | Use first |
| `sed -n '10,30p' file.ts` | 0 | Use first |
| Read tool (full file) | File size × 3 tokens | **Last resort** |

### 8.5 Cost Benchmark Comparison

| Model | Input/1M | Output/1M | 1M Input (KES) | 1M Output (KES) |
|-------|----------|-----------|----------------|-----------------|
| **DeepSeek Flash** | $0.14 | $0.28 | KSh 19 | KSh 38 |
| **DeepSeek Pro** | $2.00 | $8.00 | KSh 270 | KSh 1,080 |
| (Ref) Claude Opus | $30.00 | $150.00 | KSh 4,050 | KSh 20,250 |

---

## 9. Semantic Memory Integration

The agency uses a **vector RAG memory system** to prevent repeated mistakes and maintain architectural consistency across sessions.

### Memory Schema

```sql
CREATE TABLE memories (
  id          TEXT PRIMARY KEY,
  content     TEXT NOT NULL,          -- Full decision/documentation content
  embedding   vector(1536),           -- OpenAI-compatible embedding vector
  tags        TEXT[],                 -- Label tags for filtering
  source      TEXT,                   -- Session ID or agent slug that created this
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  access_count INTEGER DEFAULT 0
);
```

### Recall Protocol

Before starting **any** new task, the Lead Architect runs:

```bash
node .agency/scripts/memory.js recall --query "<task description>" --limit 3
```

This retrieves relevant architectural decisions and patterns, preventing:
- Repeated design discussions
- Previously rejected approaches
- Known antipatterns
- Rediscovery of existing solutions

### Store Format

Currently stored as JSON in `.agency/memory/store.json` (with planned migration to vector DB).

---

## 10. Contract Inventory

The agency maintains **38 API contracts** split across global infrastructure and per-project feature contracts.

> **📦 Storage Layout:** Global contracts live in [`.agency/contracts/`](.agency/contracts/). Per-project contracts (e.g. `mobile-*`) live in project-scoped directories under [`.agency/projects/<id>/contracts/`](.agency/projects/). See [`agency-multi-project@1.0.0`](.agency/contracts/agency-multi-project.json) § `directoryStructure`.

### Global Agency Contracts (9)

| Contract | Version | Purpose |
|----------|---------|---------|
| `agency-memory` | 1.0.0 | Semantic memory vector RAG system |
| `agency-dispatcher` | 1.0.0 | Agent-to-agent task dispatch protocol |
| `agency-hitl-webhook` | 1.0.0 | Human-in-the-loop webhook integration |
| `agency-model-routing` | 1.0.0 | LLM model routing (Flash → Pro escalation) |
| `agency-secret-scan` | 1.0.0 | Secret scanning configuration |
| `agency-telemetry` | 1.0.0 | Telemetry and cost tracking |
| `agency-auto-docs` | 1.0.0 | Auto-documentation generation |
| `agency-multi-project` | 1.0.0 | Multi-project isolation rules and project registry |
| `cost-ledger.schema` | 1.0.0 | Cost ledger schema definition |

> 📍 Stored in [`.agency/contracts/`](.agency/contracts/)

### JengaBooks Feature Contracts (24)

All `mobile-*` contracts have been migrated to the JengaBooks project-scoped directory per Principal 14 (PROJECT ISOLATION):

📍 [`../projects/jengabooks/contracts/`](../projects/jengabooks/contracts/)

| Contract | Description |
|----------|-------------|
| `mobile-auth` | Authentication & authorization |
| `mobile-backup` | Cloud backup & restore |
| `mobile-barcode` | Barcode scanning |
| `mobile-biometric` | Biometric authentication |
| `mobile-client-portal` | Client portal access |
| `mobile-clients` | Client management CRUD |
| `mobile-credit-notes` | Credit notes management |
| `mobile-dashboard` | Dashboard summaries |
| `mobile-documents` | Document upload & management |
| `mobile-etims` | KRA eTIMS integration |
| `mobile-expenses` | Expense tracking |
| `mobile-export` | Data export (PDF, CSV) |
| `mobile-gamification` | XP bar & gamification |
| `mobile-hitl` | Human-in-the-loop approvals |
| `mobile-ledger` | General ledger view |
| `mobile-mpesa` | M-Pesa payment integration |
| `mobile-payments` | Payment processing |
| `mobile-payroll` | Payroll management |
| `mobile-products` | Product/Service catalog |
| `mobile-receipts` | Receipt management |
| `mobile-reports` | Financial reports |
| `mobile-share` | WhatsApp sharing |
| `mobile-sms-import` | SMS import for transactions |
| `mobile-sync` | Offline sync protocol |

---

## 11. Compliance Checklists

### 11.1 Pre-Task Checklist (All Agents)

- [ ] Output pre-task oath with cost estimate
- [ ] Read `PROJECT.md` and `ORCHESTRATION.md`
- [ ] Verify agent slug matches HANDOFF in `.roomodes`
- [ ] Use `rg`/`find`/`head` before Read tool (Principal 9)
- [ ] Max 3 editor tabs open

### 11.2 Post-Task Checklist (All Agents)

- [ ] No `TODO`, `FIXME`, `MISSING_API_DATA` in production code
- [ ] No hardcoded secrets
- [ ] No `new Date()` in business logic
- [ ] No scope additions beyond spec
- [ ] All modified files within agent's `fileRegex` domain
- [ ] Tests exist with correct coverage
- [ ] Commit uses conventional commit format
- [ ] HANDOFF metadata present in commit body

### 11.3 Backend Compliance (10 Checks)

- [ ] `/health` endpoint exists and checks DB + Redis
- [ ] Global error handler is the LAST middleware
- [ ] No route file contains a Prisma query
- [ ] Zod schemas exist for all POST/PUT/PATCH
- [ ] Graceful shutdown logic present
- [ ] Config uses `process.env` — no hardcoded values
- [ ] Accounting: `ActivityLog` model + `auditMiddleware` applied
- [ ] Test files do NOT contain `mock` for Prisma
- [ ] Tests query DB AFTER HTTP call to verify state
- [ ] All heavy jobs (>100ms) delegated to BullMQ workers

### 11.4 Frontend Compliance (10 Checks)

- [ ] Every component handles Loading, Empty, Error, Success
- [ ] No UI component imports from `stores/`, `hooks/`, or `api/`
- [ ] Tailwind uses config values only — no arbitrary `w-[...]`
- [ ] Dark mode equivalents for every visual class
- [ ] All interactive elements have hover, focus, active states
- [ ] Every `img` has alt, every `input` has label, every `button` has text
- [ ] Touch targets >= 44px (mobile) / >= 48px (web)
- [ ] Mobile inputs have `fontSize: 16`
- [ ] No `any` types in production code
- [ ] Tests test behavior (not implementation)

### 11.5 Security Checklist

- [ ] No SQL injection (concatenated user input)
- [ ] No XSS (unsanitised user input in HTML/JSX)
- [ ] No mass assignment (accepting all fields)
- [ ] Missing auth/authorisation checks
- [ ] No insecure deserialisation
- [ ] `npm audit` passes (no CRITICAL/HIGH)
- [ ] No secrets committed to repository

### 11.6 Error Handling Checklist

- [ ] Every page-level component wrapped in `ErrorBoundary`
- [ ] Fallback UI shows user-friendly message + Retry button
- [ ] Raw JSON/stack traces never shown to user
- [ ] Errors logged to monitoring service
- [ ] Non-critical failures degrade gracefully
- [ ] Backend errors: `{ error, code?, details? }` format
- [ ] Test coverage for error handling >= 90%

### 11.7 File Clutter Prevention Checklist

- [ ] All temporary files deleted at end of task
- [ ] Only permanent files remain (source code, config, docs)
- [ ] All kept files in approved `.agency/` directories
- [ ] No orphan files in root or unauthorised locations
- [ ] All `.agency/plans/` and `.agency/scripts/` files have documented purpose
- [ ] No temporary scripts (`.tmp`, `.bak`, `plan-*.md`)
- [ ] All diagrams in code format (Mermaid/PlantUML), not images
- [ ] `npm run clean:temp` runs without warnings

---

## 12. Model Routing Strategy

| Task Type | Primary Model | Fallback | Rationale |
|-----------|--------------|----------|-----------|
| Simple refactoring, code gen, tests, docs | **DeepSeek Flash** | DeepSeek Pro (2 retries) | Cheap and fast |
| Complex architecture, multi-step debugging | **DeepSeek Pro** | — | Stronger reasoning |
| Compliance audit, security scan | **DeepSeek Flash** | — | Pattern matching, not reasoning-heavy |

### ZooCode Configuration

```json
{
  "model": "deepseek-flash",
  "max_context_tokens": 16384,
  "max_iterations": 6,
  "max_tokens_per_task": 2500,
  "temperature": 0.1,
  "tool_call_parallelism": true,
  "on_fail": { "retry": 2, "escalate_to": "deepseek-pro" }
}
```

---

## 13. File Clutter Prevention

### The "One Location" Rule

All plans, scripts, notes, and temporary files MUST be stored in one of:

| Directory | Purpose |
|-----------|---------|
| `.agency/plans/` | Planning documents |
| `.agency/scripts/` | Utility scripts |
| `.agency/notes/` | Temporary notes |
| `ORCHESTRATION.md` | Task tracking (single file) |

### The "Clean Up" Rule

At end of EVERY task:
1. Delete ALL temporary files
2. Keep only permanent files (source, config, documentation)
3. Run `npm run clean:temp`

### File Types to Delete

| File Type | Example | Action |
|-----------|---------|--------|
| Temporary plan | `plan.md`, `plan-v2.md` | Delete after implementation |
| One-off script | `migrate-data.js` | Delete or move to `.agency/scripts/` |
| Debug file | `debug-output.txt` | Delete after debugging |
| Backup file | `service.ts.bak` | Delete (git handles history) |
| Diagram image | `architecture.png` | Delete (use Mermaid code) |

---

## 14. Directory Structure Map

```
/
├── AGENCY.md                          ← This file (agency profile for LLM eval)
├── .roomodes                          ← Agent definitions, fileRegex, model config
├── ORCHESTRATION.md                   ← Task tracking (single file)
├── FLOW-DOC.md                        ← Pipeline, feature types, handoff graph
├── COMPLIANCE-CHECKLISTS.md           ← Full platform-specific checklists
├── COST-LEDGER.md                     ← Cost tracking ledger
├── CHANGELOG.md                       ← Release changelog
│
├── .agency/                           ← Agency root
│   ├── AGENCY-RULES.md                ← Single source of truth (v5.0)
│   ├── config.json                    ← Agency configuration
│   ├── projects.json                  ← Registered projects
│   ├── roomodes-formats.md            ← .roomodes format reference
│   │
│   ├── contracts/                     ← Global agency contracts (9 files)
│   │   ├── TEMPLATE.api.json          ← Contract template
│   │   ├── agency-*.json              ← Agency infrastructure contracts
│   │   └── MOBILE-CONTRACTS-MOVED.md  ← Pointer to new location
│   │
│   ├── projects/                      ← Multi-project registry (Principal 14)
│   │   ├── projects.json              ← Project registry (symlink to ../projects.json)
│   │   ├── jenga/                     ← Jenga Agency project
│   │   │   ├── ORCHESTRATION.md       ← Sprint tracking
│   │   │   ├── contracts/             ← Agency-specific contracts
│   │   │   ├── memory/                ← Project-scoped memory
│   │   │   ├── plans/                 ← Project-specific plans
│   │   │   └── notes/                 ← Project-specific notes
│   │   └── jengabooks/                ← JengaBooks project
│   │       ├── ORCHESTRATION.md       ← Sprint tracking
│   │       ├── contracts/             ← 24 mobile feature contracts
│   │       ├── memory/                ← Project-scoped memory
│   │       ├── plans/                 ← Project-specific plans
│   │       └── notes/                 ← Project-specific notes
│   │
│   ├── memory/                        ← Semantic memory system
│   │   ├── schema.sql                 ← Memory DB schema (pgvector)
│   │   └── store.json                 ← Current memory store
│   │
│   ├── scripts/                       ← Agency scripts (21 files)
│   │   ├── memory.js                  ← Semantic memory RAG
│   │   ├── handoff.js                 ← Handoff validation
│   │   ├── dispatcher.js              ← Task dispatcher
│   │   ├── cost-track.js              ← Cost tracking
│   │   ├── secret-scan.js             ← Secret scanning
│   │   ├── validate-commit.js         ← Commit validation
│   │   ├── chaos-monkey.js            ← Chaos testing
│   │   └── clean-temp.js              ← Temp file cleanup
│   │
│   ├── plans/                         ← Planning documents
│   ├── notes/                         ← Temporary notes
│   ├── reports/                       ← Reports (violations, cost)
│   ├── sessions/                      ← Session management
│   ├── telemetry/                     ← Telemetry events
│   ├── templates/                     ← Templates
│   └── temp/                          ← Temporary storage
│
├── projects/                          ← Managed projects
│   └── jengabooks/                    ← JengaBooks application
│   ├── apps/
│   │   ├── api/                       ← NestJS backend (Prisma + PostgreSQL)
│   │   ├── web/                       ← React web app (Vite + Tailwind)
│   │   └── mobile/                    ← Expo mobile app (NativeWind)
│   ├── packages/shared/               ← Shared types, enums, permissions
│   └── scripts/                       ← Project-specific scripts
│
├── e2e/                               ← E2E tests
├── .github/                           ← CI/CD workflows
├── .vscode/                           ← VS Code settings
└── .zoo/                              ← ZooCode configuration
```

---

## 15. LLM Evaluation Criteria

This section provides structured criteria for LLMs to **rate** the ZooCode Agency framework. Each dimension is scored 1-10.

### Dimension 1: Completeness (1-10)

| Criteria | Weight | Description |
|----------|--------|-------------|
| Agent coverage | 25% | Are all roles (lead, specialist, QA, support) defined with clear boundaries? |
| Rule coverage | 25% | Are all development lifecycle aspects covered (security, quality, cost, discipline)? |
| Asset coverage | 25% | Are contracts, scripts, templates, and memory systems present? |
| Pipeline coverage | 25% | Are all stages from recall to deploy defined? |

### Dimension 2: Clarity & Usability (1-10)

| Criteria | Weight | Description |
|----------|--------|-------------|
| Self-documentation | 30% | Can a new agent understand their role from the docs alone? |
| Actionability | 30% | Are rules specific enough to enforce programmatically? |
| Examples | 20% | Are there concrete examples of commits, handoffs, contracts? |
| Structure | 20% | Is the information organized for quick reference? |

### Dimension 3: Enforcement (1-10)

| Criteria | Weight | Description |
|----------|--------|-------------|
| Tool-based gates | 30% | Are there scripts that validate compliance (commit hooks, scanners)? |
| Agent-based gates | 30% | Are there agents whose job is to enforce rules (Compliance Guardian)? |
| File-level restrictions | 20% | Are agent file domains enforced via `.roomodes` `fileRegex`? |
| Blocking criteria | 20% | Are the criteria for blocking a PR clearly defined? |

### Dimension 4: Scalability (1-10)

| Criteria | Weight | Description |
|----------|--------|-------------|
| Agent count | 25% | Can the framework support 30+ agents without confusion? |
| Contract versioning | 25% | Is there a clear contract lifecycle and versioning strategy? |
| Cross-project support | 25% | Can the agency manage multiple projects simultaneously? |
| Parallel workflows | 25% | Can multiple features flow through the pipeline simultaneously? |

### Dimension 5: Adaptability (1-10)

| Criteria | Weight | Description |
|----------|--------|-------------|
| Model flexibility | 30% | Can it switch between Flash and Pro models based on task complexity? |
| Platform compatibility | 25% | Does it work on Windows/PowerShell natively? |
| Protocol extensibility | 25% | Can new agent types be added without redesign? |
| Hotfix handling | 20% | Is there an expedited path for emergencies without breaking rules? |

### Dimension 6: Cost Efficiency (1-10)

| Criteria | Weight | Description |
|----------|--------|-------------|
| Token budget rules | 30% | Are there clear token limits and cost targets? |
| Tool-first retrieval | 25% | Does it prioritize zero-cost tools (rg, sed) over Read? |
| Cost tracking | 25% | Is there automatic cost reporting and benchmarking? |
| Model routing | 20% | Does it use cheaper models for simpler tasks? |

### Overall Rating Formula

```
Overall = (Completeness × 0.20) + (Clarity × 0.20) + (Enforcement × 0.20)
        + (Scalability × 0.15) + (Adaptability × 0.15) + (Cost × 0.10)
```

### Scoring Rubric

| Score | Label | Meaning |
|-------|-------|---------|
| 9-10 | **Production-ready** | Fully mature, minimal gaps |
| 7-8 | **Strong** | Minor gaps, easily fixable |
| 5-6 | **Adequate** | Functional but has moderate gaps |
| 3-4 | **Developing** | Major gaps in one or more dimensions |
| 1-2 | **Nascent** | Significant work needed |

---

## Appendix A: Quick Reference

### File Priority Order

| Priority | File | Purpose |
|----------|------|---------|
| 1 | `.roomodes → groups.fileRegex` | Domain boundaries — never override |
| 2 | `.roomodes → customInstructions` | Mode-specific overrides |
| 3 | `.agency/AGENCY-RULES.md` | Universal agency rules |
| 4 | `PROJECT.md` | Project context |
| 5 | `.project-context.json` | Structural metadata |
| 6 | `ORCHESTRATION.md` | Task tracking |

### Anti-Patterns to Avoid

| Anti-Pattern | Example | Correct |
|--------------|---------|---------|
| Reading wrong config | Reading `jengabooks/.roomodes` | Always use root `.roomodes` |
| Skipping GROUNDING | Starting code without context | Read PROJECT.md first |
| `new Date()` in business | `cancelledAt: new Date()` | Use `SELECT NOW()` |
| Adding scope mid-task | "While I'm here, let me fix..." | File separate task |
| Mocking in production | Fake data instead of real API | Mock only in tests |
| Forgetting HANDOFF | No handoff metadata | Always include HANDOFF |
| Arbitrary Tailwind | `w-[137px]` | Use design tokens: `w-32` |

### Backend Layering

```
Router → Controller → Service → Repository (optional)
                                ↕
                           Prisma → PostgreSQL
```

No DB calls in routes. Heavy jobs (>100ms) → BullMQ workers.

### Frontend State Management

```
React Query → Server data
Zustand     → UI state
useState    → Local component state
Repository Pattern → IUserRepository → MockRepository | HttpRepository
```

---

> **Generated by:** 🧠 Lead Architect & Orchestrator  
> **Source files:** [`.agency/AGENCY-RULES.md`](.agency/AGENCY-RULES.md) | [`.roomodes`](.roomodes) | [`FLOW-DOC.md`](FLOW-DOC.md) | [`COMPLIANCE-CHECKLISTS.md`](COMPLIANCE-CHECKLISTS.md)  
> **Purpose:** Provide a complete, self-contained agency profile for LLM evaluation and benchmarking
