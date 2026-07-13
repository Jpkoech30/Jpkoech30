#!/usr/bin/env node
// @ts-nocheck

/**
 * hitl-server.js — HITL Webhook Server
 *
 * Lightweight HTTP server that receives approval/rejection/retry decisions
 * from Telegram/Slack callbacks and updates ORCHESTRATION.md.
 *
 * Contract: agency-hitl-webhook@1.0.0
 *
 * Usage:
 *   node .agency/scripts/hitl-server.js
 *
 * Environment:
 *   HITL_PORT              — Server port (default: 3177)
 *   HITL_CALLBACK_TOKEN    — Pre-shared secret for callback validation
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const ORCHESTRATION_PATH = path.join(ROOT, 'ORCHESTRATION.md');

const PORT = parseInt(process.env.HITL_PORT, 10) || 3177;
const CALLBACK_TOKEN = process.env.HITL_CALLBACK_TOKEN || '';

const VALID_DECISIONS = ['APPROVE', 'REJECT', 'RETRY'];
const STATUS_MAP = {
    APPROVE: 'APPROVED',
    REJECT: 'REJECTED',
    RETRY: 'RETRY',
};

const startTime = Date.now();

// ── Helpers ───────────────────────────────────────────────────────────────────

function getUptimeSeconds() {
    return Math.floor((Date.now() - startTime) / 1000);
}

/**
 * Parse the JSON body from an incoming HTTP request.
 * @param {http.IncomingMessage} req
 * @returns {Promise<object>}
 */
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let raw = '';
        req.on('data', (chunk) => { raw += chunk; });
        req.on('end', () => {
            try {
                resolve(JSON.parse(raw));
            } catch (_) {
                reject(new Error('Invalid JSON body'));
            }
        });
        req.on('error', reject);
    });
}

/**
 * Send a JSON response.
 * @param {http.ServerResponse} res
 * @param {number} statusCode
 * @param {object} data
 */
function sendJson(res, statusCode, data) {
    const body = JSON.stringify(data);
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
    });
    res.end(body);
}

/**
 * Parse ORCHESTRATION.md and update a task's status.
 * Looks for markdown table rows matching the taskId.
 *
 * @param {string} taskId
 * @param {string} newStatus — one of APPROVED, REJECTED, RETRY
 * @returns {boolean} true if the task was found and updated
 */
function updateTaskStatus(taskId, newStatus) {
    if (!fs.existsSync(ORCHESTRATION_PATH)) {
        return false;
    }

    let content = fs.readFileSync(ORCHESTRATION_PATH, 'utf-8');
    const lines = content.split('\n');
    let updated = false;
    let inTable = false;

    // Detect table rows with task IDs and update status.
    // Expected format: | **task-id** | ... | <status> | <fail_count> | YES/NO | ...
    // We replace the status field (3rd column-ish in the gate failure table).
    // More broadly, look for the task ID in bold and replace the entire row's
    // gate status to the new status.
    const resultLines = lines.map((line) => {
        // Detect table boundaries
        if (line.trim().startsWith('|---')) {
            inTable = true;
            return line;
        }
        if (line.trim() === '' && inTable) {
            inTable = false;
            return line;
        }

        if (!inTable) return line;

        // Match a row that starts with | **<taskId>**
        const taskRe = /^(\|\s*\*\*)([^*]+)(\*\*.*)$/;
        const match = line.match(taskRe);
        if (!match) return line;

        const rowTaskId = match[2].trim();
        if (rowTaskId !== taskId) return line;

        // Replace FAIL/PASS/APPROVED/REJECTED/RETRY status in the row.
        // The status is typically at column 3 or 4 depending on table structure.
        // We look for the FAIL/PASS status pattern and replace it.
        const statusRe = /(\|\s*)(FAIL|PASS|APPROVED|REJECTED|RETRY)(\s*\|)/;
        if (statusRe.test(line)) {
            updated = true;
            return line.replace(statusRe, `$1${newStatus}$3`);
        }

        return line;
    });

    if (updated) {
        fs.writeFileSync(ORCHESTRATION_PATH, resultLines.join('\n'), 'utf-8');
    }

    return updated;
}

// ── Route Handlers ────────────────────────────────────────────────────────────

/**
 * Handle GET /health
 */
function handleHealth(res) {
    sendJson(res, 200, {
        status: 'ok',
        uptime_seconds: getUptimeSeconds(),
    });
}

/**
 * Handle POST /webhook/approve/:taskId
 */
async function handleWebhookApprove(req, res, taskId) {
    if (!taskId) {
        sendJson(res, 404, { error: 'Task not found' });
        return;
    }

    let body;
    try {
        body = await parseBody(req);
    } catch (_) {
        sendJson(res, 400, { error: 'Invalid JSON body' });
        return;
    }

    const { decision, comment, callbackToken } = body;

    // Validate callback token
    if (!CALLBACK_TOKEN) {
        sendJson(res, 500, { error: 'Server misconfigured: HITL_CALLBACK_TOKEN not set' });
        return;
    }

    if (!callbackToken || callbackToken !== CALLBACK_TOKEN) {
        sendJson(res, 401, { error: 'Invalid callback token' });
        return;
    }

    // Validate decision
    if (!decision || !VALID_DECISIONS.includes(decision)) {
        sendJson(res, 400, {
            error: `Invalid decision "${decision || ''}". Must be one of: ${VALID_DECISIONS.join(', ')}`,
        });
        return;
    }

    // Validate comment length
    if (comment && typeof comment === 'string' && comment.length > 500) {
        sendJson(res, 400, { error: 'Comment exceeds maximum length of 500 characters' });
        return;
    }

    const newStatus = STATUS_MAP[decision];

    // Update ORCHESTRATION.md
    const updated = updateTaskStatus(taskId, newStatus);

    if (!updated) {
        sendJson(res, 404, { error: 'Task not found' });
        return;
    }

    sendJson(res, 200, {
        status: 'updated',
        taskId,
        newStatus,
    });
}

// ── Server ────────────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
    // CORS headers for development
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Parse URL
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // GET /health
    if (req.method === 'GET' && pathname === '/health') {
        handleHealth(res);
        return;
    }

    // POST /webhook/approve/:taskId
    const approveMatch = pathname.match(/^\/webhook\/approve\/(.+)$/);
    if (req.method === 'POST' && approveMatch) {
        const taskId = approveMatch[1];
        handleWebhookApprove(req, res, taskId);
        return;
    }

    // 404 for any other route
    sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
    console.log(`🧑‍💼 HITL Webhook Server running on http://localhost:${PORT}`);
    console.log(`   Health:   GET  http://localhost:${PORT}/health`);
    console.log(`   Webhook:  POST http://localhost:${PORT}/webhook/approve/:taskId`);
    console.log(`   Token:    ${CALLBACK_TOKEN ? 'configured' : 'NOT SET (set HITL_CALLBACK_TOKEN)'}`);
});

// Graceful shutdown
function shutdown() {
    console.log('\nShutting down HITL server...');
    server.close(() => {
        console.log('HITL server stopped.');
        process.exit(0);
    });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
