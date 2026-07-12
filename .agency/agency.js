#!/usr/bin/env node

/**
 * agency.js — Unified CLI Wrapper for Agency Scripts
 *
 * Single entry point for all 20 agency scripts.
 * Usage: agency <command> [args...]
 *
 * Maps short command names to script paths and passes all arguments through.
 * Uses execSync with { stdio: 'inherit' } for transparent I/O.
 * Error codes are passthrough from the underlying script.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCRIPTS_DIR = path.resolve(__dirname, 'scripts');

// ── Command Registry ─────────────────────────────────────────────────────────
//
// Each entry: [command, scriptPath, description]
// Script paths relative to .agency/scripts/
const COMMANDS = [
    // ── Core workflow ──────────────────────────────────────────────────────────
    ['status', 'status.js', 'Update task status in ORCHESTRATION.md'],
    ['handoff', 'handoff.js', 'Generate formatted HANDOFF commit body'],
    ['validate-commit', 'validate-commit.js', 'Validate conventional commit message format'],
    ['validate-handoff', 'validate-handoff.js', 'Validate HANDOFF metadata in commit body'],

    // ── Cost tracking ──────────────────────────────────────────────────────────
    ['cost-track', 'cost-track.js', 'Record token usage to COST-LEDGER.md'],
    ['cost-report', 'cost-report.js', 'Generate sprint cost report'],

    // ── Project management ─────────────────────────────────────────────────────
    ['project', 'projects-manager.js', 'Manage project registry (register|switch|list|remove)'],
    ['init', 'init-project.js', 'Bootstrap Roo Code Agency folder structure'],

    // ── Notifications ──────────────────────────────────────────────────────────
    ['client-bot', 'client-bot.js', 'Generate client standup summary'],
    ['notify', 'notify-telegram.js', 'Send Telegram notification'],

    // ── DevOps ─────────────────────────────────────────────────────────────────
    ['version-check', 'version-check.js', 'Verify Node.js version meets requirements'],
    ['cleanup', 'cleanup.js', 'Delete obsolete files per AGENCY-RULES §16'],
    ['cleanup-test-db', 'cleanup-test-db.js', 'Truncate all test database tables'],
    ['clean-temp', 'clean-temp.js', 'Scan for orphan temp files'],
    ['secret-scan', 'secret-scan.js', 'Pre-commit secret scanner — blocks API keys, passwords, tokens'],
    ['telemetry', 'telemetry.js', 'Event telemetry pipeline — log, monitor, stats'],
    ['chaos-monkey', 'chaos-monkey.js', 'Run P0 guard chaos monkey tests'],
    ['escalate', 'escalate-lead.js', 'Check gate circuit breaker for failing tasks'],
    ['github', 'github.js', 'GitHub API — init repo, push, issues, PRs'],
    ['terminal', 'terminal-session.js', 'Terminal helper & session manager'],
    ['hitl', 'hitl-server.js', 'HITL approval webhook server — Express on port 3177'],
    ['notify-hitl', 'notify-hitl.js', 'Send Telegram HITL notification with inline buttons'],
    ['sync-models', 'sync-models.js', 'Sync model_overrides from .zoo/config.json to .roomodes'],
    ['dispatch', 'dispatcher.js', 'Parallel task dispatcher — spawns independent tasks concurrently'],
    ['docs', 'auto-docs.js', 'Self-updating documentation — sync scripts + changelog'],
    ['memory', 'memory.js', 'Semantic memory — store, recall, stats, purge'],
    ['close-tabs', 'close-tabs.js', 'Close all VS Code editor tabs via workbench.action.closeAllEditors'],

    // ── Gates (Sprint 11-16) ─────────────────────────────────────────────────────
    ['preflight-gate', 'preflight-gate.js', 'Pre-Flight Gate — pass/check/reset/status'],
    ['post-task-gate', 'post-task-gate.js', 'Post-Task Gate — 6 checkpoint validation'],
    ['quality-gate', 'quality-gate.js', 'Quality Gate — 10 output quality checks'],
    ['compliance-check', 'compliance-check.js', 'Compliance — 7 automated rule checks'],

    // ── Automation (Sprint 17-18) ────────────────────────────────────────────────
    ['auto-assign', 'auto-assign.js', 'Auto-assign tasks to agents via fileRegex'],
    ['contract-gen', 'contract-gen.js', 'Generate draft contracts from controller code'],
    ['retro-report', 'retro-report.js', 'Generate sprint retrospective report'],

    // ── Maintenance ──────────────────────────────────────────────────────────────
    ['inject-grounding', 'inject-grounding.js', 'Inject GROUNDING section into all agents'],
    ['update-roomodes', 'update-roomodes.js', 'Update fileRegex patterns in .roomodes'],
    ['fix-codeagent-regex', 'fix-codeagent-regex.js', 'Fix code-agent regex to allow .roomodes edits'],
    ['inject-pfg-oath', 'inject-pfg-oath.js', 'Inject PFG oath into all 31 agents'],

    // ── PowerShell scripts (invoked via powershell -File) ──────────────────────
    ['release', 'release-s14.5.ps1', '[PS] Run release script for sprint s14.5'],
    ['init-ps', 'init-project.ps1', '[PS] Bootstrap project via PowerShell'],
    ['cleanup-jenga', 'cleanup-jengaprojects.ps1', '[PS] Cleanup jengaprojects workspace'],

    // ── Sprint 20b+20c ─────────────────────────────────────────────────────────
    ['init-wizard', 'init-wizard.js', 'Interactive project setup wizard (stdin prompts)'],
    ['metrics', 'metrics.js', 'Agent performance metrics — completion, error, rework, tokens'],
];

// ── Help Menu ────────────────────────────────────────────────────────────────

function showHelp(exitCode = 0) {
    const scriptName = path.basename(process.argv[1]);
    console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║          ZooCode Agency — Unified CLI               ║
  ╚══════════════════════════════════════════════════════╝

  Usage:
    node ${scriptName} <command> [args...]
    npm run agency -- <command> [args...]

  Commands:
`);
    // Group commands by category
    console.log('  ── Core Workflow ──────────────────────────────');
    for (const [cmd, , desc] of COMMANDS.slice(0, 4)) {
        console.log(`    ${cmd.padEnd(18)} ${desc}`);
    }
    console.log('');
    console.log('  ── Cost Tracking ──────────────────────────────');
    for (const [cmd, , desc] of COMMANDS.slice(4, 6)) {
        console.log(`    ${cmd.padEnd(18)} ${desc}`);
    }
    console.log('');
    console.log('  ── Project Management ─────────────────────────');
    for (const [cmd, , desc] of COMMANDS.slice(6, 8)) {
        console.log(`    ${cmd.padEnd(18)} ${desc}`);
    }
    console.log('');
    console.log('  ── Notifications ──────────────────────────────');
    for (const [cmd, , desc] of COMMANDS.slice(8, 10)) {
        console.log(`    ${cmd.padEnd(18)} ${desc}`);
    }
    console.log('');
    console.log('  ── DevOps ─────────────────────────────────────');
    for (const [cmd, , desc] of COMMANDS.slice(10, 27)) {
        console.log(`    ${cmd.padEnd(18)} ${desc}`);
    }
    console.log('');
    console.log('  ── Gates (Sprint 11-16) ───────────────────────');
    for (const [cmd, , desc] of COMMANDS.slice(27, 31)) {
        console.log(`    ${cmd.padEnd(18)} ${desc}`);
    }
    console.log('');
    console.log('  ── Automation (Sprint 17-18) ──────────────────');
    for (const [cmd, , desc] of COMMANDS.slice(31, 34)) {
        console.log(`    ${cmd.padEnd(18)} ${desc}`);
    }
    console.log('');
    console.log('  ── Maintenance ─────────────────────────────────');
    for (const [cmd, , desc] of COMMANDS.slice(34, 38)) {
        console.log(`    ${cmd.padEnd(18)} ${desc}`);
    }
    console.log('');
    console.log('  ── PowerShell (via powershell -File) ──────────');
    for (const [cmd, , desc] of COMMANDS.slice(38)) {
        console.log(`    ${cmd.padEnd(18)} ${desc}`);
    }
    console.log('');
    console.log('  Examples:');
    console.log(`    node ${scriptName} status --task 7.1 --status DONE`);
    console.log(`    node ${scriptName} handoff --from code-agent --to lead-architect --task S14`);
    console.log(`    node ${scriptName} cost-track --task S14.6 --tokens 15000/3000 --agent code-agent`);
    console.log(`    node ${scriptName} project list`);
    console.log(`    node ${scriptName} chaos-monkey`);
    console.log('');
    process.exit(exitCode);
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
    const args = process.argv.slice(2);

    // No args → show help
    if (args.length === 0) {
        showHelp(0);
    }

    const cmd = args[0];
    const cmdArgs = args.slice(1);

    // --help or -h on any command → show help
    if (cmd === '--help' || cmd === '-h') {
        showHelp(0);
    }

    // Look up the command
    const entry = COMMANDS.find(([name]) => name === cmd);
    if (!entry) {
        console.error(`\n  ❌ Unknown command: "${cmd}"`);
        console.error(`  Run "node ${path.basename(process.argv[1])} --help" for available commands.\n`);
        process.exit(1);
    }

    const [, scriptRelPath] = entry;
    const scriptPath = path.join(SCRIPTS_DIR, scriptRelPath);

    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
        console.error(`\n  ❌ Script not found: ${scriptPath}\n`);
        process.exit(1);
    }

    // Build the command to execute
    let execCmd;
    const ext = path.extname(scriptRelPath);
    if (ext === '.ps1') {
        // PowerShell script
        execCmd = `powershell -File "${scriptPath}" ${cmdArgs.join(' ')}`;
    } else {
        // Node.js script
        execCmd = `node "${scriptPath}" ${cmdArgs.join(' ')}`;
    }

    try {
        execSync(execCmd, { stdio: 'inherit' });
    } catch (err) {
        // Passthrough the error code from the underlying script
        process.exit(err.status !== null ? err.status : 1);
    }
}

main();
