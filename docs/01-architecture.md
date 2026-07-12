# Architecture — Agent Organization

> **29 agents across 9 squads**

## Command Structure

```
🧠 lead-architect (Orchestrator — Principal, deepseek-pro)
  │
  ├── ⚙️ BACKEND SQUAD (5 agents)
  │     backend-lead (Lead, pro)
  │     ├── backend-api       — REST endpoints, DTOs, Zod validation
  │     ├── backend-service   — Business logic, domain models (expanded)
  │     ├── backend-integration — Third-party APIs, BullMQ, webhooks
  │     └── backend-database  — Prisma schemas, migrations, SQL
  │
  ├── 🌐 FRONTEND WEB SQUAD (5 agents)
  │     frontend-lead (Lead, pro)
  │     ├── frontend-ui       — Reusable components, TailwindCSS
  │     ├── frontend-page     — Page composition, routing
  │     ├── frontend-state    — Zustand stores, React Query
  │     └── frontend-web      — Build tooling (Vite, bundler config)
  │
  ├── 📱 MOBILE SQUAD (4 agents)
  │     mobile-lead (Lead, pro)
  │     ├── mobile-ui         — React Native components, NativeWind
  │     ├── mobile-screen     — Screen composition, navigation
  │     ├── mobile-state      — WatermelonDB, offline sync
  │     └── frontend-mobile   — Expo, Metro, mobile build config
  │
  ├── 🚀 DEVOPS SQUAD (4 agents)
  │     devops-lead (Lead, pro)
  │     ├── devops-infra      — Docker, VMs, networking, secrets
  │     ├── devops-cicd       — GitHub Actions, CI/CD pipelines
  │     └── devops-db         — PostgreSQL, backups, performance
  │
  ├── 🔒 QUALITY SQUAD (5 agents)
  │     compliance-guardian   (Principal, pro)   — Rules enforcement
  │     security-auditor      (Principal, pro)   — OWASP, secrets, npm audit
  │     performance-auditor   (Senior, flash)    — Lighthouse, bundles
  │     accessibility-auditor (Senior, flash)    — WCAG, axe-core
  │     qa-automator          (Senior, flash)    — E2E tests, regression
  │
  └── 📦 SUPPORT SQUAD (4 agents)
        documentarian         (Senior, flash)    — README, API docs
        design-keeper         (Senior, flash)    — Design tokens, Storybook
        release-manager       (Lead, pro)        — SemVer, changelogs
        code-agent            (Mid, flash)       — User-supervised fixes
```

## Model Routing

| Model | Count | Agents | Cost/1K in | Cost/1K out |
|-------|-------|--------|-----------|------------|
| `deepseek-pro` | 7 | Orchestrator + 4 leads + 2 Principals | KES 0.2025 | KES 0.810 |
| `deepseek-flash` | 22 | All specialists + support | KES 0.0675 | KES 0.270 |

## Level Distribution

| Level | Count | Agents |
|-------|-------|--------|
| **Principal** | 3 | `lead-architect`, `compliance-guardian`, `security-auditor` |
| **Lead** | 5 | `backend-lead`, `frontend-lead`, `mobile-lead`, `devops-lead`, `release-manager` |
| **Senior** | 18 | All specialists |
| **Mid** | 3 | `frontend-page`, `mobile-screen`, `code-agent` |

## Domain Boundaries

Every agent's file access is restricted by `fileRegex` defined in [`.roomodes`](../.roomodes):

| Squad | Specialists | File Pattern |
|-------|-------------|--------------|
| Backend | API | `*.controller.ts`, `*.route.ts`, `*.dto.ts` |
| Backend | Service | `*.service.ts`, `*.logic.ts`, `*.business.ts`, `packages/shared/` |
| Backend | Integration | `*.integration.ts`, `*.adapter.ts`, `*.client.ts` |
| Backend | Database | `prisma/`, `*.sql` |
| Frontend | UI | `apps/web/src/components/*` |
| Frontend | Page | `apps/web/src/pages/*` |
| Frontend | State | `apps/web/src/stores/*`, `hooks/*` |
| Frontend | Build | Config files only (`vite.config`, `tailwind.config`, etc.) |
| Mobile | UI | `apps/mobile/src/components/*` |
| Mobile | Screen | `apps/mobile/src/app/*` |
| Mobile | State | `apps/mobile/src/stores/*`, `hooks/*`, `lib/*` |
| Mobile | Build | Config files only (`app.config`, `metro.config`, etc.) |

## Related

- [Full agent personas →](03-agents.md)
- [Pipeline routing →](02-workflow.md)
