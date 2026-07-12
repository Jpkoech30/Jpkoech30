#!/usr/bin/env node

/**
 * ⚠️ DEPRECATED — This script is replaced by enforcer.js
 *
 *   Use: node .agency/scripts/enforcer.js <phase> [args]
 *   See: npm run agency enforcer -- --help
 *
 * This shim delegates to enforcer.js for backward compatibility.
 */

console.log('⚠️ DEPRECATED: This script is replaced by enforcer.js');
console.log('  Use: node .agency/scripts/enforcer.js <phase> [args]');
console.log('  See: npm run agency enforcer -- --help');

// Delegate to enforcer.js
require('./enforcer.js');

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const SENTINEL_PATH = path.join(ROOT, '.agency', '.preflight-passed');

// ── Helpers ─────────────────────────────────────────────────────────────────

function readSentinel() {
    try {
        return JSON.parse(fs.readFileSync(SENTINEL_PATH, 'utf-8'));
    } catch {
        return null;
    }
}

function writeSentinel(data) {
    const dir = path.dirname(SENTINEL_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SENTINEL_PATH, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function deleteSentinel() {
    try {
        fs.unlinkSync(SENTINEL_PATH);
        return true;
    } catch {
        return false;
    }
}

function callTelemetry(agent, task, status) {
    try {
        execSync(
            `node .agency/scripts/telemetry.js log --event preflight-gate:pass --agent "${agent}" --task "${task}" --status ${status}`,
            { cwd: ROOT, stdio: 'ignore', timeout: 10000 }
        );
    } catch {
        // Telemetry logging is non-blocking
    }
}

function computeOathHash(agent, task) {
    // Simple hash of agent + task for provenance
    let hash = 0;
    const str = `${agent}:${task}`;
    for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + ch;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
}

// ── Commands ────────────────────────────────────────────────────────────────

function cmdPass(agent, task) {
    if (!agent || !task) {
        console.error('FAIL: --agent and --task are required for pass command.');
        process.exit(1);
    }

    const sentinel = {
        agent,
        timestamp: new Date().toISOString(),
        task,
        oathHash: computeOathHash(agent, task),
    };

    writeSentinel(sentinel);
    console.log(`✓ Pre-flight passed for agent "${agent}"`);

    // Non-blocking telemetry call
    callTelemetry(agent, task, 'PASSED');

    process.exit(0);
}

function cmdCheck(agent) {
    if (!agent) {
        console.error('FAIL: --agent is required for check command.');
        process.exit(1);
    }

    const sentinel = readSentinel();
    if (!sentinel) {
        console.error('FAIL: No pre-flight sentinel found. Run pass command first.');
        process.exit(1);
    }

    if (sentinel.agent !== agent) {
        console.error(
            `FAIL: Agent mismatch. Sentinel is for "${sentinel.agent}", but check was called for "${agent}".`
        );
        process.exit(1);
    }

    console.log(`✓ Pre-flight check passed for agent "${agent}"`);
    process.exit(0);
}

function cmdReset() {
    if (deleteSentinel()) {
        console.log('✓ Pre-flight sentinel deleted.');
    } else {
        console.log('No pre-flight sentinel to delete.');
    }
    process.exit(0);
}

function cmdStatus() {
    const sentinel = readSentinel();
    if (!sentinel) {
        console.log('STATUS: No sentinel');
        process.exit(0);
    }

    console.log('Pre-flight sentinel:');
    console.log(`  Agent:     ${sentinel.agent}`);
    console.log(`  Timestamp: ${sentinel.timestamp}`);
    console.log(`  Task:      ${sentinel.task}`);
    console.log(`  oathHash:  ${sentinel.oathHash}`);
    process.exit(0);
}

// ── CLI Parser ──────────────────────────────────────────────────────────────

function parseArgs() {
    const args = process.argv.slice(2);
    const command = args[0];
    const opts = { agent: null, task: null };

    for (let i = 1; i < args.length; i++) {
        if (args[i] === '--agent' && i + 1 < args.length) {
            opts.agent = args[++i];
        } else if (args[i] === '--task' && i + 1 < args.length) {
            opts.task = args[++i];
        }
    }

    return { command, ...opts };
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
    const { command, agent, task } = parseArgs();

    switch (command) {
        case 'pass':
            cmdPass(agent, task);
            break;
        case 'check':
            cmdCheck(agent);
            break;
        case 'reset':
            cmdReset();
            break;
        case 'status':
            cmdStatus();
            break;
        default:
            console.error(
                `FAIL: Unknown command "${command}".\n` +
                `  Usage: node .agency/scripts/preflight-gate.js <pass|check|reset|status> [options]`
            );
            process.exit(1);
    }
}

main();
