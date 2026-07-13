#!/usr/bin/env node

/**
 * ⚠️ DEPRECATED — This script is superseded by enforcer.js
 * Use instead: node .agency/scripts/enforcer.js <phase> --agent <slug> --task <id>
 * This file kept for backward compatibility (30-day grace period).
 * Remove after 2026-08-11.
 */

const { execSync } = require('child_process');
const path = require('path');

const ENFORCER_PATH = path.resolve(__dirname, 'enforcer.js');

console.warn('⚠️ DEPRECATED: preflight-gate.js is superseded by enforcer.js');
console.warn('  Use: node .agency/scripts/enforcer.js pre --agent <slug> --task <id>');

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

function main() {
    const { command, agent, task } = parseArgs();

    let enforcerArgs;
    switch (command) {
        case 'pass':
            enforcerArgs = ['pre', '--agent', agent, '--task', task];
            break;
        case 'check':
            enforcerArgs = ['check', '--agent', agent];
            break;
        case 'reset':
            enforcerArgs = ['reset', '--task', task || 'unknown', '--force'];
            break;
        case 'status':
            enforcerArgs = ['status', '--task', task || 'unknown'];
            break;
        default:
            console.error('FAIL: Unknown command "' + command + '".');
            console.error('  Usage: node .agency/scripts/preflight-gate.js <pass|check|reset|status> [options]');
            process.exit(1);
    }

    try {
        execSync('node "' + ENFORCER_PATH + '" ' + enforcerArgs.join(' '), {
            stdio: 'inherit',
            timeout: 30000,
        });
    } catch {
        process.exit(1);
    }
}

main();
