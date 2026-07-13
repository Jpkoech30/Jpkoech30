# Plan: Disable Roo Code Default Modes & Agency Skills Landscape

> **Author:** Lead Architect & Orchestrator
> **Date:** 2026-07-13
> **Status:** Draft for review

---

## 1. Investigation Findings Summary

### 1.1 Open Tabs Status

| Tab | Path | Purpose |
|-----|------|---------|
| Pre-commit Hook | [`.husky/pre-commit`](.husky/pre-commit) | Husky hook that runs `enforcer.js check` before commits. Validates agent PRE phase is complete. |
| Orchestration | [`ORCHESTRATION.md`](ORCHESTRATION.md) | Master orchestration document tracking sprints 5-20+ (agency infra, N-Sprint, PFG, PTG, QG, automation). |
| GitHub Profile | [`.github-profile-README.md`](.github-profile-README.md) | GitHub profile README for user Jpkoech30. Showcases ZooCode Agency + JengaBooks. |

### 1.2 Roo Code Default Mode Disabling — No Built-in Mechanism Exists

**Core finding:** Roo Code has **no configuration option** to disable or hide its default modes (Code, Architect, Ask, Debug, etc.). The investigation covered:

| File | Contains Mode Controls? | Notes |
|------|------------------------|-------|
| [`.roomodes`](.roomodes) | ❌ — Only `customModes` array | Roo Code always *adds* these to its built-in defaults. Cannot suppress defaults. |
| [`.zoo/config.json`](.zoo/config.json) | ❌ — Model overrides only | Has `model_overrides`, `session`, `on_fail` — no mode visibility controls. |
| [`.vscode/settings.json`](.vscode/settings.json) | ❌ — Editor settings only | Tab limits, format-on-save, Tailwind config — unrelated to modes. |
| [`.agency/config.json`](.agency/config.json) | ❌ — Agency's own tracking | `agents.enabled` list is for the agency's internal workflow, not Roo Code mode visibility. |
| No `.vscode/roo-code.json` | — File doesn't exist | Roo Code doesn't create a VS Code settings file for mode configuration. |

**Conclusion:** The only reliable way to remove default modes is through a **fork of Roo Code's source**, where default modes can be removed or replaced at the source-code level.

### 1.3 Existing Fork Work — Simba Code

The project already has work in progress documented at:

- [`plans/simba-code-migration-plan.md`](.agency/plans/simba-code-migration-plan.md) — Full fork plan
- [`ORCHESTRATION.md`](ORCHESTRATION.md) (Sprint 17 handoff, line 499-509) — States `simba-code-source` has been created with PFG/PTG/QG/Memory/Telemetry hooks integrated into Roo Code's original activation flow. Built successfully (30.9MB dist/extension.js).

The Sprint 17 handoff confirms:
> _"Restored Roo Code's original activation flow with PFG/PTG/QG/Memory/Telemetry commands added"_
> _"dist/extension.js contains PFG_BLOCKED, checkPFG, runPTG, ClineProvider integration"_

**The Simba Code fork already exists as a working extension build.** What remains is to remove the default modes from the fork's source.

### 1.4 Agency Skills Landscape

There is **no `.agency/skills/` directory** in this project. Roo Code's "skills" concept (typically a `skills/` directory at workspace root with reusable instruction files) is not used here.

What exists instead:

| Asset | Location | Count | Description |
|-------|----------|-------|-------------|
| Custom Modes | [`.roomodes`](.roomodes) | **31 agents** | Full agency hierarchy: orchestrator, leads, specialists, quality gates, support |
| Agency Scripts | [`.agency/scripts/`](.agency/scripts) | **52+ scripts** | enforcer.js, memory.js, telemetry.js, handoff.js, quality-gate.js, dispatcher.js, + more |
| Agent Template | [`.agency/templates/agent-template.json`](.agency/templates/agent-template.json) | 1 template | Scaffold for creating new agents with 8 Foundational Principals |
| Agency JS | [`.agency/agency.js`](.agency/agency.js) | 215 lines | Unified CLI wrapper for 20+ commands |
| Session Data | [`.agency/sessions/`](.agency/sessions) | — | Session persistence (`default.json`) |

### 1.5 The 31 Custom Modes (Our "Skills")

