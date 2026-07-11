# 🧠 ZooCode Fork — Orchestration

> **Status:** `ACTIVE` | **Project:** `zoocode-fork` | **Created:** 2026-07-11
> **Goal:** Fork ZooCode VS Code extension → build our own agentic runtime with native PFG/PTG/QG enforcement.

---

## 📋 Project Overview

**Strategy:** We fork ZooCode (v3.69.100241) and embed our 18 sprints of agency enforcement directly into the extension engine. No more `.roomodes` text rules, no more 34 separate scripts — everything is native.

**Key Differentiator:** Rules are ENFORCED at the engine level, not advisory in customInstructions.

## 🗺️ Sprint Roadmap

### Sprint F1 — Research + Fork Setup (Est. 1 week)
**Theme:** Understand ZooCode architecture, set up build pipeline

| # | Task | Type | Agent | Est. | Status |
|---|------|------|-------|------|--------|
| **F1.1** | Decompile `dist/extension.js` — extract agent loop, tool system, MCP client | `research` | 🔧 Backend Service | 2d | `DONE` |
| **F1.2** | Set up esbuild + VSIX build pipeline | `devops` | 🚀 DevOps | 1d | `DONE` |
| **F1.3** | Set up dev environment (hot-reload, debug mode) | `devops` | 🚀 DevOps | 1d | `DONE` |
| **F1.4** | Create `zoocode-fork` organization on GitHub | `setup` | 🧠 Lead Architect | 0.5d | `DONE` |
| **F1.5** | Port `.roomodes` 31 agents into extension code | `feature` | 🔧 Backend Service | 1d | `DONE` |

### Sprint F2 — Native PFG (Est. 1 week)
**Theme:** Build Pre-Flight Gate into the agent loop — oath required before any tool

| # | Task | Type | Agent | Est. | Status |
|---|------|------|-------|------|--------|
| **F2.1** | Create `src/pfg.ts` with checkPFG, passPFG, resetPFG | `feature` | 🔧 Backend Service | 2d | `DONE` |
| **F2.2** | Hook PFG into `src/extension.ts` — register commands + tool interceptor | `feature` | 🔧 Backend Service | 1d | `DONE` |
| **F2.3** | Build PFG Status Bar UI (`src/pfg-ui.ts`) — live indicator | `ui` | 🌐 Frontend Web | 1d | `DONE` |
| **F2.4** | Build and verify — `dist/extension.js` contains PFG (41 refs, 7.3KB) | `qa` | 🧪 QA Automator | 0.5d | `DONE` |

### Sprint F3 — Native PTG + QG (Est. 1 week)
**Theme:** Build Post-Task Gate and Quality Gate into the agent loop

| # | Task | Type | Agent | Est. | Status |
|---|------|------|-------|------|--------|
| **F3.1** | Create `src/ptg.ts` — 6 checkpoints (Memory, Temp Files, Handoff, Sentinel, QG, Compliance) | `feature` | 🔧 Backend Service | 2d | `DONE` |
| **F3.2** | Create `src/qg.ts` — 9 checks (Hallucination, Contracts, Diff Size, Tests, Plan-vs-Impl, TS Compile, Dependencies, Design, Compliance) | `feature` | 🔧 Backend Service | 1d | `DONE` |
| **F3.3** | Wire PTG + QG into `src/extension.ts` — register `zoocode-fork.ptg.run` and `zoocode-fork.qg.run` commands | `feature` | 🔧 Backend Service | 1d | `DONE` |
| **F3.4** | Test: full lifecycle (PFG → task → PTG → QG → commit) | `qa` | 🧪 QA Automator | 1d | `PENDING` |

### Sprint F4 — Native Memory + Telemetry (Est. 1 week)

| # | Task | Type | Agent | Est. | Status |
|---|------|------|-------|------|--------|
| **F4.1** | Build SQLite memory into extension (auto-recall at start, auto-store at end) | `feature` | 🔧 Backend Service | 2d | `PENDING` |
| **F4.2** | Build telemetry dashboard (token usage per agent, real-time) | `ui` | 🌐 Frontend Web | 1d | `PENDING` |
| **F4.3** | VSIX packaging + VS Code marketplace listing | `devops` | 🚀 DevOps | 1d | `PENDING` |

---

## 📋 Contract Registry

| Contract ID | Version | Path | Status |
|-------------|---------|------|--------|
| `zoocode-fork-architecture` | 1.0.0 | `contracts/zoocode-fork-architecture.json` | `DONE` |

---

## 🔧 Sprint F3 — Delivery Summary

### Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| [`src/ptg.ts`](projects/zoocode-fork/src/ptg.ts) | **Created** | Core PTG module — `runPTG(task, agent)` with 6 checkpoints (C1-C6): memory verification, temp file scan, git commit metadata, PFG sentinel auto-reset, QG delegation, compliance stub |
| [`src/qg.ts`](projects/zoocode-fork/src/qg.ts) | **Created** | Core QG module — `runQG(projectPath)` with 9 checks (C1-C9): Hallucination Detector (BLOCK on secrets, WARN on TODO), Contract Compliance (WARN), Diff Size Limiter (WARN 500+ / BLOCK 2000+), Test Gate (WARN/BLOCK), Plan-vs-Implementation (WARN), TypeScript Compile (BLOCK), Dependency Sanity (BLOCK), Design Principles (WARN), Compliance (BLOCK) |
| [`src/extension.ts`](projects/zoocode-fork/src/extension.ts) | **Modified** | Added imports for `runPTG`/`PTGResult` and `runQG`/`QGResult`; registered `zoocode-fork.ptg.run` and `zoocode-fork.qg.run` VS Code commands with detailed output channel reports |

