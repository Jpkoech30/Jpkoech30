# ZooCode Agency — Complete Setup

> **Version:** 1.0  
> **Date:** 2026-07-10  
> **Purpose:** Complete reference for the ZooCode Agency — a reusable multi-agent orchestration system for any project.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Directory Structure](#2-directory-structure)
3. [Agents (31)](#3-agents-31)
4. [Scripts (14)](#4-scripts-14)
5. [npm Scripts](#5-npm-scripts)
6. [Configuration Files](#6-configuration-files)
7. [Project Management](#7-project-management)
8. [Workflows](#8-workflows)
9. [Quality Gates](#9-quality-gates)
10. [Quick Reference](#10-quick-reference)

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                  ZOOCODE AGENCY                       │
│            (c:/Users/user/jengaprojects/)              │
│                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  AGENCY      │  │  SCRIPTS     │  │  CONTRACTS  │ │
│  │  RULES.md    │  │  (14 tools)  │  │  (25 APIs)  │ │
│  └─────────────┘  └──────────────┘  └─────────────┘ │
│                                                       │
│  ┌──────────────────────────────────────────────────┐ │
│  │              REGISTERED PROJECTS                  │ │
│  │  ├── zoocode-agency (self)                        │ │
│  │  └── jengabooks                                   │ │
│  └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure

```
c:/Users/user/jengaprojects/
│
├── 📄 .roomodes                     # 31 agent configurations
├── 📄 package.json                  # 15 agency npm scripts
├── 📄 ORCHESTRATION.md              # Sprint tracking (9 sprints)
├── 📄 ZOOCODE-AGENCY-SETUP.md      # This file
│
├── 📄 AGENCY-RULES.md              # 15 principals, 17 sections
├── 📄 FLOW-DOC.md                  # Pipeline, handoff graph
├── 📄 COMPLIANCE-CHECKLISTS.md     # 11 checklists
├── 📄 AGENT-FLOW.md                # Agent workflow reference
├── 📄 CHANGELOG.md                 # Change log
├── 📄 COST-LEDGER.md               # Token cost tracking
│
├── 📂 .agency/
│   ├── 📄 AGENCY-RULES.md          # Main rulebook (v5.0)
│   ├── 📄 BACKEND-STRATEGY.md      # Backend layer guide
│   ├── 📄 FRONTEND-STRATEGY.md     # Frontend layer guide
│   ├── 📄 config.json              # Agency configuration
│   ├── 📄 projects.json            # Project registry
│   ├── 📄 .active-project          # Currently active project
│   ├── 📄 roomodes-formats.md      # ZooCode + Roo Code docs
│   │
│   ├── 📂 scripts/                 # 14 automation scripts
│   ├── 📂 contracts/               # 25 API contracts
│   ├── 📂 plans/                   # Planning documents
│   ├── 📂 reports/                 # Cost reports
│   ├── 📂 sessions/                # Terminal session data
│   ├── 📂 templates/               # Templates
│   ├── 📂 notes/                   # Temporary notes
│   └── 📂 temp/                    # Cleanup temp location
│
├── 📂 .vscode/
│   ├── 📄 settings.json            # Tab discipline (max 3)
│   └── 📄 extensions.json          # 10 extensions
│
├── 📂 .zoo/
│   └── 📄 config.json              # DeepSeek Flash config
│
├── 📂 .github/workflows/
│   └── 📄 ci.yml                   # Lint → Test → Build pipeline
│
└── 📂 jengabooks/                  # Consumer project
    └── 📄 package.json             # Project-specific scripts only
```

---

## 3. Agents (31)

### Architecture Agents
| Slug | Name | Domain |
|------|------|--------|
| `lead-architect` | 🧠 Lead Architect & Orchestrator | `.md\|json\|yaml\|prisma\|sql` |
| `backend-lead` | ⚙️ Backend Lead | `.md\|json` |
| `frontend-lead` | 🌐 Frontend Web Lead | `.md\|json` |
| `mobile-lead` | 📱 Mobile Lead | `.md\|json` |
| `devops-lead` | 🚀 DevOps Lead | `.md\|json` |

### Implementation Agents
| Slug | Name | Domain |
|------|------|--------|
| `code-agent` | 🔧 Code Agent | `.tsx?\|jsx?\|css\|json` |
| `backend-api` | ⚙️ Backend API | `apps/api/src/` (not prisma) |
| `backend-service` | ⚙️ Backend Service | `apps/api/src/` (not prisma) |
| `backend-integration` | ⚙️ Backend Integration | `apps/api/src/` (not prisma) |
| `backend-logic` | ⚙️ Backend Logic | `apps/api/src/` + `packages/shared` |
| `backend-database` | 🗄️ Backend Database | `prisma/`, `*.sql` |
| `frontend-ui` | 🌐 Frontend UI | `apps/web/src/components/` |
| `frontend-page` | 🌐 Frontend Page | `apps/web/src/pages/` |
| `frontend-state` | 🌐 Frontend State | `stores/\|hooks/\|lib/` |
| `frontend-web` | 🌐 Frontend Web | `apps/web/src/\|packages/shared` |
| `frontend-mobile` | 📱 Frontend Mobile | `apps/mobile/src/\|packages/shared` |
| `mobile-ui` | 📱 Mobile UI | `apps/mobile/src/components/` |
| `mobile-screen` | 📱 Mobile Screen | `apps/mobile/src/app/` |
| `mobile-state` | 📱 Mobile State | `stores/\|hooks/\|lib/` |

### Infrastructure Agents
| Slug | Name | Domain |
|------|------|--------|
| `devops-infra` | 🚀 DevOps Infra | `docker-compose\|Dockerfile\|scripts/deploy` |
| `devops-cicd` | 🚀 DevOps CI/CD | `.github/\|scripts/ci` |
| `devops-db` | 🚀 DevOps Database | `prisma/\|scripts/db\|*.sql` |
| `devops` | 🚀 DevOps | `scripts/\|docker-compose\|.github/` |

### Quality Agents
| Slug | Name | Domain |
|------|------|--------|
| `qa-automator` | 🧪 QA Automator | `e2e/\|tests/playwright/*.spec.*` |
| `compliance-guardian` | 🛡️ Compliance Guardian | `.md` (audit reports) |
| `security-auditor` | 🔒 Security Auditor | `.md\|.yaml` |
| `performance-auditor` | ⚡ Performance Auditor | `.md\|.js` |
| `accessibility-auditor` | ♿ Accessibility Auditor | `.md\|.js` |

### Support Agents
| Slug | Name | Domain |
|------|------|--------|
| `documentarian` | 📝 Agency Documentarian | `.md` |
| `release-manager` | 📦 Release Manager | `package.json\|CHANGELOG.md\|release workflows` |
| `design-keeper` | 🎨 Design System Keeper | `theme.ts\|*.stories.*` |

---

## 4. Scripts (14)

All scripts are in `.agency/scripts/` — pure Node.js, cross-platform.

### Validation & Compliance
| Script | Usage | Purpose |
|--------|-------|---------|
| `validate-commit.js` | `node .agency/scripts/validate-commit.js` | Checks conventional commit format + HANDOFF metadata |
| `validate-handoff.js` | `node .agency/scripts/validate-handoff.js` | Validates all 4 HANDOFF fields |
| `clean-temp.js` | `node .agency/scripts/clean-temp.js` | Scans root for orphan files |
| `cleanup.js` | `node .agency/scripts/cleanup.js [--dry-run]` | §16 file cleanup |

### Project Lifecycle
| Script | Usage | Purpose |
|--------|-------|---------|
| `init-project.js` | `node .agency/scripts/init-project.js [--force]` | Bootstrap new project structure |
| `cleanup-test-db.js` | `node .agency/scripts/cleanup-test-db.js` | Truncate all test DB tables |

### Cost Tracking
| Script | Usage | Purpose |
|--------|-------|---------|
| `cost-report.js` | `node .agency/scripts/cost-report.js --sprint <name>` | Generate cost report in `.agency/reports/` |
| `cost-track.js` | `node .agency/scripts/cost-track.js --task <id> --tokens <in>/<out> --agent <slug>` | Append cost to COST-LEDGER.md |

### Developer Tools
| Script | Usage | Purpose |
|--------|-------|---------|
| `handoff.js` | `node .agency/scripts/handoff.js --from <a> --to <a> --task <id>` | Generate formatted commit body |
| `status.js` | `node .agency/scripts/status.js --task <id> --status <s>` | Look up task status in ORCHESTRATION.md |
| `terminal-session.js` | `node .agency/scripts/terminal-session.js @command [args]` | 9 @commands + session manager |
| `projects-manager.js` | `node .agency/scripts/projects-manager.js <cmd> [args]` | Register/switch/list/remove projects |

### Notifications
| Script | Usage | Purpose |
|--------|-------|---------|
| `notify-telegram.js` | `node .agency/scripts/notify-telegram.js --message <text>` | Send Telegram notification |
| `client-bot.js` | `node .agency/scripts/client-bot.js --standup` | Generate client standup summary |

### terminal-session.js @Commands

| Command | Example | Purpose |
|---------|---------|---------|
| `@search` | `@search "Prisma"` | Recursive regex search |
| `@find` | `@find "*.service.ts"` | Locate files by name/glob |
| `@extract` | `@extract file.ts 10:30` | Read line range |
| `@history` | `@history [agent]` | Show command history |
| `@cost` | `@cost [task-id]` | Token cost report |
| `@stats` | `@stats [agent]` | Agent productivity stats |
| `@switch` | `@switch jengabooks` | Switch project + open VS Code |
| `@help` | `@help` | List all commands |

---

## 5. npm Scripts

All available in root `package.json`:

```bash
# Project Management
npm run project:register -- <name> <path> [desc]
npm run project:switch -- <name>
npm run project:list

# Agency Lifecycle
npm run agency:init [-- --force]
npm run agency:clean
npm run agency:report -- --sprint <name>

# Agent Tools
npm run agent:handoff -- --from <a> --to <a> --task <id>
npm run agent:status -- --task <id> --status <s>
npm run agent:cost -- --task <id> --tokens <in>/<out> --agent <slug>

# Terminal Helper
npm run terminal -- @command [args]
npm run terminal:cost
npm run terminal:stats

# Notifications
npm run telegram:test

# Cleanup
npm run clean:temp
```

---

## 6. Configuration Files

### `.roomodes` — Agent Config (ZooCode Format)
- 31 agents with `slug`, `name`, `roleDefinition`, `groups` (with `fileRegex`), `apiConfiguration`, `customInstructions`
- All agents use `deepseek-v4-flash` model
- File regex restricts each agent to its domain

### `.zoo/config.json` — DeepSeek Flash Settings
```json
{
  "model": "deepseek-flash",
  "max_context_tokens": 16384,
  "max_iterations": 6,
  "temperature": 0.1,
  "tool_call_parallelism": true,
  "on_fail": { "retry": 2, "escalate_to": "deepseek-pro" }
}
```

### `.vscode/settings.json` — Tab Discipline
- Max 3 editor tabs
- Preview mode enabled
- Close empty groups
- Format on save

### `.vscode/extensions.json` — 10 Extensions
GitLens, Prettier, ESLint, Tailwind CSS IntelliSense, Prisma, Auto Rename Tag, Path IntelliSense, Code Spell Checker, Conventional Commits, Nx Console

---

## 7. Project Management

### Register a Project
```bash
npm run project:register -- my-app ../my-app "Description"
```

### List Projects
```bash
npm run project:list
```

### Switch Project
```bash
npm run project:switch -- my-app
# → Updates .active-project
# → Opens new VS Code window at project path
```

### Current Registry
| Project | Path | Description |
|---------|------|-------------|
| ▶ zoocode-agency (active) | `.` | The agency itself |
| jengabooks | `jengabooks/` | Consumer project |

### Project Bootstrap (New Project)
```bash
npm run agency:init -- --force
# Creates: .roomodes, .agency/, ORCHESTRATION.md, .env.template
# Installs: husky, lint-staged, cross-env
```

---

## 8. Workflows

### Daily Agent Workflow
```
1. Read PROJECT.md + ORCHESTRATION.md
2. Use @search/@find (0 tokens) before reading files
3. Read max 1 file at a time
4. Write code + tests
5. Run: npm run agent:cost -- --task <id> --tokens <in>/<out>
6. Commit with HANDOFF:next-agent
7. Run: npm run project:switch -- <next-project> (if needed)
```

### Handoff Flow
```
1. Agent completes task
2. Runs: npm run agent:handoff -- --from <a> --to <b> --task <id>
3. Copies generated commit body
4. Commits: git commit -m "feat(scope): description" -m "HANDOFF:b..."
5. Updates ORCHESTRATION.md status
```

### Quality Gate Flow
```
Implementation → Security Audit → Performance → Accessibility
  → QA Tests → Compliance Check → Release Manager
```

---

## 9. Quality Gates

| Gate | Trigger | Blocking? | Pass Criteria |
|------|---------|-----------|---------------|
| Security & Verification | Implementation complete | Yes | No hallucinations, no OWASP violations |
| Accessibility | Frontend implementation | HIGH | WCAG 2.1 AA, 48px touch targets |
| Performance | Frontend implementation | Regression | Lighthouse ≥90, LCP <2.5s |
| Unit Tests | Implementation complete | Test fail | Services 95%, Controllers 80%, Utils 100% |
| Error Handling | All code | Any | All errors caught, user-friendly messages |
| Compliance | All gates passed | Any | All 15 principals satisfied |

---

## 10. Quick Reference

### Most Used Commands
```bash
# Switch to jengabooks project
npm run project:switch -- jengabooks

# List all projects
npm run project:list

# Search for code
npm run terminal -- @search "functionName"

# Generate handoff commit body
npm run agent:handoff -- --from lead-architect --to code-agent --task 8.1

# Track costs
npm run agent:cost -- --task 8.1 --tokens 5000/1000 --agent code-agent

# Generate sprint report
npm run agency:report -- --sprint latest

# Check for orphan files
npm run clean:temp
```

### Key Files
| File | Purpose |
|------|---------|
| `.agency/AGENCY-RULES.md` | Main rulebook (ALL agents must read this) |
| `ORCHESTRATION.md` | Task tracking and sprint status |
| `.agency/projects.json` | Project registry |
| `.agency/.active-project` | Currently active project |
| `.roomodes` | Agent configuration (31 agents) |
| `package.json` | 15 agency npm scripts |
