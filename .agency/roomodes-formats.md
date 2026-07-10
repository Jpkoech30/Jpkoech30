# `.roomodes` Configuration Formats

> **Last updated:** 2026-07-10  
> **Status:** Reference documentation for both supported formats

The project supports two `.roomodes` configuration formats. The primary format is **ZooCode** (currently active). **Roo Code** format is documented for cross-platform compatibility and reference.

---

## Format 1: ZooCode (Primary — Currently Active)

The active [`.roomodes`](.roomodes) file uses the ZooCode format with a top-level [`customModes`](.roomodes:2) array. This is the richer format supporting `roleDefinition`, `apiConfiguration`, and structured permission groups per agent.

### Structure

```json
{
  "customModes": [
    {
      "slug": "agent-slug",
      "name": "🎩 Agent Display Name",
      "roleDefinition": "You are...",
      "groups": [
        "read",
        ["edit", { "fileRegex": "\\.(ts|js)$", "description": "Source code" }],
        "command",
        "browser"
      ],
      "apiConfiguration": {
        "model": "deepseek-v4-flash"
      },
      "customInstructions": "Detailed instructions for this agent..."
    }
  ]
}
```

### Key Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| [`slug`](.roomodes:4) | `string` | ✅ | Unique identifier (kebab-case) used in HANDOFF protocol |
| [`name`](.roomodes:5) | `string` | ✅ | Human-readable name with emoji prefix |
| [`roleDefinition`](.roomodes:6) | `string` | ✅ | System prompt defining the agent's purpose and boundaries |
| [`groups`](.roomodes:7) | `array` | ✅ | Permission groups: `"read"`, `["edit", {fileRegex, description}]`, `"command"`, `"browser"` |
| [`apiConfiguration`](.roomodes:19) | `object` | ✅ | Model selection (currently all agents use `deepseek-v4-flash`) |
| [`customInstructions`](.roomodes:22) | `string` | ✅ | Mode-specific instructions extending the role definition |

### Permission Groups Detail

The [`groups`](.roomodes:7) array supports four permission types:

1. **`"read"`** — Read-only access to all files
2. **`["edit", { "fileRegex": "...", "description": "..." }]`** — Edit access restricted by `fileRegex` pattern
3. **`"command"`** — CLI command execution access
4. **`"browser"`** — Browser/network access

The `fileRegex` for edit groups is the critical domain boundary — agents are **strictly forbidden** from editing files outside their regex pattern (SWARM principle).

### Currently Configured Agents (28 total)

