# Pre-Task Oath Enforcement — Hard Gate Plan

> **Problem**: The AGENCY-RULES.md mandates running `enforcer.js pre --agent X --task Y` before any code, but there's no hard enforcement. Agents skip the oath, the enforcer DB stays empty, and the rules become decoration.

---

## Root Cause Chain

```
1. System prompt says "recite oath" → agent tries enforcer.js pass (WRONG COMMAND)
                                     → "FAIL: Unknown command pass"
                                     → agent shrugs and proceeds            ← NO RETRY
                                     
2. No pre-commit check             → agent commits without PRE phase
3. No handoff check for PRE phase  → enforcer.js handoff allows it
4. post-commit hook has try-catch  → all errors silently swallowed
```

## Current Infra That Already Exists

| Component | Exists? | Purpose |
|---|---|---|
| `enforcer.js pre` | ✅ | Creates PRE phase with oath_hash + TTL |
| `enforcer.js check` | ✅ | Verifies PRE phase exists + not expired |
| `enforcer.js handoff` | ✅ | HANDOFF phase state machine |
| `.husky/post-commit` | ✅ | Runs after commit (but all try-catch swallowed) |
| `handoff.js` | ✅ | CLI handoff helper |

## What's Missing

| Gap | Impact |
|---|---|
| No **pre-commit hook** to check PRE phase | Agent commits with no oath |
| `handoff.js` doesn't verify PRE phase | Handoff succeeds with no oath |
| `post-commit` swallows all errors | Hidden failures everywhere |
| `.agent-slug` file not persisted | Pre-commit hook doesn't know which agent to check |

---

## Solution Design

### Change 1: Pre-commit hook — Block if no PRE phase

Create `.husky/pre-commit`:

```
#!/usr/bin/env node
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

// Read active agent slug (written by enforcer.js pre)
const agentSlugPath = path.join(ROOT, ".agency", ".agent-slug");
let agent = null;
try { agent = fs.readFileSync(agentSlugPath, "utf-8").trim(); } catch {}

if (agent) {
    try {
        execSync(`node .agency/scripts/enforcer.js check --agent "${agent}"`, { 
            stdio: "inherit", timeout: 15000, cwd: ROOT 
        });
        console.log(`  ✅ PRE phase verified for agent "${agent}"`);
    } catch {
        console.error(`  ❌ COMMIT BLOCKED: No PRE phase for agent "${agent}".`);
        console.error(`  Run: node .agency/scripts/enforcer.js pre --agent "${agent}" --task "<task-id>"`);
        process.exit(1);
    }
} else {
    console.warn("  ⚠ No .agent-slug file — skipping PRE phase check");
    console.warn("  Recommendation: Set .agency/.agent-slug to enforce oath compliance");
}
```

### Change 2: enforcer.js `pre` writes `.agent-slug`

In `cmdPre()`, after creating the PRE phase entry:

```javascript
// Write .agent-slug for pre-commit hook
fs.writeFileSync(path.join(ROOT, '.agency', '.agent-slug'), agent, 'utf-8');
```

### Change 3: handoff.js — Verify PRE phase before proceeding

In `handoff.js` main flow, add:

```javascript
// Verify PRE phase exists before handoff
try {
    execSync(`node "${ENFORCER_SCRIPT}" check --agent "${opts.from}"`, {
        cwd: ROOT, stdio: 'pipe', timeout: 15000
    });
    console.log('  ✅ PRE phase verified');
} catch {
    console.error('  ❌ HANDOFF BLOCKED: No PRE phase recorded for this agent.');
    console.error('  Run: node .agency/scripts/enforcer.js pre --agent <slug> --task <id>');
    process.exit(1);
}
```

### Change 4: Fix post-commit hook non-blocking swallows

Replace silent try-catch with proper error reporting in `.husky/post-commit`:

```javascript
// Non-fatal — report but don't block
try { ... } catch (e) {
    console.error('  ⚠ post-commit step failed:', e.message);
}
```

### Change 5: Add `.agent-slug` to `.gitignore`

So it doesn't pollute commits.

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| No `.agent-slug` file | Pre-commit warns but allows (graceful degradation) |
| PRE phase expired (>1hr TTL) | `enforcer.js check` blocks → must re-run `pre` |
| Multiple agents in session | Each `pre` call overwrites `.agent-slug` (last wins) |
| Agent runs `pre` but never commits | `.agent-slug` persists — harmless |
| Hotfix (`--hotfix`) | Already exempt from PRE per enforcer logic |
| CI environment | No `.agent-slug` → pre-commit skips check (CI machines don't have interactive agents) |

---

## Implementation Plan

| # | File | Action | What to change |
|---|---|---|---|
| 1 | [`.husky/pre-commit`](.husky/pre-commit) | **Create** | Check that `.agent-slug` has a valid PRE phase in enforcer DB |
| 2 | [`.agency/scripts/enforcer.js`](.agency/scripts/enforcer.js) | **Modify** | In `cmdPre()`: write `.agent-slug` file after creating PRE entry |
| 3 | [`.agency/scripts/handoff.js`](.agency/scripts/handoff.js) | **Modify** | Add `enforcer.js check` call before allowing handoff |
| 4 | [`.husky/post-commit`](.husky/post-commit) | **Modify** | Fix silent try-catch swallows — at minimum report errors |
| 5 | [`.gitignore`](.gitignore) | **Modify** | Add `.agency/.agent-slug` |

## Flow After Fix

```
User says "implement X"
  → Agent recites oath (human reads it)
  → Agent runs: enforcer.js pre --agent code-agent --task "X"
      → writes .agency/.agent-slug ← NEW
  → Agent works, makes changes
  → Agent runs: git add -A
  → .husky/pre-commit runs           ← NEW
      → enforcer.js check --agent code-agent
      → If PRE phase missing → COMMIT BLOCKED
  → git commit succeeds
  → .husky/post-commit runs          ← FIXED (no silent swallows)
  → Agent runs: handoff.js
      → enforcer.js check runs       ← NEW
      → If PRE phase missing → HANDOFF BLOCKED
  → Handoff succeeds ✅
```
