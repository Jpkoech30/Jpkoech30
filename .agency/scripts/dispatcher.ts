#!/usr/bin/env node


/**
 * dispatcher.js — Parallel Task Dispatcher
 *
 * Reads ORCHESTRATION.md task tables, identifies tasks whose dependencies are
 * all DONE, and spawns up to N concurrent processes via child_process.spawn.
 *
 * @desc Parallel task dispatcher — spawns independent tasks concurrently based on Depends On graph in ORCHESTRATION.md
 * @param --parallel <n> Maximum number of concurrent agent processes (required for dispatch, max 5)
 * @param --sprint <id> Only consider tasks in this sprint (optional)
 * @param --dry-run Show what would be dispatched without executing
 * @param --status Show currently running dispatched tasks
 * @param --kill <taskId> Kill a specific dispatched task
 * @example node .agency/scripts/dispatcher.js --parallel 3
 * @example node .agency/scripts/dispatcher.js --parallel 2 --sprint 9
 * @example node .agency/scripts/dispatcher.js --parallel 2 --dry-run
 * @example node .agency/scripts/dispatcher.js --status
 * @example node .agency/scripts/dispatcher.js --kill 9.1
 *
 * Contract: agency-dispatcher@1.0.0
 *
 * Exit codes:
 *   0 — Dispatch completed or status shown
 *   1 — Error
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const SCRIPTS_DIR = path.resolve(__dirname);
const HANDOFF_SCRIPT = path.join(SCRIPTS_DIR, 'handoff.js');
const TELEMETRY_SCRIPT = path.join(SCRIPTS_DIR, 'telemetry.js');
const ORCHESTRATION_PATH = path.join(ROOT, 'ORCHESTRATION.md');
const STATE_DIR = path.join(ROOT, '.agency', 'temp');
const STATE_FILE = path.join(STATE_DIR, 'dispatcher-state.json');

const MAX_PARALLEL = 5;
const VALID_STATUSES = ['PENDING', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED', 'HOTFIX'];

// ── Helpers ─────────────────────────────────────────────────────────────────

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

/**
 * Read and parse the dispatcher state file.
 * @returns {object[]}
 */
function readState() {
    if (!fs.existsSync(STATE_FILE)) return [];
    try {
        const raw = fs.readFileSync(STATE_FILE, 'utf-8');
        return JSON.parse(raw);
    } catch (_) {
        return [];
    }
}

/**
 * Write the dispatcher state file.
 * @param {object[]} state
 */
