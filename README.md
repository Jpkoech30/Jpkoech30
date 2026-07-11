# 🏢 ZooCode Agency — Multi-Agent Orchestration Framework

> **Version:** 5.1 | **Target:** [ZooCode](https://zoocode.ai) + DeepSeek Flash | **Currency:** KES

**ZooCode Agency** is a production-grade, multi-agent orchestration framework designed for [ZooCode](https://zoocode.ai) users. It transforms a single AI coding assistant into a coordinated team of **31 specialized agents** with domain boundaries, formal handoff protocols, automated quality gates, and semantic memory.

Instead of one agent doing everything (and doing it poorly at scale), the ZooCode Agency routes each task to the right specialist — backend API builders, frontend UI craftspeople, mobile screen composers, security auditors, and more — all coordinated by a Lead Architect.

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| **31 Specialised Agents** | Lead → Domain Lead → Specialist → Quality/Support, each with strict `fileRegex` domain boundaries |
| **14 Foundational Principals** | Enforceable rules covering security, quality, cost, discipline, and project isolation |
| **API Contract System** | Versioned, typed API definitions in `.agency/contracts/` — single source of truth for all endpoints |
| **Formal Handoff Protocol** | Commit-body-based agent-to-agent task routing with `HANDOFF` metadata |
| **Pre-Flight Gate (PFG)** | Mandatory oath + sentinel file that prevents agents from working without reciting their task context |
| **Post-Task Gate (PTG)** | Automated checkpoint system (memory, cleanup, metadata, sentinel) that validates task completion before handoff |
| **Quality Gate (QG)** | 7 automated checks: hallucination detection, contract compliance, diff size, test gate, plan-vs-implementation, TypeScript compile, dependency sanity |
| **Semantic Memory** | Vector RAG (sqlite-vec) that prevents repeated mistakes — recalls relevant decisions before every task |
| **Telemetry & Cost Tracking** | Per-task event logging and KES-based cost reporting |
| **Auto-Documentation** | Generates docs from API contracts and Git log automatically |
| **Project Isolation** | Multi-project support via `.agency/projects.json` — agents only modify files within their project's scope |
| **Human-in-the-Loop (HITL)** | Telegram-based approval workflow for gate failures |
| **Model Routing** | DeepSeek Flash by default, auto-escalates to DeepSeek Pro on failure |

---

## 🏗️ Architecture Overview

### The 6-Stage Pipeline

```
RECALL → PLAN → CONTRACT → IMPLEMENT → REVIEW → DEPLOY
  │        │        │           │           │         │
  │        │        │           │           │         └── 📦 Release Manager
  │        │        │           │           └── Quality Gates (6 stages)
  │        │        │           └── Specialist Agent (HANDOFF-assigned)
  │        │        └── API Contract (.agency/contracts/<feature>.json)
  │        └── 🧠 Lead Architect (plan, route, track)
  └── Semantic Memory recall (memory.js)
```

### Agent Hierarchy (4 Tiers)

```
                    ┌──────────────────────────┐
                    │  🧠 Lead Architect        │
                    │  (Recall → Plan → Contract│
                    │   → Route → Track)        │
                    └────────────┬─────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
    ┌─────────────────┐ ┌──────────────┐ ┌──────────────────┐
    │  ⚙️ Backend Lead │ │ 🌐 Frontend  │ │  📱 Mobile Lead  │
    │                 │ │   Web Lead   │ │                  │
    └────────┬────────┘ └──────┬───────┘ └────────┬─────────┘
             │                 │                   │
       ┌─────┼─────┐     ┌────┼────┐        ┌────┼─────┐
       ▼     ▼     ▼     ▼    ▼    ▼        ▼    ▼     ▼
    ┌───┐ ┌───┐ ┌───┐ ┌──┐ ┌──┐ ┌──┐  ┌──┐ ┌──┐ ┌───┐
    │API│ │Svc│ │Int│ │UI│ │Pg│ │St│  │UI│ │Sc│ │St │
    └───┘ └───┘ └───┘ └──┘ └──┘ └──┘  └──┘ └──┘ └───┘
             │                                │
             ▼                                ▼
    ┌────────────────┐              ┌─────────────────┐
    │ 🗄️ Database   │              │  🚀 DevOps Lead │
    └────────────────┘              └────────┬─────────┘
                                             │
                                      ┌──────┼──────┐
                                      ▼      ▼      ▼
                                   ┌───┐  ┌───┐  ┌──┐
                                   │Inf│  │CD │  │DB│
                                   └───┘  └───┘  └──┘

    Quality Gates (post-implementation):
       🔒 Security → ⚡ Performance → ♿ Accessibility
       → 🧪 QA Automator → 🛡️ Compliance Guardian → 📦 Release Manager
```

### The 31 Agents

| Tier | Agents |
|------|--------|
| **🧠 Orchestration** (3) | Lead Architect, Documentarian, Compliance Guardian |
| **⚙️ Domain Leads** (4) | Backend Lead, Frontend Web Lead, Mobile Lead, DevOps Lead |
| **🔧 Specialists** (17) | Backend API/Service/Integration/Logic/Database · Frontend UI/Page/State · Mobile UI/Screen/State · DevOps Infra/CI-CD/DB Admin |
| **✅ Quality & Support** (7) | QA Automator, Security Auditor, Performance Auditor, Accessibility Auditor, Design Keeper, Release Manager, Fixer |

---

## 🚦 Quality Gates

| # | Gate | Trigger | Blocking? |
|---|------|---------|-----------|
| 1 | 🔒 Security & Verification | Implementation complete | **YES** — blocks on hallucinations, secrets, OWASP violations |
| 2 | ♿ Accessibility | Frontend implementation | **HIGH** — WCAG 2.1 AA, 48px touch targets |
| 3 | ⚡ Performance | Frontend implementation | **Regression** — Lighthouse ≥90, LCP < 2.5s |
| 4 | 🧪 Unit Tests | Implementation complete | **On test failure** — coverage targets enforced |
| 5 | ⚠️ Error Handling | All code | **Any failure** — ErrorBoundary everywhere |
| 6 | 🛡️ Compliance | All gates passed | **Any violation** — all 14 principals satisfied |

---

## 📋 Requirements

- **Node.js** 18+
- **ZooCode** installed ([zoocode.ai](https://zoocode.ai))
- **Git** 2.30+
- **npm** 9+

---

## ⚡ Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-org/zoocode-agency.git
cd zoocode-agency

# 2. Install dependencies
npm install

# 3. Initialize a new project
node .agency/scripts/init-project.js --name my-project

# 4. Run the pre-flight gate
node .agency/scripts/preflight-gate.js pass --agent lead-architect --task "setup"

# 5. Start adding tasks to ORCHESTRATION.md
```

> See [`SETUP.md`](SETUP.md) for detailed setup instructions, or [`QUICKSTART.md`](QUICKSTART.md) if you're an existing ZooCode user adding the agency to an existing project.

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [`SETUP.md`](SETUP.md) | Step-by-step setup for a new project |
| [`QUICKSTART.md`](QUICKSTART.md) | For existing ZooCode users adding the agency |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | How to extend the agency (new agents, contracts, tests) |
| [`AGENCY.md`](AGENCY.md) | Comprehensive agency profile for LLM evaluation |
| [`FLOW-DOC.md`](FLOW-DOC.md) | Pipeline stages, feature types, and handoff graph |
| [`.agency/AGENCY-RULES.md`](.agency/AGENCY-RULES.md) | Single source of truth — all 14 principals and rules |
| [`COMPLIANCE-CHECKLISTS.md`](COMPLIANCE-CHECKLISTS.md) | Platform-specific compliance checklists |
| [`ORCHESTRATION.md`](ORCHESTRATION.md) | Task tracking and sprint management |

---

## 🧠 How the 14 Principals Work

The agency is governed by **14 Foundational Principals** — enforceable rules, not guidelines:

| # | Principal | What It Does |
|---|-----------|-------------|
| 1 | **VERIFICATION** | Anti-hallucination + OWASP security checks |
| 2 | **TIME-TRAVEL** | No `new Date()` in financial/business logic — use DB timestamps |
| 3 | **SOCRATIC** | Plan before code — list files, approach, edge cases |
| 4 | **GROUNDING** | Read context first (memory recall → partial read → full read) |
| 5 | **SWARM** | Never touch files outside your `fileRegex` domain |
| 6 | **FEATURE-CREEP** | Zero scope additions — modify only what's specified |
| 7 | **UNIT TEST** | Coverage: Services 95%, Controllers/UI 80%, Utils 100% |
| 8 | **GIT HANDSHAKE** | Conventional commits + `HANDOFF` metadata in commit body |
| 9 | **TOKEN-OPTIMIZED RETRIEVAL** | Use `rg`/`head` before Read tool (0-token tools first) |
| 10 | **HOTFIX EXCEPTION** | Critical fixes skip full pipeline, require follow-up within 24h |
| 11 | **COST AWARENESS** | Pre-task cost estimate, KES-based tracking |
| 13 | **FILE CLUTTER PREVENTION** | One-location rule, clean up temps, no orphan files |
| 14 | **PROJECT ISOLATION** | Multi-project support — agents scoped to one project |

---

## 💰 Cost Model

The agency uses **DeepSeek Flash** by default (KSh 19/1M input, KSh 38/1M output). Target: <500 tokens per task.

| Model | Input/1M | Output/1M | 1M Input (KES) | 1M Output (KES) |
|-------|----------|-----------|----------------|-----------------|
| **DeepSeek Flash** | $0.14 | $0.28 | KSh 19 | KSh 38 |
| **DeepSeek Pro** | $2.00 | $8.00 | KSh 270 | KSh 1,080 |
| (Ref) Claude Opus | $30.00 | $150.00 | KSh 4,050 | KSh 20,250 |

---

## 🤝 Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for details on:
- Adding new agents
- Creating new contracts
- Running the test suite
- Code of conduct

---

## 📄 License

This project is open source. See the LICENSE file for details.

---

## 🙏 Acknowledgements

Built for [ZooCode](https://zoocode.ai) — the AI coding assistant for modern development teams.
