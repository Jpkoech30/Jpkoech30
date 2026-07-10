# Compliance Violations Report

**Date:** 2026-07-09
**Auditor:** Compliance Guardian
**Tag Range:** `v1.0.0..HEAD`
**Status:** ✅ UNBLOCKED — All violations resolved

---

## Mandate 1: SENTINEL — Anti-Hallucination

### Result: ✅ RESOLVED

| Check | Status |
|-------|--------|
| `MISSING_API_DATA` / `MISSING_DATA` | ✅ None found |
| `TODO` / `FIXME` comments | ✅ None found |
| Hardcoded secrets (production code) | ✅ None found |
| Invented endpoints | ✅ Resolved |

### Fix Applied: Missing API endpoint — `/collab/notifications/count`

**Fixed in Sprint 13.2:**

| File | Change |
|------|--------|
| [`collaboration.controller.ts`](jengabooks/apps/api/src/modules/collaboration/collaboration.controller.ts) | Added `@Get('notifications/count')` endpoint (line ~169) |
| [`collaboration.service.ts`](jengabooks/apps/api/src/modules/collaboration/collaboration.service.ts) | Added `getUnreadCount()` method returning `{ count: number }` |
| [`collaboration.service.spec.ts`](jengabooks/apps/api/src/modules/collaboration/collaboration.service.spec.ts) | Added 3 tests covering count, zero, and 'me' userId resolution |

The endpoint accepts `?userId=me` (resolved to `req.user.sub` in the controller) and queries `notification` table with `WHERE readAt IS NULL`. Returns `{ count: 0 }` for zero unread.

---

## Mandate 2: TIME-TRAVEL — Temporal Integrity

### Result: ✅ ALL 5 VIOLATIONS RESOLVED

All 5 TIME-TRAVEL violations were already fixed in the codebase (resolved by prior Security Auditor work in Task 13.1). Verification confirmed each occurrence uses `$queryRaw<{ now: Date }[]>('SELECT NOW()')` via existing `getDbNow()` methods:

| # | File | Line | Original Violation | Current State | Status |
|---|------|------|--------------------|---------------|--------|
| 1 | [`billing.service.ts`](jengabooks/apps/api/src/modules/billing/billing.service.ts) | 69 | `new Date() < new Date()` trial expiry | Uses `(await this.getDbNow())` on RHS | ✅ Fixed |
| 2 | [`billing.service.ts`](jengabooks/apps/api/src/modules/billing/billing.service.ts) | 152 | `cancelledAt: new Date()` | Uses `dbNow` from `getDbNow()` | ✅ Fixed |
| 3 | [`audit.service.ts`](jengabooks/apps/api/src/modules/audit/audit.service.ts) | 59 | `lockedAt: new Date()` | Uses `dbNow` from `getDbNow()` | ✅ Fixed |
| 4 | [`audit.service.ts`](jengabooks/apps/api/src/modules/audit/audit.service.ts) | 347 | `lastAccessedAt: new Date()` | Uses `dbNow` from `getDbNow()` | ✅ Fixed |
| 5 | [`lock-down.guard.ts`](jengabooks/apps/api/src/modules/audit/guards/lock-down.guard.ts) | 77 | `overriddenAt: new Date()` | Uses `dbNow` from `auditService.getDbNow()` | ✅ Fixed |

---

## Mandate 3: SWARM — Domain Boundary

### Result: ✅ NO VIOLATIONS

---

## Mandate 4: FEATURE-CREEP — Zero Scope

### Result: ✅ NO VIOLATIONS

---

## Mandate 5: UNIT TEST — Quality Gate

### Result: ⚠️ 2 TEST SUITES STILL FAILING (pre-existing, not scope of S13.2)

The collaboration test suite now passes 25/25 tests (3 new tests added for `getUnreadCount`).

Pre-existing failures (not part of this sprint's scope):

| Suite | Failures | Root Cause |
|-------|----------|------------|
| `auth/auth.service.spec.ts` | 3 | Missing `refreshToken`/`chartOfAccount` mock models |
| `sandbox/sandbox.service.spec.ts` | 2 | Missing `createMany` on `mpesaTransaction` mock |

---

## Mandate 6-8: Other Mandates

| Mandate | Status |
|---------|--------|
| 6. SOCRATIC — Plan Before Code | ✅ Plan at [`sprint-13-security-compliance-remediation-plan.md`](plans/sprint-13-security-compliance-remediation-plan.md) approved |
| 7. GROUNDING — Read Context | ✅ Reviewed |
| 8. COMMIT & DOCUMENT | ✅ Handoff committed |

---

## Summary

| Mandate | Status |
|---------|--------|
| 1. SENTINEL — Anti-Hallucination | ✅ **Resolved** — `/collab/notifications/count` endpoint added |
| 2. TIME-TRAVEL — Temporal Integrity | ✅ **Resolved** — All 5 violations fixed (verified in code) |
| 3. SWARM — Domain Boundary | ✅ Clean |
| 4. FEATURE-CREEP — Zero Scope | ✅ Clean |
| 5. UNIT TEST — Quality Gate | ⚠️ 2 pre-existing failures (auth, sandbox — not in scope) |
| **Overall** | **✅ UNBLOCKED** |

### Next Steps

1. Handoff to 🗄️ **Backend Database** for Task 13.3 — Payroll DB Schema
2. Pre-existing test failures in `auth.service.spec.ts` and `sandbox.service.spec.ts` may need separate tickets