### Build Verification
- `npm run build` → **PASS** (esbuild)
- Bundle contains all PTG checkpoints (C1-C6): `runPTG` function present
- Bundle contains all QG checks (C1-C9): `runQG` function present
- Commands extracted: `zoocode-fork.ptg.run` and `zoocode-fork.qg.run`

### PTG Architecture
```
┌──────────────────────────────────────────────────────────────┐
│                    POST-TASK GATE (runPTG)                     │
│                                                              │
│  PTG-C1: Memory Stored?  → Check .agency/memory/store.json   │
│  PTG-C2: Temp Files?     → Scan for temp-*, *.bak, debug-*   │
│  PTG-C3: Handoff Meta?   → Validate git commit fields        │
│  PTG-C4: Sentinel Reset? → Auto-delete .preflight-passed     │
│  PTG-C5: QG Passed?      → Delegates to runQG                │
│  PTG-C6: Compliance?     → Future contract-based validation  │
│                                                              │
│  Result: ALL PASS ✅  or  FAILED ❌ with per-checkpoint msg    │
└──────────────────────────────────────────────────────────────┘
```

### QG Architecture
```
┌──────────────────────────────────────────────────────────────┐
│                    QUALITY GATE (runQG)                        │
│                                                              │
│  QG-C1: Hallucination Detector   🚫 BLOCK on secrets         │
│  QG-C2: Contract Compliance       ⚠️ WARN on mismatches       │
│  QG-C3: Diff Size Limiter        ⚠️ WARN 500+ / 🚫 BLOCK 2K+ │
│  QG-C4: Test Gate                ⚠️ WARN / 🚫 BLOCK on fail   │
│  QG-C5: Plan-vs-Implementation   ⚠️ WARN on drift             │
│  QG-C6: TypeScript Compile       🚫 BLOCK on errors           │
│  QG-C7: Dependency Sanity        🚫 BLOCK on missing pkgs     │
│  QG-C8: Design Principles        ⚠️ WARN on violations        │
│  QG-C9: Compliance               🚫 BLOCK on merge conflicts  │
│                                                              │
│  Result: ✅ ALL PASS / ⚠️ WARNINGS / 🚫 BLOCKED               │
└──────────────────────────────────────────────────────────────┘
```

### Commands Registered
| Command ID | Description |
|------------|-------------|
| `zoocode-fork.ptg.run` | Post-Task Gate — validates 6 checkpoints after task completion. Reports to output channel. |
| `zoocode-fork.qg.run` | Quality Gate — runs 9 automated quality checks on project. Blocks on critical failures, warns on advisory items. |

---

## 🔧 Sprint F2 — Delivery Summary

### Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| [`src/pfg.ts`](projects/zoocode-fork/src/pfg.ts) | **Created** | Core PFG module — `checkPFG`, `passPFG`, `resetPFG`, sentinel file at `.agency/.preflight-passed` |
| [`src/extension.ts`](projects/zoocode-fork/src/extension.ts) | **Modified** | Activation hooks: `PFGManager` class, 3 VS Code commands (`pfg.pass`, `pfg.check`, `pfg.reset`), tool interceptor command |
| [`src/pfg-ui.ts`](projects/zoocode-fork/src/pfg-ui.ts) | **Created** | `PFGStatusBar` class — live status bar indicator (green check / red x), refreshes every 5s |
| [`package.json`](projects/zoocode-fork/package.json) | **Fixed** | Resolved merge conflict, added `@types/node` dev dependency |

### Build Verification
- `npm run build` → **PASS** (esbuild, 7.3KB bundle)
- Bundle contains 41 PFG references
- All functions present: `checkPFG`, `passPFG`, `resetPFG`, `PFGStatusBar`

### PFG Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Agent Loop (presentAssistantMessage)   │
│                                                         │
│  LLM Response → Parse Tool Calls → FOR EACH CALL:       │
│                                    │                    │
│                                    ▼                    │
│                          ┌──────────────────┐           │
│                          │  zoocode-fork.   │           │
│                          │  tool.intercept  │◄── F2.2   │
│                          └────────┬─────────┘           │
│                                   │                     │
│                                   ▼                     │
│                          ┌──────────────────┐           │
│                          │   checkPFG()     │◄── F2.1   │
│                          │  from pfg.ts     │           │
│                          └────────┬─────────┘           │
│                                   │                     │
│                    ┌──────────────┴──────────────┐      │
│                    ▼                              ▼      │
│           ┌──────────────┐              ┌──────────────┐ │
│           │ PFG PASSED   │              │ PFG BLOCKED  │ │
│           │ → execute    │              │ → return     │ │
│           │   tool       │              │   error msg  │ │
│           └──────────────┘              └──────────────┘ │
│                                                         │
│  Status Bar: $(check) PFG: Passed / $(x) PFG: Not Passed │
│              (refreshes every 5s)          ◄── F2.3     │
└─────────────────────────────────────────────────────────┘
```

### Commands Registered
| Command ID | Description |
|------------|-------------|
| `zoocode-fork.pfg.pass` | Pass PFG — prompts for agent slug + task, writes sentinel |
| `zoocode-fork.pfg.check` | Check PFG status for current agent |
| `zoocode-fork.pfg.reset` | Reset PFG — deletes sentinel, blocks all tools |
| `zoocode-fork.tool.intercept` | Tool interceptor — checks PFG before forwarding |
| `zoocode-fork.hello` | Verify extension is active |
