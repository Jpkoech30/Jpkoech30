#!/usr/bin/env node

/**
 * escalate-lead.js — Gate Circuit Breaker
 *
 * Reads ORCHESTRATION.md and finds tasks whose gate fail_count exceeds 3.
 * Generates an escalation alert for each failing task, or reports all clear.
 *
 * Usage:
 *   node .agency/scripts/escalate-lead.js --all
 *   node .agency/scripts/escalate-lead.js --task S14.6
 *
 * Exit codes:
 *   0 — All gates passing or no escalation needed
 *   1 — Escalation required (tasks found with fail_count > 3)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const ORCHESTRATION_PATH = path.join(ROOT, 'ORCHESTRATION.md');

// ── CLI Parsing ──────────────────────────────────────────────────────────────

function parseArgs() {
    const args = process.argv.slice(2);
    const opts = { task: null, all: false };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--task' && i + 1 < args.length) {
            opts.task = args[++i];
        }
        if (args[i] === '--all') {
            opts.all = true;
        }
    }

    return opts;
}

// ── Gate Parsing ─────────────────────────────────────────────────────────────

/**
 * Parse ORCHESTRATION.md and find tasks with gate fail_count > 3.
 *
 * Expected table row format (within markdown tables):
 *   | task-id | ... | FAIL | N | YES/NO | ...
 *
 * Returns array of { id, gate, failCount, escalated } objects.
 */
function findFailingTasks(content, targetTaskId) {
    const lines = content.split('\n');
    const failures = [];
    let inTable = false;

    // Regex to match a gate-failure row:
    //   | <task-id> | ... | FAIL | <count> | <YES|NO> |
    // The fail_count column must be a number > 3
    const gateFailRe = /^\|\s*\*\*(.+?)\*\*\s*\|.*?\|\s*FAIL\s*\|\s*(\d+)\s*\|\s*(YES|NO)\s*\|/;

    for (const line of lines) {
        // Detect table boundaries by checking for markdown separator rows
        if (line.trim().startsWith('|---')) {
            inTable = true;
            continue;
        }
        if (line.trim() === '' && inTable) {
            inTable = false;
            continue;
        }

        if (!inTable) continue;

        const match = line.match(gateFailRe);
        if (!match) continue;

        const taskId = match[1].trim();
        const failCount = parseInt(match[2], 10);
        const escalated = match[3];

        // If a specific task is targeted, skip non-matching
        if (targetTaskId && taskId !== targetTaskId) continue;

        if (failCount > 3) {
            failures.push({
                id: taskId,
                gate: 'quality',
                failCount,
                escalated: escalated === 'YES',
                agent: extractAgentFromRow(line),
            });
        }
    }

    return failures;
}

/**
 * Extract agent slug from a table row (heuristic: find backtick-quoted slug).
 */
function extractAgentFromRow(row) {
    const agentMatch = row.match(/`([^`]+)`/);
    return agentMatch ? agentMatch[1] : 'unknown';
}

// ── Output ───────────────────────────────────────────────────────────────────

/**
 * Generate escalation alert for a failing task.
 */
function generateAlert(task) {
    const lines = [
        '🚨 ESCALATION REQUIRED',
        `Task ${task.id} failed gate ${task.gate} ${task.failCount} times.`,
        `Agent: ${task.agent}`,
        'Action required: Lead Architect intervention.',
        '',
    ];
    return lines.join('\n');
}

/**
 * Print all escalation alerts.
 */
function printAlerts(failures) {
    for (const task of failures) {
        console.log(generateAlert(task));
    }
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
    const opts = parseArgs();

    // Validate args: must have --all or --task
    if (!opts.all && !opts.task) {
        console.error('FAIL: Must specify --all or --task <id>');
        console.error('Usage: node escalate-lead.js --all');
        console.error('   or: node escalate-lead.js --task <id>');
        process.exit(1);
    }

    // Read ORCHESTRATION.md
    if (!fs.existsSync(ORCHESTRATION_PATH)) {
        console.error(`FAIL: ORCHESTRATION.md not found at ${ORCHESTRATION_PATH}`);
        process.exit(1);
    }

    const content = fs.readFileSync(ORCHESTRATION_PATH, 'utf-8');

    // Find failing tasks
    const failures = findFailingTasks(content, opts.task);

    if (failures.length === 0) {
        console.log('✅ All gates passing. No escalation needed.');
        process.exit(0);
    }

    // Print escalation alerts
    printAlerts(failures);
    process.exit(1);
}

main();
