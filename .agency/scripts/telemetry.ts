#!/usr/bin/env node


/**
 * telemetry.js — Agency Telemetry Pipeline
 *
 * Logs agent invocations, cost events, and gate failures to a JSONL file.
 * Provides monitor (tail) and stats (aggregation) commands.
 *
 * Contract: agency-telemetry@1.0.0
 *
 * Usage:
 *   node .agency/scripts/telemetry.js log --event <type> --agent <slug> --task <id> --status <status>
 *   node .agency/scripts/telemetry.js monitor [--filter <agent>] [--tail <lines>]
 *   node .agency/scripts/telemetry.js stats [--since <ISO8601>]
 *
 * Exit codes:
 *   0 — Success
 *   1 — Error
 */

// ── Type Definitions ────────────────────────────────────────────────────────────

interface TelemetryEvent {
    timestamp: string;
    agent?: string;
    task?: string;
    event: string;
    status: string;
    tokens?: { input?: number; output?: number; cacheHit?: number };
    duration_ms?: number;
    error?: string;
    model?: string;
    inputTokens?: number;
    outputTokens?: number;
    costKES?: number;
    cacheHitTokens?: number;
    gate?: string;
    failCount?: number;
    escalated?: boolean;
}

interface BuildInvocationParams {
    agent: string;
    task: string;
    event: 'start' | 'end' | 'error' | 'handoff';
    status: string;
    tokens?: { input?: number; output?: number };
    duration_ms?: number;
    error?: string;
    model?: string;
}

interface BuildCostParams {
    task: string;
    agent: string;
    inputTokens: number;
    outputTokens: number;
    costKES: number;
    cacheHitTokens?: number;
}

interface BuildGateFailureParams {
    task: string;
    gate: 'security' | 'performance' | 'accessibility' | 'qa' | 'compliance';
    failCount: number;
    escalated?: boolean;
}

// ── Constants ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const TELEMETRY_DIR = path.join(ROOT, '.agency', 'telemetry');
const EVENTS_FILE = path.join(TELEMETRY_DIR, 'events.jsonl');
const ARCHIVE_DIR = path.join(TELEMETRY_DIR, 'archive');

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// ── Color Constants ─────────────────────────────────────────────────────────

const C = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
    bold: '\x1b[1m',
};

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Ensure a directory exists, creating it (and parents) if needed.
 * @param {string} dirPath
 */
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

/**
 * Rotate the events.jsonl file if it exceeds MAX_FILE_SIZE_BYTES.
 * Archives it to .agency/telemetry/archive/events-{timestamp}.jsonl.
 */
function rotateFileIfNeeded() {
    if (!fs.existsSync(EVENTS_FILE)) return;

    const stats = fs.statSync(EVENTS_FILE);
    if (stats.size < MAX_FILE_SIZE_BYTES) return;

    ensureDir(ARCHIVE_DIR);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archivePath = path.join(ARCHIVE_DIR, `events-${timestamp}.jsonl`);
    fs.renameSync(EVENTS_FILE, archivePath);
    console.error(`Archived ${EVENTS_FILE} → ${archivePath}`);
}

/**
 * Append a single JSON event object as a newline to the JSONL file.
 * @param {object} eventObj
 */
function appendEvent(eventObj) {
    ensureDir(TELEMETRY_DIR);
    rotateFileIfNeeded();

    const line = JSON.stringify(eventObj) + '\n';
    fs.appendFileSync(EVENTS_FILE, line, 'utf-8');
}

/**
 * Read all events from the JSONL file.
 * @returns {object[]}
 */
function readEvents() {
    if (!fs.existsSync(EVENTS_FILE)) return [];
    const content = fs.readFileSync(EVENTS_FILE, 'utf-8');
    return content
        .split('\n')
        .filter(Boolean)
        .map(line => JSON.parse(line));
}

// ── Event Builders (contract-aligned) ──────────────────────────────────────