| # | Slug | Domain (fileRegex) | Model |
|---|------|-------------------|-------|
| 1 | `lead-architect` | `.md\|.json\|.yaml\|.prisma\|.sql` | deepseek-pro |
| 2 | `code-agent` | `.tsx?\|.jsx?\|.css\|.json` + extensionless | deepseek-flash |
| 3 | `backend-lead` | `.md\|.json` | deepseek-pro |
| 4 | `backend-api` | `apps/api/src/*.controller\|route\|dto.ts` | deepseek-flash |
| 5 | `backend-service` | `apps/api/src/*.service\|provider\|module\|logic\|business.ts` + shared | deepseek-flash |
| 6 | `backend-integration` | `apps/api/src/*.integration\|adapter\|client.ts` | deepseek-flash |
| 7 | `backend-database` | `apps/api/prisma/\|*.sql` | deepseek-flash |
| 8 | `frontend-lead` | `.md\|.json` | deepseek-pro |
| 9 | `frontend-ui` | `apps/web/src/components/*` | deepseek-flash |
| 10 | `frontend-page` | `apps/web/src/pages/*` | deepseek-flash |
| 11 | `frontend-state` | `apps/web/src/stores/\|hooks/\|lib/*` | deepseek-flash |
| 12 | `frontend-web` | `apps/web/vite\|tailwind\|postcss\|tsconfig\|index\|package.json` | deepseek-flash |
| 13 | `frontend-mobile` | `apps/mobile/app.config\|metro\|tsconfig\|index\|package.json` | deepseek-flash |
| 14 | `mobile-lead` | `.md\|.json` | deepseek-pro |
| 15 | `mobile-ui` | `apps/mobile/src/components/*` | deepseek-flash |
| 16 | `mobile-screen` | `apps/mobile/src/app/*` | deepseek-flash |
| 17 | `mobile-state` | `apps/mobile/src/stores/\|hooks/\|lib/*` | deepseek-flash |
| 18 | `devops-lead` | `.md\|.json` | deepseek-pro |
| 19 | `devops-infra` | `docker-compose\|Dockerfile\|scripts/deploy*` | deepseek-flash |
| 20 | `devops-cicd` | `.github/\|scripts/ci*` | deepseek-flash |
| 21 | `devops-db` | `prisma/\|scripts/db\|*.sql` | deepseek-flash |
| 22 | `documentarian` | `.md` | deepseek-flash |
| 23 | `qa-automator` | `e2e/\|tests/playwright/*.spec.ts` | deepseek-flash |
| 24 | `release-manager` | `package.json\|CHANGELOG.md\|.github/workflows/release*` | deepseek-pro |
| 25 | `design-keeper` | `packages/shared/src/theme.ts\|*.stories.*` | deepseek-flash |
| 26 | `compliance-guardian` | `.md` | deepseek-pro |
| 27 | `security-auditor` | `.md\|.yaml` | deepseek-pro |
| 28 | `performance-auditor` | `.md\|.js` | deepseek-flash |
| 29 | `accessibility-auditor` | `.md\|.js` | deepseek-flash |
| 30 | *(legacy — merged)* | — | — |
| 31 | *(legacy — merged)* | — | — |

---

## 2. The Plan

### Phase A: Complete Simba Code Fork → Remove Default Modes

**Context:** The Simba Code fork already exists at `../simba-code-source/` with PFG/PTG/QG/Memory/Telemetry integrated. The build compiles successfully. What's needed is to remove the 6 Roo Code default modes from the source.

**Tasks:**

| # | Task | Agent | Description | Files |
|---|------|-------|-------------|-------|
| A1 | Locate default mode definitions in Simba Code source | 🔧 JengaBooks Code | Search `simba-code-source/src/` for where Code/Architect/Ask/Debug/Orchestrator/Lead-Architect default modes are defined. Roo Code typically defines these in a `modes.ts` or `agents.ts` file. Remove or comment out the default mode entries, keeping only the 31 custom modes. | `../simba-code-source/src/` |
| A2 | Verify mode registry only contains custom modes | 🔧 JengaBooks Code | After removal, ensure the mode registry/sidebar only lists the 31 agency modes. Check that mode switching, mode selection UI, and any mode-related commands only reference custom modes. | `../simba-code-source/src/` |
| A3 | Rebuild extension | 🚀 DevOps | Run the build pipeline (esbuild / turborepo) to produce a new `dist/extension.js` without default modes. | `../simba-code-source/` |
| A4 | Test mode selection UI | 🧪 QA Automator | Install the rebuilt VSIX and verify: (1) Only 31 agency modes appear in mode picker, (2) Default modes are not selectable, (3) Mode switching between agency modes works correctly. | — |

