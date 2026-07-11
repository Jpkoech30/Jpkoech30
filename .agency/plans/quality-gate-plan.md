# Quality Gate System — Sprint 16 Plan

> **Status:** `PLANNED` | **Contract:** `agency-quality-gate@1.0.0`
> **Problem:** LLM output has 7 unenforced quality gaps. No automated check validates code before handoff.

---

## 7 Quality Gaps → 7 Automated Checks

### QG-C1: Hallucination Detector
**What it checks:** Scans ALL modified files for hallucination patterns:
- `MISSING_API_DATA`, `TODO`, `FIXME`, `HACK`, `XXX` comments in non-test files
- Imports from packages not in `package.json`
- References to files that don't exist (`require('./nonexistent')`, `import('./nonexistent')`)
- Hardcoded secrets: `api_key`, `password`, `secret`, `jwt_secret` (literal values, not env vars)
**Edge cases:**
- Test files are exempt from TODO/FIXME checks (per Principal 1)
- Auto-generated code may have expected patterns (Prisma client, GraphQL types)
- Package.json may not exist for all projects (global agency scripts)

### QG-C2: Contract Compliance Checker
**What it checks:** Scans modified `.ts`, `.js` files for API calls and cross-references against `.agency/contracts/*.json`:
- HTTP method matches contract endpoint (GET/POST/PUT/DELETE)
- URL path matches contract path
- Required request params are present
**Edge cases:**
- Contracts may not exist for all APIs (new feature, contract not yet drafted)
- Internal function calls are NOT API calls — don't flag them
- Different frameworks (Axios vs fetch vs tRPC) have different call patterns

### QG-C3: Diff Size Limiter
**What it checks:** Counts lines changed (additions + deletions) across all modified files:
- Warning at 500 lines: "⚠ Large diff (N lines). Consider splitting into smaller tasks."
- Block at 2000 lines: "❌ Diff too large (N lines). Must split into multiple tasks."
**Edge cases:**
- Auto-generated files (Prisma client, lock files) should be excluded from count
- Initial project bootstrap (first commit) should be exempt
- Renames count as 1 line, not full file content

### QG-C4: Test Gate
**What it checks:** Runs `npm test` (or equivalent) if test files were modified or new code was added:
- If `.spec.ts` or `.test.ts` files were modified → must run tests
- If no test files exist for new code → warning: "No tests found for new modules"
- If `package.json` exists and has a `test` script → run it
**Edge cases:**
- Project may not have tests set up yet (bootstrap phase)
- `npm test` may take too long (>30s) → timeout and warn instead of block
- CI environment may not have DB/network dependencies for integration tests

### QG-C5: Plan-vs-Implementation Diff
**What it checks:** Compares the list of files from the Socratic plan (Principal 3) against actual git diff:
- Files in plan but not changed → warning: "Planned file X was not modified"
- Files changed but not in plan → warning: "File Y was modified but not in plan"
**Edge cases:**
- Plan may not exist (hotfix, simple task exempted from P3)
- Renamed files — plan says "edit X" but git shows "rename X→Y"
- Test files — adding tests for file X may create `X.spec.ts` which wasn't in plan

### QG-C6: TypeScript Compile Check
**What it checks:** Runs `npx tsc --noEmit` if `tsconfig.json` exists in the project:
- Pass: zero errors
- Fail: any TypeScript errors (blocks handoff)
**Edge cases:**
- Project may not be TypeScript (pure JS)
- `tsconfig.json` may not exist
- Pre-existing errors (not caused by this task) — QG should only flag NEW errors
- Ambient type declarations (`.d.ts`) may cause false positives

### QG-C7: Dependency Sanity Check
**What it checks:** Verifies new imports are valid:
- `require('express')` → `express` must be in `package.json` dependencies
- `import { useState } from 'react'` → `react` must be in `package.json`
- Relative imports (`'./helper'`) → `helper.ts` or `helper.js` must exist
**Edge cases:**
- Monorepo with hoisted dependencies — package may be in root `node_modules` but not in project's `package.json`
- Built-in Node modules (`fs`, `path`, `child_process`) — don't need to be in package.json
- Dynamic imports (`import('module')`) — harder to parse statically

---

## Architecture

```
PTG currently has 4 checkpoints (C1-C4).
Add QG as PTG-C5: Quality Gate

PTG-C5 runs ALL 7 QG checks (C1-C7):
  → If all pass → handoff proceeds
  → If warnings only → handoff proceeds with warnings printed
  → If any BLOCK → handoff is blocked, agent must fix and retry

QG-C1: Hallucination detector   → BLOCK on hardcoded secrets, WARN on TODO/FIXME
QG-C2: Contract compliance       → WARN only (advisory, no block)
QG-C3: Diff size limiter         → WARN at 500, BLOCK at 2000
QG-C4: Test gate                 → WARN on missing tests, BLOCK on test failures
QG-C5: Plan-vs-implementation    → WARN only (advisory)
QG-C6: TypeScript compile        → BLOCK on errors
QG-C7: Dependency sanity         → BLOCK on missing packages, WARN on monorepo
```

## Sprint 16 Task Board

| # | Task | Type | Agent | Est. | Blocking |
|---|------|------|-------|------|----------|
| **16.1** | Create `.agency/scripts/quality-gate.js` — Script with all 7 checks | `script` | 🔧 JengaBooks Code | 2d | 🔴 P0 |
| **16.2** | Wire QG into PTG-C5 in `post-task-gate.js` | `integration` | 🔧 JengaBooks Code | 0.5d | 🔴 P0 |
| **16.3** | Create contract `agency-quality-gate@1.0.0` | `contract` | 🧠 Lead Architect | 0.25d | — |
| **16.4** | Update AGENCY-RULES.md §3 with new QG gates | `docs` | 🧠 Lead Architect | 0.25d | — |
| **16.5** | 🧪 Validate QG-G1 through QG-G7 | `qa` | 🧪 QA Automator | 0.5d | — |
