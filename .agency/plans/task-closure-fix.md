# Task Closure Fix — Git Commit + Handoff Enforcement

> **Root Cause:** Subtask agents return TEXT ("HANDOFF:complete") but never execute `handoff.js`.
> **Secondary Cause:** `handoff.js` makes git commit NON-BLOCKING (line 401-404 catches errors and continues).
> **Fix:** Make git commit blocking + add Lead Architect task-closer.js for fallback.

---

## Problem Analysis

### Flow Today (Broken)

```
AGENT finishes work
  → Agent says "HANDOFF:complete" in conversation (TEXT ONLY)
  → Agent does NOT run: node .agency/scripts/handoff.js --from ... --to ...
  → Agent does NOT run: git add -A + git commit + git push
  → Lead Architect sees "HANDOFF:complete" and moves on
  → Nothing is committed to git
  → Nothing is logged in enforcement DB
```

### Root Cause: handoff.js line 401-404

```javascript
} catch (gitError) {
    console.error('  ⚠ Git commit failed (non-blocking):', gitError.message);
    // Non-blocking — handoff proceeds even if commit fails
}
```

The git failure is caught and swallowed. The script exits with code 0. No evidence of failure.

---

## Changes

### Change 1: Make git commit blocking in `handoff.js`

**File: `.agency/scripts/handoff.js` — lines 401-404**

Replace the catch block:

```javascript
} catch (gitError) {
    console.error('  ❌ Git commit FAILED (blocking):', gitError.message);
    console.error('  The handoff CANNOT proceed without a git commit.');
    console.error('  Please ensure there are changes to commit, then retry.');
    // Clean up temp file
    try { fs.unlinkSync(msgFile); } catch {}
    process.exit(1);
}
```

This ensures:
- If `git add -A` fails → handoff blocks with exit code 1
- If `git commit` fails → handoff blocks with exit code 1
- The agent MUST fix the issue and retry

### Change 2: Create `task-closer.js` — Lead Architect Fallback

**File: `.agency/scripts/task-closer.js`**

The Lead Architect runs this after each subtask agent returns text. It:
1. Checks git log for a recent commit from the agent
2. If none found, creates the commit on behalf of the agent using parsed metadata
3. Runs enforcer POST → MIDDLE → COMMIT → HANDOFF
4. Stores memory

