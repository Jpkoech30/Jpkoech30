#!/usr/bin/env node

/**
 * ⚠️ DEPRECATED — This script is replaced by enforcer.js
 *
 *   Use: node .agency/scripts/enforcer.js post --task <id> --agent <slug>
 *   See: npm run agency enforcer -- --help
 *
 * This shim delegates to enforcer.js for backward compatibility.
 */

console.log('⚠️ DEPRECATED: This script is replaced by enforcer.js');
console.log('  Use: node .agency/scripts/enforcer.js post --task <id> --agent <slug> [--ci]');
console.log('  See: npm run agency enforcer -- --help');

// Delegate to enforcer.js
require('./enforcer.js');

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const MEMORY_STORE_PATH = path.join(ROOT, '.agency', 'memory', 'store.json');
const SENTINEL_PATH = path.join(ROOT, '.agency', '.preflight-passed');
const E2E_DIR = path.join(ROOT, 'e2e');
const TELEMETRY_SCRIPT = path.join(__dirname, 'telemetry.js');
const QUALITY_GATE_SCRIPT = path.join(__dirname, 'quality-gate.js');
const COMPLIANCE_CHECK_SCRIPT = path.join(__dirname, 'compliance-check.js');

// ── Temp file patterns ──────────────────────────────────────────────────────

const TEMP_PATTERNS = [
    /^temp-/,
    /\.bak$/,
    /^debug-/,
    /^ROO-/,
    /^PLAN-/,
    /^\$null/,
];

// ── Checkpoint counters ─────────────────────────────────────────────────────

let passedCount = 0;
let failedCount = 0;

// ── Helpers ─────────────────────────────────────────────────────────────────

function callTelemetry(task, agent, status, details) {
    try {
        execSync(
            `node "${TELEMETRY_SCRIPT}" log --event post-task-gate:check --agent "${agent}" --task "${task}" --status ${status}`,
            { cwd: ROOT, stdio: 'ignore', timeout: 10000 }
        );
    } catch {
        console.error('  ❌ Telemetry logging failed (blocking)');
        process.exit(1);
    }
}

function pass(msg) {
    console.log(`  ${msg}`);
    passedCount++;
}

function fail(msg) {
    console.log(`  ${msg}`);
    failedCount++;
}

// ── PTG-C1: Memory Stored ───────────────────────────────────────────────────

/**
 * Check if memory.js store was called for this task+agent.
 * Reads .agency/memory/store.json (JSON fallback) and scans for matching task AND agent.
 * Also attempts SQLite read if available.
 */
function checkMemoryStored(task, agent) {
    console.log('');
    console.log('  ── PTG-C1: Memory Stored ──');

    // Check JSON store first
    if (fs.existsSync(MEMORY_STORE_PATH)) {
        try {
            const store = JSON.parse(fs.readFileSync(MEMORY_STORE_PATH, 'utf-8'));
            const match = store.find(m =>
                m.taskId === task && m.agentSlug === agent
            );

            if (match) {
                pass(`✅ PTG-C1: Memory stored for task "${task}" by agent "${agent}"`);
                return;
            }
        } catch {
            // Fall through to fail
        }
    }

    // Also check project-scoped memory stores
    const projectsDir = path.join(ROOT, '.agency', 'projects');
    if (fs.existsSync(projectsDir)) {
        const projectDirs = fs.readdirSync(projectsDir, { withFileTypes: true })
            .filter(d => d.isDirectory());

        for (const dir of projectDirs) {
            const projectStorePath = path.join(projectsDir, dir.name, 'memory', 'store.json');
            if (fs.existsSync(projectStorePath)) {
                try {
                    const store = JSON.parse(fs.readFileSync(projectStorePath, 'utf-8'));
                    const match = store.find(m =>
                        m.taskId === task && m.agentSlug === agent
                    );
                    if (match) {
                        pass(`✅ PTG-C1: Memory stored for task "${task}" by agent "${agent}" (project: ${dir.name})`);
                        return;
                    }
                } catch {
                    // Continue checking
                }
            }
        }
    }

    fail(`❌ PTG-C1: Memory NOT found for task "${task}" by agent "${agent}".\n` +
        `     Run: node .agency/scripts/memory.js store --content "..." --tags "..." --task "${task}" --agent "${agent}"`);
}

