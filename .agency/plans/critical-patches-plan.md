# 🔧 Critical Infrastructure Patches — Sprint MP

> **Status:** `PLANNING` | **Lead:** Lead Architect & Orchestrator | **Created:** 2026-07-11  
> **Priority:** CRITICAL  
> **Affected:** Project Switching Logic, Agent FileRegex Mapping

---

## Analysis Summary

After verifying the current state of all affected files, the following findings were confirmed:

### Patch 1: Active Project Mismatch

| Check | Expected | Actual | Verdict |
|-------|----------|--------|---------|
| `.agency/projects.json` → `activeProject` | `jengabooks` | `jengabooks` | ✅ Correct |
| `.agency/.active-project` | `jengabooks` | `zoocode-agency` | ❌ **MISMATCH** |
| `projects-manager.js` → `cmdSwitch()` | Calls `writeActiveProject()` | Calls `writeActiveProject()` | ✅ Already correct |
| `projects-manager.js` → `cmdRegister()` | Calls `writeActiveProject()` | Does NOT call it | ❌ **MISSING** |
| `init-project.js` | Creates `.active-project` | Does NOT create it | ❌ **MISSING** |

### Patch 2: FileRegex Overlap

| Agent A | Agent B | Overlapping Path | Verdict |
|---------|---------|-----------------|---------|
| `frontend-web` | `frontend-ui` | `apps/web/src/` (parent) vs `apps/web/src/components/` (child) | ❌ **OVERLAP** |
| `frontend-web` | `frontend-page` | `apps/web/src/` (parent) vs `apps/web/src/pages/` (child) | ❌ **OVERLAP** |
| `frontend-web` | `frontend-state` | `apps/web/src/` (parent) vs `apps/web/src/stores/|hooks/|lib/` (child) | ❌ **OVERLAP** |
| `frontend-mobile` | `mobile-ui` | `apps/mobile/src/` (parent) vs `apps/mobile/src/components/` (child) | ❌ **OVERLAP** |
| `frontend-mobile` | `mobile-screen` | `apps/mobile/src/` (parent) vs `apps/mobile/src/app/` (child) | ❌ **OVERLAP** |
| `frontend-mobile` | `mobile-state` | `apps/mobile/src/` (parent) vs `apps/mobile/src/stores/|hooks/|lib/` (child) | ❌ **OVERLAP** |
| `frontend-web` | `backend-logic` | `packages/shared/src/` (both claim it) | ❌ **OVERLAP** |

---

## Task Breakdown

### Task MP-1: Sync `.active-project` + Fix `cmdRegister()` — [Patch 1]

**Agent:** 🔧 JengaBooks Code (`jengabooks-code`)

**Files to modify:**
1. [`.agency/scripts/projects-manager.js`](.agency/scripts/projects-manager.js) — Add `writeActiveProject()` call inside `cmdRegister()`
2. [`.agency/scripts/init-project.js`](.agency/scripts/init-project.js) — Add `.active-project` creation after registering a project

**Changes required:**

**A) `projects-manager.js` — `cmdRegister()` function (line ~158):**
- After `writeRegistry(registry);` on line 158, add:
  ```js
  writeActiveProject(name);
  ```
- This ensures that when a new project is registered, it becomes the active project immediately.

**B) `init-project.js` — After project scaffold (around line ~630-647):**
- After writing `.roomodes` and `ORCHESTRATION.md`, add a file write for `.agency/.active-project`:
  - Path: `path.join(AGENCY_DIR, '.active-project')`
  - Content: the project ID string (e.g., `jengabooks`)
- Wrap in a `writeFile()` call following the existing pattern.

**One-time sync (to be done immediately):**
```powershell
echo jengabooks > .agency/.active-project
```

### Task MP-2: Fix Agent FileRegex Overlaps — [Patch 2]

**Agent:** 🔧 JengaBooks Code (`jengabooks-code`)

**File to modify:** [`.roomodes`](.roomodes)

**Changes required:**

**A) `frontend-web` agent (slug: `frontend-web`):**
- **Current regex:** `^(?:projects/[^/]+/)?(?:[^/]+/)?(apps/web/src/|packages/shared/src/).*`
- **New regex:** `^(?:projects/[^/]+/)?(?:[^/]+/)?(apps/web/(vite\\.config|tailwind\\.config|postcss\\.config|tsconfig|index\\.html|package\\.json)).*`
- **Rationale:** Restrict to build configs and entrypoints only — NOT application source code. The sub-paths `src/components/`, `src/pages/`, `src/stores/`, `src/hooks/`, `src/lib/` are already owned by `frontend-ui`, `frontend-page`, and `frontend-state` respectively.

**B) `frontend-mobile` agent (slug: `frontend-mobile`):**
- **Current regex:** `^(?:projects/[^/]+/)?(?:[^/]+/)?(apps/mobile/src/|packages/shared/src/).*`
- **New regex:** `^(?:projects/[^/]+/)?(?:[^/]+/)?(apps/mobile/(app\\.config|metro\\.config|tsconfig|index\\.js|package\\.json)).*`
- **Rationale:** Same as web — restrict to build configs and entrypoints. The sub-paths `src/components/`, `src/app/`, `src/stores/`, `src/hooks/`, `src/lib/` are owned by `mobile-ui`, `mobile-screen`, and `mobile-state`.

**C) Remove `packages/shared/src/` from `frontend-web`:**
- `backend-logic` already has `packages/shared/src/` in its regex. Remove it from `frontend-web` to eliminate the overlap.

**D) Verify `backend-logic` already covers `packages/shared/src/`:**
- Current regex includes: `^(?:[^/]+/)?(apps/api/src/(?!prisma).*|packages/shared/src/).*`
- This is correct — no change needed.

---

## Dependencies

| Task | Depends On | Blocking |
|------|-----------|----------|
| MP-1: Fix project switching | None | 🔴 All project operations |
| MP-2: Fix fileRegex overlaps | None | 🔴 All agent routing |
| Verification | MP-1, MP-2 | 🟡 Post-merge validation |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `.roomodes` parse error after edit | Low | High — agents can't load | Validate JSON before saving; keep backup |
| `packages/shared` losing editor | Low | Medium — backend-logic must cover it | Confirm backend-logic regex already includes it |
| `echo` command format wrong on Windows | Low | Low — use `Set-Content` in PowerShell | Run verification command afterward |

---

## Verification Checklist (Post-Implementation)

- [ ] **MP-1:** `cat .agency/.active-project` outputs `jengabooks`
- [ ] **MP-1:** `npm run project:list` shows `jengabooks` as active (▶ marker)
- [ ] **MP-1:** Register a new project — `.active-project` updates to match
- [ ] **MP-2:** `frontend-web` no longer matches `apps/web/src/components/*`
- [ ] **MP-2:** `frontend-mobile` no longer matches `apps/mobile/src/components/*`
- [ ] **MP-2:** `frontend-web` no longer claims `packages/shared/src/*`
- [ ] **MP-2:** `backend-logic` still claims `packages/shared/src/*`
- [ ] **Integration:** Run `npm run sync-models` to propagate `.roomodes` changes
