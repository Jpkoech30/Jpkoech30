# P2 Organization Fixes — Implementation Plan

> **Scope:** Resolve agent overlaps, expand workflow pipelines, add missing feature types
> **Status:** Design complete — ready for HANDOFF to code-agent

---

## Change 1: Remove `devops` (Generalist)

**File:** [`.roomodes`](../../.roomodes:465)

**Problem:** `devops` (slug: `devops`) has fileRegex covering `scripts/, docker-compose, Dockerfile, .github/, *deployment*` — which overlaps with all 3 devops specialists. Routing ambiguity: should a CI/CD task go to `devops` or `devops-cicd`?

**Action:** Remove the entire `devops` agent block (lines ~465-485). The 3 specialists (`devops-infra`, `devops-cicd`, `devops-db`) cover the domain completely.

**File:** [`.agency/config.json`](../../.agency/config.json)

**Action:** Remove `"devops"` from:
- `agents.enabled` array
- `agents.hierarchy.specialists` array

---

## Change 2: Re-scope `frontend-web` to "Frontend Config & Build"

**File:** [`.roomodes`](../../.roomodes:381)

**Problem:** `frontend-web` has a vague role "build responsive UIs" but its fileRegex only matches config files (`vite.config`, `tailwind.config`, `postcss.config`, `tsconfig`, `index.html`, `package.json`). It overlaps with `frontend-ui`, `frontend-page`, `frontend-state` for actual UI work.

**Action:** Re-scope it as a build/config specialist:

```json
{
  "slug": "frontend-web",
  "name": "🌐 Frontend Web Config & Build",
  "roleDefinition": "You manage frontend build tooling, bundler configuration, framework setup, and dependency management. You do NOT build UI components or pages.",
  ...
}
```

Keep the same fileRegex since it already correctly limits to config files.

---

## Change 3: Re-scope `frontend-mobile` to "Mobile Config & Build"

**File:** [`.roomodes`](../../.roomodes:401)

**Problem:** Same pattern as `frontend-web` — role says "build offline-first mobile UIs" but fileRegex only matches config files.

**Action:** Re-scope:

```json
{
  "slug": "frontend-mobile",
  "name": "📱 Frontend Mobile Config & Build",
  "roleDefinition": "You manage mobile build tooling, Expo configuration, Metro bundler, and mobile framework setup. You do NOT build mobile components or screens.",
  ...
}
```

Keep the same fileRegex.

---

## Change 4: Merge `backend-logic` into `backend-service`

**File:** [`.roomodes`](../../.roomodes:88)

**Problem:** `backend-logic` covers `*.logic.ts, *.business.ts, packages/shared/` while `backend-service` covers `*.service.ts, *.provider.ts, *.module.ts`. These overlap in the business logic domain. A developer writing business rules doesn't know whether to use `*.service.ts` or `*.logic.ts`.

**Action 4a:** Expand `backend-service`'s fileRegex to include `backend-logic`'s domain:

```json
{
  "slug": "backend-service",
  "name": "⚙️ Backend Service & Logic",
  "groups": [
    "read",
    [ "edit", { "fileRegex": "^(?:projects/[^/]+/)?(?:[^/]+/)?(apps/api/src/.*\\.(service|provider|module|logic|business)\\.ts|packages/shared/src/.*)$", "description": "Service layer, business logic, shared packages" } ],
    "command",
    "browser"
  ],
  ...
}
```

**Action 4b:** Remove the `backend-logic` agent block (lines ~423-443).

**File:** [`.agency/config.json`](../../.agency/config.json)

**Action:** Remove `"backend-logic"` from:
- `agents.enabled` array
- `agents.hierarchy.specialists` array

---

## Change 5: Expand Workflow Pipelines

**File:** [`.agency/config.json`](../../.agency/config.json:111)

**Problem:** Pipelines skip specialists. A Type-C (DB+API+UI) task routes `backend-database → backend-lead → frontend-lead` but the leads then have to delegate to specialists anyway — 2 extra handoffs.

**Action:** Expand each pipeline to include the full specialist chain:

