# 🤝 Contributing to ZooCode Agency

Thank you for your interest in extending the ZooCode Agency! This guide covers how to add new agents, create API contracts, run tests, and follow our code of conduct.

---

## Table of Contents

1. [Code of Conduct](#1-code-of-conduct)
2. [How to Add a New Agent](#2-how-to-add-a-new-agent)
3. [How to Create a New Contract](#3-how-to-create-a-new-contract)
4. [How to Run Tests](#4-how-to-run-tests)
5. [Agent Modification Rules](#5-agent-modification-rules)
6. [Documentation Standards](#6-documentation-standards)
7. [Pull Request Process](#7-pull-request-process)

---

## 1. Code of Conduct

### Our Pledge

We are committed to providing a welcoming, inclusive, and harassment-free experience for everyone.

### Our Standards

**Positive behaviour:**
- Using welcoming and inclusive language
- Respecting differing viewpoints and experiences
- Accepting constructive criticism gracefully
- Focusing on what is best for the community

**Unacceptable behaviour:**
- Harassment, insults, or derogatory comments
- Publishing others' private information without consent
- Any conduct that could reasonably be considered inappropriate

### Enforcement

Project maintainers are responsible for clarifying standards and will take appropriate action in response to any unacceptable behaviour.

---

## 2. How to Add a New Agent

### Step 1: Create the Agent in `.roomodes`

Add a new entry to the `customModes` array in [`.roomodes`](.roomodes):

```json
{
  "slug": "your-agent-slug",
  "name": "🔧 Your Agent Name",
  "roleDefinition": "Describe what this agent does in 1-2 sentences.",
  "groups": [
    "read",
    ["edit", { "fileRegex": "\\.(ts|js)$", "description": "Source files this agent can edit" }],
    "command",
    "browser"
  ],
  "apiConfiguration": {
    "model": "deepseek-flash"
  },
  "customInstructions": "Agent-specific instructions here."
}
```

**Rules:**
- The `slug` must be unique and use kebab-case
- The `fileRegex` must be narrow — no wildcard `.*` patterns (Principal 5: SWARM)
- The `model` should be `deepseek-flash` unless the agent requires Pro reasoning

### Step 2: Add PFG Oath to `customInstructions`

Every agent MUST have the pre-flight oath as the **first line** of their `customInstructions`:

```
CRITICAL — FIRST ACTION: You MUST recite the pre-task oath from AGENCY-RULES.md v5.0 §PRE-TASK OATH BEFORE executing ANY tool. Output: "🧠 Bound by AGENCY-RULES v5.0. Pre-flight passed. Cost estimate: ~X,XXX tokens (~KES Y.YY). Sections: [applicable sections]." Then run: node .agency/scripts/preflight-gate.js pass --agent <slug> --task "<brief description>"
```

### Step 3: Register the Agent

1. Update the agent table in [`AGENCY.md`](AGENCY.md) (Tier 2-4 as appropriate)
2. Update the agent legend in [`FLOW-DOC.md`](FLOW-DOC.md)
3. Update [`AGENCY-SETUP-OVERVIEW.md`](AGENCY-SETUP-OVERVIEW.md) agent hierarchy
4. If the agent has specific compliance checks, add them to [`COMPLIANCE-CHECKLISTS.md`](COMPLIANCE-CHECKLISTS.md)

### Step 4: (Optional) Create a Contract

If the new agent needs API definitions, create a contract (see §3 below).

### Step 5: Validate

```bash
# Check the agent loads in the system
node .agency/agency.js status

# Verify pre-flight gate works with the new agent
node .agency/scripts/preflight-gate.js pass --agent your-agent-slug --task "validation"
node .agency/scripts/preflight-gate.js check --agent your-agent-slug
```

---

## 3. How to Create a New Contract

### Contract Template

Use the template at [`.agency/contracts/TEMPLATE.api.json`](.agency/contracts/TEMPLATE.api.json):

```json
{
  "contractId": "your-feature-name",
  "version": "1.0.0",
  "description": "Brief description of the feature",
  "featureType": "A | B | C | D",
  "endpoints": [
    {
      "method": "GET | POST | PATCH | DELETE",
      "path": "/api/v1/<resource>/<action>",
      "auth": "JWT | Public | Optional",
      "rateLimit": "requests/minute",
      "request": {
        "headers": { "Authorization": "Bearer <token>" },
        "query": {},
        "body": { "contentType": "application/json", "schema": {} }
      },
      "response": {
        "200": { "description": "Success", "body": {} },
        "400": { "description": "Bad Request" },
        "401": { "description": "Unauthorized" },
        "404": { "description": "Not Found" }
      }
    }
  ],
  "types": {},
  "changelog": [{ "version": "1.0.0", "date": "YYYY-MM-DD", "changes": ["Initial contract"] }]
}
```

### Feature Types

| Type | Description | Pipeline |
|------|-------------|----------|
| A | UI-only | Frontend Lead → Frontend specialists |
| B | API+UI | Backend Lead → Frontend Lead |
| C | DB+API+UI | Database → Backend Lead → Frontend Lead |
| D | Backend-only | Backend Lead → Backend specialists |

### Contract Lifecycle

1. **Creation** — Copy the template, fill in your endpoints
2. **Versioning** — Strict semver (`major.minor.patch`)
3. **Updates** — Backward-incompatible changes bump major version
4. **Deprecation** — Set `"deprecated": true` with replacement reference
5. **Storage** — Global contracts go in `.agency/contracts/`; per-project contracts go in `.agency/projects/<id>/contracts/`

### Contract Naming Rules

- Global agency contracts: `agency-<name>.json` (e.g., `agency-memory.json`)
- Per-project contracts: `<project-prefix>-<name>.json` (e.g., `project-auth.json`)
- All contracts must be valid JSON
- All contracts must include a `changelog` array

---

## 4. How to Run Tests

### E2E Tests (Playwright)

```bash
# Run all E2E tests
npx playwright test

# Run specific test file
npx playwright test e2e/pfg-validation-report.spec.js

# Run with UI mode
npx playwright test --ui
```

### Available E2E Test Suites

| Test File | What It Validates |
|-----------|-------------------|
| [`e2e/pfg-validation-report.spec.js`](e2e/pfg-validation-report.spec.js) | Pre-Flight Gate G1-G7 quality gates |
| [`e2e/ptg-validation-report.spec.js`](e2e/ptg-validation-report.spec.js) | Post-Task Gate G1-G6 quality gates |
| [`e2e/multi-project-handoff.spec.js`](e2e/multi-project-handoff.spec.js) | Multi-project handoff protocol |

### Chaos Monkey Tests

```bash
# Run chaos monkey validation suite
node .agency/scripts/chaos-monkey.js
```

### Manual Validation

```bash
# Validate handoff format
npm run agent:handoff

# Check agent status
npm run agent:status

# Run cost report
npm run agency:report

# Sync documentation
npm run docs:sync
```

### Pre-commit Checks

The pre-commit hook (via Husky + lint-staged) runs automatically:
- `eslint --fix` on `.ts`, `.tsx`, `.js`, `.jsx` files
- `prettier --write` on all staged files

---

## 5. Agent Modification Rules

### DOs

- ✅ Create agents with narrow, specific `fileRegex` domains
- ✅ Document new agents in all relevant `.md` files
- ✅ Add compliance checks for new agents if they handle new concerns
- ✅ Test the agent with `preflight-gate.js` before submitting
- ✅ Include `HANDOFF` metadata in all commits

### DON'Ts

- ❌ Never use `.*` as a `fileRegex` — this violates Principal 5 (SWARM)
- ❌ Never modify `.agency/scripts/` files unless you understand the full handoff protocol
- ❌ Never create agents that overlap with existing agent domains
- ❌ Never skip the pre-flight gate — it's mandatory for ALL agents
- ❌ Never commit without `HANDOFF`, `PROJECT`, `STATUS`, and `MEMORY` fields

### File Overlap Rules

Agent `fileRegex` patterns must not overlap. If two agents can edit the same file, domain boundaries break. Follow these rules:

1. Parent-child paths are allowed only if the child is more specific (e.g., `apps/web/src/components/` is a valid subset of `apps/web/src/`)
2. `packages/shared/` can only be claimed by ONE agent
3. If overlap is unavoidable, the Lead Architect must document the exception

---

## 6. Documentation Standards

All documentation MUST follow these rules:

### Markdown Style

- Use ATX headings (`#`, `##`, `###`, etc.)
- Use fenced code blocks with language tags
- Use relative links for internal references
- Keep lines under 100 characters where possible

### Link Format

All language constructs and filename references must be clickable:

```markdown
See [`filename.ext`](relative/path/file.ext) for details.
```

### What Needs Documentation

| Change Type | Files to Update |
|-------------|-----------------|
| New agent | [`AGENCY.md`](AGENCY.md), [`FLOW-DOC.md`](FLOW-DOC.md), [`AGENCY-SETUP-OVERVIEW.md`](AGENCY-SETUP-OVERVIEW.md) |
| New contract | [`FLOW-DOC.md`](FLOW-DOC.md) contract inventory |
| New rule/principal | [`.agency/AGENCY-RULES.md`](.agency/AGENCY-RULES.md) |
| New compliance check | [`COMPLIANCE-CHECKLISTS.md`](COMPLIANCE-CHECKLISTS.md) |
| New script | [`AGENCY-SETUP-OVERVIEW.md`](AGENCY-SETUP-OVERVIEW.md) script inventory |

---

## 7. Pull Request Process

### Before Submitting

1. [ ] Run the pre-flight gate: `node .agency/scripts/preflight-gate.js pass --agent <slug> --task "<description>"`
2. [ ] Store decision in memory: `node .agency/scripts/memory.js store --content "..." --tags "..." --task "..." --agent "<slug>"`
3. [ ] Run the post-task gate: `node .agency/scripts/post-task-gate.js check --task "<task>" --agent "<slug>"`
4. [ ] Run relevant E2E tests
5. [ ] Update [`ORCHESTRATION.md`](ORCHESTRATION.md) with status changes
6. [ ] Clean up temporary files: `npm run clean:temp`
7. [ ] Verify no orphan files left behind

### Commit Format

```bash
git commit -m "<type>(<scope>): <descriptive summary (>=10 words)>

HANDOFF:<next-agent-slug>
ARTIFACTS:<comma-separated-file-list>
CONTRACT:<contract-id@version>
STATUS:DONE
MEMORY:stored
SCOPE:<project|global>
PREFLIGHT:PASSED"
```

### Commit Types

| Type | When to Use |
|------|-------------|
| `feat` | New feature or enhancement |
| `fix` | Bug fix |
| `docs` | Documentation change |
| `config` | Configuration change |
| `refactor` | Code restructuring |
| `test` | Test addition/modification |
| `chore` | Maintenance task |

### After Submitting

1. The PR will be reviewed by the Lead Architect
2. Quality Gates will run automatically (Security → Performance → Accessibility → Tests → Compliance)
3. The Compliance Guardian validates all 14 principals
4. The Release Manager handles versioning and CHANGELOG updates

---

> **Questions?** Open an issue or start a discussion. We're here to help!
