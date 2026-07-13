#!/usr/bin/env node

/**
 * task-closer.ts — Lead Architect task closure fallback
 * 
 * When a subtask agent returns TEXT instead of running handoff.js,
 * this script closes the loop on their behalf.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT: string = path.resolve(__dirname, "..", "..");

/** CLI options for task-closer */
interface CloserOptions {
    agent: string | null;
    task: string | null;
    artifacts: string | null;
    status: string;
    project: string | null;
    scope: string;
    model: string | null;
    contract: string;
    dryRun: boolean;
}

/** Parse CLI args into typed options */
function parseArgs(): CloserOptions {
    const args: string[] = process.argv.slice(2);
    const opts: CloserOptions = {
        agent: null, task: null, artifacts: null,
        status: "PASSED", project: null, scope: "project",
        model: null, contract: "none", dryRun: false
    };
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case "--agent": opts.agent = args[++i]; break;
            case "--task": opts.task = args[++i]; break;
            case "--artifacts": opts.artifacts = args[++i]; break;
            case "--status": opts.status = args[++i] || "PASSED"; break;
            case "--project": opts.project = args[++i]; break;
            case "--scope": opts.scope = args[++i] || "project"; break;
            case "--model": opts.model = args[++i]; break;
            case "--contract": opts.contract = args[++i] || "none"; break;
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

/** Check git log for existing commit matching agent + task */
function checkExistingCommit(agent: string, task: string): string | null {
    try {
        const log: string = execSync(
            `git log --all --oneline --grep="${task}" --grep="${agent}" --all-match --max-count=1 2>&1`,
            { cwd: ROOT, stdio: "pipe" as const, timeout: 10000 }
        ).toString().trim();
        return log.length > 0 ? log : null;
    } catch {
        return null;
    }
}

function main(): void {
    const opts: CloserOptions = parseArgs();
    console.log(`🔧 task-closer.js — closing task for ${opts.agent}${opts.dryRun ? " (dry-run)" : ""}`);

    const existing: string | null = checkExistingCommit(opts.agent!, opts.task!);
    if (existing) {
        console.log(`  ✅ Git commit already exists: ${existing}`);
    } else {
        console.log(`  ⚠️  No git commit found for ${opts.agent}/${opts.task}`);

        if (opts.dryRun) {
            console.log(`  🔍 Would create commit for: ${opts.agent}/${opts.task}`);
            console.log(`  🔍 Would run: git add -A`);
            console.log(`  🔍 Would run: git commit -m "feat(${opts.task}): ${opts.agent}"`);
            console.log(`  ✅ Task closure complete for ${opts.agent}/${opts.task} (dry-run)`);
            return;
        }

        const subject: string = `feat(${opts.task}): task completed by ${opts.agent}`;
        const body: string = [
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
        } catch (err: any) {
            console.error(`  ❌ Commit failed: ${err.message}`);
            process.exit(1);
        }

        try {
            const enforcer: string = path.join(__dirname, "enforcer.js");
            execSync(`node "${enforcer}" post --agent "${opts.agent}" --task "${opts.task}" --project "${opts.project || 'global'}"`, { cwd: ROOT, stdio: 'inherit', timeout: 30000 });
            execSync(`node "${enforcer}" middle --agent "${opts.agent}" --task "${opts.task}" --project "${opts.project || 'global'}"`, { cwd: ROOT, stdio: 'inherit', timeout: 30000 });
            execSync(`node "${enforcer}" commit --agent "${opts.agent}" --task "${opts.task}" --project "${opts.project || 'global'}" --msg "${subject}\n\n${body}"`, { cwd: ROOT, stdio: 'inherit', timeout: 30000 });
            console.log(`  ✅ Enforcement gates passed for ${opts.agent}/${opts.task}`);
        } catch (err: any) {
            console.error(`  ❌ Enforcement gate failed: ${err.message}`);
            process.exit(1);
        }
    }

    console.log(`  ✅ Task closure complete for ${opts.agent}/${opts.task}`);
}

main();
