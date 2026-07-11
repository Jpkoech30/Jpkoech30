# ⚡ ZooCode Agency — Quickstart for Existing Projects

> **Use this guide** if you already have a ZooCode project and want to add the ZooCode Agency to it.

---

## What You'll Get

- **31 specialised AI agents** with domain boundaries
- **14 Foundational Principals** — enforceable rules
- **Pre-Flight Gate** — mandatory oath before any work
- **Post-Task Gate** — automated validation after task completion
- **Quality Gate** — 7 checks (hallucination, contract compliance, etc.)
- **Semantic Memory** — vector RAG that remembers decisions
- **Telemetry & Cost Tracking** — per-task KES-based logging
- **Handoff Protocol** — structured agent-to-agent routing

---

## Step 1: Copy `.agency/` to Your Project Root

```bash
# From the agency repository
cp -r .agency/ /path/to/your-project/.agency/
```

Or if you're cloning fresh:

```bash
git clone https://github.com/your-org/zoocode-agency.git temp-agency
cp -r temp-agency/.agency/ /path/to/your-project/.agency/
rm -rf temp-agency
```

---

## Step 2: Copy `.roomodes` to Your Project Root

The `.roomodes` file defines all 31 agents with their domain boundaries.

```bash
cp .roomodes /path/to/your-project/.roomodes
```

Then in ZooCode:
1. Open ZooCode settings
2. Click **"Import Custom Modes"**
3. Select the `.roomodes` file
4. Verify all 31 agents appear

---

## Step 3: Copy Husky Hooks

```bash
cp -r .husky/ /path/to/your-project/.husky/
```

This installs:
- **pre-commit** — Runs secret scan + lint-staged
- **commit-msg** — Validates conventional commit format
- **post-commit** — Triggers telemetry logging

---

## Step 4: Install Dependencies

```bash
cd /path/to/your-project
npm install husky lint-staged
```

If your project doesn't have a `package.json`, create one:

```bash
npm init -y
npm install husky lint-staged
```

---

## Step 5: Add npm Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "agency": "node .agency/agency.js",
    "agency:init": "node .agency/scripts/init-project.js",
    "agency:clean": "node .agency/scripts/clean-temp.js",
    "agency:report": "node .agency/scripts/cost-report.js",
    "agent:handoff": "node .agency/scripts/handoff.js",
    "agent:status": "node .agency/scripts/status.js",
    "agent:cost": "node .agency/scripts/cost-track.js",
    "docs:sync": "node .agency/scripts/auto-docs.js --sync",
    "clean:temp": "node .agency/scripts/clean-temp.js",
    "prepare": "husky"
  }
}
```

---

## Step 6: Initialize the Agency

```bash
node .agency/scripts/init-project.js
```

This sets up:
- Project registration in `.agency/projects.json`
- Directory structure (memory, plans, notes)
- Initial configuration

---

## Step 7: Verify Setup

```bash
# Run the pre-flight gate
node .agency/scripts/preflight-gate.js pass --agent lead-architect --task "quickstart"

# Check agent status
npm run agent:status

# Verify Husky
npm run prepare

# Test auto-docs
npm run docs:sync
```

---

## Your First Agency Task

1. Open [`ORCHESTRATION.md`](ORCHESTRATION.md) and add:

```markdown
### Sprint 1 — Agency Onboarding
| # | Task | Type | Agent | Status |
|---|------|------|-------|--------|
| **1.1** | Audit existing codebase for contract compliance | audit | 🛡️ Compliance Guardian | `PENDING` |
```

2. Store context in memory:

```bash
node .agency/scripts/memory.js store \
  --content "Added ZooCode Agency to existing project" \
  --tags "onboarding, agency-setup" \
  --task "quickstart" \
  --agent lead-architect
```

3. Assign the task via commit:

```bash
git add .
git commit -m "feat(agency): add ZooCode Agency orchestration framework

HANDOFF:compliance-guardian
PROJECT:your-project
ARTIFACTS:.roomodes,.husky/,package.json
STATUS:IN_PROGRESS
MEMORY:stored
SCOPE:project"
```

---

## 📋 What Was Added to Your Project

```
your-project/
├── .agency/                       ← Full agency engine
│   ├── AGENCY-RULES.md            ↑
│   ├── config.json                │
│   ├── projects.json              │
│   ├── contracts/                 │
│   ├── scripts/                   │  (all copied)
│   ├── memory/                    │
│   ├── plans/                     │
│   ├── notes/                     │
│   └── reports/                   ↓
├── .roomodes                      ← 31 agent definitions (NEW)
├── .husky/                        ← Git hooks (NEW)
├── ORCHESTRATION.md               ← Task tracking (NEW)
└── package.json                   ← Updated with agency scripts
```

---

## ⚠️ Important Notes

- **The `.agency/` directory is the engine** — do not modify scripts unless you understand the full handoff protocol
- **Agent domains** are enforced by `fileRegex` in `.roomodes` — agents can only edit files matching their pattern
- **All costs are in KES** (Kenyan Shillings) — DeepSeek Flash: KSh 19/1M input, KSh 38/1M output
- **Pre-flight gate is mandatory** — every agent must recite the oath before any work
- **Post-task gate validates completion** — memory stored, temp files cleaned, commit metadata present

---

> **Next:** See [`SETUP.md`](SETUP.md) if you're starting a **new** project from scratch.
