# Workflow — Task Lifecycle & Pipelines

## The Task Lifecycle

```
USER REQUEST
     │
     ▼
┌─ LEAD ARCHITECT ────────────────────────────────────────────────────┐
│  1. Recite pre-task oath  (enforcer.js pre) → writes .agent-slug   │
│  2. Recall memory          (memory.js recall)                        │
│  3. Read relevant rules    (AGENCY-RULES.md sections)               │
│  4. Classify task type     (A through H)                            │
│  5. Define contracts       (.agency/contracts/)                     │
│  6. HANDOFF to specialist                                           │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─ SPECIALIST AGENT ──────────────────────────────────────────────────┐
│  1. Recite oath  (enforcer.js pre) → confirms .agent-slug          │
│  2. Read contracts from .agency/contracts/                          │
│  3. Implement the sub-task                                          │
│  4. Run quality gates (compliance → security → QA)                  │
│  5. Run enforcer POST -> MIDDLE -> COMMIT -> HANDOFF                │
│                                                                     │
│     ┌─ Pre-Commit Hook (automatic) ────────────────────────┐       │
│     │  .husky/pre-commit reads .agent-slug                 │       │
│     │  enforcer.js check — blocks if no PRE session        │       │
│     └──────────────────────────────────────────────────────┘       │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                    ┌─────────────────────┐
                    │  Did agent run      │
                    │  handoff.js?        │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                   YES                    NO
                    │                     │
                    ▼                     ▼
         ┌──────────────────┐  ┌──────────────────────────────────────┐
         │ Normal path      │  │ LEAD ARCHITECT FALLBACK              │
         │                  │  │                                      │
         │                  │  │  task-closer.js --agent <slug>       │
         │                  │  │    --task <id> --artifacts "<files>" │
         │                  │  │                                      │
         │                  │  │  Creates commit on agent's behalf    │
         │                  │  │  Runs enforcer POST -> MIDDLE -> CMD │
         └────────┬─────────┘  └──────────────────┬───────────────────┘
                  │                                │
                  └────────────┬───────────────────┘
                               │
                               ▼
┌─ LEAD ARCHITECT (Integration) ──────────────────────────────────────┐
│  1. Collect all sub-task results                                     │
│  2. Integrate, resolve conflicts                                     │
│  3. Store memory (memory.js store)                                   │
│  4. Final enforcer cycle                                             │
│  5. HANDOFF completes -> session-state.json written (handoff.js)     │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Additions (Sprint 20)

| Step | What | File | Behavior |
|------|------|------|----------|
| **Pre-commit hook gate** | Blocks commit if no PRE phase | [`.husky/pre-commit`](.husky/pre-commit) | Reads `.agent-slug`, runs `enforcer.js check`, exit 1 if missing |
| **Task closer fallback** | Closes loop when agent returns text | [`.agency/scripts/task-closer.js`](.agency/scripts/task-closer.js) | Creates commit + runs enforcement on agent's behalf |
| **Session state** | Written after successful handoff | [`.agency/session-state.json`](.agency/session-state.json) | Read by `npm run recap` for context recovery |

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

## Session Context Recovery

After VSCode restart, run [`npm run recap`](package.json:7) to restore context:

```bash
npm run recap
# → Shows:
#   🏢 Agency branch & status
#   📁 Active project & git state
#   🔄 Last session (from session-state.json)
#   🕐 Recent commits
#   ➡️ Next steps
```

This uses [`recap.js`](.agency/scripts/recap.js) which reads:
- Git state (branch, dirty files, last commit)
- [`.agency/session-state.json`](.agency/session-state.json) — last handoff context
- [`.agency/projects.json`](.agency/projects.json) + [`.agency/.active-project`](.agency/.active-project) — project info

## Related

- [Agent roles and personas →](03-agents.md)
- [Handoff protocol →](04-handoff.md)
- [Enforcement gates →](05-enforcement.md)
