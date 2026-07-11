# Automation Sprint 17 — Plan

> **Goal:** Automate the top 5 manual processes. Target: remove ~80% of manual work.

---

## Task 17.1 — Add Design Principle Checks to QG (G8)

**What:** Add 3 automated Design Principle checks to `quality-gate.js` as QG-C8

| DP | Check | Automation |
|----|-------|------------|
| DP3 (48px touch) | All interactive elements >= 48x48dp | Scan CSS/JSX for `min-height`, `min-width`, `h-`, `w-` values < 48px |
| DP4 (fontSize 16) | All `<TextInput>` have fontSize: 16 | Scan for `<input` / `<TextInput` without `text-base` or `fontSize: 16` |
| DP12 (Offline) | Every screen handles null/loading/error | Scan for missing `loading`/`error`/`null` state handling in components |

**Severity:** WARN (advisory) — blocks only if >3 violations

## Task 17.2 — Create compliance-check.js (G6 replacement)

**What:** Automated compliance checklist script that replaces manual Compliance Guardian review

**Checks:**
1. No `new Date()` in financial/service files (Principal 2)
2. No TODO/FIXME in non-test files (Principal 1)
3. All new modules have `.spec.ts`/`.test.ts` files (Principal 7)
4. No hardcoded paths (uses `path.join`)
5. All API calls match `.agency/contracts/` (reuses QG-C2)
6. HANDOFF metadata present in last commit
7. MEMORY:stored in last commit body

**Usage:** `node .agency/scripts/compliance-check.js --project <path>`

**Integration:** Wire as QG-C9 in PTG

## Task 17.3 — Wire cost-report.js into post-commit

**What:** After every commit, append cost data to a running report

**Usage:** Add to `.husky/post-commit`:
```js
try { execSync('node .agency/scripts/cost-report.js --update .agency/reports/cost-running.md', { stdio: 'inherit' }); } catch(e) {}
```

**Report format:**
```markdown
# Running Cost Report
| Date | Agent | Task | Tokens | Cost (KES) |
|------|-------|------|--------|------------|
| 2026-07-11 | lead-architect | sprint16 | ~3,200 | ~0.06 |
```

## Task 17.4 — E2E Persona Tests (G7)

**What:** Create automated E2E tests for the 3 personas
- Jane (Accountant): invoice creation, ledger view, report generation
- David (SME): quick invoice, M-Pesa payment, client management
- Grace (Freelancer): expense tracking, receipt generation, simple invoice

**Implementation:** Reuse existing E2E test patterns from `e2e/` directory

## Task 17.5 — Plan Sprint script (stretch goal)

**What:** Create `plan-sprint.js` that reads feature requirements and generates task entries
- Input: feature description + .roomodes agent list
- Output: ORCHESTRATION.md sprint table with tasks, agents, estimates
- Keep it simple — just generates the table markdown, doesn't make decisions

---

## Sprint 17 Task Board

| # | Task | Type | Agent | Est. | Priority |
|---|------|------|-------|------|----------|
| **17.1** | Add Design Principle checks (DP3, DP4, DP12) to quality-gate.js | `enhance` | 🔧 JengaBooks Code | 0.5d | 🟡 P1 |
| **17.2** | Create `.agency/scripts/compliance-check.js` — 7 automated checks | `script` | 🔧 JengaBooks Code | 1d | 🔴 P0 |
| **17.3** | Wire cost-report.js into post-commit hook | `integration` | 🔧 JengaBooks Code | 0.25d | 🟡 P1 |
| **17.4** | Create E2E persona tests (Jane/David/Grace workflows) | `qa` | 🧪 QA Automator | 2d | 🟢 P2 |
| **17.5** | Create plan-sprint.js — generate task tables from requirements | `script` | 🔧 JengaBooks Code | 1d | 🟢 P2 |
| **17.6** | 🧪 Validate all automation | `qa` | 🧪 QA Automator | 0.5d | — |
