# Fork ZooCode — Pipeline Plan

> **Status:** `EXPLORATORY` | **Goal:** Build our own agentic runtime with native enforcement

---

## Phase 0: Research (1 week)

| Task | What | Output |
|------|------|--------|
| 0.1 | Clone ZooCode repo, understand architecture | Architecture map |
| 0.2 | Identify the 5 key extension points | Tool system, agent loop, model routing, file editing, MCP |
| 0.3 | Audit license — can we fork? | Legal signoff |
| 0.4 | Set up build pipeline (VSIX packaging) | `npm run build:vsix` |

## Phase 1: Core Fork (2 weeks)

Build the minimum viable fork that replaces `.roomodes` + `.agency/scripts/` with built-in features:

| Sprint | Feature | Replaces |
|--------|---------|----------|
| **F1** | **Native agent definitions** — 31 agents hardcoded in extension, not `.roomodes` | `.roomodes` |
| **F2** | **Pre-Flight Gate** — oath required before any tool executes (engine-level, not text) | `preflight-gate.js` |
| **F3** | **Post-Task Gate** — 6 checkpoints run automatically after task | `post-task-gate.js` |
| **F4** | **Quality Gate** — 10 checks run on diff before commit allowed | `quality-gate.js` + `compliance-check.js` |

## Phase 2: Memory & Telemetry (1 week)

| Sprint | Feature | Replaces |
|--------|---------|----------|
| **F5** | **Native Memory** — auto-recall at session start, auto-store at task end | `memory.js` |
| **F6** | **Native Telemetry** — per-agent token tracking in extension UI | `telemetry.js` + `cost-track.js` |

## Phase 3: Automation (1 week)

| Sprint | Feature | Replaces |
|--------|---------|----------|
| **F7** | **Auto-assign** — task description → agent routing built into extension | `auto-assign.js` |
| **F8** | **Auto-docs** — changelog generation on commit | `auto-docs.js` + post-commit hook |

## Phase 4: Distribution (1 week)

| Sprint | Feature | What |
|--------|---------|------|
| **F9** | VSIX packaging | `vsce package` → `.vsix` file |
| **F10** | Marketplace listing | VS Code Marketplace → public listing |
| **F11** | Documentation | User guide, migration guide from ZooCode |

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│              OUR VS CODE EXTENSION                        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  AGENT RUNTIME (forked from ZooCode)                     │
│  ├── Agent loop (think → act → observe → repeat)         │
│  ├── Tool system (read, write, apply_diff, command)       │
│  ├── LLM router (Flash vs Pro per agent type)            │
│  └── MCP server support                                  │
│                                                          │
│  OUR EXTENSIONS (added on top)                           │
│  ├── Agent Registry (31 agents, hardcoded, not .roomodes)│
│  ├── Pre-Flight Gate (oath required before 1st tool)     │
│  ├── Post-Task Gate (6 checks after task completion)      │
│  ├── Quality Gate (10 checks on diff)                    │
│  ├── Memory System (SQLite, auto-recall)                 │
│  ├── Telemetry (token tracking per agent)                │
│  └── Auto-assign (task → agent routing)                  │
│                                                          │
│  UI (our additions)                                      │
│  ├── Status bar (PFG/PTG/QG status)                     │
│  ├── Memory browser (recall/stats UI)                   │
│  └── Cost dashboard (per-agent token usage)             │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Migration Path

```
CURRENT STATE (uses ZooCode):
  .roomodes → 31 agent definitions (text)
  .agency/scripts/ → 34 enforcement scripts
  .husky/post-commit → git hooks
  User installs ZooCode extension

AFTER FORK (uses our extension):
  No .roomodes needed — agents built into extension
  No .agency/scripts/ — enforcement built into extension
  No .husky/ — commit gates built into extension
  User installs our VSIX from marketplace
```

---

## Effort Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 0: Research | 1 week | None |
| Phase 1: Core Fork | 2 weeks | Phase 0 |
| Phase 2: Memory | 1 week | Phase 1 |
| Phase 3: Automation | 1 week | Phase 2 |
| Phase 4: Distribution | 1 week | Phase 3 |
| **Total** | **~6 weeks** | |

---

## Key Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| ZooCode updates during fork | Merge conflicts | Pin to specific ZooCode version, merge quarterly |
| VS Code API changes | Extension breaks | Track VS Code release notes, CI test against insiders |
| Marketplace listing rejected | No distribution | Self-host VSIX as fallback |
| Users resist installing another extension | Low adoption | Provide migration guide, support both extensions |
