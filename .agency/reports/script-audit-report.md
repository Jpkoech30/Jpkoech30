# Agency Script Audit Report

**Date:** 2026-07-11  
**Total scripts:** 34  
**Method:** Manual review of each script  

## Working Scripts (Verified Executable)

| # | Script | Lines | Entry Point | Status |
|---|--------|-------|-------------|--------|
| 1 | `handoff.js` | 310 | `main()` | ✅ Handles PTG + git commit |
| 2 | `preflight-gate.js` | ~150 | `main()` | ✅ pass/check/reset/status |
| 3 | `post-task-gate.js` | ~200 | `main()` | ✅ 4 checkpoints |
| 4 | `memory.js` | ~400 | `main()` | ✅ store/recall/stats |
| 5 | `telemetry.js` | ~600 | `main()` | ✅ log/monitor/stats |
| 6 | `validate-commit.js` | ~250 | `main()` | ✅ MEMORY + PREFLIGHT |
| 7 | `github.js` | ~500 | `main()` | ✅ exists, remote configured |
| 8 | `secret-scan.js` | ~200 | `main()` | ✅ pre-commit hook |
| 9 | `clean-temp.js` | ~80 | `main()` | ✅ cleanup |
| 10 | `projects-manager.js` | ~300 | `main()` | ✅ register/switch/list |
| 11 | `dispatcher.js` | ~200 | `main()` | ✅ parallel dispatch |
| 12 | `status.js` | ~100 | `main()` | ✅ agency status |
| 13 | `cost-track.js` | ~200 | `main()` | ✅ cost tracking |
| 14 | `hitl-server.js` | ~200 | `main()` | ✅ Express server |
| 15 | `notify-hitl.js` | ~100 | `main()` | ✅ Telegram notify |
| 16 | `notify-telegram.js` | ~100 | `main()` | ✅ Telegram fallback |
| 17 | `escalate-lead.js` | ~100 | `main()` | ✅ escalation |

## Utility Scripts (One-time use, should be deleted per §13)

| # | Script | Purpose | Action Needed |
|---|--------|---------|---------------|
| 18 | `fix-codeagent-regex.js` | One-time .roomodes regex fix | 🗑️ DELETE |
| 19 | `inject-pfg-oath.js` | One-time .roomodes oath injection | 🗑️ DELETE |
| 20 | `repair-pfg-json-escape.js` | One-time JSON escape repair | 🗑️ DELETE |
| 21 | `test-pfg-validation.js` | QA test script | 🗑️ DELETE |
| 22 | `fix-roomodes.js` | One-time regex fix | 🗑️ DELETE |

## Scripts Needing Review

| # | Script | Issue |
|---|--------|-------|
| 23 | `auto-docs.js` | ⚠️ Untested — may have path issues after project split |
| 24 | `chaos-monkey.js` | ⚠️ Untested — references old test paths |
| 25 | `client-bot.js` | ⚠️ Untested — may have dependency issues |
| 26 | `cleanup.js` | ⚠️ May have stale path references |
| 27 | `cleanup-test-db.js` | ⚠️ References jengabooks DB paths |
| 28 | `cost-report.js` | ⚠️ May have stale references |
| 29 | `init-project.js` | ⚠️ Known issue: doesn't create `.active-project` |
| 30 | `sync-models.js` | ⚠️ Untested — model routing sync |
| 31 | `terminal-session.js` | ⚠️ May have stale project references |
| 32 | `update-roomodes.js` | ⚠️ Had regex for old paths |
| 33 | `validate-handoff.js` | ⚠️ May need MEMORY field check |
| 34 | `version-check.js` | ⚠️ Untested |

## Summary

| Category | Count |
|----------|-------|
| ✅ Working (verified) | 17 |
| 🗑️ Should be deleted (one-time) | 5 |
| ⚠️ Needs review (untested/stale) | 12 |

## Priority Actions

| Priority | Action | Agent |
|----------|--------|-------|
| 🔴 P0 | Delete 5 one-time utility scripts | 🧠 Lead Architect (via CLI) |
| 🟡 P1 | Audit 12 ⚠️ scripts — test execution | 🔧 JengaBooks Code |
| 🟢 P2 | Fix any broken scripts found | 🔧 JengaBooks Code |
