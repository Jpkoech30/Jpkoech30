# Sprint 18 — Final Automation Push

> **Goal:** Automate remaining 4 candidates. Target: zero manual steps in agent workflow.

---

## Task 18.1 — Auto-assign Agents

**Problem:** Every HANDOFF requires me (Lead Architect) to choose which agent gets which task. This is pattern-matching — automatable.

**Solution:** Create `auto-assign.js` that reads a task description and matches it to the best agent based on:
- `fileRegex` in `.roomodes` — which files does the task modify?
- Task type (new-screen, script, feature, config, docs, qa)
- Agent availability (is agent already assigned to another task?)

**Usage:**
```
node .agency/scripts/auto-assign.js --task "Create invoice list screen" --files "apps/mobile/src/app/invoices/"
→ Suggests: 📱 Mobile Screen (matches apps/mobile/src/app/)

node .agency/scripts/auto-assign.js --task "Fix API endpoint validation" --files "apps/api/src/controllers/"
→ Suggests: ⚙️ Backend API (matches apps/api/src/*.controller.ts)
```

**Integration:** Wire into `handoff.js` with `--auto-assign` flag.

## Task 18.2 — Auto-PR with Changelog

**Problem:** After commits, creating a PR with changelog is manual.

**Solution:** Enhance `github.js` with `pr create` command:
```
node .agency/scripts/github.js pr --from <branch> --to main --title "Sprint 17"
```
- Reads commits since last release
- Groups by type (feat, fix, docs, test)
- Creates PR body from grouped commits
- Assigns labels based on commit types

## Task 18.3 — Sprint Retro Report

**Problem:** Sprint retros require reading telemetry + memory + commits manually.

**Solution:** Create `retro-report.js` that generates a retrospective from data:
```
node .agency/scripts/retro-report.js --sprint 17 --output .agency/reports/retro-sprint17.md
```

**Report includes:**
- Tasks completed vs planned
- Agents involved and their contributions
- Token cost per agent (from cost-running.md)
- Memory entries created during sprint
- Quality gate results (pass/fail per QG check)
- Recommendations (based on patterns: repeated QG failures, high token tasks, etc.)

## Task 18.4 — Auto-create Contracts from Code

**Problem:** Contracts are manually designed. For simple endpoints, the contract can be inferred from the code.

**Solution:** Create `contract-gen.js` that scans controller/service files and generates contract JSON:
```
node .agency/scripts/contract-gen.js --file apps/api/src/invoices/controller.ts --output .agency/contracts/mobile-invoices.json
```

**Scans for:**
- `@Post()`, `@Get()`, `@Put()`, `@Delete()` decorators → HTTP methods
- Route paths → endpoint URLs
- DTO/Zod schemas → request/response types

**Warning:** This generates DRAFT contracts. Always requires human review before use.

---

## Sprint 18 Task Board

| # | Task | Type | Agent | Est. |
|---|------|------|-------|------|
| **18.1** | Create `auto-assign.js` — match task descriptions to agents via fileRegex | `script` | 🔧 JengaBooks Code | 1d |
| **18.2** | Enhance `github.js` — add `pr create` command with auto-changelog | `enhance` | 🔧 JengaBooks Code | 1d |
| **18.3** | Create `retro-report.js` — sprint retrospective from telemetry+memory+commits | `script` | 🔧 JengaBooks Code | 1d |
| **18.4** | Create `contract-gen.js` — scan code → draft contracts | `script` | 🔧 JengaBooks Code | 1.5d |
| **18.5** | 🧪 Validate all automation | `qa` | 🧪 QA Automator | 1d |
