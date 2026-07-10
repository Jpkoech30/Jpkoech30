#!/usr/bin/env node

/**
 * handoff.js — CLI Handoff Helper
 *
 * Validates agent slugs against .roomodes and outputs a formatted HANDOFF
 * commit body for use in commit messages.
 *
 * Usage:
 *   node .agency/scripts/handoff.js --from lead-architect --to code-agent --task "7.1"
 *   node .agency/scripts/handoff.js --from backend-api --to frontend-state --task "S14.3" --status REVIEW
 *
 * Default STATUS is IN_PROGRESS.
 *
 * Exit codes:
 *   0 — Valid handoff, output generated
 *   1 — Invalid agent slug or missing args
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const ROOMODES_PATH = path.join(ROOT, '.roomodes');

const VALID_STATUSES = ['PENDING', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED', 'HOTFIX'];

// ── CLI Parsing ──────────────────────────────────────────────────────────────

function parseArgs() {
    const args = process.argv.slice(2);
    const opts = { from: null, to: null, task: null, status: 'IN_PROGRESS', artifacts: 'pending' };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--from' && i + 1 < args.length) opts.from = args[++i];
        if (args[i] === '--to' && i + 1 < args.length) opts.to = args[++i];
        if (args[i] === '--task' && i + 1 < args.length) opts.task = args[++i];
        if (args[i] === '--status' && i + 1 < args.length) opts.status = args[++i].toUpperCase();
        if (args[i] === '--artifacts' && i + 1 < args.length) opts.artifacts = args[++i];
    }

    return opts;
}

// ── Agent Validation ─────────────────────────────────────────────────────────

/**
 * Parse .roomodes and extract all agent slugs.
 * @returns {string[]}
 */
function getAgentSlugs() {
    if (!fs.existsSync(ROOMODES_PATH)) {
        console.error(`FAIL: .roomodes not found at ${ROOMODES_PATH}`);
        process.exit(1);
    }

    const raw = fs.readFileSync(ROOMODES_PATH, 'utf-8');
    let config;

    try {
        config = JSON.parse(raw);
    } catch (err) {
        console.error(`FAIL: Could not parse .roomodes: ${err.message}`);
        process.exit(1);
    }

    // Support both ZooCode (customModes) and Roo Code native (groups) formats
    const modes = config.customModes || config.groups || [];
    return modes.map(m => m.slug).filter(Boolean);
}

/**
 * Validate that an agent slug exists in .roomodes.
 * @param {string} slug
 * @param {string[]} validSlugs
 * @returns {boolean}
 */
function isValidAgent(slug, validSlugs) {
    return validSlugs.includes(slug);
}

// ── Output ───────────────────────────────────────────────────────────────────

/**
 * Generate the formatted commit body.
 */
function generateCommitBody(from, to, task, status, artifacts) {
    const lines = [
        '',
        `HANDOFF:${to}`,
        `ARTIFACTS:${artifacts}`,
        `CONTRACT:pending`,
        `STATUS:${status}`,
        '',
    ];

    // Add optional context line
    if (from && to) {
        lines.splice(1, 0, `CONTEXT:Handoff from ${from} to ${to} for task ${task}`);
    }

    return lines.join('\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
    const opts = parseArgs();

    // Validate required args
    const missing = [];
    if (!opts.from) missing.push('--from');
    if (!opts.to) missing.push('--to');
    if (!opts.task) missing.push('--task');

    if (missing.length > 0) {
        console.error(`FAIL: Missing required argument(s): ${missing.join(', ')}`);
        console.error('Usage: node handoff.js --from <agent> --to <agent> --task <id> [--status <STATUS>] [--artifacts <files>]');
        process.exit(1);
    }

    // Validate status
    if (!VALID_STATUSES.includes(opts.status)) {
        console.error(`FAIL: Invalid status "${opts.status}". Must be one of: ${VALID_STATUSES.join(', ')}`);
        process.exit(1);
    }

    // Load valid agents
    const validSlugs = getAgentSlugs();

    if (validSlugs.length === 0) {
        console.error('FAIL: No agent slugs found in .roomodes');
        process.exit(1);
    }

    // Validate from agent
    if (!isValidAgent(opts.from, validSlugs)) {
        console.error(`FAIL: Invalid --from agent "${opts.from}". Valid slugs: ${validSlugs.join(', ')}`);
        process.exit(1);
    }

    // Validate to agent
    if (!isValidAgent(opts.to, validSlugs)) {
        console.error(`FAIL: Invalid --to agent "${opts.to}". Valid slugs: ${validSlugs.join(', ')}`);
        process.exit(1);
    }

    // Generate commit body
    const body = generateCommitBody(opts.from, opts.to, opts.task, opts.status, opts.artifacts);

    console.log(body);
    process.exit(0);
}

main();