/**
 * Build an agent_invocation event object.
 * @param {object} params
 * @param {string} params.agent
 * @param {string} params.task
 * @param {'start'|'end'|'error'|'handoff'} params.event
 * @param {string} params.status
 * @param {object} [params.tokens]
 * @param {number} [params.duration_ms]
 * @param {string} [params.error]
 * @param {string} [params.model]
 * @returns {object}
 */
function buildAgentInvocation({ agent, task, event, status, tokens, duration_ms, error, model }) {
    const obj = {
        timestamp: new Date().toISOString(),
        agent,
        task,
        event,
        status,
    };
    if (tokens) obj.tokens = tokens;
    if (duration_ms !== undefined) obj.duration_ms = duration_ms;
    if (error) obj.error = error;
    if (model) obj.model = model;
    return obj;
}

/**
 * Build a cost_event object.
 * @param {object} params
 * @param {string} params.task
 * @param {string} params.agent
 * @param {number} params.inputTokens
 * @param {number} params.outputTokens
 * @param {number} params.costKES
 * @param {number} [params.cacheHitTokens]
 * @returns {object}
 */
function buildCostEvent({ task, agent, inputTokens, outputTokens, costKES, cacheHitTokens }) {
    const obj = {
        timestamp: new Date().toISOString(),
        task,
        agent,
        inputTokens,
        outputTokens,
        costKES,
    };
    if (cacheHitTokens !== undefined) obj.cacheHitTokens = cacheHitTokens;
    return obj;
}

/**
 * Build a gate_failure event object.
 * @param {object} params
 * @param {string} params.task
 * @param {'security'|'performance'|'accessibility'|'qa'|'compliance'} params.gate
 * @param {number} params.failCount
 * @param {boolean} [params.escalated]
 * @returns {object}
 */
function buildGateFailure({ task, gate, failCount, escalated }) {
    return {
        timestamp: new Date().toISOString(),
        task,
        gate,
        failCount,
        escalated: escalated === true,
    };
}

// ── Color helpers ──────────────────────────────────────────────────────────

/**
 * Get the display color for a given status value.
 * @param {string} status
 * @returns {string} ANSI color code
 */
function getStatusColor(status) {
    switch (status) {
        case 'DONE': return C.green;
        case 'IN_PROGRESS': return C.yellow;
        case 'BLOCKED':
        case 'error': return C.red;
        case 'handoff': return C.blue;
        default: return C.reset;
    }
}

/**
 * Wrap text in an ANSI color.
 * @param {string} text
 * @param {string} color
 * @returns {string}
 */
function colorize(text, color) {
    return `${color}${text}${C.reset}`;
}

// ── Commands ────────────────────────────────────────────────────────────────

/**
 * `log` command — validate args and append event to JSONL.
 * @param {object} opts
 */
