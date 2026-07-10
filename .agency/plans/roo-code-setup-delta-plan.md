
# Roo Code Setup — Delta Analysis & Integration Plan

> **Evaluated:** 2026-07-10  
> **Source:** Roo Code Setup Guide  
> **Target:** Current `.agency/AGENCY-RULES.md` v5.0 + `.roomodes` (ZooCode format)  
> **Status:** Analysis complete — see delta items below

---

## 1. Folder Structure Comparison

| Item | Guide Requires | Current State | Delta |
|------|---------------|---------------|-------|
| `.agency/scripts/` | ✅ Yes | ✅ Exists | ✅ None |
| `.agency/contracts/` | ✅ Yes | ✅ Exists (24 contracts) | ✅ None |
| `.agency/plans/` | ✅ Yes | ✅ Exists (just created) | ✅ None |
| `.agency/reports/` | ✅ Yes | ✅ Exists (just created) | ✅ None |
| `.agency/temp/` | ✅ Yes | ❌ Missing (`.agency/notes/` exists instead) | ⚠️ RENAME or alias |
| `.vscode/` | ✅ Yes | ✅ Exists (settings.json + extensions.json) | ✅ None |
| `.github/workflows/` | ✅ Yes | ❌ Missing | 🚨 **CREATE** |
| `infra/` | ✅ No (but implied by devops fileRegex) | ❌ Missing | ⚠️ Optional |
| `apps/api/src/` | ✅ Yes | ✅ Exists in `jengabooks/` | ✅ None |
| `apps/web/src/` | ✅ Yes | ✅ Exists in `jengabooks/` | ✅ None |

---

## 2. .roomodes Format Difference ⚠️ CRITICAL

The guide describes a **Roo Code native** `.roomodes` format using a `groups` array:

```json
{
  "customInstructions": "...",
  "groups": [
    { "name": "...", "slug": "...", "fileRegex": "...", "customInstructions": "..." }
  ]
}
```

Our current `.roomodes` uses the **ZooCode** format with `customModes`:

```json
{
  "customModes": [
    { 
      "slug": "...", "name": "...", "roleDefinition": "...", 
      "groups": ["read", ["edit", { "fileRegex": "..." }], "command", "browser"],
      "apiConfiguration": { "model": "deepseek-v4-flash" },
      "customInstructions": "..."
    }
  ]
}
```

**Decision:** Keep ZooCode format (richer — supports `roleDefinition`, `apiConfiguration`, permission groups).  
**Document both formats** for cross-platform compatibility.

---

## 3. Package.json Scripts — Missing

| Script | Current | Priority | Notes |
|--------|---------|----------|-------|
| `agency:init` | ❌ Missing | MEDIUM | Bootstrap script for new projects |
| `agency:clean` | ✅ `clean:temp` | ✅ Done | Already exists |
| `agency:report` | ❌ Missing | LOW | Cost report generation |
| `agent:handoff` | ❌ Missing | LOW | CLI wrapper for handoff |
| `agent:status` | ❌ Missing | LOW | CLI status updater |
| `agent:cost` | ❌ Missing | LOW | Cost tracker |
| `telegram:*` | ❌ Missing | LOW | Telegram notifications |
| `client:*` | ❌ Missing | LOW | Client standup bot |
| `prepare` (husky) | ❌ Missing | **HIGH** | Git hooks |
| `precommit` (lint-staged) | ❌ Missing | **HIGH** | Pre-commit checks |
| `test:setup` | ❌ Missing | **HIGH** | Test DB setup |
| `test:cleanup` | ❌ Missing | MEDIUM | Test DB cleanup |
| lint-staged config | ❌ Missing | **HIGH** | Pre-commit hook config |

---

## 4. Missing Scripts (.agency/scripts/)

| Script | Priority | Notes |
|--------|----------|-------|
| `init-project.js` | MEDIUM | Bootstrap new projects |
| `cost-report.js` | LOW | Generate cost reports per §11.5 |
| `handoff.js` | LOW | CLI handoff helper |
| `status.js` | LOW | CLI status updater |
| `cost-track.js` | LOW | Track token costs |
| `notify-telegram.js` | LOW | Telegram notifications |
| `cleanup-test-db.js` | **HIGH** | Test DB cleanup |
| Pre-commit hook | **HIGH** | Validate commits |

---

## 5. Infrastructure & CI/CD

| Item | Priority | Notes |
|------|----------|-------|
| `.github/workflows/` | **HIGH** | Create basic CI workflow |
| Husky pre-commit hooks | **HIGH** | Enforce commit quality |
| lint-staged config | **HIGH** | Run lint + validate on staged files |

---

## 6. Implementation Plan (Priority Order)

### Sprint A: HIGH Priority (Do First)

| # | Task | Agent | Est. |
|---|------|-------|------|
| A1 | Create `.github/workflows/ci.yml` — basic CI (lint, test, build) | `🚀 DevOps` | 1d |
| A2 | Install Husky + lint-staged; create pre-commit hook | `🚀 DevOps` | 0.5d |
| A3 | Add lint-staged config to `jengabooks/package.json` | `🚀 DevOps` | 0.5d |
| A4 | Create `test:setup` + `test:cleanup` npm scripts | `⚙️ Backend` | 0.5d |
| A5 | Create `.agency/scripts/cleanup-test-db.js` | `🔧 JengaBooks Code` | 0.5d |
| A6 | Add missing npm scripts to `jengabooks/package.json` | `⚙️ Backend` | 0.5d |

### Sprint B: MEDIUM Priority

| # | Task | Agent | Est. |
|---|------|-------|------|
| B1 | Create `.agency/scripts/init-project.js` | `🔧 JengaBooks Code` | 1d |
| B2 | Add `agency:init` script to package.json | `⚙️ Backend` | 0.25d |
| B3 | Create `.agency/temp/` directory (or alias `.agency/notes/` as temp) | `🧠 Lead Architect` | 0.1d |
| B4 | Document both `.roomodes` formats (ZooCode + Roo Code) in `.agency/` | `📝 Documentarian` | 0.5d |

### Sprint C: LOW Priority (Nice-to-Have)

| # | Task | Agent | Est. |
|---|------|-------|------|
| C1 | Create cost tracking scripts | `🔧 JengaBooks Code` | 1d |
| C2 | Create handoff CLI tools | `🔧 JengaBooks Code` | 1d |
| C3 | Create Telegram notification scripts | `⚙️ Backend Integration` | 1d |
| C4 | Create client standup bot | `⚙️ Backend Integration` | 1d |

---

## 7. Summary

**Already implemented (✅):** 12 of ~25 items from the guide  
**HIGH priority to implement (🚨):** 6 items (CI/CD, Husky, lint-staged, test DB scripts)  
**MEDIUM priority (⚠️):** 4 items (init script, temp dir, format docs)  
**LOW priority (📋):** 6 items (telegram, client bot, cost tools)

**Estimated total effort:** ~6.5 days across 4 agents
