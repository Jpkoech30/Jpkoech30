# 💰 JengaBooks Sprint Cost Ledger

> **Central cost tracking for all sprints.**
> Updated automatically by the orchestrator via HANDOFF protocol.
> Schema defined at [`.agency/contracts/cost-ledger.schema.json`](.agency/contracts/cost-ledger.schema.json)

---

## Cost Schema

Each sprint entry captures:

| Field | Type | Description |
|-------|------|-------------|
| `sprintId` | `string` | Sprint identifier (e.g., `S12.1`) |
| `name` | `string` | Sprint feature name |
| `model` | `string` | AI model used (e.g., `deepseek-v4-flash`) |
| `inputTokens` | `number` | Total input tokens consumed |
| `outputTokens` | `number` | Total output tokens consumed |
| `cacheHitTokens` | `number` | Cached input tokens (99.6% discount) |
| `cost` | `number` | Total cost in USD |
| `duration` | `string` | Wall-clock duration (e.g., "1h 23m") |
| `agent` | `string` | Primary agent slug |
| `artifacts` | `string[]` | Files created/modified |
| `timestamp` | `string` | ISO 8601 datetime |

---

## Sprint Entries

| Sprint | Feature | Model | Tokens (In/Out/Cache) | Cost (USD) | Duration | Agent | Date |
|--------|---------|-------|----------------------|------------|----------|-------|------|
| **S5.2** | VAT Auto-Calculation | deepseek-v4-flash | 85K / 12K / 42K | $0.004 | 45m | backend-api | 2026-07-08 |
| **S6.1** | Payroll Schema *(plan)* | deepseek-v4-flash | 52K / 8K / 28K | $0.003 | 30m | backend-database | 2026-07-08 |
| **S9.4** | Client Document Portal | deepseek-v4-flash | 210K / 45K / 120K | $0.014 | 2h 10m | backend-api | 2026-07-08 |
| **S10.1** | Audit Locks + External Access | deepseek-v4-flash | 95K / 18K / 55K | $0.006 | 1h 05m | backend-database | 2026-07-08 |
| **S11.2** | Predictive Cash Flow | deepseek-v4-pro | 180K / 35K / 100K | $0.032 | 1h 45m | backend-api | 2026-07-08 |
| **S12.1** | Billing System + Pricing | deepseek-v4-flash | 250K / 52K / 140K | $0.016 | 2h 30m | backend-api | 2026-07-08 |
| **S12.2** | Sandbox / Training Mode | deepseek-v4-flash | 160K / 30K / 85K | $0.010 | 1h 20m | backend-api | 2026-07-08 |
| **S13.1** | Security Remediation (CRITICAL Fix) | deepseek-v4-flash | 62K / 15K / 35K | $0.005 | 15m | security-auditor | 2026-07-09 |
| **S13.2** | Compliance Fix (Task 13.2) | deepseek-v4-flash | 85K / 18K / 42K | $0.005 | 12m | compliance-guardian, backend-api | 2026-07-09 |
| **S13.3** | Payroll DB Schema Implementation | deepseek-v4-flash | 15K / 3K / 8K | $0.001 | 10m | backend-database | 2026-07-09 |
| **S13.4** | QA E2E Regression | deepseek-v4-flash | 85K / 18K / 42K | $0.005 | 18m | qa-automator, backend-api, backend-service, frontend-ui | 2026-07-09 |
| **S13.5** | Release v1.0.1 (tag, changelog) | deepseek-v4-flash | 15K / 3K / 8K | $0.001 | 10m | release-manager | 2026-07-09 |
| **S14.1** | Fix Broken Links & Navigation | deepseek-v4-flash | 25K / 5K / 12K | $0.002 | 5m | frontend-ui | 2026-07-09 |
| **S14.2** | Smooth Page Transitions | deepseek-v4-flash | 20K / 4K / 10K | $0.001 | 5m | frontend-ui | 2026-07-09 |
| **S14.3** | Fix Client Switching | deepseek-v4-flash | 65K / 12K / 30K | $0.004 | 8m | frontend-state | 2026-07-09 |
| **S14.4** | QA — Frontend Regression | deepseek-v4-flash | 40K / 8K / 20K | $0.002 | 5m | qa-automator, code | 2026-07-09 |
| **S14.5** | Release v1.0.2 (tag, changelog, version bump) | deepseek-v4-flash | 15K / 3K / 8K | $0.001 | 5m | release-manager | 2026-07-09 |
| **S13** | Security + Compliance + Payroll + QA + Release | *rollup* | 262K / 57K / 135K | $0.017 | 65m | — | 2026-07-09 |
| **MP-1.13-E2E** | cost-track entry [PROJECT:jenga] | deepseek-v4-flash | 100 / 50 / 0 | $0.000 | — | qa-automator | 2026-07-10 |

---

## Cost Calculation Reference

```
cost = (outputTokens / 1_000_000) * modelRate + (inputTokens * 0.004 / 1_000_000)
cacheSavings = cacheHitTokens * 0.996 * modelRate / 1_000_000
netCost = cost - cacheSavings

V4 Flash rate:  $0.28 / 1M output tokens
V4 Pro rate:    $0.87 / 1M output tokens
```

---

## Rollup

| Metric | Value |
|--------|-------|
| **Total Sprints Tracked** | 13 (13 completed) |
| **Total Cost (All Sprints)** | **$0.104** |
| **Total Input Tokens** | 1,334,000 |
| **Total Output Tokens** | 265,000 |
| **Cache Hit Tokens** | 725,000 |
| **Average Cost Per Sprint** | ~$0.008 |

---

## Notes

- Sprint costs are estimated based on typical token consumption for the work performed
- Actual costs vary based on retries, context window sizes, and cache hit rates
- Sprint 11.2 used V4 Pro ($0.87/M tokens) due to complex forecasting math requirements
- All other sprints used V4 Flash ($0.28/M tokens) for standard CRUD + business logic
- Sprint 6.1 was planning-only (schema not yet implemented — moved to S13.3)
- Sprint 13.2: Added `/collab/notifications/count` endpoint, fixed TIME-TRAVEL violations, updated violations-report.md
- Sprint 13.3: Verified existing payroll schema. 4 models (Employee, SalaryStructure, PayrollRun, PayrollEntry). Migration `20260708_add_payroll_tables` confirmed. `npx prisma validate` passed.
- Sprint 13.4: Full QA E2E regression. 548/548 API tests pass, 33/33 frontend tests pass. 10 mock-gap failures fixed. `jest-e2e.config.ts` created. `new Date()` violations verified resolved.
- Sprint 13.5: Release v1.0.1. Version bumped in root/api/web package.json, CHANGELOG.md created, git tag v1.0.1 created, .project-context.json updated, ORCHESTRATION.md archived, COST-LEDGER.md updated.
- Sprint 14.4: QA Frontend Regression. 39/39 frontend tests pass (fixed matchMedia mock in setup.ts). 548/548 API tests pass. No new TS errors. No backend regressions. Ready for v1.0.2 release.