function cmdLog(opts) {
    const validEvents = ['agent_invocation', 'cost_event', 'gate_failure', 'preflight-gate:pass'];
    if (!validEvents.includes(opts.event)) {
        console.error(`FAIL: Invalid event type "${opts.event}". Must be one of: ${validEvents.join(', ')}`);
        process.exit(1);
    }

    const eventType = opts.event;

    if (eventType === 'agent_invocation') {
        // Required: --agent, --task, --status
        const missing = [];
        if (!opts.agent) missing.push('--agent');
        if (!opts.task) missing.push('--task');
        if (!opts.status) missing.push('--status');
        if (missing.length > 0) {
            console.error(`FAIL: agent_invocation requires: ${missing.join(', ')}`);
            process.exit(1);
        }

        const validStatuses = ['PENDING', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED', 'HOTFIX'];
        if (!validStatuses.includes(opts.status)) {
            console.error(`FAIL: Invalid status "${opts.status}". Must be one of: ${validStatuses.join(', ')}`);
            process.exit(1);
        }

        // Determine sub-event (start/end/error/handoff), default to 'start'
        const subEvent = opts.subEvent || 'start';
        const validSubEvents = ['start', 'end', 'error', 'handoff'];
        if (!validSubEvents.includes(subEvent)) {
            console.error(`FAIL: Invalid sub-event "${subEvent}". Must be one of: ${validSubEvents.join(', ')}`);
            process.exit(1);
        }

        let tokens;
        if (opts.inputTokens || opts.outputTokens) {
            tokens = {};
            if (opts.inputTokens) tokens.input = parseInt(opts.inputTokens, 10);
            if (opts.outputTokens) tokens.output = parseInt(opts.outputTokens, 10);
            if (opts.cacheHit) tokens.cache = parseInt(opts.cacheHit, 10);
        }

        const eventObj = buildAgentInvocation({
            agent: opts.agent,
            task: opts.task,
            event: subEvent,
            status: opts.status,
            tokens,
            duration_ms: opts.duration ? parseInt(opts.duration, 10) : undefined,
            error: opts.error || undefined,
            model: opts.model || undefined,
        });

        appendEvent(eventObj);
        console.log(`PASS: agent_invocation (${subEvent}) event logged for ${opts.agent} / ${opts.task}`);
        process.exit(0);
    }

    if (eventType === 'cost_event') {
        const missing = [];
        if (!opts.task) missing.push('--task');
        if (!opts.agent) missing.push('--agent');
        if (!opts.inputTokens) missing.push('--inputTokens');
        if (!opts.outputTokens) missing.push('--outputTokens');
        if (!opts.costKES) missing.push('--costKES');
        if (missing.length > 0) {
            console.error(`FAIL: cost_event requires: ${missing.join(', ')}`);
            process.exit(1);
        }

        const inputTokens = parseInt(opts.inputTokens, 10);
        const outputTokens = parseInt(opts.outputTokens, 10);
        const costKES = parseFloat(opts.costKES);

        if (isNaN(inputTokens) || isNaN(outputTokens) || isNaN(costKES)) {
            console.error('FAIL: --inputTokens, --outputTokens, and --costKES must be numeric');
            process.exit(1);
        }

        const eventObj = buildCostEvent({
            task: opts.task,
            agent: opts.agent,
            inputTokens,
            outputTokens,
            costKES,
            cacheHitTokens: opts.cacheHit ? parseInt(opts.cacheHit, 10) : undefined,
        });

        appendEvent(eventObj);
        console.log(`PASS: cost_event logged for ${opts.agent} / ${opts.task} — KES ${costKES.toFixed(3)}`);
        process.exit(0);
    }

    if (eventType === 'gate_failure') {
        const missing = [];
        if (!opts.task) missing.push('--task');
        if (!opts.gate) missing.push('--gate');
        if (!opts.failCount) missing.push('--failCount');
        if (missing.length > 0) {
            console.error(`FAIL: gate_failure requires: ${missing.join(', ')}`);
            process.exit(1);
        }

        const validGates = ['security', 'performance', 'accessibility', 'qa', 'compliance'];
        if (!validGates.includes(opts.gate)) {
            console.error(`FAIL: Invalid gate "${opts.gate}". Must be one of: ${validGates.join(', ')}`);
            process.exit(1);
        }

        const failCount = parseInt(opts.failCount, 10);
        if (isNaN(failCount)) {
            console.error('FAIL: --failCount must be numeric');
            process.exit(1);
        }

        const eventObj = buildGateFailure({
            task: opts.task,
            gate: opts.gate,
            failCount,
            escalated: opts.escalated === 'true',
        });

        appendEvent(eventObj);
        console.log(`PASS: gate_failure logged for ${opts.gate} — ${failCount} failure(s)`);
        process.exit(0);
    }

    if (eventType === 'preflight-gate:pass') {
        const missing = [];
        if (!opts.agent) missing.push('--agent');
        if (!opts.task) missing.push('--task');
        if (!opts.status) missing.push('--status');
        if (missing.length > 0) {
            console.error(`FAIL: preflight-gate:pass requires: ${missing.join(', ')}`);
            process.exit(1);
        }

        const eventObj = {
            timestamp: new Date().toISOString(),
            event: 'preflight-gate:pass',
            agent: opts.agent,
            task: opts.task,
            status: opts.status,
        };

        appendEvent(eventObj);
        console.log(`PASS: preflight-gate:pass logged for ${opts.agent} / ${opts.task}`);
        process.exit(0);
    }
}

/**
 * `monitor` command — tail the JSONL file with color-coded output.
 * @param {object} opts
 */
function cmdMonitor(opts) {
    const filter = opts.filter || null;
    const tailLines = parseInt(opts.tail, 10) || 50;
    const asJson = opts.json === 'true';

    const events = readEvents();

    // Apply agent filter
    let filtered = events;
    if (filter) {
        filtered = events.filter(e => e.agent === filter);
    }

    // Apply tail (most recent N)
    const tailed = filtered.slice(-tailLines);

    if (asJson) {
        console.log(JSON.stringify(tailed, null, 2));
        process.exit(0);
    }

    if (tailed.length === 0) {
        console.log('No events found' + (filter ? ` for agent "${filter}"` : ''));
        process.exit(0);
    }

    // Determine column widths
    const tsWidth = 24;
    const agentWidth = Math.max(10, ...tailed.map(e => (e.agent || '').length));
    const taskWidth = Math.max(10, ...tailed.map(e => (e.task || '').length));
    const eventWidth = Math.max(10, ...tailed.map(e => (e.event || '').length));
    const statusWidth = Math.max(10, ...tailed.map(e => {
        const s = e.status || '';
        return typeof s === 'string' ? s.length : String(s).length;
    }));

    // Header
    const header =
        `${'TIMESTAMP'.padEnd(tsWidth)} ` +
        `${'AGENT'.padEnd(agentWidth)} ` +
        `${'TASK'.padEnd(taskWidth)} ` +
        `${'EVENT'.padEnd(eventWidth)} ` +
        `${'STATUS'.padEnd(statusWidth)} ` +
        `DETAILS`;
    console.log(colorize(header, C.bold));
    console.log('─'.repeat(header.length));

    // Rows
    for (const event of tailed) {
        const status = (event.status || event.event || '');
        const color = getStatusColor(status);
        const isHandoff = event.event === 'handoff';
        const rowColor = isHandoff ? C.blue : color;

        const timestamp = (event.timestamp || '').padEnd(tsWidth);
        const agent = (event.agent || '').padEnd(agentWidth);
        const task = (event.task || '').padEnd(taskWidth);
        const evt = (event.event || '').padEnd(eventWidth);
        const st = (event.status || '').padEnd(statusWidth);

        let details = '';
        if (event.error) details = `error: ${event.error}`;
        else if (event.gate) details = `gate: ${event.gate} (${event.failCount} failures)`;
        else if (event.costKES) details = `KES ${event.costKES}`;
        else if (event.tokens) details = `tokens: ${JSON.stringify(event.tokens)}`;
        else if (event.duration_ms) details = `${event.duration_ms}ms`;

        console.log(colorize(`${timestamp} ${agent} ${task} ${evt} ${st} ${details}`, rowColor));
    }

    console.log(
        `\nShowing ${tailed.length} of ${filtered.length} events` +
        (filter ? ` for agent "${filter}"` : '')
    );
    process.exit(0);
}

/**
 * `stats` command — aggregate statistics from telemetry data.
 * @param {object} opts
 */
function cmdStats(opts) {
    const since = opts.since ? new Date(opts.since) : null;
    const events = readEvents();

    // Apply since filter
    let filtered = events;
    if (since && !isNaN(since.getTime())) {
        filtered = events.filter(e => new Date(e.timestamp) >= since);
    }

    if (filtered.length === 0) {
        console.log('No events found' + (since ? ` since ${opts.since}` : ''));
        process.exit(0);
    }

    // ── Aggregate ──
    const totalEvents = filtered.length;
    const byType = {};
    const byAgent = {};
    const byStatus = {};
    const byGate = {};
    let totalCostKES = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    for (const event of filtered) {
        // Classify event type
        const isAgentInv = ['start', 'end', 'error', 'handoff'].includes(event.event);
        const isCost = event.inputTokens !== undefined;
        const isGate = event.gate !== undefined;
        const type = isAgentInv ? 'agent_invocation' : isCost ? 'cost_event' : isGate ? 'gate_failure' : 'unknown';
        byType[type] = (byType[type] || 0) + 1;

        // By agent
        if (event.agent) {
            byAgent[event.agent] = (byAgent[event.agent] || 0) + 1;
        }

        // By status
        if (event.status) {
            const s = typeof event.status === 'string' ? event.status : JSON.stringify(event.status);
            byStatus[s] = (byStatus[s] || 0) + 1;
        }

        // By gate
        if (event.gate) {
            byGate[event.gate] = (byGate[event.gate] || 0) + 1;
        }

        // Cost totals
        if (event.inputTokens) totalInputTokens += event.inputTokens;
        if (event.outputTokens) totalOutputTokens += event.outputTokens;
        if (event.costKES) totalCostKES += event.costKES;
    }

    // ── Output ──
    console.log(colorize('=== Telemetry Statistics ===', C.bold));
    console.log(`Period:   ${since ? `since ${since.toISOString()}` : 'all time'}`);
    console.log(`Events:   ${totalEvents}`);
    console.log('');

    console.log(colorize('── By Type ──', C.cyan));
    for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${type}: ${count}`);
    }
    console.log('');

    if (Object.keys(byStatus).length > 0) {
        console.log(colorize('── By Status ──', C.cyan));
        for (const [status, count] of Object.entries(byStatus).sort((a, b) => b[1] - a[1])) {
            const color = getStatusColor(status);
            console.log(`  ${colorize(status.padEnd(15), color)} ${count}`);
        }
        console.log('');
    }

    if (Object.keys(byAgent).length > 0) {
        console.log(colorize('── By Agent ──', C.cyan));
        for (const [agent, count] of Object.entries(byAgent).sort((a, b) => b[1] - a[1])) {
            console.log(`  ${agent.padEnd(25)} ${count}`);
        }
        console.log('');
    }

    if (Object.keys(byGate).length > 0) {
        console.log(colorize('── Gate Failures ──', C.cyan));
        for (const [gate, count] of Object.entries(byGate)) {
            console.log(`  ${gate.padEnd(15)} ${count}`);
        }
        console.log('');
    }

    if (totalCostKES > 0) {
        console.log(colorize('── Cost Summary ──', C.cyan));
        console.log(`  Total input tokens:   ${totalInputTokens.toLocaleString()}`);
        console.log(`  Total output tokens:  ${totalOutputTokens.toLocaleString()}`);
        console.log(`  Total cost:           KES ${totalCostKES.toFixed(3)}`);
    }

    process.exit(0);
}

/**
 * `circuit` command — Cost-aware circuit breaker for agent task failures.
 * Tracks failures per agent and trips breaker after threshold.
 * @param {object} opts
 */
function cmdCircuit(opts) {
    // Track task failures per agent for circuit breaker
    const agent = opts.agent;
    const task = opts.task;
    const status = opts.status;

    if (!agent) { console.error('FAIL: --agent required'); process.exit(1); }

    const circuitDir = path.join(ROOT, '.agency', 'circuit-breaker');
    if (!fs.existsSync(circuitDir)) fs.mkdirSync(circuitDir, { recursive: true });

    const breakerPath = path.join(circuitDir, `${agent}.json`);
    let breaker = { failures: [], state: 'CLOSED', last_success: null };

    try {
        if (fs.existsSync(breakerPath)) {
            breaker = JSON.parse(fs.readFileSync(breakerPath, 'utf-8'));
        }
    } catch { /* use defaults */ }

    if (status === 'FAILED') {
        breaker.failures.push({
            task,
            timestamp: new Date().toISOString(),
        });
        // Keep last 10 failures
        if (breaker.failures.length > 10) breaker.failures = breaker.failures.slice(-10);

        // Trip breaker if 3+ failures on same task or 5+ total recent
        const recentFailures = breaker.failures.filter(f => {
            return (Date.now() - new Date(f.timestamp).getTime()) < 86400000; // 24h
        });

        if (recentFailures.length >= 5 || (recentFailures.filter(f => f.task === task).length >= 3)) {
            breaker.state = 'OPEN';
            console.log(`🔴 Circuit BREAKER OPEN for ${agent}: ${recentFailures.length} failures in 24h`);
        }
    } else if (status === 'SUCCESS') {
        // Reset breaker on success
        breaker.failures = [];
        breaker.state = 'CLOSED';
        breaker.last_success = new Date().toISOString();
        console.log(`🟢 Circuit breaker RESET for ${agent}`);
    }

    fs.writeFileSync(breakerPath, JSON.stringify(breaker, null, 2), 'utf-8');
    console.log(breaker.state === 'OPEN' ? 'BLOCK' : 'PASS');
    process.exit(0);
}

// ── CLI Parsing ─────────────────────────────────────────────────────────────

/**
 * Parse CLI arguments into a command and options object.
 * @returns {{ command: string|null, opts: object }}
 */
function parseArgs() {
    const args = process.argv.slice(2);
    const command = args[0] || null;

    const opts = {
        event: null,
        agent: null,
        task: null,
        status: null,
        subEvent: null,
        inputTokens: null,
        outputTokens: null,
        costKES: null,
        cacheHit: null,
        gate: null,
        failCount: null,
        escalated: 'false',
        duration: null,
        error: null,
        model: null,
        filter: null,
        tail: '50',
        json: 'false',
        since: null,
    };

    for (let i = 1; i < args.length; i++) {
        switch (args[i]) {
            case '--event': opts.event = args[++i]; break;
            case '--agent': opts.agent = args[++i]; break;
            case '--task': opts.task = args[++i]; break;
            case '--status': opts.status = args[++i]; break;
            case '--sub-event': opts.subEvent = args[++i]; break;
            case '--inputTokens': opts.inputTokens = args[++i]; break;
            case '--outputTokens': opts.outputTokens = args[++i]; break;
            case '--costKES': opts.costKES = args[++i]; break;
            case '--cacheHit': opts.cacheHit = args[++i]; break;
            case '--gate': opts.gate = args[++i]; break;
            case '--failCount': opts.failCount = args[++i]; break;
            case '--escalated': opts.escalated = args[++i]; break;
            case '--duration': opts.duration = args[++i]; break;
            case '--error': opts.error = args[++i]; break;
            case '--model': opts.model = args[++i]; break;
            case '--filter': opts.filter = args[++i]; break;
            case '--tail': opts.tail = args[++i]; break;
            case '--json': opts.json = 'true'; break;
            case '--since': opts.since = args[++i]; break;
        }
    }

    return { command, opts };
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
    const { command, opts } = parseArgs();

    if (!command) {
        console.error('FAIL: No command specified.');
        console.error('Usage:');
        console.error('  node .agency/scripts/telemetry.js log --event <type> --agent <slug> --task <id> --status <status>');
        console.error('  node .agency/scripts/telemetry.js monitor [--filter <agent>] [--tail <lines>]');
        console.error('  node .agency/scripts/telemetry.js stats [--since <ISO8601>]');
        process.exit(1);
    }

    switch (command) {
        case 'log':
            cmdLog(opts);
            break;
        case 'monitor':
            cmdMonitor(opts);
            break;
        case 'stats':
            cmdStats(opts);
            break;
        case 'circuit':
            cmdCircuit(opts);
            break;
        default:
            console.error(`FAIL: Unknown command "${command}".`);
            console.error('Valid commands: log, monitor, stats, circuit');
            process.exit(1);
    }
}

main();

export {};
