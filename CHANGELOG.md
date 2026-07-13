# Changelog

## v1.0.3 (2026-07-13)

### ✨ Features
- complete all 12 tasks - deprecation, .roomodes, telemetry, QA validation
- pre-task oath hard gates via pre-commit + handoff
- add recap.js + npm run recap for session context
- blocking git commits, task-closer fallback, git verify in handoff
- close 8 remaining gaps
- unified enforcer + memory v2
- initial commit — bootstrap project
- rename zoocode-fork → Simba Code in project registry
- register zoocode-fork as active project — fork ZooCode with native enforcement
- register agency-mcp as new project — MCP server for native gate enforcement
- unify agency.js as single entry point — 39 commands via npm run agency
- handoff from lead-architect to qa-automator
- handoff from lead-architect to qa-automator
- handoff from code-agent to qa-automator
- handoff from lead-architect to qa-automator
- initial commit — bootstrap project
- add E2E test for multi-project handoff validation (MP-1.13)
- S10.7 Chaos Monkey validation - semantic memory system
- wire auto-docs sync into release-manager workflow
- hook telemetry pipeline into agency scripts (Sprint 7.5-7.8)
- implement Sprint 7 — secret-scan.js + telemetry.js
- Phase B + Phase A — agent boundary refactor and CLI wrapper
- auto-open VS Code on project switch
- add projects-manager.js with register/switch/list/remove and @switch command for terminal-session.js
- rename jengabooks-code to code-agent, JengaBooks to ZooCode Agency
- add notify-telegram and client-bot scripts
- Sprint C low-priority scripts (cost-report, cost-track, handoff, status)
- add init-project.js bootstrap script and agency:init npm script
- add Node.js validation scripts for commit, handoff, and cleanup

### 🐛 Bug Fixes
- eliminate ALL non-blocking error swallows across 10 scripts
- make git push blocking too
- use comma-chain injection for minified var statement; fix ZooCode→SimbaCode identifier replacement
- apply critical Patch-1 (project switch) + Patch-2 (fileRegex overlap) — Sprint MP complete
- implement P1 edge case mitigations — context chunk guard, CWD sync, CI timeout, node version guard
- rename stale JengaBooks references to ZooCode Agency names

### 📝 Documentation
- update ORCHESTRATION.md with actual status (8/12 done)
- add Lead Architect Post-Handoff Procedure — 6-step mandatory checklist after every subtask
- fix 13 edge cases — Windows/macOS/Linux setup, LICENSE, verify flow, rename code-agent
- beautify README — SEO-friendly, LLM-friendly, quick setup focused
- open-source release prep — README, SETUP, QUICKSTART, CONTRIBUTING, jengabooks cleanup
- update FLOW-DOC.md with memory recall integration
- document both .roomodes formats (ZooCode + Roo Code)

### 🧪 Testing
- verify pre-commit hook blocks/approves with PRE phase
- validate all Sprint 9 deliverables — all 6/6 tests pass
- add chaos monkey test suite for P0 guard validation

### 🔄 Other Changes
- chore: cleanup oath test artifact
- chore: final 3 fixes - replace PFG with enforcer in .roomodes (31 agents), update .gitignore, stage package-lock.json
- chore: post-commit hook updates (cost report + changelog)
- sprint20: add all 15 gaps — 3 sub-sprints (core/medium/low) with honest estimates
- cleanup: remove orphan directories, generate final inspection report
- cleanup: remove dead projects (simba-code, --name), reset activeProject to jengabooks
- HANDOFF: backend-service -> next
- HANDOFF:lead-architect — Sprint F1 fork setup complete
- chore: rename repo references jenga-agency → zoocode-agency in docs + package.json
- chore: exclude managed projects from factory repo -- each project is its own repo
- HANDOFF: lead-architect
- HANDOFF: lead-architect
- Sprint 10 P0 Edge Case Mitigations
- Sprint 8.1+8.2: terminal-session.js + npm scripts
- Sprint 5.1+5.2: CI/CD workflow + Husky setup
- chore(agency): add clean-temp.js orphan file cleanup checker

