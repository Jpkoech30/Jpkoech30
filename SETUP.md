# 📦 ZooCode Agency — Project Setup Guide

> **Use this guide** when starting a **new project** with the ZooCode Agency from scratch.

---

## Prerequisites

- **Node.js** 18+ (`node --version`)
- **npm** 9+ (`npm --version`)
- **Git** 2.30+ (`git --version`)
- **ZooCode** installed ([zoocode.ai](https://zoocode.ai))

---

## Step 1: Clone the Agency Repository

```bash
git clone https://github.com/your-org/zoocode-agency.git my-project
cd my-project
```

---

## Step 2: Install Dependencies

```bash
npm install
```

This installs:
- **Husky** — Git hooks manager (pre-commit, commit-msg)
- **lint-staged** — Lint runner on staged files
- All agency dependencies

---

## Step 3: (ZooCode Only) Load `.roomodes`

If using ZooCode, load the custom mode configuration:

1. Open ZooCode settings
2. Click **"Import Custom Modes"**
3. Select the `.roomodes` file in your project root
4. Verify 31 agents appear in the mode list

> **For Roo Code users:** The `.roomodes` format is compatible with Roo Code as well. See [`.agency/roomodes-formats.md`](.agency/roomodes-formats.md) for format details.

---

## Step 4: Initialize Your Project

```bash
node .agency/scripts/init-project.js --name my-project
```

This creates:
- [`README.md`](README.md) — Project readme (customise as needed)
- Basic project structure

---

## Step 5: Run the Pre-Flight Gate

Every task starts with the pre-flight gate. Run it once to verify the setup:

```bash
node .agency/scripts/preflight-gate.js pass --agent lead-architect --task "setup"
```

Expected output:
```
✓ Pre-flight passed for agent "lead-architect"
```

---

## Step 6: Configure Your Project

### Register your project

```bash
npm run project:register
```

This adds your project to [`.agency/projects.json`](.agency/projects.json).

### (Optional) Set up API contracts

If your project uses APIs, create contracts in `.agency/contracts/`:

```bash
cp .agency/contracts/TEMPLATE.api.json .agency/contracts/my-feature.json
```

Edit the template with your endpoints.

---

## Step 7: Start Working

1. Open [`ORCHESTRATION.md`](ORCHESTRATION.md) and add your first task:

```markdown
### Sprint 1 — My First Feature
| # | Task | Type | Agent | Est. | Status |
|---|------|------|-------|------|--------|
| **1.1** | Set up project infrastructure | config | 🧠 Lead Architect | 0.5d | `PENDING` |
```

2. Assign the task via a commit with `HANDOFF` metadata:

```bash
git add .
git commit -m "feat(project): initialize project scaffold

HANDOFF:lead-architect
PROJECT:my-project
STATUS:IN_PROGRESS
SCOPE:project"
```

3. The assigned agent reads the task and starts working.

---

## 📁 What Was Created

After setup, your project will have:

```
my-project/
├── .agency/                       ← Agency engine
│   ├── AGENCY-RULES.md            ← All rules (v5.0+)
│   ├── config.json                ← Agency configuration
│   ├── projects.json              ← Project registry
│   ├── contracts/                 ← API contracts
│   ├── scripts/                   ← Agency scripts (33 files)
│   ├── memory/                    ← Semantic memory
│   ├── plans/                     ← Planning documents
│   ├── notes/                     ← Temporary notes
│   └── reports/                   ← Generated reports
├── .roomodes                      ← 31 agent definitions
├── .husky/                        ← Git hooks
├── .zoo/                          ← ZooCode configuration
├── .github/                       ← CI/CD workflows
├── ORCHESTRATION.md               ← Task tracking
├── README.md                      ← Project readme
├── package.json                   ← npm scripts
└── .gitignore
```

---

## 🧪 Verify Everything Works

Run these checks:

```bash
# 1. Verify pre-flight gate
node .agency/scripts/preflight-gate.js status

# 2. Check agent status
npm run agent:status

# 3. Run cost report
npm run agency:report

# 4. Verify Husky hooks
npm run prepare
```

---

## ❓ Troubleshooting

| Problem | Solution |
|---------|----------|
| `preflight-gate.js` not found | Ensure you're in the project root directory |
| `.roomodes` not loading in ZooCode | Restart ZooCode after importing |
| Husky hooks not running | Run `npm run prepare` to install hooks |
| Agent can't edit files | Check the agent's `groups.fileRegex` in `.roomodes` — it restricts which file patterns the agent can modify |
| Pre-flight gate blocks everything | Run `node .agency/scripts/preflight-gate.js reset` then re-pass with the correct agent slug |

---

> **Next:** See [`QUICKSTART.md`](QUICKSTART.md) if you're adding the agency to an **existing** ZooCode project.
