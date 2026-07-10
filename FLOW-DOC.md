
# JengaBooks Agency — Flow Document

> **Version:** 1.0  
> **Companion to:** [`.agency/AGENCY-RULES.md`](.agency/AGENCY-RULES.md) v5.0  
> **Purpose:** Document the pipeline stages, feature types, agent handoff graph, and common workflows.

---

## 1. Pipeline Stages

Every feature follows these stages through the agency:

```
PLAN → CONTRACT → IMPLEMENT → REVIEW → DEPLOY
  │        │           │           │         │
  │        │           │           │         └── Release Manager
  │        │           │           └── Quality Gates (Security → Compliance → Tests)
  │        │           └── Specialist Agent (assigned via HANDOFF)
  │        └── API Contract (.agency/contracts/<feature>.api.json)
  └── Lead Architect (plan, route, track)
```

### Stage Details

| Stage | Owner | Artifact | Gate |
|-------|-------|----------|------|
| **PLAN** | [`🧠 Lead Architect`](.roomodes:4) | [`ORCHESTRATION.md`](ORCHESTRATION.md) | Socratic (Principal 3) |
| **CONTRACT** | [`🧠 Lead Architect`](.roomodes:4) | `.agency/contracts/<feature>.api.json` | Contract versioned (semver) |
| **IMPLEMENT** | Specialist Agent | Source code + tests | SWARM (Principal 5) |
| **REVIEW** | Lead / Compliance | PR + violations-report.md | All Quality Gates (§3) |
| **DEPLOY** | [`📦 Release Manager`](.roomodes:204) | Release PR + CHANGELOG.md | Git Handshake (Principal 8) |

---

## 2. Feature Types

| Type | Suffix | Description | Example |
|------|--------|-------------|---------|
| **New Screen** | `new-screen` | New page/screen route | Invoice Creation Screen |
| **UI Component** | `components` | Reusable UI component | Modal, Toast, Badge |
| **API Endpoint** | `api-endpoint` | New REST endpoint | `POST /api/v1/invoices` |
| **Service Logic** | `service` | Business logic service | Invoice calculation engine |
| **Integration** | `integration` | Third-party API connection | M-Pesa, eTIMS, BullMQ worker |
| **Offline/DB** | `offline-db` | WatermelonDB model + sync | Client model with sync protocol |
| **Feature** | `feature` | Cross-cutting feature (UI+state) | WhatsApp sharing, biometric login |
| **Polish** | `polish` | Visual refinement + animation | Brand color migration, micro-interactions |
| **QA** | `qa` | E2E/regression tests | Detox E2E test suite |
| **Audit** | `audit` | Performance/security audit | Lighthouse, npm audit |
| **Hotfix** | `hotfix` | Emergency production fix | Critical bug patch (§10) |

---

## 3. Handoff Graph

```
                    ┌──────────────────────────┐
                    │  🧠 Lead Architect        │
                    │  (Plan → Contract → Route)│
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
    │   Specialist   │              │                  │
    └────────────────┘              └────────┬─────────┘
                                             │
                                      ┌──────┼──────┐
                                      ▼      ▼      ▼
                                   ┌───┐  ┌───┐  ┌──┐
                                   │Inf│  │CD │  │DB│
                                   └───┘  └───┘  └──┘

Quality Gates (post-implementation):
    🔒 Security Auditor → ⚡ Performance Auditor → ♿ Accessibility Auditor
    → 🧪 QA Automator → 🛡️ Compliance Guardian → 📦 Release Manager
```

### Agent Legend