## v1.0.3 (2026-07-12)

### ✨ Features
- unified enforcer + memory v2
- initial commit — bootstrap project
- rename zoocode-fork → Simba Code in project registry
- register zoocode-fork as active project — fork ZooCode with native enforcement
- register agency-mcp as new project — MCP server for native gate enforcement
- unify agency.js as single entry point — 39 commands via npm run agency
- handoff from lead-architect to qa-automator
- handoff from lead-architect to qa-automator
- handoff from code-agent to qa-automator
- handoff from lead-architect to qa-automator
- initial commit — bootstrap project
- add E2E test for multi-project handoff validation (MP-1.13)
- S10.7 Chaos Monkey validation - semantic memory system
- wire auto-docs sync into release-manager workflow
- hook telemetry pipeline into agency scripts (Sprint 7.5-7.8)
- implement Sprint 7 — secret-scan.js + telemetry.js
- Phase B + Phase A — agent boundary refactor and CLI wrapper
- auto-open VS Code on project switch
- add projects-manager.js with register/switch/list/remove and @switch command for terminal-session.js
- rename jengabooks-code to code-agent, JengaBooks to ZooCode Agency
- add notify-telegram and client-bot scripts
- Sprint C low-priority scripts (cost-report, cost-track, handoff, status)
- add init-project.js bootstrap script and agency:init npm script
- add Node.js validation scripts for commit, handoff, and cleanup

### 🐛 Bug Fixes
- use comma-chain injection for minified var statement; fix ZooCode→SimbaCode identifier replacement
- apply critical Patch-1 (project switch) + Patch-2 (fileRegex overlap) — Sprint MP complete
- implement P1 edge case mitigations — context chunk guard, CWD sync, CI timeout, node version guard
- rename stale JengaBooks references to ZooCode Agency names

### 📝 Documentation
- add Lead Architect Post-Handoff Procedure — 6-step mandatory checklist after every subtask
- fix 13 edge cases — Windows/macOS/Linux setup, LICENSE, verify flow, rename code-agent
- beautify README — SEO-friendly, LLM-friendly, quick setup focused
- open-source release prep — README, SETUP, QUICKSTART, CONTRIBUTING, jengabooks cleanup
- update FLOW-DOC.md with memory recall integration
- document both .roomodes formats (ZooCode + Roo Code)

### 🧪 Testing
- validate all Sprint 9 deliverables — all 6/6 tests pass
- add chaos monkey test suite for P0 guard validation

### 🔄 Other Changes
- sprint20: add all 15 gaps — 3 sub-sprints (core/medium/low) with honest estimates
- cleanup: remove orphan directories, generate final inspection report
- cleanup: remove dead projects (simba-code, --name), reset activeProject to jengabooks
- HANDOFF: backend-service -> next
- HANDOFF:lead-architect — Sprint F1 fork setup complete
- chore: rename repo references jenga-agency → zoocode-agency in docs + package.json
- chore: exclude managed projects from factory repo -- each project is its own repo
- HANDOFF: lead-architect
- HANDOFF: lead-architect
- Sprint 10 P0 Edge Case Mitigations
- Sprint 8.1+8.2: terminal-session.js + npm scripts
- Sprint 5.1+5.2: CI/CD workflow + Husky setup
- chore(agency): add clean-temp.js orphan file cleanup checker

## v1.0.3 (2026-07-11)

### ✨ Features
- handoff from lead-architect to qa-automator
- handoff from lead-architect to qa-automator
- handoff from code-agent to qa-automator
- handoff from lead-architect to qa-automator
- initial commit — bootstrap project
- add E2E test for multi-project handoff validation (MP-1.13)
- S10.7 Chaos Monkey validation - semantic memory system
- wire auto-docs sync into release-manager workflow
- hook telemetry pipeline into agency scripts (Sprint 7.5-7.8)
- implement Sprint 7 — secret-scan.js + telemetry.js
- Phase B + Phase A — agent boundary refactor and CLI wrapper
- auto-open VS Code on project switch
- add projects-manager.js with register/switch/list/remove and @switch command for terminal-session.js
- rename jengabooks-code to code-agent, JengaBooks to ZooCode Agency
- add notify-telegram and client-bot scripts
- Sprint C low-priority scripts (cost-report, cost-track, handoff, status)
- add init-project.js bootstrap script and agency:init npm script
- add Node.js validation scripts for commit, handoff, and cleanup