// ── PTG-C2: Temp Files Cleaned ──────────────────────────────────────────────

/**
 * Scan root + e2e/ for temp file patterns.
 * Returns list of offending files.
 */
function checkTempFiles() {
    console.log('');
    console.log('  ── PTG-C2: Temp Files Cleaned ──');

    const offending = [];

    // Scan root directory
    try {
        const rootFiles = fs.readdirSync(ROOT);
        for (const file of rootFiles) {
            // Skip .agency, node_modules, .git, etc
            if (file.startsWith('.') && file !== '.gitignore') {
                // Still check .agency for temp files
                continue;
            }
            if (file === 'node_modules' || file === '.git') continue;

            // Check all files in root
            if (TEMP_PATTERNS.some(pattern => pattern.test(file))) {
                offending.push(path.join(ROOT, file));
            }
        }
    } catch {
        // Cannot read root
    }

    // Scan root level files (non-recursive for root)
    try {
        const rootEntries = fs.readdirSync(ROOT, { withFileTypes: true });
        for (const entry of rootEntries) {
            if (!entry.isFile()) continue;
            if (TEMP_PATTERNS.some(pattern => pattern.test(entry.name))) {
                const fullPath = path.join(ROOT, entry.name);
                if (!offending.includes(fullPath)) {
                    offending.push(fullPath);
                }
            }
        }
    } catch {
        // Cannot read root
    }

    // Scan e2e/ directory
    if (fs.existsSync(E2E_DIR)) {
        try {
            const e2eFiles = fs.readdirSync(E2E_DIR);
            for (const file of e2eFiles) {
                if (TEMP_PATTERNS.some(pattern => pattern.test(file))) {
                    offending.push(path.join(E2E_DIR, file));
                }
            }
        } catch {
            // Cannot read e2e/
        }
    }

    if (offending.length === 0) {
        pass('✅ PTG-C2: No temp files found');
    } else {
        const fileList = offending.map(f => path.relative(ROOT, f)).join(', ');
        fail(`❌ PTG-C2: Temp files found: ${fileList}.\n` +
            `     Run cleanup: node .agency/scripts/clean-temp.js (or delete manually)`);
    }
}

// ── PTG-C3: Handoff Metadata Valid ──────────────────────────────────────────

/**
 * Build a mock commit message from provided args and validate all required fields.
 * Required: HANDOFF, ARTIFACTS, CONTRACT, STATUS, MEMORY
 */
function checkHandoffMetadata(handoff, artifacts, contract, status, memory) {
    console.log('');
    console.log('  ── PTG-C3: Handoff Metadata Valid ──');

    const missing = [];

    // Build mock commit message
    const fields = {
        HANDOFF: handoff || '',
        ARTIFACTS: artifacts || '',
        CONTRACT: contract || '',
        STATUS: status || '',
        MEMORY: memory || '',
    };

    // Validate each field is present and non-empty
    for (const [field, value] of Object.entries(fields)) {
        const cleanValue = value.replace(/^(HANDOFF:|ARTIFACTS:|CONTRACT:|STATUS:|MEMORY:)/, '').trim();
        if (!cleanValue) {
            missing.push(field);
        }
    }

    if (missing.length === 0) {
        pass('✅ PTG-C3: All handoff fields valid');
        console.log(`     HANDOFF:  ${fields.HANDOFF.replace(/^HANDOFF:/, '')}`);
        console.log(`     ARTIFACTS: ${fields.ARTIFACTS.replace(/^ARTIFACTS:/, '')}`);
        console.log(`     CONTRACT:  ${fields.CONTRACT.replace(/^CONTRACT:/, '')}`);
        console.log(`     STATUS:    ${fields.STATUS.replace(/^STATUS:/, '')}`);
        console.log(`     MEMORY:    ${fields.MEMORY.replace(/^MEMORY:/, '')}`);
    } else {
        fail(`❌ PTG-C3: Missing fields: ${missing.join(', ')}.\n` +
            `     Add: HANDOFF, ARTIFACTS, CONTRACT, STATUS, MEMORY`);
    }
}

// ── PTG-C4: PFG Sentinel Reset ──────────────────────────────────────────────

/**
 * Check if .agency/.preflight-passed exists.
 * If yes, auto-run preflight-gate.js reset.
 */
