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
| **F1.1** | Decompile `dist/extension.js` — extract agent loop, tool system, MCP client | `research` | 🔧 Backend Service | 2d | `PENDING` |
| **F1.2** | Set up esbuild + VSIX build pipeline | `devops` | 🚀 DevOps | 1d | `PENDING` |
| **F1.3** | Set up dev environment (hot-reload, debug mode) | `devops` | 🚀 DevOps | 1d | `PENDING` |
| **F1.4** | Create `zoocode-fork` organization on GitHub | `setup` | 🧠 Lead Architect | 0.5d | `PENDING` |
| **F1.5** | Port `.roomodes` 31 agents into extension code | `feature` | 🔧 Backend Service | 1d | `PENDING` |

### Sprint F2 — Native PFG (Est. 1 week)
**Theme:** Build Pre-Flight Gate into the agent loop — oath required before any tool

| # | Task | Type | Agent | Est. | Status |
|---|------|------|-------|------|--------|
| **F2.1** | Hook into agent loop's first tool call → check PFG sentinel | `feature` | 🔧 Backend Service | 2d | `PENDING` |
| **F2.2** | Block tool execution if PFG not passed | `feature` | 🔧 Backend Service | 1d | `PENDING` |
| **F2.3** | Build PFG UI (status bar indicator, oath prompt) | `ui` | 🌐 Frontend Web | 1d | `PENDING` |
| **F2.4** | Test: verify tool calls blocked before oath | `qa` | 🧪 QA Automator | 0.5d | `PENDING` |

### Sprint F3 — Native PTG + QG (Est. 1 week)
**Theme:** Build Post-Task Gate and Quality Gate into the agent loop

| # | Task | Type | Agent | Est. | Status |
|---|------|------|-------|------|--------|
| **F3.1** | Hook into task completion → run PTG checks automatically | `feature` | 🔧 Backend Service | 2d | `PENDING` |
| **F3.2** | Block handoff if PTG fails | `feature` | 🔧 Backend Service | 1d | `PENDING` |
| **F3.3** | Quality gate runs on diff before commit | `feature` | 🔧 Backend Service | 1d | `PENDING` |
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
| `zoocode-fork-architecture` | 1.0.0 | `contracts/zoocode-fork-architecture.json` | `DRAFT` |
