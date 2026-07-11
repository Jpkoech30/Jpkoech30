# 🧠 Agency MCP Server — Orchestration

> **Status:** `ACTIVE` | **Project:** `agency-mcp` | **Created:** 2026-07-11
> **Goal:** Build an MCP server that enforces PFG/PTG/QG gates natively within ZooCode, replacing all `.agency/scripts/` with native MCP tools.

---

## 📋 Project Overview

**Problem:** The agency's enforcement layer (PFG, PTG, QG, memory, telemetry) runs as 34 separate scripts. Agents must remember to run them manually. An MCP server makes them native to ZooCode — running automatically on every tool call and task completion.

**Solution:** A Node.js MCP server that ZooCode connects to, exposing:
- `preflight` tool — checks PFG before any tool use
- `posttask` tool — runs PTG after task completion
- `qualitygate` tool — validates output quality
- `memory` resource — semantic memory (store/recall)
- `telemetry` resource — cost and event tracking

## 🏗️ Architecture

```
ZooCode Extension
    │
    ├── MCP Client (built-in)
    │       │
    │       ▼
    │   Agency MCP Server (this project)
    │       ├── preflight/check       → PFG check before 1st tool
    │       ├── preflight/pass        → PFG oath confirmation
    │       ├── posttask/complete     → PTG validation
    │       ├── quality/check         → QG validation
    │       ├── memory/store          → Store decision
    │       ├── memory/recall         → Recall context
    │       └── telemetry/log         → Log event
    │
    ├── File tools (read, write, apply_diff)
    └── Terminal tools (command)
```

## 🗺️ Sprint Roadmap

### Sprint M1 — MCP Server Foundation (Est. 3 days)
**Theme:** Basic MCP server with PFG enforcement

| # | Task | Type | Agent | Est. | Status |
|---|------|------|-------|------|--------|
| **M1.1** | Scaffold MCP server with `@modelcontextprotocol/sdk` | `setup` | 🔧 Backend Service | 0.5d | `PENDING` |
| **M1.2** | Implement `preflight/check` tool — verify PFG sentinel exists before allowing tools | `feature` | 🔧 Backend Service | 1d | `PENDING` |
| **M1.3** | Implement `preflight/pass` tool — create PFG sentinel after oath | `feature` | 🔧 Backend Service | 0.5d | `PENDING` |
| **M1.4** | Wire ZooCode to connect to MCP server on startup | `config` | 🔧 DevOps | 0.5d | `PENDING` |
| **M1.5** | Test: MCP server blocks tool calls before PFG pass | `qa` | 🧪 QA Automator | 0.5d | `PENDING` |

### Sprint M2 — Post-Task Gate + Quality Gate (Est. 3 days)

| # | Task | Type | Agent | Est. | Status |
|---|------|------|-------|------|--------|
| **M2.1** | Implement `posttask/complete` tool — 6 PTG checkpoints | `feature` | 🔧 Backend Service | 1d | `PENDING` |
| **M2.2** | Implement `quality/check` tool — 10 QG checks | `feature` | 🔧 Backend Service | 1d | `PENDING` |
| **M2.3** | Implement `memory/store` and `memory/recall` resources | `feature` | 🔧 Backend Service | 1d | `PENDING` |
| **M2.4** | End-to-end test: full task lifecycle via MCP | `qa` | 🧪 QA Automator | 1d | `PENDING` |

### Sprint M3 — Telemetry + Polish (Est. 2 days)

| # | Task | Type | Agent | Est. | Status |
|---|------|------|-------|------|--------|
| **M3.1** | Implement `telemetry/log` tool — cost + event tracking | `feature` | 🔧 Backend Service | 0.5d | `PENDING` |
| **M3.2** | Package as VSIX-ready standalone server | `devops` | 🚀 DevOps | 0.5d | `PENDING` |
| **M3.3** | Documentation: setup guide, MCP integration guide | `docs` | 📝 Documentarian | 0.5d | `PENDING` |
| **M3.4** | Final validation — all 15 quality gates pass via MCP | `qa` | 🧪 QA Automator | 0.5d | `PENDING` |

---

## 🔗 Handoff Protocol

| Handoff | From | To | Artifacts |
|---------|------|----|-----------|
| **HM1** | 🧠 Lead Architect | 🔧 Backend Service | M1 contract + plan |
| **HM2** | 🔧 Backend Service | 🧪 QA Automator | MCP server for testing |
| **HM3** | 🧪 QA Automator | 🧠 Lead Architect | Validation report |

## 📋 Contract Registry

| Contract ID | Version | Path | Status |
|-------------|---------|------|--------|
| `agency-mcp-gate` | 1.0.0 | `contracts/agency-mcp-gate.json` | `DRAFT` |
