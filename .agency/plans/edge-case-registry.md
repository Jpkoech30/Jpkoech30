
# ZooCode Agency — Edge Case Registry & Mitigation Plan

> **Source:** Edge Case Registry v1.0  
> **Date:** 2026-07-10  
> **Status:** Planned for Sprint 10

---

## P0 — Critical (Must patch)

| ID | Issue | Fix | Files |
|----|-------|-----|-------|
| E1 | Pre-commit hook path broken — `.agency/` is at root, hook runs from `jengabooks/` | Fix path in `.husky/commit-msg` to `../.agency/scripts/validate-commit.js`. Add `prepare: "husky"` back to `jengabooks/package.json`. | `.husky/commit-msg`, `jengabooks/package.json` |
| E2 | Cost tracking is self-reported, no API cross-check | Add `--raw-usage <json>` flag to `cost-track.js`. Model override if manual vs API mismatch >10%. | `.agency/scripts/cost-track.js` |
| S1 | Cross-project git commits — agent commits from wrong root | Add CWD guard to `handoff.js`: read `.active-project`, verify CWD matches. | `.agency/scripts/handoff.js` |
| O1 | Quality gate infinite treadmill | Create `escalate-lead.js`. Add gate_failures counter to ORCHESTRATION.md schema. Update AGENCY-RULES.md with 3-strike rule. | New: `.agency/scripts/escalate-lead.js`, update `ORCHESTRATION.md` |

## P1 — High (This sprint)

| ID | Issue | Fix |
|----|-------|-----|
| C1 | Context window bloat on @extract | Add 50KB pre-read guard in `terminal-session.js` |
| S2 | Active-project / CWD mismatch | Add `process.chdir()` and explicit `cd` print in `projects-manager.js` |
| O2 | CI timeout blindness | Add 2-min timeout + status message in `terminal-session.js` exec wrapper |
| N1 | Node version mismatch | Create `version-check.js` utility, inject into all scripts |
| O3 | 6-iteration hard wall no notification | Wire `escalate_to: "deepseek-pro"` to actually alert |

## P2 — Medium

| ID | Issue | Fix |
|----|-------|-----|
| S4 | VS Code dual-window desync | Document in AGENCY-RULES.md |
| C3 | clean-temp.js false positives | Add `--confirm` flag before deletion |
| O4 | File-regex turf war | Add `--force-agent` override flag |
