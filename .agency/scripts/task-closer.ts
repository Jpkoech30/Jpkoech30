#!/usr/bin/env node
// @ts-nocheck
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