function writeState(state) {
    ensureDir(STATE_DIR);
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

/**
 * Escape special regex characters.
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── CLI Parsing ──────────────────────────────────────────────────────────────

function parseArgs() {
    const args = process.argv.slice(2);
    const opts = {
        parallel: null,
        sprint: null,
        dryRun: false,
        status: false,
        kill: null,
    };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--parallel' && i + 1 < args.length) {
            opts.parallel = parseInt(args[++i], 10);
        }
        if (args[i] === '--sprint' && i + 1 < args.length) {
            opts.sprint = args[++i];
        }
        if (args[i] === '--dry-run') {
            opts.dryRun = true;
        }
        if (args[i] === '--status') {
            opts.status = true;
        }
        if (args[i] === '--kill' && i + 1 < args.length) {
            opts.kill = args[++i];
        }
    }

    return opts;
}

// ── ORCHESTRATION.md Parsing ─────────────────────────────────────────────────

/**
 * Parse ORCHESTRATION.md and extract all sprint task tables.
 *
 * Table format:
 *   | # | Task | Type | Agent | Est. | Status | Depends On | Contract |
 *   | **9.1** | ... | script | 🔧 JengaBooks Code | 3d | IN_PROGRESS | — | ... |
 *
 * @param {string} content
 * @returns {Array<{ id: string, agent: string, status: string, dependsOn: string[], sprint: string, line: string }>}
 */
function parseTaskTables(content) {
    const lines = content.split('\n');
    const tasks = [];
    let currentSprint = null;
    let inTable = false;
    let headerParsed = false;
    let dependsOnColIndex = -1;
    let statusColIndex = -1;
    let agentColIndex = -1;

    // Sprint header pattern: ### Sprint <N> — ...
    const sprintRe = /^###\s+Sprint\s+(\d+(?:\.\d+)?)\s*[—–-]?\s*/i;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Detect sprint headers
        const sprintMatch = line.match(sprintRe);
        if (sprintMatch) {
            currentSprint = sprintMatch[1];
            inTable = false;
            headerParsed = false;
            continue;
        }

        // Detect table separator row (e.g., |---|---|---|---|)
        // In markdown, separator follows the header row.
        // When we find it, look back one line for the header.
        if (line.trim().startsWith('|---')) {
            inTable = true;
            headerParsed = false;
            dependsOnColIndex = -1;
            statusColIndex = -1;
            agentColIndex = -1;

            // Look back one line for the header row (it precedes the separator)
            if (i > 0) {
                const prevLine = lines[i - 1].trim();
                if (prevLine.startsWith('|') && prevLine.includes('#')) {
                    const cells = prevLine.split('|').map(c => c.trim().toLowerCase());
                    for (let j = 0; j < cells.length; j++) {
                        if (cells[j] === 'depends on' || cells[j] === 'depends_on') dependsOnColIndex = j;
                        if (cells[j] === 'status') statusColIndex = j;
                        if (cells[j] === 'agent') agentColIndex = j;
                    }
                    headerParsed = true;
                }
            }
            continue;
        }

        if (!inTable) continue;

        // Detect empty line = end of table
        if (line.trim() === '') {
            inTable = false;
            headerParsed = false;
            continue;
        }

        // Skip header rows
        if (!headerParsed) continue;

        // Parse data row
        if (!line.startsWith('|')) continue;

        const cells = line.split('|').map(c => c.trim());

        // Task ID is in the first cell: **9.1**
        const taskIdMatch = cells[1] ? cells[1].match(/\*\*(.+?)\*\*/) : null;
        if (!taskIdMatch) continue;

        const taskId = taskIdMatch[1].trim();

        // Extract agent from the agent column (backtick-quoted or emoji+text)
        let agent = '';
        if (agentColIndex > 0 && cells[agentColIndex]) {
            const agentCell = cells[agentColIndex];
            const backtickMatch = agentCell.match(/`([^`]+)`/);
            agent = backtickMatch ? backtickMatch[1] : agentCell.replace(/[🔧🌐⚙️📱🧠🧪🚀📝🎨🛡️🔒⚡♿]/g, '').trim();
        }

        // Extract status
        let status = '';
        if (statusColIndex > 0 && cells[statusColIndex]) {
            const statusCell = cells[statusColIndex].trim();
            // Check for ✅ DONE or IN_PROGRESS etc.
            const statusClean = statusCell.replace(/[✅❌🔄⏳]/g, '').trim();
            if (VALID_STATUSES.includes(statusClean)) {
                status = statusClean;
            } else {
                // Try to find a valid status substring
                for (const s of VALID_STATUSES) {
                    if (statusCell.includes(s)) {
                        status = s;
                        break;
                    }
                }
            }
        }

        // Extract depends on (comma-separated task IDs, or — for none)
        let dependsOn = [];
        if (dependsOnColIndex > 0 && cells[dependsOnColIndex]) {
            const depCell = cells[dependsOnColIndex].trim();
            if (depCell !== '—' && depCell !== '-') {
                dependsOn = depCell
                    .split(',')
                    .map(d => d.trim().replace(/^\*\*|\*\*$/g, ''))
                    .filter(Boolean);
            }
        }

        tasks.push({
            id: taskId,
            agent,
            status,
            dependsOn,
            sprint: currentSprint,
            line: lines[i],
        });
    }

    return tasks;
}

/**
 * Parse gate failure entries from ORCHESTRATION.md.
 * Expected format within quality gates tables:
 *   | task-id | ... | FAIL | <count> | <YES|NO> |
 *
 * @param {string} content
 * @returns {Array<{ id: string, failCount: number }>}
 */
function parseGateFailures(content) {
    const lines = content.split('\n');
    const failures = [];
    let inTable = false;

    // Regex: | **<task-id>** | ... | FAIL | <count> | <YES|NO> |
    const gateFailRe = /^\|\s*\*\*(.+?)\*\*\s*\|.*?\|\s*FAIL\s*\|\s*(\d+)\s*\|\s*(YES|NO)\s*\|/;

    for (const line of lines) {
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

        if (failCount > 3) {
            failures.push({ id: taskId, failCount });
        }
    }

    return failures;
}

// ── Task Resolution ──────────────────────────────────────────────────────────

/**
 * Build a lookup map of taskId → status.
 * @param {object[]} tasks
 * @returns {object}
 */
function buildStatusMap(tasks) {
    const map = {};
    for (const t of tasks) {
        map[t.id] = t.status;
    }
    return map;
}

/**
 * Determine which tasks are runnable (dependencies all DONE).
 * Respects circuit breaker — tasks with gate fail_count > 3 are excluded.
 *
 * @param {object[]} tasks
 * @param {object} statusMap
 * @param {string[]} excludedIds — task IDs excluded by circuit breaker
 * @returns {object[]}
 */
function findRunnableTasks(tasks, statusMap, excludedIds) {
    return tasks.filter(t => {
        // Skip if already done or in progress
        if (t.status === 'DONE' || t.status === 'IN_PROGRESS' || t.status === 'HOTFIX') return false;

        // Skip if circuit-broken
        if (excludedIds.includes(t.id)) return false;

        // Check dependencies
        if (t.dependsOn.length === 0) return true;

        // All dependencies must be DONE
        return t.dependsOn.every(dep => statusMap[dep] === 'DONE');
    });
}

// ── Spawning ─────────────────────────────────────────────────────────────────

/**
 * Spawn a handoff process for a given task.
 * Returns the child process object.
 *
 * @param {object} task
 * @returns {ChildProcess}
 */
function spawnTask(task) {
    const agent = task.agent || 'unknown';
    const args = [
        HANDOFF_SCRIPT,
        '--from', 'dispatcher',
        '--to', agent,
        '--task', task.id,
        '--status', 'IN_PROGRESS',
    ];

    const child = spawn('node', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: ROOT,
        env: { ...process.env },
    });

    return child;
}

/**
 * Log telemetry event for a dispatched task.
 *
 * @param {string} agent
 * @param {string} taskId
 * @param {string} status
 */
function logTelemetry(agent, taskId, status) {
    try {
        const child = spawn('node', [
            TELEMETRY_SCRIPT,
            'log',
            '--event', 'agent_invocation',
            '--agent', agent,
            '--task', taskId,
            '--status', status,
        ], {
            stdio: 'ignore',
            cwd: ROOT,
            detached: true,
        });
        child.unref();
    } catch (_) {
        // Telemetry failures must not block dispatch
    }
}

// ── Commands ─────────────────────────────────────────────────────────────────

/**
 * `--status` command: show currently running dispatched tasks.
 */
function cmdStatus() {
    const state = readState();

    if (state.length === 0) {
        console.log('No tasks currently dispatched.');
        process.exit(0);
    }

    console.log('Currently dispatched tasks:');
    console.log('');
    console.log('  TASK ID    AGENT                PID      DURATION');
    console.log('  ───────    ─────                ───      ────────');

    const now = Date.now();
    for (const entry of state) {
        const duration = now - entry.startTime;
        const minutes = Math.floor(duration / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);
        const durationStr = `${minutes}m ${seconds}s`;
        const isRunning = entry.pid && isPidRunning(entry.pid);

        console.log(
            `  ${entry.taskId.padEnd(10)} ${entry.agent.padEnd(20)} ${String(entry.pid).padEnd(7)} ${durationStr}${isRunning ? '' : ' (STALE)'}`
        );
    }

    process.exit(0);
}

/**
 * Check if a PID is still running (Windows-compatible).
 * @param {number} pid
 * @returns {boolean}
 */
function isPidRunning(pid) {
    try {
        // On Windows, `tasklist /FI "PID eq <pid>"` works
        const { execSync } = require('child_process');
        const result = execSync(`tasklist /FI "PID eq ${pid}" /NH`, {
            encoding: 'utf-8',
            timeout: 5000,
        });
        return result.includes(String(pid));
    } catch (_) {
        return false;
    }
}

/**
 * `--kill <taskId>` command: kill a specific dispatched task.
 * @param {string} taskId
 */
function cmdKill(taskId) {
    let state = readState();
    const entry = state.find(e => e.taskId === taskId);

    if (!entry) {
        console.error(`Task "${taskId}" is not currently dispatched.`);
        process.exit(1);
    }

    try {
        process.kill(entry.pid, 'SIGTERM');
        console.log(`Killed dispatched task "${taskId}" (PID ${entry.pid}).`);

        // Log telemetry end event
        logTelemetry(entry.agent, taskId, 'BLOCKED');

        // Remove from state
        state = state.filter(e => e.taskId !== taskId);
        writeState(state);
    } catch (err) {
        console.error(`Failed to kill task "${taskId}": ${err.message}`);

        // Remove stale entry
        state = state.filter(e => e.taskId !== taskId);
        writeState(state);
        process.exit(1);
    }

    process.exit(0);
}

/**
 * `--parallel` command: dispatch tasks.
 * @param {object} opts
 */
function cmdDispatch(opts) {
    // Read ORCHESTRATION.md
    if (!fs.existsSync(ORCHESTRATION_PATH)) {
        console.error(`FAIL: ORCHESTRATION.md not found at ${ORCHESTRATION_PATH}`);
        process.exit(1);
    }

    const content = fs.readFileSync(ORCHESTRATION_PATH, 'utf-8');

    // Parse task tables
    const allTasks = parseTaskTables(content);

    // Filter by sprint if specified
    let tasks = allTasks;
    if (opts.sprint) {
        tasks = allTasks.filter(t => t.sprint === opts.sprint);
        if (tasks.length === 0) {
            console.error(`FAIL: No tasks found for sprint "${opts.sprint}"`);
            process.exit(1);
        }
    }

    // Build status map
    const statusMap = buildStatusMap(allTasks);

    // Parse gate failures for circuit breaker
    const gateFailures = parseGateFailures(content);
    const excludedIds = gateFailures.map(f => f.id);
    if (excludedIds.length > 0) {
        console.log(`Circuit breaker: ${excludedIds.length} task(s) excluded (fail_count > 3): ${excludedIds.join(', ')}`);
    }

    // Find runnable tasks
    const runnable = findRunnableTasks(tasks, statusMap, excludedIds);

    if (runnable.length === 0) {
        console.log('No runnable tasks found. All eligible tasks are either DONE, IN_PROGRESS, or have unmet dependencies.');
        process.exit(0);
    }

    // Determine concurrency limit
    const parallel = Math.min(opts.parallel || 2, MAX_PARALLEL);
    const toDispatch = runnable.slice(0, parallel);

    // ── Dry run ──
    if (opts.dryRun) {
        console.log('── DRY RUN ──');
        console.log(`Sprint:        ${opts.sprint || 'all'}`);
        console.log(`Runnable:      ${runnable.length} task(s)`);
        console.log(`Would spawn:   ${toDispatch.length} task(s) (max ${parallel})`);
        console.log('');
        console.log('Tasks to dispatch:');
        for (const t of toDispatch) {
            console.log(`  ${t.id.padEnd(8)} → ${t.agent.padEnd(20)} (deps: ${t.dependsOn.join(', ') || 'none'})`);
        }
        console.log('');
        console.log('Skipped (capacity):');
        for (const t of runnable.slice(parallel)) {
            console.log(`  ${t.id.padEnd(8)} → ${t.agent.padEnd(20)} (queued for next cycle)`);
        }
        process.exit(0);
    }

    // ── Actual dispatch ──
    console.log(`Dispatching ${toDispatch.length} task(s) (max ${parallel} concurrent)...`);

    let state = readState();

    for (const task of toDispatch) {
        console.log(`  Starting: ${task.id} → ${task.agent}`);

        const child = spawnTask(task);

        const entry = {
            taskId: task.id,
            agent: task.agent,
            pid: child.pid,
            startTime: Date.now(),
            sprint: task.sprint,
        };

        state.push(entry);

        // Telemetry: task start
        logTelemetry(task.agent, task.id, 'IN_PROGRESS');

        child.on('close', (code) => {
            console.log(`  Completed: ${task.id} (exit code: ${code})`);

            // Telemetry: task complete
            const endStatus = code === 0 ? 'DONE' : 'BLOCKED';
            logTelemetry(task.agent, task.id, endStatus);

            // Remove from state
            state = state.filter(e => e.taskId !== task.id);
            writeState(state);
        });

        child.on('error', (err) => {
            console.error(`  Error: ${task.id} — ${err.message}`);

            // Telemetry: task error
            logTelemetry(task.agent, task.id, 'BLOCKED');

            // Remove from state
            state = state.filter(e => e.taskId !== task.id);
            writeState(state);
        });
    }

    writeState(state);

    console.log('');
    console.log(`Dispatched ${toDispatch.length} task(s). Use --status to monitor.`);

    // Note: We do NOT exit here; we keep the process alive to track children.
    // But since we unref telemetry and the parent should wait for children,
    // we keep the event loop alive by not exiting.
    // However, the typical pattern is to exit after spawning and let children run independently.
    // So we exit and let the state file track running processes.

    process.exit(0);
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
    const opts = parseArgs();

    // --status
    if (opts.status) {
        cmdStatus();
        return;
    }

    // --kill
    if (opts.kill) {
        cmdKill(opts.kill);
        return;
    }

    // --parallel (dispatch mode)
    if (opts.parallel !== null) {
        cmdDispatch(opts);
        return;
    }

    // No recognized command
    console.error('FAIL: No valid command specified.');
    console.error('Usage:');
    console.error('  node .agency/scripts/dispatcher.js --parallel <n> [--sprint <id>] [--dry-run]');
    console.error('  node .agency/scripts/dispatcher.js --status');
    console.error('  node .agency/scripts/dispatcher.js --kill <taskId>');
    process.exit(1);
}

main();

export {};