function checkPfgSentinel() {
    console.log('');
    console.log('  ── PTG-C4: PFG Sentinel Reset ──');

    if (fs.existsSync(SENTINEL_PATH)) {
        console.log('  ⚠ PFG sentinel still active. Auto-resetting...');
        try {
            execSync(
                `node "${path.join(__dirname, 'preflight-gate.js')}" reset`,
                { cwd: ROOT, stdio: 'inherit', timeout: 10000 }
            );
            pass('✅ PTG-C4: Sentinel cleared (auto-reset)');
        } catch {
            fail('❌ PTG-C4: Failed to auto-reset sentinel. Run manually: node .agency/scripts/preflight-gate.js reset');
        }
    } else {
        pass('✅ PTG-C4: Sentinel already clear (no sentinel file found)');
    }
}

// ── PTG-C5: Quality Gate ────────────────────────────────────────────────────

/**
 * Run the quality gate script (QG-C1 through QG-C7).
 * Delegates to quality-gate.js check --project <ROOT>.
 * If quality-gate.js exits 0 → pass. If exits 1 → block.
 */
function checkQualityGate() {
    console.log('');
    console.log('  ── PTG-C5: Quality Gate ──');

    if (!fs.existsSync(QUALITY_GATE_SCRIPT)) {
        fail(`❌ PTG-C5: Quality Gate script not found at ${QUALITY_GATE_SCRIPT}`);
        return;
    }

    try {
        const qgResult = execSync(
            `node "${QUALITY_GATE_SCRIPT}" check --project "${ROOT}"`,
            { cwd: ROOT, stdio: 'pipe', timeout: 120000, encoding: 'utf-8' }
        );
        const qgOutput = qgResult.toString();
        console.log(qgOutput);
        if (qgOutput.includes('[BLOCK]')) {
            fail('❌ PTG-C5: Quality Gate FAILED — blocking issues found');
        } else {
            pass('✅ PTG-C5: Quality Gate passed');
        }
    } catch (qgErr) {
        // quality-gate.js exits 1 on block — this is expected
        const qgOutput = qgErr.stdout ? qgErr.stdout.toString() : (qgErr.message || '');
        console.log(qgOutput);

        if (qgOutput.includes('[BLOCK]') || qgErr.status === 1) {
            fail('❌ PTG-C5: Quality Gate FAILED — blocking issues found');
        } else {
            // Quality Gate error (e.g., script crash)
            fail(`❌ PTG-C5: Quality Gate error — ${qgErr.message || 'Unknown error'}`);
        }
    }
}

// ── PTG-C6: Compliance Check ────────────────────────────────────────────────

/**
 * Run the compliance check script (CC-1 through CC-7).
 * Delegates to compliance-check.js --project <ROOT>.
 * If compliance-check.js exits 0 → pass. If exits 1 → block.
 */
function checkComplianceCheck() {
    console.log('');
    console.log('  ── PTG-C6: Compliance Check ──');

    if (!fs.existsSync(COMPLIANCE_CHECK_SCRIPT)) {
        fail(`❌ PTG-C6: Compliance Check script not found at ${COMPLIANCE_CHECK_SCRIPT}`);
        return;
    }

    try {
        const ccResult = execSync(
            `node "${COMPLIANCE_CHECK_SCRIPT}" --project "${ROOT}"`,
            { cwd: ROOT, stdio: 'pipe', timeout: 120000, encoding: 'utf-8' }
        );
        const ccOutput = ccResult.toString();
        console.log(ccOutput);
        if (ccOutput.includes('[BLOCK]')) {
            fail('❌ PTG-C6: Compliance Check FAILED — blocking issues found');
        } else {
            pass('✅ PTG-C6: Compliance Check passed');
        }
    } catch (ccErr) {
        const ccOutput = ccErr.stdout ? ccErr.stdout.toString() : (ccErr.message || '');
        console.log(ccOutput);

        if (ccOutput.includes('[BLOCK]') || ccErr.status === 1) {
            fail('❌ PTG-C6: Compliance Check FAILED — blocking issues found');
        } else {
            fail(`❌ PTG-C6: Compliance Check error — ${ccErr.message || 'Unknown error'}`);
        }
    }
}

// ── CLI Parsing ─────────────────────────────────────────────────────────────