**Risks:**
- Roo Code's core logic may depend on default modes existing (e.g., the `code` mode might be referenced internally for tool execution). Removal could break the agent loop.
- **Mitigation:** Search for internal references to `"code"`, `"architect"`, `"ask"`, `"debug"` slugs in the source before removing them. If dependencies exist, keep the slugs but hide them from the UI.

### Phase B: If Fork is Not Feasible — Alternative Approaches

If Phase A reveals too many internal dependencies on default modes:

| # | Approach | Complexity | Description |
|---|----------|------------|-------------|
| B1 | UI-only hiding via CSS/settings | Medium | Modify the extension to filter default modes from the mode picker dropdown while keeping them in the backend. Add a `showDefaultModes: false` config option. |
| B2 | Mode slug rename | Medium | Rename default mode slugs to prefixed versions (e.g., `roo-code`, `roo-architect`) and add a section separator in the mode picker. |
| B3 | Single "Agency" meta-mode | High | Replace all 6 default modes with a single "Agency" mode that auto-routes to the appropriate specialist via the dispatcher.js. |

**Recommendation:** Start with Phase A (fork), fall back to B1 if internal dependencies block.

### Phase C: Document Agency Skills

Since there's no `.agency/skills/` directory, consider whether one should be created:

| # | Task | Description |
|---|------|-------------|
| C1 | Decide on skills strategy | Determine if Roo Code's `skills/` directory concept adds value beyond the existing 31 custom modes and 52 agency scripts. Skills in Roo Code are reusable instruction files — the agency already has `customInstructions` per mode. |
| C2 | If skills are wanted | Create a `.agencyskills/` or `skills/` directory with reusable skill definitions for common operations (e.g., `oath-recite.md`, `memory-recall.md`, `grounding-protocol.md`). These can be referenced via `@skills/skill-name` in prompts. |
| C3 | Document the mode-to-skill mapping | Create a reference doc mapping which custom mode has which skills/instrinsics, to avoid duplication between `.roomodes` customInstructions and any future skills files. |

**Recommendation:** The 31 custom modes with their `customInstructions` already serve as skills. A separate skills directory would only add value OR confusion. **Default:** Document the existing modes as the skills inventory and move on.

---

## 3. Quality Gates

| Gate | Trigger | Pass Criteria |
|------|---------|---------------|
| **DG-1** | After A1 | Search `simba-code-source` for default mode slugs — none found in mode registry/UI layer |
| **DG-2** | After A3 | `dist/extension.js` builds successfully and contains agency custom modes but not default modes |
| **DG-3** | After A4 | Installed extension shows exactly 31 modes in mode picker, no Roo Code defaults |
| **DG-4** | After C3 | Skills inventory document created and covers all 31 modes |

---

## 4. Handoff Chain

| Handoff | From | To | Artifacts |
|---------|------|----|-----------|
| **H-A** | 🧠 Lead Architect | 🔧 JengaBooks Code | This plan + Simba Code fork location |
| **H-B** | 🔧 JengaBooks Code | 🚀 DevOps | Modified source + rebuilt VSIX |
| **H-C** | 🚀 DevOps | 🧪 QA Automator | Built VSIX for testing |
| **H-D** | 🧪 QA Automator | 🧠 Lead Architect | Validation report — all gates pass/fail |

---

## 5. Key Decisions Needed

1. **Fork vs. Hide vs. Accept:** Do we proceed with the Simba Code fork (Phase A), attempt a UI-only hide (Phase B1), or accept that default modes coexist with custom modes?
2. **Skills directory:** Do we create a `.agency/skills/` directory with reusable skill files, or rely on the 31 custom modes' `customInstructions` as the skills inventory?
3. **Legacy modes in `.roomodes`:** The file lists 31 modes but some may be legacy/merged (slots 30-31). Should these be cleaned up?
