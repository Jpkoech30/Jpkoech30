# TypeScript Migration — 52 Agency Scripts

> **Goal:** Migrate all `.agency/scripts/*.js` to TypeScript (`.ts`) for type safety, better IDE support, and catch bugs at compile time.

---

## Scope

| Metric | Value |
|---|---|
| Scripts to migrate | 52 `.js` files in `.agency/scripts/` |
| External dependencies | `better-sqlite3`, `sqlite-vec`, `@xenova/transformers` |
| Node.js built-ins used | `fs`, `path`, `child_process` (execSync) |
| Husky hooks (separate) | 2 files: `.husky/pre-commit`, `.husky/post-commit` — these use raw Node.js |
| PowerShell scripts | 3 files: `cleanup-jengaprojects.ps1`, `init-project.ps1`, `release-s14.5.ps1`, `validate-handoff.ps1` — not migrated |

## Approach: `tsx` (Zero Build Step)

Use [`tsx`](https://github.com/privatenumber/tsx) — an esbuild-powered TypeScript executor. It runs `.ts` files directly with no compilation step:

```bash
# Before
node .agency/scripts/enforcer.js pre --agent X --task Y

# After
npx tsx .agency/scripts/enforcer.ts pre --agent X --task Y
```

**Why tsx over alternatives:**

| Approach | Build Step | dist/ folder | Startup Speed | Complexity |
|---|---|---|---|---|
| `tsc` → `dist/` | ✅ Required | ✅ Yes | Fast | High — need tsconfig, build pipeline |
| `ts-node` | ❌ No | ❌ No | Slow | Medium — slower startup, ESM issues |
| **`tsx`** | **❌ No** | **❌ No** | **Fast** | **Low — install + rename** |

## Migration Steps

### Step 1: Install Dependencies
```bash
npm install --save-dev typescript @types/node tsx
```

### Step 2: Create `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": [".agency/scripts/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

### Step 3: Migrate ~/.husky Hooks Separately
Husky hooks run raw Node.js and have no extension. Leave them as `.js`:
- `.husky/pre-commit` → keep as `.js` (no extension)
- `.husky/post-commit` → keep as `.js` (no extension)
- Reference: `node .agency/scripts/enforcer.js` stays as `.js` path

### Step 4: Rename `.js` → `.ts` + Add Types

For each of the 52 scripts:
1. Copy `.js` → `.ts`
2. Add `import` types where applicable
3. The `.js` file is kept as a shim that calls the `.ts` version

**Shim pattern** (leave the old `.js` file as a redirect):
```javascript
#!/usr/bin/env node
/**
 * Shim — delegates to TypeScript implementation
 * This file kept for backward compatibility during migration.
 */
require('tsx').require('./enforcer.ts');
```

This ensures existing scripts and references (`.roomodes`, `package.json`, `handoff.js`) continue to work without changes.

### Step 5: Gradual Type Enhancement

**Phase A — Structural (all 52 scripts):**
- Add `: string`, `: number`, `: boolean` types to function params
- Add return types to functions
- Replace `var` with `const`/`let` (already done in most)
- Add `@types/node` for `fs`, `path`, `child_process`

**Phase B — Core Scripts (8 priority scripts):**
Add proper interfaces for:
- `enforcer.ts` — `EnforcementRow`, `Phase`, `Status` enums
- `handoff.ts` — `HandoffOptions`, `CommitBody` interfaces
- `memory.ts` — `MemoryRow`, `RecallResult` interfaces  
- `recap.ts` — `SessionState`, `ProjectConfig` interfaces
- `telemetry.ts` — `TelemetryEvent` interface
- `quality-gate.ts` — `QGCheck`, `QGResult` interfaces
- `task-closer.ts` — `CloserOptions` interface
- `projects-manager.ts` — `ProjectConfig` interface

**Phase C — Rest (44 scripts):**
Basic types only — no major refactoring

## Edge Cases

| # | Edge Case | Handling |
|---|---|---|
| EC1 | `.roomodes` references `.js` paths | Shim files keep `.js` alive; no `.roomodes` changes needed |
| EC2 | Husky hooks use `node` not `tsx` | Leave hooks as `.js` — they only call the shim which delegates |
| EC3 | `package.json` scripts reference `.js` | Same as EC1 — shim files handle the routing |
| EC4 | PowerShell scripts (.ps1) | Not migrated — out of scope |
| EC5 | Scripts use `require()` not `import` | tsx supports both CJS and ESM; keep CJS for now |
| EC6 | `__dirname` not available in ESM | tsx in CJS mode has `__dirname`; no change needed |
| EC7 | `execSync` return type | `@types/node` provides `Buffer | string` types |
| EC8 | JSON imports (`require('./config.json')`) | `resolveJsonModule: true` in tsconfig handles this |

## Files Changed

| File | Action |
|---|---|
| `package.json` | Add `typescript`, `@types/node`, `tsx` devDependencies |
| `tsconfig.json` | **Create** — TypeScript config |
| `.agency/scripts/*.ts` (52 files) | **Create** — TypeScript versions |
| `.agency/scripts/*.js` (52 files) | **Modify** — Replace content with tsx shim |
| `.husky/pre-commit` | No change (keeps `.js` references) |
| `.husky/post-commit` | No change (keeps `.js` references) |

## Not Changed

- `.roomodes` — references `.js` paths that still work via shims
- `package.json` scripts — same reason
- PowerShell scripts — out of scope
- Project scripts in `projects/` — agency-only

## Migration Order (Priority)

1. **Core** — `enforcer.ts`, `handoff.ts`, `memory.ts` (most complex, highest value)
2. **Supporting** — `recap.ts`, `telemetry.ts`, `quality-gate.ts`, `task-closer.ts`, `projects-manager.ts`
3. **Rest** — Remaining 44 scripts in batches of 10