```json
"workflows": {
  "featureTypes": {
    "A": {
      "name": "UI-only",
      "pipeline": ["frontend-ui", "frontend-page", "frontend-state", "frontend-lead"]
    },
    "B": {
      "name": "API+UI",
      "pipeline": ["backend-api", "backend-service", "backend-integration", "backend-lead", "frontend-ui", "frontend-page", "frontend-state", "frontend-lead"]
    },
    "C": {
      "name": "DB+API+UI",
      "pipeline": ["backend-database", "backend-api", "backend-service", "backend-integration", "backend-lead", "frontend-ui", "frontend-page", "frontend-state", "frontend-lead"]
    },
    "D": {
      "name": "Backend-only",
      "pipeline": ["backend-api", "backend-service", "backend-integration", "backend-lead"]
    },
    "E": {
      "name": "Mobile-only",
      "pipeline": ["mobile-ui", "mobile-screen", "mobile-state", "mobile-lead"]
    },
    "F": {
      "name": "Full-stack+mobile",
      "pipeline": ["backend-database", "backend-api", "backend-service", "backend-integration", "backend-lead", "frontend-ui", "frontend-page", "frontend-state", "frontend-lead", "mobile-ui", "mobile-screen", "mobile-state", "mobile-lead"]
    },
    "G": {
      "name": "Infrastructure",
      "pipeline": ["devops-infra", "devops-cicd", "devops-db", "devops-lead"]
    },
    "H": {
      "name": "Hotfix",
      "pipeline": ["code-agent"]
    }
  }
}
```

---

## Summary of Files Changed

| File | Changes |
|------|---------|
| [`.roomodes`](../../.roomodes) | Remove `devops` agent (lines ~465-485) |
| [`.roomodes`](../../.roomodes) | Remove `backend-logic` agent (lines ~423-443) |
| [`.roomodes`](../../.roomodes) | Re-scope `frontend-web` role name |
| [`.roomodes`](../../.roomodes) | Re-scope `frontend-mobile` role name |
| [`.roomodes`](../../.roomodes) | Expand `backend-service` fileRegex |
| [`.agency/config.json`](../../.agency/config.json) | Remove `devops` from enabled + hierarchy.specialists |
| [`.agency/config.json`](../../.agency/config.json) | Remove `backend-logic` from enabled + hierarchy.specialists |
| [`.agency/config.json`](../../.agency/config.json) | Replace workflows with expanded pipelines + new types |

---

## Files NOT Changed

These agents have well-defined, non-overlapping domains and remain as-is:

| Agent | Domain | Unique? |
|-------|--------|---------|
| `backend-api` | `.controller.ts`, `.route.ts`, `.dto.ts` | ✅ No overlap |
| `backend-service` | `.service.ts`, `.provider.ts`, `.module.ts` (expanded) | ✅ After merge |
| `backend-integration` | `.integration.ts`, `.adapter.ts`, `.client.ts` | ✅ No overlap |
| `backend-database` | `prisma/`, `*.sql` | ✅ No overlap |
| `frontend-ui` | `components/` | ✅ No overlap |
| `frontend-page` | `pages/` | ✅ No overlap |
| `frontend-state` | `stores/`, `hooks/` | ✅ No overlap |
| `mobile-ui` | `mobile/src/components/` | ✅ No overlap |
| `mobile-screen` | `mobile/src/app/` | ✅ No overlap |
| `mobile-state` | `mobile/stores/`, `hooks/`, `lib/` | ✅ No overlap |

---

## Validation Steps

After changes, run:

1. **Config validity:**
   ```bash
   node -e "var fs=require('fs'); var c=JSON.parse(fs.readFileSync('.agency/config.json','utf8')); var r=JSON.parse(fs.readFileSync('.roomodes','utf8')); var rSlugs=r.customModes.map(function(a){return a.slug;}); var missing=rSlugs.filter(function(s){return !c.agents.enabled.includes(s);}); var extra=c.agents.enabled.filter(function(s){return !rSlugs.includes(s);}); console.log('Slugs in .roomodes only:', missing); console.log('Slugs in config only:', extra);"
   ```

2. **Pipeline validation:**
   ```bash
   node -e "var fs=require('fs'); var c=JSON.parse(fs.readFileSync('.agency/config.json','utf8')); Object.entries(c.workflows.featureTypes).forEach(function(e){console.log(e[0]+' ('+e[1].name+'): '+e[1].pipeline.join(' → '));});"
   ```

3. **Agent count:**
   - Before: 31 agents in `.roomodes`
   - After: 29 agents (removed `devops`, `backend-logic`)
