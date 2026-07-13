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

console.warn('⚠️ DEPRECATED: post-task-gate.js is superseded by enforcer.js');
console.warn('  Use: node .agency/scripts/enforcer.js post --task <id> --agent <slug>');

function parseArgs() {
    const args = process.argv.slice(2);
    const command = args[0];
    const opts = { agent: null, task: null };

    for (let i = 1; i < args.length; i++) {
        switch (args[i]) {
            case '--agent': opts.agent = args[++i]; break;
            case '--task': opts.task = args[++i]; break;
        }
    }

    return { command, opts };
}

function main() {
    const { command, opts } = parseArgs();

    if (!command || command === '--help' || command === '-h') {
        console.log('');
        console.log('  ╔══════════════════════════════════════════════════════╗');
        console.log('  ║   Post-Task Gate (DEPRECATED — delegates to enforcer.js) ║');
        console.log('  ╚══════════════════════════════════════════════════════╝');
        console.log('');
        console.log('  This script is deprecated. Use instead:');
        console.log('    node .agency/scripts/enforcer.js post --task <id> --agent <slug>');
        console.log('');
        console.log('  Legacy usage:');
        console.log('    node .agency/scripts/post-task-gate.js complete --task <id> --agent <slug>');
        console.log('');
        process.exit(0);
    }

    let enforcerArgs;
    switch (command) {
        case 'complete':
            enforcerArgs = ['post', '--task', opts.task, '--agent', opts.agent];
            break;
        default:
            console.error('FAIL: Unknown command "' + command + '". Use "complete".');
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