| # | Slug | Name | Edit Domain |
|---|------|------|-------------|
| 1 | [`lead-architect`](.roomodes:4) | 🧠 Lead Architect & Orchestrator | `.md`, `.json`, `.yaml`, `.prisma`, `.sql` |
| 2 | [`jengabooks-code`](.roomodes:25) | 🔧 JengaBooks Code | `.tsx?`, `.jsx?`, `.css`, `.json` |
| 3 | [`backend-lead`](.roomodes:46) | ⚙️ Backend Lead | `.md`, `.json` |
| 4 | [`backend-api`](.roomodes:67) | ⚙️ Backend API | `apps/api/src/` (not prisma) |
| 5 | [`backend-service`](.roomodes:88) | ⚙️ Backend Service | `apps/api/src/` (not prisma) |
| 6 | [`backend-integration`](.roomodes:109) | ⚙️ Backend Integration | `apps/api/src/` (not prisma) |
| 7 | [`frontend-lead`](.roomodes:130) | 🌐 Frontend Web Lead | `.md`, `.json` |
| 8 | [`frontend-ui`](.roomodes:151) | 🌐 Frontend UI | `apps/web/src/components/` |
| 9 | [`frontend-page`](.roomodes:172) | 🌐 Frontend Page | `apps/web/src/pages/` |
| 10 | [`frontend-state`](.roomodes:193) | 🌐 Frontend State | `apps/web/src/stores/`, `hooks/`, `lib/` |
| 11 | [`mobile-lead`](.roomodes:214) | 📱 Mobile Lead | `.md`, `.json` |
| 12 | [`mobile-ui`](.roomodes:235) | 📱 Mobile UI | `apps/mobile/src/components/` |
| 13 | [`mobile-screen`](.roomodes:256) | 📱 Mobile Screen | `apps/mobile/src/app/` |
| 14 | [`mobile-state`](.roomodes:277) | 📱 Mobile State | `apps/mobile/src/stores/`, `hooks/`, `lib/` |
| 15 | [`devops-lead`](.roomodes:298) | 🚀 DevOps Lead | `.md`, `.json` |
| 16 | [`devops-infra`](.roomodes:319) | 🚀 DevOps Infrastructure | `docker-compose`, `Dockerfile`, `scripts/deploy` |
| 17 | [`devops-cicd`](.roomodes:340) | 🚀 DevOps CI/CD | `.github/`, `scripts/ci` |
| 18 | [`devops-db`](.roomodes:361) | 🚀 DevOps Database Admin | `prisma/`, `scripts/db`, `*.sql` |
| 19 | [`frontend-web`](.roomodes:382) | 🌐 Frontend Web | `apps/web/src/`, `packages/shared/src/` |
| 20 | [`frontend-mobile`](.roomodes:403) | 📱 Frontend Mobile | `apps/mobile/src/`, `packages/shared/src/` |
| 21 | [`backend-logic`](.roomodes:424) | ⚙️ Backend Logic | `apps/api/src/` (not prisma), `packages/shared/src/` |
| 22 | [`backend-database`](.roomodes:445) | 🗄️ Backend Database | `apps/api/prisma/`, `*.sql` |
| 23 | [`devops`](.roomodes:466) | 🚀 DevOps | `scripts/`, `docker-compose`, `Dockerfile`, `.github/` |
| 24 | [`documentarian`](.roomodes:487) | 📝 Agency Documentarian | `.md` |
| 25 | [`qa-automator`](.roomodes:508) | 🧪 QA Automator | `e2e/`, `tests/playwright/` `*.spec.ts` |
| 26 | [`release-manager`](.roomodes:529) | 📦 Release Manager | `package.json`, `CHANGELOG.md`, `.github/workflows/release` |
| 27 | [`design-keeper`](.roomodes:550) | 🎨 Design System Keeper | `packages/shared/src/theme.ts`, `*.stories.*` |
| 28 | [`compliance-guardian`](.roomodes:571) | 🛡️ Compliance Guardian | `.md` |
| 29 | [`security-auditor`](.roomodes:592) | 🔒 Security Auditor | `.md`, `.yaml` |
| 30 | [`performance-auditor`](.roomodes:613) | ⚡ Performance Auditor | `.md`, `.js` |
| 31 | [`accessibility-auditor`](.roomodes:634) | ♿ Accessibility Auditor | `.md`, `.js` |

---

## Format 2: Roo Code (Alternative — Reference)

The Roo Code native format uses a simpler structure with a top-level `groups` array instead of `customModes`. This format is documented for cross-platform compatibility.

### Structure

```json
{
  "customInstructions": "Shared instructions for all agents...",
  "groups": [
    {
      "name": "📝 Agency Documentarian",
      "slug": "documentarian",
      "fileRegex": "\\.md$",
      "customInstructions": "You are the Agency Documentarian...",
      "apiConfiguration": {
        "model": "deepseek-v4-flash"
      }
    }
  ]
}
```

### Key Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| [`customInstructions`] | `string` | ❌ | Top-level shared instructions applied to all groups |
| [`groups`] | `array` | ✅ | Array of agent/group configurations |
| `groups[].name` | `string` | ✅ | Human-readable display name |
| `groups[].slug` | `string` | ✅ | Unique identifier |
| `groups[].fileRegex` | `string` | ✅ | Regex pattern restricting editable files |
| `groups[].customInstructions` | `string` | ❌ | Per-group instructions (merges with top-level) |
| `groups[].apiConfiguration` | `object` | ❌ | Model configuration (optional per agent) |

### Key Differences from ZooCode

