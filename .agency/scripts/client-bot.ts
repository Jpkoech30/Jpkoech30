#!/usr/bin/env node

/**
 * client-bot.js — Client Standup Summary Bot
 *
 * Reads ORCHESTRATION.md to extract current sprint task statuses and
 * outputs a formatted markdown standup summary suitable for piping to
 * Telegram, email, or Slack.
 *
 * Usage:
 *   node .agency/scripts/client-bot.js --standup
 *   node .agency/scripts/client-bot.js --notify
 *
 *   --standup  Outputs a daily standup summary with task breakdown
 *   --notify   Outputs a concise status notification
 *
 * Environment:
 *   ORCHESTRATION.md at project root (auto-detected)
 *
 * Exit codes:
 *   0 — Summary generated successfully
 *   1 — Missing args, file not found, or parse error
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const ORCHESTRATION_PATH = path.join(ROOT, 'ORCHESTRATION.md');

// ── CLI Parsing ──────────────────────────────────────────────────────────────

function parseArgs() {
    const args = process.argv.slice(2);
    const opts = { standup: false, notify: false };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--standup') opts.standup = true;
        if (args[i] === '--notify') opts.notify = true;
    }

    return opts;
}

// ── ORCHESTRATION.md Parser ──────────────────────────────────────────────────

/**
 * Represents a parsed task row from the sprint table.
 * @typedef {Object} TaskRow
 * @property {string} id - Task ID (e.g., "7.5")
 * @property {string} description - Task description
 * @property {string} status - Task status (PENDING, DONE, etc.)
 */

/**
 * Parse ORCHESTRATION.md and extract all task rows with their status.
 *
 * Looks for table rows in sprint tables that match:
 *   | **<id>** | <description> ... | <status> |
 *
 * @param {string} content - Full content of ORCHESTRATION.md
 * @returns {TaskRow[]} Array of parsed tasks
 */
function parseTasks(content) {
    const lines = content.split('\n');
    const tasks = [];

    const tableRowRegex = /^\|\s*\*\*([\d.]+)\*\*\s*\|(.+?)\|/;

    for (const rawLine of lines) {
        const line = rawLine.trim();

        // Only look at table rows
        if (!line.startsWith('|')) continue;

        // Skip header, separator, and non-standard rows
        if (line.match(/^\|[-|\s]+\|$/)) continue;          // separator
        if (line.match(/^\|.*#.*\|/)) continue;              // header
        if (line.match(/^\|.*Design Principles\|/)) continue; // design principles table

        const match = line.match(tableRowRegex);
        if (!match) continue;

        const taskId = match[1];

        // Skip non-task rows (e.g., integration rows without numeric IDs)
        if (!/^\d+(\.\d+)?$/.test(taskId)) continue;

        // Extract the status — it's the last cell-like segment before the final pipe
        // Status values are: PENDING, IN_PROGRESS, REVIEW, DONE, BLOCKED, HOTFIX
        const statusMatch = line.match(/\|\s*(PENDING|IN_PROGRESS|REVIEW|DONE|BLOCKED|HOTFIX)\s*\|/);
        const status = statusMatch ? statusMatch[1] : 'UNKNOWN';

        // Extract description from the second cell
        const description = match[2].trim();

        tasks.push({ id: taskId, description, status });
    }

    return tasks;
}

/**
 * Categorize tasks by their status.
 * @param {TaskRow[]} tasks
 * @returns {{ completed: TaskRow[], inProgress: TaskRow[], pending: TaskRow[], blocked: TaskRow[] }}
 */
function categorizeTasks(tasks) {
    const completed = [];
    const inProgress = [];
    const pending = [];
    const blocked = [];

    for (const task of tasks) {
        switch (task.status) {
            case 'DONE':
                completed.push(task);
                break;
            case 'IN_PROGRESS':
                inProgress.push(task);
                break;
            case 'BLOCKED':
                blocked.push(task);
                break;
            case 'PENDING':
            case 'REVIEW':
            case 'HOTFIX':
            default:
                pending.push(task);
                break;
        }
    }

    return { completed, inProgress, pending, blocked };
}

/**
 * Build a task list as a bullet string.
 * @param {TaskRow[]} tasks
 * @param {string} prefix - Emoji prefix for each line (e.g., "✅")
 * @returns {string}
 */
function formatTaskList(tasks, prefix) {
    if (tasks.length === 0) return `  ${prefix} _None_`;
    return tasks.map(t => `  ${prefix} **${t.id}** — ${t.description}`).join('\n');
}

/**
 * Build the standup summary markdown.
 * @param {{ completed: TaskRow[], inProgress: TaskRow[], pending: TaskRow[], blocked: TaskRow[] }} categorized
 * @returns {string}
 */
function buildStandupSummary(categorized) {
    const { completed, inProgress, pending, blocked } = categorized;

    const today = new Date().toISOString().split('T')[0];

    return [
        `📋 **Daily Standup — ${today}**`,
        '',
        '✅ **Completed:**',
        formatTaskList(completed, '✅'),
        '',
        '🔄 **In Progress:**',
        formatTaskList(inProgress, '🔄'),
        '',
        '⏳ **Pending:**',
        formatTaskList(pending, '⏳'),
        '',
        '🚫 **Blocked:**',
        formatTaskList(blocked, '🚫'),
        '',
        `_Total: ${completed.length + inProgress.length + pending.length + blocked.length} tasks_`,
    ].join('\n');
}

/**
 * Build a concise notification message.
 * @param {{ completed: TaskRow[], inProgress: TaskRow[], pending: TaskRow[], blocked: TaskRow[] }} categorized
 * @returns {string}
 */
function buildNotifySummary(categorized) {
    const { completed, inProgress, pending, blocked } = categorized;

    return [
        `📊 **Sprint Status Update**`,
        '',
        `✅ Done: ${completed.length}  🔄 In Progress: ${inProgress.length}  ⏳ Pending: ${pending.length}  🚫 Blocked: ${blocked.length}`,
        '',
        ...(blocked.length > 0 ? ['🚫 **Blocked Items:**', ...blocked.map(t => `  • **${t.id}** — ${t.description}`)] : []),
        '',
        `_Generated: ${new Date().toISOString()}_`,
    ].join('\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
    const opts = parseArgs();

    // Validate at least one mode
    if (!opts.standup && !opts.notify) {
        console.error('FAIL: No mode specified. Use --standup or --notify.');
        console.error('Usage: node client-bot.js --standup');
        console.error('       node client-bot.js --notify');
        process.exit(1);
    }

    // Read ORCHESTRATION.md
    if (!fs.existsSync(ORCHESTRATION_PATH)) {
        console.error(`FAIL: ORCHESTRATION.md not found at ${ORCHESTRATION_PATH}`);
        process.exit(1);
    }

    const content = fs.readFileSync(ORCHESTRATION_PATH, 'utf-8');

    // Parse tasks
    const tasks = parseTasks(content);

    if (tasks.length === 0) {
        console.error('FAIL: No task rows found in ORCHESTRATION.md');
        process.exit(1);
    }

    // Categorize
    const categorized = categorizeTasks(tasks);

    // Build output
    let output;
    if (opts.standup) {
        output = buildStandupSummary(categorized);
    } else {
        output = buildNotifySummary(categorized);
    }

    // Output to stdout (ready for piping)
    console.log(output);
    process.exit(0);
}

main();