| Slug | Role | File Regex |
|------|------|------------|
| [`lead-architect`](.roomodes:4) | 🧠 Lead Architect & Orchestrator | `.md\|json\|yaml\|prisma\|sql` |
| [`jengabooks-code`](.roomodes:12) | 🔧 JengaBooks Code | `.tsx?\|jsx?\|css\|json` |
| [`backend-lead`](.roomodes:20) | ⚙️ Backend Lead | `.md\|json` |
| [`backend-api`](.roomodes:28) | ⚙️ Backend API | `apps/api/src/` (not prisma) |
| [`backend-service`](.roomodes:36) | ⚙️ Backend Service | `apps/api/src/` (not prisma) |
| [`backend-integration`](.roomodes:44) | ⚙️ Backend Integration | `apps/api/src/` (not prisma) |
| [`backend-logic`](.roomodes:164) | ⚙️ Backend Logic | `apps/api/src/` + `packages/shared` |
| [`backend-database`](.roomodes:172) | 🗄️ Backend Database | `prisma/`, `*.sql` |
| [`frontend-lead`](.roomodes:52) | 🌐 Frontend Web Lead | `.md\|json` |
| [`frontend-ui`](.roomodes:60) | 🌐 Frontend UI | `apps/web/src/components/` |
| [`frontend-page`](.roomodes:68) | 🌐 Frontend Page | `apps/web/src/pages/` |
| [`frontend-state`](.roomodes:76) | 🌐 Frontend State | `stores/\|hooks/\|lib/` |
| [`frontend-web`](.roomodes:148) | 🌐 Frontend Web | `apps/web/src/\|packages/shared` |
| [`frontend-mobile`](.roomodes:156) | 📱 Frontend Mobile | `apps/mobile/src/\|packages/shared` |
| [`mobile-lead`](.roomodes:84) | 📱 Mobile Lead | `.md\|json` |
| [`mobile-ui`](.roomodes:92) | 📱 Mobile UI | `apps/mobile/src/components/` |
| [`mobile-screen`](.roomodes:100) | 📱 Mobile Screen | `apps/mobile/src/app/` |
| [`mobile-state`](.roomodes:108) | 📱 Mobile State | `stores/\|hooks/\|lib/` |
| [`devops-lead`](.roomodes:116) | 🚀 DevOps Lead | `.md\|json` |
| [`devops-infra`](.roomodes:124) | 🚀 DevOps Infrastructure | `docker-compose\|Dockerfile\|scripts/deploy` |
| [`devops-cicd`](.roomodes:132) | 🚀 DevOps CI/CD | `.github/\|scripts/ci` |
| [`devops-db`](.roomodes:140) | 🚀 DevOps Database Admin | `prisma/\|scripts/db\|*.sql` |
| [`devops`](.roomodes:180) | 🚀 DevOps | `scripts/\|docker-compose\|Dockerfile\|.github/` |
| [`documentarian`](.roomodes:188) | 📝 Agency Documentarian | `.md` |
| [`qa-automator`](.roomodes:196) | 🧪 QA Automator | `e2e/\|tests/playwright/*.spec.*` |
| [`release-manager`](.roomodes:204) | 📦 Release Manager | `package.json\|CHANGELOG.md\|release workflows` |
| [`design-keeper`](.roomodes:212) | 🎨 Design System Keeper | `theme.ts\|*.stories.*` |
| [`compliance-guardian`](.roomodes:220) | 🛡️ Compliance Guardian | `.md` |
| [`security-auditor`](.roomodes:228) | 🔒 Security Auditor | `.md\|.yaml` |
| [`performance-auditor`](.roomodes:236) | ⚡ Performance Auditor | `.md\|.js` |
| [`accessibility-auditor`](.roomodes:244) | ♿ Accessibility Auditor | `.md\|.js` |

---

## 4. Common Workflows

### 4.1 New Feature Flow
```
1. 🧠 Lead Architect creates plan in ORCHESTRATION.md
2. 🧠 Lead Architect writes/updates API contract in .agency/contracts/
3. 🧠 Lead Architect assigns task (HANDOFF:backend-api, HANDOFF:mobile-screen, etc.)
4. ⚙️/🌐/📱 Specialist implements code + tests
5. 🔒 Security Auditor → ⚡ Performance → ♿ Accessibility (parallel)
6. 🧪 QA Automator runs E2E tests
7. 🛡️ Compliance Guardian validates all principals
8. 📦 Release Manager creates release PR
```

### 4.2 Hotfix Flow (§10)
```
1. 🧠 Lead Architect approves verbally
2. Agent implements minimal fix (exempt from §6 Feature-Creep)
3. Run security scan + smoke tests only
4. Commit with STATUS:HOTFIX and HANDOFF:release-manager
5. Within 24h: follow-up PR adds tests + refactors
```

### 4.3 Contract Update Flow (§10.1)
```
1. 🧠 Lead Architect increments contract version (semver)
2. Commits with CONTRACT-UPDATE in message
3. All affected agents notified
4. Mock repositories updated to match new contract
```

---

## 5. Handoff Protocol Summary

Per [`§2 HANDOFF PROTOCOL`](.agency/AGENCY-RULES.md:264):

```
HANDOFF:<next-agent-slug>
ARTIFACTS:<comma-separated-file-list>
CONTRACT:<contract-id@version>
STATUS:<PENDING|IN_PROGRESS|REVIEW|DONE|BLOCKED|HOTFIX>
BACKEND-DEPENDENCY:<optional>
COST-ESTIMATE:~Xk tokens (~KES Y.YY)
```