1. **No `roleDefinition`** — Roo Code format relies on `customInstructions` alone, without a separate role definition field
2. **No structured permission groups** — Only a single `fileRegex` string instead of the ZooCode `groups` array with `read`/`edit`/`command`/`browser` distinction
3. **Top-level shared instructions** — Roo Code supports a top-level `customInstructions` that applies to all groups, merged with per-group instructions
4. **Simpler structure** — Fewer nesting levels and fewer required fields

---

## Comparison Table

| Aspect | ZooCode (Current) | Roo Code (Reference) |
|--------|-------------------|---------------------|
| **Top-level key** | [`customModes`](.roomodes:2) | `groups` |
| **Role definition** | ✅ Dedicated `roleDefinition` field | ❌ Uses `customInstructions` only |
| **Permission model** | ✅ Structured `groups` array (`read`, `edit` with `fileRegex`, `command`, `browser`) | ⚠️ Single `fileRegex` string |
| **Per-agent API config** | ✅ `apiConfiguration` with model selection | ✅ Optional `apiConfiguration` |
| **Shared instructions** | ❌ No top-level shared instructions | ✅ Optional top-level `customInstructions` |
| **Agent count** | 28 agents | N/A (project uses ZooCode) |
| **Complexity** | Higher — richer, more granular | Lower — simpler, fewer fields |
| **Flexibility** | Higher — fine-grained permission control | Lower — basic file-scoping only |

---

## Which Format to Use

| Scenario | Format | Reason |
|----------|--------|--------|
| **Primary development** | **ZooCode** | Richer permission model, `roleDefinition`, per-agent `apiConfiguration`. Required for the full agency workflow with domain enforcement (SWARM). |
| **New project bootstrap** | **ZooCode** | Use the template at [`.agency/templates/agent-template.json`](.agency/templates/agent-template.json) to scaffold new agents. |
| **Roo Code IDE integration** | **Roo Code** | If running this project in Roo Code IDE (without Zoo extension), use the Roo Code format. Note that `roleDefinition` and fine-grained permission groups will not be available. |
| **Cross-platform compatibility** | **ZooCode** | Zoo Code extension supports both ZooCode and Roo Code formats. Stick with ZooCode for maximum capability. |

### Decision: Primary = ZooCode

Per the delta analysis in [`.agency/plans/roo-code-setup-delta-plan.md`](.agency/plans/roo-code-setup-delta-plan.md:56):

> **Decision:** Keep ZooCode format (richer — supports `roleDefinition`, `apiConfiguration`, permission groups).
> **Document both formats** for cross-platform compatibility.

---

## Example Snippets

### ZooCode — Full Agent Entry

```json
{
  "slug": "documentarian",
  "name": "📝 Agency Documentarian",
  "roleDefinition": "You maintain project documentation, README files, API specs, and usage examples. Auto-generate docs from .agency/contracts/. Never write application code.",
  "groups": [
    "read",
    ["edit", { "fileRegex": "\\.md$", "description": "Documentation files" }],
    "command",
    "browser"
  ],
  "apiConfiguration": {
    "model": "deepseek-v4-flash"
  },
  "customInstructions": "You are the Agency Documentarian..."
}
```

### Roo Code — Equivalent Entry

```json
{
  "customInstructions": "Shared agency rules for all agents...",
  "groups": [
    {
      "name": "📝 Agency Documentarian",
      "slug": "documentarian",
      "fileRegex": "\\.md$",
      "customInstructions": "You are the Agency Documentarian...",
      "apiConfiguration": {
        "model": "deepseek-v4-flash"
      }
    }
  ]
}
```

---

## Maintenance

- **Adding a new agent:** Use the template at [`.agency/templates/agent-template.json`](.agency/templates/agent-template.json) to generate a ZooCode entry, then insert it into the [`customModes`](.roomodes:2) array.
- **Updating an existing agent:** Edit the corresponding object inside the [`customModes`](.roomodes:2) array in [`.roomodes`](.roomodes).
- **Roo Code format regeneration:** If needed, a script could transform ZooCode entries → Roo Code groups (stripping `roleDefinition`, flattening permission groups to a single `fileRegex`).
