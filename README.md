# 🧠 ZooCode Agency — Multi-Agent Orchestration Framework

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js)](https://nodejs.org)
[![ZooCode](https://img.shields.io/badge/ZooCode-Compatible-6C5CE7)](https://zoo.dev)
[![Agents](https://img.shields.io/badge/Agents-31-00B894)](.roomodes)
[![Quality Gates](https://img.shields.io/badge/Quality%20Gates-15-E17055)](.agency/AGENCY-RULES.md)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS-0078D4)](.husky/post-commit)
[![Brainstorming Guide](https://img.shields.io/badge/Brainstorm-Guide-FF6B6B)](.agency/notes/agency-brainstorm-guide.md)
[![GitHub Stars](https://img.shields.io/github/stars/Jpkoech30/zoocode-agency?style=social)](https://github.com/Jpkoech30/zoocode-agency)

> **A production-ready multi-agent orchestration system for [ZooCode](https://zoo.dev).**
> Automate code generation, enforce quality gates, track decisions with semantic memory, and coordinate 31 specialized AI agents — all from your terminal.

---

## 🧠 Brainstorming Guide

Want to understand **how the agency really works** — the agent hierarchy, HANDOFF protocol, quality gates, pipeline types, enforcement phases, and cost model — all in one place?

👉 **[Open the Brainstorming Guide →](.agency/notes/agency-brainstorm-guide.md)**

This 15-section guide covers everything:
| Section | What's Inside |
|---------|---------------|
| **§1–2** | Big picture + all 31 agents with their fileRegex domains |
| **§3** | The 14 Foundational Principals (enforceable rules) |
| **§4** | **HANDOFF protocol** — how agents pass work via commit messages |
| **§5** | Pipeline types A–H — how tasks get routed to specialists |
| **§6** | Quality gates — 6-stage post-implementation checks |
| **§7–8** | Full dev pipeline + enforcer.js 5-phase state machine |
| **§9–11** | 33 scripts, 37 API contracts, cost model (KES) |
| **§12–13** | Multi-project awareness + semantic memory RAG |
| **§14** | **15 brainstorming prompts** — structural, workflow, quality, cost, and architecture questions to explore |

---

## 🔥 Quick Setup (2 minutes)

### Windows (cmd.exe)
```cmd
:: 1. Clone
git clone https://github.com/Jpkoech30/zoocode-agency.git
cd zoocode-agency

:: 2. Install
npm install

:: 3. Init your project
node .agency\scripts\init-project.js --name my-new-project

:: 4. Start collaborating
:: Load .roomodes in ZooCode and begin!
```

### macOS / Linux
```bash
# 1. Clone
git clone https://github.com/Jpkoech30/zoocode-agency.git
cd zoocode-agency

# 2. Install
npm install

# 3. Init your project
node .agency/scripts/init-project.js --name my-new-project

# 4. Start collaborating
# Load .roomodes in ZooCode and begin!
```

**[📥 Download ZIP](https://github.com/Jpkoech30/zoocode-agency/archive/refs/heads/master.zip)** — No git required. Note: ZIP users skip git features (auto-changelog, PR creation, retro reports).

---

## 📋 Table of Contents

- [What Is This?](#-what-is-this)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [For ZooCode Users](#-for-zoocode-users)
- [31 Agents](#-31-agents)
- [Quality Gates](#-quality-gates)
- [Principles](#-14-foundational-principles)
- [Project Structure](#-project-structure)
- [Requirements](#-requirements)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 What Is This?

ZooCode Agency is a **multi-agent orchestration framework** that transforms how you use AI coding agents. Instead of one generic agent, you get **31 specialized agents** with:

| Capability | How It Works |
|-----------|-------------|
| **🧠 Smart Routing** | Tasks are automatically assigned to the right specialist agent based on file types |
| **🛡️ Quality Enforcement** | 15 automated gates check output before any code is committed |
| **💾 Decision Memory** | Every architectural decision is stored and recallable — no repeated mistakes |
| **🔍 Hallucination Detection** | Automated scanning catches fake APIs, missing imports, and hardcoded secrets |
| **📊 Cost Tracking** | Every token spend is logged and reported per agent per sprint |
| **🚀 Auto-Deploy** | Commits → auto-docs → cost report → GitHub push — fully automated |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ZOOCODE AGENCY — FULL PIPELINE                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  TASK START                                                          │
│    ├─ Pre-Flight Gate ── Oath + Sentinel                             │
│    ├─ Grounding ──────── Memory recall → partial read → full read    │
│    └─ Socratic Plan ──── List files → describe → edge cases          │
│                                                                      │
│  TASK EXECUTION                                                      │
│    └─ 31 specialized agents working autonomously                     │
│                                                                      │
│  TASK END                                                            │
│    ├─ Post-Task Gate ─── 6 checkpoints (memory, cleanup, metadata,   │
│    │                      sentinel, quality, compliance)             │
│    ├─ Quality Gate ───── 7+3 output checks (hallucination, contract, │
│    │                      diff size, tests, plan, TypeScript, deps,  │
│    │                      design principles, compliance)             │
│    └─ Compliance ─────── 7 automated rule checks                     │
│                                                                      │
│  HANDOFF                                                            │
│    ├─ git add + git commit with HANDOFF metadata                     │
│    ├─ auto-docs.js ──── Updates scripts table + CHANGELOG            │
│    ├─ cost-report.js ── Appends token costs to running report        │
│    └─ git push ──────── Auto-pushes to origin/master                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Quick Start

### New Project

```bash
git clone https://github.com/Jpkoech30/zoocode-agency.git my-project
cd my-project
npm install
node .agency/scripts/init-project.js --name my-project
# Load .roomodes in ZooCode → start adding tasks to ORCHESTRATION.md
```

### Existing ZooCode Project

**Windows (cmd.exe):**
```cmd
:: Copy agency files to your existing project
xcopy /E /I zoocode-agency\.agency your-project\.agency
copy zoocode-agency\.roomodes your-project\.roomodes
xcopy /E /I zoocode-agency\.husky your-project\.husky
copy zoocode-agency\package.json your-project\
cd your-project
npm install
node .agency\scripts\init-project.js
node .agency\scripts\enforcer.js pre --agent lead-architect --task "setup-complete"
```

**macOS / Linux:**
```bash
cp -r ./zoocode-agency/.agency ./zoocode-agency/.roomodes ./zoocode-agency/.husky ./zoocode-agency/package.json ./your-project/
cd your-project
npm install
node .agency/scripts/init-project.js
node .agency/scripts/enforcer.js pre --agent lead-architect --task "setup-complete"
```

### Verify It Works

Run these commands from your project root:

```bash
# 1. Start a task session (replaces old preflight-gate)
node .agency/scripts/enforcer.js pre --agent lead-architect --task "verify-setup"
# → ✓ PRE phase: enforcement session created

# 2. Recover session context after VSCode restart
npm run recap
# → Shows agency state, active project, last session, recent commits

# 3. Store a test memory
node .agency/scripts/memory.js store --content "Setup verified" --tags "setup" --task "verify" --agent "lead-architect"
# → PASS: Memory stored

# 4. Recall it
node .agency/scripts/memory.js recall --query "setup" --limit 3
# → Returns your test memory entry

# 5. Run quality gate (will warn about diff size on first run — that's expected)
node .agency/scripts/quality-gate.js check --project .
# → Runs all 10 quality checks
```

---

## 🤖 For ZooCode Users

1. Install [ZooCode](https://zoo.dev) for your editor
2. Clone this repo or copy `.roomodes` to your project root
3. ZooCode reads `.roomodes` and activates all 31 agents
4. Start a task with the `🧠 Lead Architect` mode
5. The agent handles routing, gates, memory, and commits automatically

**Key File:** [`.roomodes`](.roomodes) — This is the ZooCode configuration file that defines all 31 agents. Drop it into any project to activate the agency.

---

## 👥 31 Agents

| Tier | Agent Slug | Role |
|------|-----------|------|
| **🧠 Orchestrator** | `lead-architect` | Plans sprints, creates contracts, routes tasks |
| **⚙️ Backend (4)** | `backend-lead`, `backend-api`, `backend-service`, `backend-integration` | API endpoints, business logic, integrations |
| **🌐 Frontend Web (4)** | `frontend-lead`, `frontend-ui`, `frontend-page`, `frontend-state` | UI components, pages, state management |
| **📱 Mobile (4)** | `mobile-lead`, `mobile-ui`, `mobile-screen`, `mobile-state` | React Native, offline-first, WatermelonDB |
| **🚀 DevOps (4)** | `devops-lead`, `devops-infra`, `devops-cicd`, `devops-db` | Docker, CI/CD, databases |
| **🔒 Quality (5)** | `compliance-guardian`, `security-auditor`, `performance-auditor`, `accessibility-auditor`, `qa-automator` | Rules, security, performance, a11y, testing |
| **📦 Support (4)** | `documentarian`, `design-keeper`, `release-manager`, `code-agent` | Docs, design system, releases, general code |
| **⚙️ Specialists (5)** | `backend-logic`, `backend-database`, `frontend-web`, `frontend-mobile`, `devops` | Domain-specific implementations |

---

## 🛡️ Quality Gates

| Gate | What It Checks | Severity |
|------|---------------|----------|
| **QG-C1** | Hallucination detector — fake APIs, hardcoded secrets, TODO markers | 🔴 BLOCK |
| **QG-C2** | Contract compliance — API calls match `.agency/contracts/` | 🟡 WARN |
| **QG-C3** | Diff size limiter — warns >500 lines, blocks >2000 | 🔴 BLOCK |
| **QG-C4** | Test gate — runs tests, warns if tests missing | 🔴 BLOCK |
| **QG-C5** | Plan-vs-implementation — compares planned files vs changed files | 🟡 WARN |
| **QG-C6** | TypeScript compile — `tsc --noEmit` must pass | 🔴 BLOCK |
| **QG-C7** | Dependency sanity — all imports must exist in package.json | 🔴 BLOCK |
| **QG-C8** | Design principles — 48px touch, fontSize 16, offline safety | 🟡 WARN |
| **QG-C9** | Compliance — 7 automated rule checks (Date(), HANDOFF, MEMORY, etc.) | 🔴 BLOCK |
| **PFG-G1–G7** | Pre-Flight Gate — oath enforcement, sentinel, telemetry | 🔴 BLOCK |
| **PTG-G1–G6** | Post-Task Gate — memory, cleanup, metadata, sentinel reset | 🔴 BLOCK |

---

## 📜 14 Foundational Principles

| # | Principle | Purpose |
|---|-----------|---------|
| 1 | **Verification** | Anti-hallucination + OWASP security checks |
| 2 | **Time-Travel** | No `new Date()` in financial logic — use DB timestamps |
| 3 | **Socratic** | Plan before code — list files, describe approach, state edge cases |
| 4 | **Grounding** | Hybrid memory recall + token-optimized file reading |
| 5 | **Swarm** | Domain boundaries — agents only edit files matching their regex |
| 6 | **Feature-Creep** | Zero scope additions — modify only what's planned |
| 7 | **Unit Test** | 95% services, 80% controllers, 100% utilities coverage |
| 8 | **Git Handshake** | Commit with HANDOFF/ARTIFACTS/CONTRACT/STATUS/MEMORY/SCOPE |
| 9 | **Token-Optimized** | Read is last resort — use rg/findstr/head first |
| 10 | **Hotfix** | Emergency fixes skip pipeline but must be retroactively tested |
| 11 | **Cost Awareness** | Estimate before starting, report after completing |
| 12 | **Memory** | All decisions stored in SQLite with cosine-similarity recall |
| 13 | **File Clutter Prevention** | No orphan files — delete or archive after task |
| 14 | **Project Isolation** | Each project has its own contracts, memory, and ORCHESTRATION.md |

---

## 📁 Project Structure

```
.agency/                  ← Core agency engine
├── contracts/            ← API contracts (OpenAPI-style JSON)
├── scripts/              ← 34+ automation scripts
│   ├── enforcer.js           ← 4-phase enforcement state machine (replaces PFG + PTG)
│   ├── recap.js              ← Session context recovery (npm run recap)
│   ├── task-closer.js        ← Lead Architect fallback for text-only agent responses
│   ├── quality-gate.js       ← Output quality checks (10 checks)
│   ├── memory.js             ← Semantic memory (SQLite + cosine similarity)
│   ├── telemetry.js          ← Event logging pipeline
│   ├── handoff.js            ← Git commit + metadata + push (blocks on failure)
│   ├── auto-assign.js        ← Agent routing by fileRegex
│   ├── compliance-check.js   ← 7 automated compliance rules
│   ├── contract-gen.js       ← Draft contracts from code
│   ├── retro-report.js       ← Sprint retrospective generator
│   ├── github.js             ← PR creation with changelog
│   └── ... (24 more)
├── enforcer/             ← Enforcement state (enforcer.db SQLite)
├── .agent-slug           ← Current agent slug (written by enforcer.js pre)
├── session-state.json    ← Last handoff snapshot (written by handoff.js)
├── plans/                ← Sprint plans
├── reports/              ← Generated reports
├── memory/               ← Store (SQLite + JSON)
├── telemetry/            ← Event logs
└── projects/             ← Per-project subdirectories

.roomodes                 ← ZooCode agent definitions (31 agents)
.husky/pre-commit         ← Oath enforcement (blocks commit if no PRE phase)
.husky/post-commit        ← Auto-docs + cost report + git push
ORCHESTRATION.md          ← Sprint tracking
AGENCY-RULES.md           ← Complete rules package (v5.1)
```

---

## 📦 Requirements

- **Node.js** 18+ (tested with v24)
- **ZooCode** extension for VS Code or compatible editor
- **Git** 2.x for commit hooks and auto-push
- **npm** for script dependencies
- **Operating System:** Windows (primary), Linux/macOS (compatible via Node.js)

---

## 🤝 Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for:
- Adding new agents (4 steps)
- Creating API contracts
- Writing E2E tests
- Agent modification rules

---

## 📄 License

MIT — See [LICENSE](LICENSE) file.

---

## ⭐ Support

- ⭐ Star this repo if you find it useful
- 🐛 [Report issues](https://github.com/Jpkoech30/zoocode-agency/issues)
- 💬 [Start a discussion](https://github.com/Jpkoech30/zoocode-agency/discussions)
- 🔄 [Fork and adapt](https://github.com/Jpkoech30/zoocode-agency/fork) for your own agency
