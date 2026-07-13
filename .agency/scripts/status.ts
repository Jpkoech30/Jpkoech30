#!/usr/bin/env node


/**
 * status.js — CLI Status Updater for ORCHESTRATION.md
 *
 * Reads ORCHESTRATION.md, finds the task line matching the given task ID,
 * and prints the updated line with the new status for manual insertion.
 *
 * This script does NOT modify ORCHESTRATION.md directly to avoid corruption.
 *
 * Usage:
 *   node .agency/scripts/status.js --task 7.1 --status DONE
 *   node .agency/scripts/status.js --task "S14.3" --status REVIEW
 *
 * Valid statuses: PENDING, IN_PROGRESS, REVIEW, DONE, BLOCKED, HOTFIX
 *
 * Exit codes:
 *   0 — Task line found, updated version printed
 *   1 — Task not found, invalid args, or file error
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const TELEMETRY_SCRIPT = path.join(__dirname, 'telemetry.js');
const ORCHESTRATION_PATH = path.join(ROOT, 'ORCHESTRATION.md');

const VALID_STATUSES = ['PENDING', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED', 'HOTFIX'];

// ── CLI Parsing ──────────────────────────────────────────────────────────────

function parseArgs() {
    const args = process.argv.slice(2);
    const opts = { task: null, status: null, agent: null };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--task' && i + 1 < args.length) opts.task = args[++i];
        if (args[i] === '--status' && i + 1 < args.length) opts.status = args[++i].toUpperCase();
        if (args[i] === '--agent' && i + 1 < args.length) opts.agent = args[++i];
    }

    return opts;
}

// ── ORCHESTRATION.md Parsing ─────────────────────────────────────────────────

/**
 * Parse ORCHESTRATION.md and find the line containing the task reference.
 *
 * Task rows in ORCHESTRATION.md look like:
 *   | **7.1** | Create `.agency/scripts/cost-report.js` ... | `script` | `🔧 Code Agent` | PENDING | — |
 *
 * We search for the task ID in table rows (lines starting with '|').
 *
 * @param {string} content - Full content of ORCHESTRATION.md
 * @param {string} taskId - Task ID to find (e.g., "7.1", "S14.3")
 * @returns {{ lineIndex: number, line: string, statusColumn: number } | null}
 */
function findTaskLine(content, taskId) {
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Only look at table rows
        if (!line.startsWith('|')) continue;

        // Skip header and separator rows
        if (line.match(/^\|[-|\s]+\|$/)) continue;
        if (line.match(/^\|.*#.*\|.*Task\|/)) continue;

        // Check if this row contains our task ID
        // Task IDs appear as **7.1** or **S14.3** in cells
        const taskPattern = new RegExp(`\\*\\*${escapeRegex(taskId)}\\*\\*`);
        if (taskPattern.test(line)) {
            return { lineIndex: i, line: lines[i] };
        }
    }

    return null;
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Find the current status value in the task line.
 * Status is typically in the column before the Files column or at the end of the row.
 *
 * In the format: | # | Task | Type | Agent | Status | Files |
 * The status column is the 5th cell (index 4, 0-based).
 *
 * For simpler format: | # | Task | Agent | Status | Files |
 * The status column is the 4th cell (index 3, 0-based).
 *
 * We find it by searching for known status values.
 */
function findStatusInLine(line) {
    for (const status of VALID_STATUSES) {
        // Match status as a standalone cell value (between | characters)
        const escapedStatus = escapeRegex(status);
        const regex = new RegExp(`\\|\\s*${escapedStatus}\\s*\\|`);
        const match = line.match(regex);
        if (match) {
            return { status, index: match.index, fullMatch: match[0] };
        }
    }
    return null;
}

/**
 * Replace the status in the line with a new one.
 */
function replaceStatus(line, oldStatus, newStatus) {
    // Preserve the exact formatting by replacing only the status text
    // Match the status as a complete cell value
    const escapedOld = escapeRegex(oldStatus);
    const regex = new RegExp(`(\\|\\s*)${escapedOld}(\\s*\\|)`);
    return line.replace(regex, `$1${newStatus}$2`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
    const opts = parseArgs();

    // Validate required args
    const missing = [];
    if (!opts.task) missing.push('--task');
    if (!opts.status) missing.push('--status');

    if (missing.length > 0) {
        console.error(`FAIL: Missing required argument(s): ${missing.join(', ')}`);
        console.error('Usage: node status.js --task <id> --status <STATUS>');
        process.exit(1);
    }

    // Validate status
    if (!VALID_STATUSES.includes(opts.status)) {
        console.error(`FAIL: Invalid status "${opts.status}". Must be one of: ${VALID_STATUSES.join(', ')}`);
        process.exit(1);
    }

    // Read ORCHESTRATION.md
    if (!fs.existsSync(ORCHESTRATION_PATH)) {
        console.error(`FAIL: ORCHESTRATION.md not found at ${ORCHESTRATION_PATH}`);
        process.exit(1);
    }

    const content = fs.readFileSync(ORCHESTRATION_PATH, 'utf-8');

    // Find the task line
    const found = findTaskLine(content, opts.task);

    if (!found) {
        console.error(`FAIL: Task "${opts.task}" not found in ORCHESTRATION.md`);
        console.error('  Ensure the task ID matches the format used in the table (e.g., "7.1" or "S14.3").');
        process.exit(1);
    }

    // Find the current status
    const statusInfo = findStatusInLine(found.line);

    if (!statusInfo) {
        console.error(`FAIL: Could not detect current status in task line for "${opts.task}"`);
        console.error(`  Current line: ${found.line}`);
        process.exit(1);
    }

    // Replace with new status
    const updatedLine = replaceStatus(found.line, statusInfo.status, opts.status);

    if (updatedLine === found.line && statusInfo.status === opts.status) {
        console.log(`INFO: Status is already "${opts.status}". No change needed.`);
        console.log(`  ${updatedLine}`);
        process.exit(0);
    }

    // Print the update info
    console.log('PASS: Task status updated');
    console.log(`  Task:        ${opts.task}`);
    console.log(`  Old Status:  ${statusInfo.status}`);
    console.log(`  New Status:  ${opts.status}`);
    console.log(`  Line:        ${found.lineIndex + 1}`);
    console.log('');
    console.log('Updated line (paste into ORCHESTRATION.md):');
    console.log(updatedLine);

    // ── Telemetry: status transition ─────────────────────────────────
    if (opts.agent) {
        try {
            execSync(
                `node ${TELEMETRY_SCRIPT} log --event agent_invocation --task ${opts.task} --agent ${opts.agent} --status ${opts.status}`,
                { stdio: 'ignore', timeout: 10000 }
            );
        } catch (_) {
            // Telemetry failures must not block status updates
        }
    }

    process.exit(0);
}

main();
