# Workflow — Task Lifecycle & Pipelines

## The Task Lifecycle

```
USER REQUEST
     │
     ▼
┌─ LEAD ARCHITECT ─────────────────────────────────────────────┐
│  1. Recite pre-task oath  (enforcer.js pre)                  │
│  2. Recall memory          (memory.js recall)                 │
│  3. Read relevant rules    (AGENCY-RULES.md sections)        │
│  4. Classify task type     (A through H)                     │
│  5. Define contracts       (.agency/contracts/)              │
│  6. HANDOFF to specialist                                    │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌─ SPECIALIST AGENT ───────────────────────────────────────────┐
│  1. Recite oath                                              │
│  2. Read contracts from .agency/contracts/                   │
│  3. Implement the sub-task                                   │
│  4. Run quality gates (compliance → security → QA)           │
│  5. Run enforcer POST → MIDDLE → COMMIT → HANDOFF            │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌─ LEAD ARCHITECT (Integration) ───────────────────────────────┐
│  1. Collect all sub-task results                             │
│  2. Integrate, resolve conflicts                             │
│  3. Store memory (memory.js store)                           │
│  4. Final enforcer cycle                                     │
└──────────────────────────────────────────────────────────────┘
```

## Pipeline Types (A–H)

When a task arrives, the Lead Architect classifies it and routes through the appropriate pipeline:

| Type | Name | Pipeline |
|------|------|----------|
| **A** | UI-only | `frontend-ui` → `frontend-page` → `frontend-state` → `frontend-lead` |
| **B** | API+UI | `backend-api` → `backend-service` → `backend-integration` → `backend-lead` → `frontend-ui` → `frontend-page` → `frontend-state` → `frontend-lead` |
| **C** | DB+API+UI | `backend-database` → `backend-api` → `backend-service` → `backend-integration` → `backend-lead` → `frontend-ui` → `frontend-page` → `frontend-state` → `frontend-lead` |
| **D** | Backend-only | `backend-api` → `backend-service` → `backend-integration` → `backend-lead` |
| **E** | Mobile-only | `mobile-ui` → `mobile-screen` → `mobile-state` → `mobile-lead` |
| **F** | Full-stack+mobile | Full backend chain → full frontend chain → full mobile chain (13 agents) |
| **G** | Infrastructure | `devops-infra` → `devops-cicd` → `devops-db` → `devops-lead` |
| **H** | Hotfix | `code-agent` (direct user supervision) |

## Quality Gates (Post-Implementation)

After each specialist's work:
1. **`compliance-guardian`** — Rules enforcement, 8 Foundational Principals
2. **`security-auditor`** — OWASP Top 10, secret scanning, npm audit
3. **`qa-automator`** — E2E tests, regression, contract validation

## Release (Post-Pipeline)

**`release-manager`** scans conventional commits, determines SemVer, updates CHANGELOG.md, bumps version, creates release PR.

## Triage Router

Small tasks (≤100 words) and hotfix/patch keywords bypass the Lead Architect and route directly to the appropriate squad lead:

| Keyword → | Routed To |
|-----------|-----------|
| `ui`, `component` | `frontend-lead` |
| `mobile` | `mobile-lead` |
| `devops`, `docker`, `deploy` | `devops-lead` |
| `db`, `migrate`, `sql` | `backend-database` |
| General hotfix | `code-agent` |

This saves ~KES 3.66 per bypassed route.

## Related

- [Agent roles and personas →](03-agents.md)
- [Handoff protocol →](04-handoff.md)
- [Enforcement gates →](05-enforcement.md)
