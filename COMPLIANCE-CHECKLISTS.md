
# JengaBooks Agency — Compliance Checklists

> **Version:** 1.0  
> **Companion to:** [`.agency/AGENCY-RULES.md`](.agency/AGENCY-RULES.md) v5.0  
> **Purpose:** Full platform-specific checklists for all quality gates.

---

## 1. Universal Checks (All Agents)

### 1.1 Pre-Task Checklist
- [ ] Output pre-task oath with cost estimate
- [ ] Read [`PROJECT.md`](jengabooks/PROJECT.md) and [`ORCHESTRATION.md`](ORCHESTRATION.md)
- [ ] Verify agent slug matches HANDOFF in `.roomodes`
- [ ] Use `rg`/`find`/`head` before `Read` tool (§9 TOKEN-OPTIMIZED RETRIEVAL)
- [ ] Max 3 editor tabs open (§12 TAB DISCIPLINE)

### 1.2 Post-Task Checklist
- [ ] No `TODO`, `FIXME`, `MISSING_API_DATA` in production code (§1.1 VERIFICATION)
- [ ] No hardcoded secrets (API keys, JWT secrets, passwords)
- [ ] No `new Date()` in business logic (§2 TIME-TRAVEL)
- [ ] No scope additions beyond spec (§6 FEATURE-CREEP)
- [ ] All modified files are within agent's `groups.fileRegex` (§5 SWARM)
- [ ] Tests exist with correct coverage (§7 UNIT TEST)
- [ ] Commit uses conventional commit format (§8 GIT HANDSHAKE)
- [ ] HANDOFF metadata present in commit body

---

## 2. Backend Checklist (10 Checks)

From [`§12.7`](.agency/AGENCY-RULES.md:501)

- [ ] `/health` endpoint exists and checks DB + Redis
- [ ] Global error handler is the LAST middleware
- [ ] No route file contains a Prisma query
- [ ] Zod schemas exist for all `POST`/`PUT`/`PATCH`
- [ ] Graceful shutdown logic present
- [ ] Config uses `process.env` — no hardcoded values
- [ ] For accounting: `ActivityLog` model, `auditMiddleware` applied, admin log endpoints
- [ ] Test files do NOT contain `mock`, `mockImplementation`, or `mockResolvedValue` for Prisma
- [ ] Tests query the database AFTER the HTTP call to verify state
- [ ] All heavy jobs (>100ms) delegated to BullMQ workers

---

## 3. Frontend Checklist (10 Checks)

From [`§13.5`](.agency/AGENCY-RULES.md:528)

- [ ] Every component handles **Loading**, **Empty**, **Error**, **Success** states
- [ ] No UI component imports from `stores/`, `hooks/`, or `api/` directly
- [ ] Tailwind uses config values only — no arbitrary `w-[...]`
- [ ] Dark mode equivalents exist for every visual class
- [ ] All interactive elements have `hover`, `focus`, `active` states
- [ ] Every `img` has `alt`, every `input` has `label`, every `button` has text
- [ ] Touch targets >= 44px (mobile) or >= 48px (web)
- [ ] Mobile inputs have `fontSize: 16`
- [ ] No `any` types in production code
- [ ] Tests exist and test behavior (not implementation)

---

## 4. Security Checklist

- [ ] No SQL injection (concatenated user input)
- [ ] No XSS (unsanitised user input in HTML/JSX)
- [ ] No mass assignment (accepting all fields)
- [ ] Missing auth/authorisation checks
- [ ] No insecure deserialisation
- [ ] `npm audit` passes (no CRITICAL/HIGH)
- [ ] No secrets committed to repository

---

## 5. Accessibility Checklist (WCAG 2.1 AA)

- [ ] Color contrast ratio >= 4.5:1
- [ ] ARIA labels valid and descriptive
- [ ] Heading hierarchy logical (h1 → h2 → h3)
- [ ] Touch targets >= 48px
- [ ] Keyboard navigable (Tab, Enter, Escape)
- [ ] Focus indicators visible
- [ ] Screen reader announcements tested

---

## 6. Performance Checklist

- [ ] Lighthouse score >= 90
- [ ] LCP < 2.5s
- [ ] JS bundle < 200KB
- [ ] API P95 latency < 500ms
- [ ] No render-blocking resources
- [ ] Images optimised (WebP, lazy loading)

---

## 7. Error Handling Checklist (§9)

- [ ] Every page-level component wrapped in `ErrorBoundary`
- [ ] Fallback UI shows user-friendly message + Retry button
- [ ] Raw JSON/stack traces never shown to user
- [ ] Errors logged to monitoring service (Sentry/DataDog)
- [ ] Non-critical failures degrade gracefully
- [ ] Backend errors returned as `{ error, code?, details? }`
- [ ] Test coverage for error handling >= 90%

---

## 8. Git Handshake Checklist (§8)

- [ ] `git add` only intended files
- [ ] Commit format: `<type>(<scope>): <summary> (>=10 words)`
- [ ] Commit body includes:
  ```
  HANDOFF:<next-agent-slug>
  ARTIFACTS:<file-list>
  CONTRACT:<contract-id@version>
  STATUS:<status>
  COST-ESTIMATE:~Xk tokens (~KES Y.YY)
  ```
- [ ] [`ORCHESTRATION.md`](ORCHESTRATION.md) updated with status changes
- [ ] No force-push

---

## 9. Quality Gates Order (§3)

```
1. 🔒 Security & Verification       — BLOCKING
2. ♿ Accessibility                  — HIGH (frontend only)
3. ⚡ Performance                    — Regression (frontend only)
4. 🧪 Unit Tests                     — Test failure blocking
5. ⚠️ Error Handling                 — Any failure
6. 🛡️ Compliance                    — Any principal violation
```

---

## 10. File Clutter Prevention Checklist (§14)

- [ ] All temporary files deleted at end of task
- [ ] Only permanent files remain (source code, config, documentation)
- [ ] All kept files are in approved `.agency/` directories
- [ ] No orphan files in root directory or unauthorised locations
- [ ] All files in `.agency/plans/` and `.agency/scripts/` have documented purpose
- [ ] No temporary scripts left behind (`.tmp`, `.bak`, `plan-*.md`, `notes-*.md`)
- [ ] All diagrams are in code format (Mermaid/PlantUML), not images
- [ ] `npm run clean:temp` runs without warnings
- [ ] [`ORCHESTRATION.md`](ORCHESTRATION.md) updated to reflect final state

---

## 11. Cost Awareness Checklist (§11)

- [ ] Pre-task cost estimate output in oath
- [ ] Used `rg`/`find`/`head` before `Read` tool
- [ ] Read files < 200 lines (or used extract tools)
- [ ] Conversation < 20 turns (summarise if exceeded)
- [ ] Token usage < 5,000 per turn (warn if exceeded)
- [ ] Task < 20,000 tokens total (auto-flagged if exceeded)