```javascript
#!/usr/bin/env node
/**
 * task-closer.js — Lead Architect task closure fallback
 * 
 * When a subtask agent returns TEXT instead of running handoff.js,
 * this script closes the loop on their behalf.
 * 
 * Usage: node .agency/scripts/task-closer.js \
 *   --agent <slug> \
 *   --task "<task-id>" \
 *   --artifacts "<files>" \
 *   --status <passed|failed|blocked> \
 *   --project <id> \
 *   --scope <project|global>
 * 
 *   node .agency/scripts/task-closer.js --dry-run
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { agent: null, task: null, artifacts: null, status: "PASSED", project: null, scope: "project", model: null, contract: "none", dryRun: false };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--agent": opts.agent = args[++i]; break;
      case "--task": opts.task = args[++i]; break;
      case "--artifacts": opts.artifacts = args[++i]; break;
      case "--status": opts.status = args[++i]; break;
      case "--project": opts.project = args[++i]; break;
      case "--scope": opts.scope = args[++i]; break;
      case "--model": opts.model = args[++i]; break;
      case "--contract": opts.contract = args[++i]; break;
      case "--dry-run": opts.dryRun = true; break;
    }
  }
  if (!opts.agent || !opts.task) {
    console.error("❌ Usage: node .agency/scripts/task-closer.js --agent <slug> --task <id> [--artifacts <files>] [--status <passed|failed|blocked>]");
    console.error("   Required: --agent, --task");
    process.exit(1);
  }
  return opts;
}

function checkExistingCommit(agent, task) {
  // Check if a commit already exists for this task from this agent
  try {
    const log = execSync(
      `git log --all --oneline --grep="${task}" --grep="${agent}" --all-match --max-count=1 2>&1`,
      { cwd: ROOT, stdio: "pipe", timeout: 10000 }
    ).toString().trim();
    return log.length > 0 ? log : null;
  } catch {
    return null;
  }
}

function main() {
  const opts = parseArgs();
  console.log(`🔧 task-closer.js — closing task for ${opts.agent}${opts.dryRun ? " (dry-run)" : ""}`);

  // Step 1: Check if git commit already exists
  const existing = checkExistingCommit(opts.agent, opts.task);
  if (existing) {
    console.log(`  ✅ Git commit already exists: ${existing}`);
  } else {
    console.log(`  ⚠️  No git commit found for ${opts.agent}/${opts.task}`);
    
    if (opts.dryRun) {
      console.log(`  🔍 Would create commit for: ${opts.agent}/${opts.task}`);
      console.log(`  🔍 Would run: git add -A`);
      console.log(`  🔍 Would run: git commit -m "feat(${opts.task}): ${opts.agent}"`);
    } else {
      // Create the commit on behalf of the agent
      const subject = `feat(${opts.task}): task completed by ${opts.agent}`;
      const body = [
        `HANDOFF:lead-architect`,
        `ARTIFACTS:${opts.artifacts || "changes"}`,
        `CONTRACT:${opts.contract}`,
        `STATUS:${opts.status}`,
        `MEMORY:${opts.project || "global"}-${Date.now()}`,
        `SCOPE:${opts.scope}`,
      ].join("\n");
      
      try {
        execSync('git add -A', { cwd: ROOT, stdio: 'inherit', timeout: 30000 });
        execSync(`git commit -m "${subject}" -m "${body}"`, { cwd: ROOT, stdio: 'inherit', timeout: 30000 });
        console.log(`  ✅ Commit created on behalf of ${opts.agent}`);
      } catch (err) {
        console.error(`  ❌ Commit failed: ${err.message}`);
        process.exit(1);
      }
    }
  }

  // Step 2: Run enforcer POST + MIDDLE + COMMIT
  if (!opts.dryRun) {
    try {
      const enforcer = path.join(__dirname, "enforcer.js");
      execSync(`node "${enforcer}" post --agent "${opts.agent}" --task "${opts.task}" --project "${opts.project || 'global'}"`, { cwd: ROOT, stdio: 'inherit', timeout: 30000 });
      execSync(`node "${enforcer}" middle --agent "${opts.agent}" --task "${opts.task}" --project "${opts.project || 'global'}"`, { cwd: ROOT, stdio: 'inherit', timeout: 30000 });
      execSync(`node "${enforcer}" commit --agent "${opts.agent}" --task "${opts.task}" --project "${opts.project || 'global'}" --msg "${subject}\n\n${body}"`, { cwd: ROOT, stdio: 'inherit', timeout: 30000 });
      console.log(`  ✅ Enforcement gates passed for ${opts.agent}/${opts.task}`);
    } catch (err) {
      console.error(`  ❌ Enforcement gate failed: ${err.message}`);
      process.exit(1);
    }
  }

  console.log(`  ✅ Task closure complete for ${opts.agent}/${opts.task}`);
}

main();
```

### Change 3: Add git verify to enforcer.js HANDOFF phase

**File: `.agency/scripts/enforcer.js` — `cmdHandoff()`**

Add a git log check before allowing the handoff:

```javascript
// Before allowing handoff, verify git commit exists
try {
  const logCheck = execSync(
    `git log --all --oneline --grep="${task}" --max-count=1 2>&1`,
    { cwd: ROOT, stdio: 'pipe', timeout: 10000 }
  ).toString().trim();
  if (!logCheck) {
    console.error('  ❌ HANDOFF blocked: No git commit found for this task');
    console.error('  The agent must commit changes before handoff can proceed.');
    console.error('  Run: node .agency/scripts/task-closer.js --agent <slug> --task <id>');
    process.exit(1);
  }
  console.log(`  ✅ Git commit verified: ${logCheck}`);
} catch {
  console.log('  ⚠️  Git check unavailable (non-blocking)');
}
```

---

## Validation

After changes:
```bash
# Verify handoff.js now blocks on git failure
node -e "var fs=require('fs'); var h=fs.readFileSync('.agency/scripts/handoff.js','utf8'); console.log('Git commit BLOCKING:', h.includes('process.exit(1)') && h.includes('Git commit FAILED')?'✅':'❌');"

# Verify task-closer.js exists
node -e "console.log('task-closer.js:', fs.existsSync('.agency/scripts/task-closer.js')?'✅':'❌');"

# Verify enforcer.js has git verify in handoff
node -e "var fs=require('fs'); var e=fs.readFileSync('.agency/scripts/enforcer.js','utf8'); console.log('Git verify in handoff:', e.includes('git log') && e.includes('HANDOFF blocked')?'✅':'❌');"
```