function parseArgs() {
    const args = process.argv.slice(2);
    const command = args[0];
    const opts = {
        task: null,
        agent: null,
        handoff: null,
        artifacts: null,
        contract: null,
        status: null,
        memory: null,
    };

    for (let i = 1; i < args.length; i++) {
        switch (args[i]) {
            case '--task': opts.task = args[++i]; break;
            case '--agent': opts.agent = args[++i]; break;
            case '--handoff': opts.handoff = args[++i]; break;
            case '--artifacts': opts.artifacts = args[++i]; break;
            case '--contract': opts.contract = args[++i]; break;
            case '--status': opts.status = args[++i]; break;
            case '--memory': opts.memory = args[++i]; break;
        }
    }

    return { command, opts };
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
    const { command, opts } = parseArgs();

    if (!command || command === '--help' || command === '-h') {
        console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║        Post-Task Gate — 6 Checkpoint Enforcement     ║
  ╚══════════════════════════════════════════════════════╝

  Usage:
    node .agency/scripts/post-task-gate.js complete --task <id> --agent <slug>
        [--handoff <target>] [--artifacts <files>] [--contract <id>]
        [--status <STATUS>] [--memory <field>]

  Commands:
    complete    Run all 6 PTG checkpoints (C1-C6)

  Checkpoints:
    PTG-C1  Memory stored?       — Checks store.json for matching task+agent
    PTG-C2  Temp files cleaned?   — Scans root + e2e/ for temp patterns
    PTG-C3  Handoff valid?        — Validates HANDOFF, ARTIFACTS, CONTRACT, STATUS, MEMORY
    PTG-C4  Sentinel reset?       — Auto-resets if .preflight-passed exists
    PTG-C5  Quality Gate?         — Runs 8 QG checks (hallucination, contract, diff, tests, plan, TS, deps, design principles)
    PTG-C6  Compliance Check?     — Runs CC-1 through CC-7 (compliance checklist)

  Exit codes:
    0 — All checkpoints pass
    1 — One or more checkpoints fail

  Examples:
    node .agency/scripts/post-task-gate.js complete --task "14.1" --agent "jengabooks-code"
    node .agency/scripts/post-task-gate.js complete --task "14.1" --agent "jengabooks-code" --handoff "qa-automator" --artifacts "post-task-gate.js" --contract "agency-post-task-gate@1.0.0" --status DONE --memory stored
`);
        process.exit(0);
    }

    if (command !== 'complete') {
        console.error(`FAIL: Unknown command "${command}". Use "complete" to run all checkpoints.`);
        process.exit(1);
    }

    // Validate required args
    const missing = [];
    if (!opts.task) missing.push('--task');
    if (!opts.agent) missing.push('--agent');

    if (missing.length > 0) {
        console.error(`FAIL: Missing required argument(s): ${missing.join(', ')}`);
        console.error('Usage: node .agency/scripts/post-task-gate.js complete --task <id> --agent <slug> [options]');
        process.exit(1);
    }

    console.log('');
    console.log(`  ╔══════════════════════════════════════════╗`);
    console.log(`  ║   POST-TASK GATE — ${opts.task.padEnd(28)}║`);
    console.log(`  ║   Agent: ${opts.agent.padEnd(40)}║`);
    console.log(`  ╚══════════════════════════════════════════╝`);

    // ── Run all 6 checkpoints ─────────────────────────────────────────

    checkMemoryStored(opts.task, opts.agent);
    checkTempFiles();
    checkHandoffMetadata(opts.handoff, opts.artifacts, opts.contract, opts.status, opts.memory);
    checkPfgSentinel();
    checkQualityGate();
    checkComplianceCheck();

    // ── Summary ────────────────────────────────────────────────────────

    const total = passedCount + failedCount;
    console.log('');
    console.log(`  ── Summary: ${passedCount}/${total} checkpoints passed ──`);

    // Telemetry logging (blocking)
    if (failedCount === 0) {
        console.log('');
        console.log('  🏁 POST-TASK GATE: ALL PASS');
        callTelemetry(opts.task, opts.agent, 'PASSED');
        process.exit(0);
    } else {
        console.log('');
        console.log('  🏁 POST-TASK GATE: FAILED — fix checkpoints above');
        callTelemetry(opts.task, opts.agent, 'FAILED');
        process.exit(1);
    }
}

main();