### 🐛 Bug Fixes
- apply critical Patch-1 (project switch) + Patch-2 (fileRegex overlap) — Sprint MP complete
- implement P1 edge case mitigations — context chunk guard, CWD sync, CI timeout, node version guard
- rename stale JengaBooks references to ZooCode Agency names

### 📝 Documentation
- open-source release prep — README, SETUP, QUICKSTART, CONTRIBUTING, jengabooks cleanup
- update FLOW-DOC.md with memory recall integration
- document both .roomodes formats (ZooCode + Roo Code)

### 🧪 Testing
- validate all Sprint 9 deliverables — all 6/6 tests pass
- add chaos monkey test suite for P0 guard validation

### 🔄 Other Changes
- chore: exclude managed projects from factory repo -- each project is its own repo
- HANDOFF: lead-architect
- HANDOFF: lead-architect
- Sprint 10 P0 Edge Case Mitigations
- Sprint 8.1+8.2: terminal-session.js + npm scripts
- Sprint 5.1+5.2: CI/CD workflow + Husky setup
- chore(agency): add clean-temp.js orphan file cleanup checker



## v1.0.3 (2026-07-10)

### 🚀 CI/CD
- Added auto-docs sync step to release-manager workflow — runs `node .agency/scripts/auto-docs.js --sync` before version bump to regenerate CHANGELOG.md and Scripts Reference in AGENCY-RULES.md
- Created `.github/workflows/release.yml` documenting the full release process including SemVer bump, auto-docs sync, and release PR creation
- Added `npm run docs:sync` script to root package.json for easy invocation

### 📝 Documentation
- Release flow updated: auto-docs sync is now a required pre-bump step (see `.github/workflows/release.yml`)

## v1.0.2 (2026-07-09)

### 🧭 Navigation
- Added missing sidebar links: Reports, Workflow, Help & Support
- Fixed broken `/profile` link in profile dropdown (now redirects to `/settings`)

### ✨ Page Transitions
- Added CSS fadeIn animation on route change (200ms ease-out)
- Improved PageLoading component with animated SVG spinner
- Respects `prefers-reduced-motion` for accessibility

### 🔄 Client Switching
- Fixed `initViewModeFromUrl()` never being called on app bootstrap
- Default view-mode changed to `'firm'` for safer initial state
- View-mode now resets to `'firm'` on company switch (clears activeClient)
- Scoped `queryClient.invalidateQueries()` to prevent auth cache blasts
- Sidebar brand subtitle shows 'Firm Overview' in firm mode

### 🧪 Testing
- Added `window.matchMedia` mock for Dashboard test suite
- Frontend tests: 39/39 passing
- API tests: 548/548 passing

## v1.0.1 (2026-07-09)

### 🛡️ Security
- Upgraded vitest to ^3.1.2 (fixes CRITICAL RCE, CVSS 9.8)
- Removed hardcoded JWT fallback secret from audit.module.ts
- Replaced SQL injection vector ($executeRawUnsafe) with parameterized queries
- Replaced hardcoded WhatsApp verify token with env var
- Removed dev JWT secret from .env.example
- Parameterized statement-timeout interceptor query

### 🧪 Compliance
- Added GET /collab/notifications/count endpoint
- Fixed 5 TIME-TRAVEL (new Date()) violations — all now use DB NOW()
- Updated violations-report.md to PASS status

### 🗄️ Database
- Verified payroll schema: Employee, SalaryStructure, PayrollRun, PayrollEntry models
- Added jest-e2e.config.ts for consistent E2E test execution

### 🧪 Testing
- Fixed 10 test failures (mock setup gaps, UI selector fixes)
- Full suite: 548/548 API tests, 33/33 frontend tests
