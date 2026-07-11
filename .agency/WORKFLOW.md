# 🏭 Jenga Agency — Factory Workflow

> **How the factory manages projects**

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     JENGA FACTORY                            │
│  github.com/Jpkoech30/jenga-agency                          │
│                                                             │
│  Rules       → .agency/AGENCY-RULES.md                      │
│  Agents      → .roomodes (31 agents)                        │
│  Scripts     → .agency/scripts/ (14 tools)                  │
│  Contracts   → .agency/contracts/ (global)                  │
│  Pipeline    → .github/workflows/ (CI/CD)                   │
│  Memory      → .agency/memory/ (semantic RAG)               │
│  Costing     → COST-LEDGER.md                               │
└──────────────────────┬──────────────────────────────────────┘
                       │ manages via HANDOFF protocol
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  MANAGED PROJECT                             │
│  github.com/Jpkoech30/jengabooks  (separate repo)           │
│                                                             │
│  Code         → apps/api, apps/web, apps/mobile             │
│  Schema       → prisma/schema.prisma                        │
│  Config       → package.json, tsconfig.json                 │
│  Contracts    → .agency/projects/jengabooks/contracts/      │
│  Memory       → .agency/projects/jengabooks/memory/         │
│  Tracking     → .agency/projects/jengabooks/ORCHESTRATION.md│
└─────────────────────────────────────────────────────────────┘
```

---

## How the Factory Works

### 1. Factory runs at root (`c:/Users/user/jengaprojects/`)

The factory IS the ZooCode workspace. All agency tools, agents, and rules live here.

### 2. Managed projects live in `projects/`

```
projects/
├── jengabooks/     ← JengaBooks (its own GitHub repo)
└── ...             ← Future projects (each their own repo)
```

The `projects/` directory is **gitignored** in the factory repo. Each project has its own git repo.

### 3. Project-scoped agency data

```
.agency/projects/jengabooks/
├── contracts/     ← API contracts specific to JengaBooks
├── memory/        ← Semantic memory scoped to JengaBooks
├── plans/         ← Planning docs for JengaBooks
└── ORCHESTRATION.md  ← Sprint tracking for JengaBooks
```

---

## Typical Workflow

### Starting work on a project

```bash
# 1. Lead Architect recalls project memory
node .agency/scripts/memory.js recall --query "invoice feature" --project jengabooks

# 2. Lead Architect plans in project's ORCHESTRATION.md
#    (reads projects.json to find the right tracking file)

# 3. HANDOFF includes PROJECT field
#    HANDOFF:backend-api
#    PROJECT:jengabooks

# 4. Specialist agent's fileRegex matches projects/jengabooks/ paths
#    (agents can only edit files within their assigned project)
```

### Adding a new project

```bash
# 1. Create project directory
mkdir projects/my-new-app

# 2. Initialize its own git repo
cd projects/my-new-app
git init
git add -A
git commit -m "initial commit"
# (later: create GitHub repo and push)

# 3. Register with factory
cd ../..
node .agency/scripts/projects-manager.js register my-new-app projects/my-new-app

# 4. Create project-scoped agency directory
mkdir .agency/projects/my-new-app/{contracts,memory,plans,notes}
```

---

## File Access Rules

| Agent Type | Can edit | Example path |
|------------|----------|-------------|
| Factory agents (lead-architect, compliance, etc.) | `.md`, `.json`, `.yaml`, `.prisma`, `.sql` | `.agency/AGENCY-RULES.md` |
| Project agents (backend-api, frontend-ui, etc.) | `projects/jengabooks/apps/...` | `projects/jengabooks/apps/api/src/...` |
| DevOps agents | `scripts/`, `.github/`, `docker-compose` | `.github/workflows/ci.yml` |

---

## Repo Boundaries

| Repo | Contains | URL |
|------|----------|-----|
| **jenga-agency** | Factory engine only | `github.com/Jpkoech30/jenga-agency` |
| **jengabooks** | Application code only | `github.com/Jpkoech30/jengabooks` (separate) |
