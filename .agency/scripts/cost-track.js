#!/usr/bin/env node

/**
 * cost-track.js — Simple Cost Tracker
 *
 * Records a single task's token consumption by appending a new entry to
 * COST-LEDGER.md at the project root. Calculates KES cost using the formula:
 *   (input_tokens × 19 + output_tokens × 38) / 1,000,000
 *
 * Usage:
 *   node .agency/scripts/cost-track.js --task S14.6 --tokens 15000/3000/5000 --agent jengabooks-code
 *   node .agency/scripts/cost-track.js --task S14.6 --tokens 15000/3000 --agent jengabooks-code
 *
 * Token format: <input>/<output>[/<cache>]
 *   e.g., 15000/3000/5000  or  15000/3000
 *
 * Exit codes:
 *   0 — Entry appended successfully
 *   1 — Invalid arguments or file error
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const COST_LEDGER_PATH = path.join(ROOT, 'COST-LEDGER.md');

// KES rates per million tokens
const INPUT_RATE_KES = 19;   // 19 KES per 1M input tokens
const OUTPUT_RATE_KES = 38;  // 38 KES per 1M output tokens

// Default model mapping (can be extended)
const MODEL_MAP = {
    'jengabooks-code': 'deepseek-v4-flash',
    'lead-architect': 'deepseek-v4-flash',
    'backend-api': 'deepseek-v4-flash',
    'backend-service': 'deepseek-v4-flash',
    'backend-integration': 'deepseek-v4-flash',
    'backend-database': 'deepseek-v4-flash',
    'backend-lead': 'deepseek-v4-flash',
    'frontend-ui': 'deepseek-v4-flash',
    'frontend-page': 'deepseek-v4-flash',
    'frontend-state': 'deepseek-v4-flash',
    'frontend-lead': 'deepseek-v4-flash',
    'frontend-web': 'deepseek-v4-flash',
    'mobile-ui': 'deepseek-v4-flash',
    'mobile-screen': 'deepseek-v4-flash',
    'mobile-state': 'deepseek-v4-flash',
    'mobile-lead': 'deepseek-v4-flash',
    'frontend-mobile': 'deepseek-v4-flash',
    'backend-logic': 'deepseek-v4-flash',
    'devops': 'deepseek-v4-flash',
    'devops-lead': 'deepseek-v4-flash',
    'devops-infra': 'deepseek-v4-flash',
    'devops-cicd': 'deepseek-v4-flash',
    'devops-db': 'deepseek-v4-flash',
    'documentarian': 'deepseek-v4-flash',
    'qa-automator': 'deepseek-v4-flash',
    'release-manager': 'deepseek-v4-flash',
    'design-keeper': 'deepseek-v4-flash',
    'compliance-guardian': 'deepseek-v4-flash',
    'security-auditor': 'deepseek-v4-flash',
    'performance-auditor': 'deepseek-v4-flash',
    'accessibility-auditor': 'deepseek-v4-flash',
};

// ── CLI Parsing ──────────────────────────────────────────────────────────────

function parseArgs() {
    const args = process.argv.slice(2);
    const opts = { task: null, tokens: null, agent: null };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--task' && i + 1 < args.length) {
            opts.task = args[++i];
        }
        if (args[i] === '--tokens' && i + 1 < args.length) {
            opts.tokens = args[++i];
        }
        if (args[i] === '--agent' && i + 1 < args.length) {
            opts.agent = args[++i];
        }
    }

    return opts;
}

/**
 * Parse token string "input/output/cache" or "input/output".
 * Returns { inputTokens, outputTokens, cacheHitTokens }.
 */
function parseTokens(tokenStr) {
    const parts = tokenStr.split('/').map(s => parseInt(s.trim(), 10));

    if (parts.length < 2 || parts.some(isNaN)) {
        throw new Error(`Invalid token format "${tokenStr}". Expected: <input>/<output>[/<cache>]`);
    }

    return {
        inputTokens: parts[0],
        outputTokens: parts[1],
        cacheHitTokens: parts[2] || 0,
    };
}

/**
 * Calculate KES cost.
 * Formula: (input_tokens × 19 + output_tokens × 38) / 1,000,000
 */
function calculateKesCost(inputTokens, outputTokens) {
    return (inputTokens * INPUT_RATE_KES + outputTokens * OUTPUT_RATE_KES) / 1_000_000;
}

/**
 * Build the new table row to append.
 */
function buildEntryRow(taskId, tokens, agent, costKes) {
    const model = MODEL_MAP[agent] || 'deepseek-v4-flash';
    const today = new Date().toISOString().split('T')[0];

    const inputStr = tokens.inputTokens >= 1000
        ? `${(tokens.inputTokens / 1000).toFixed(0)}K`
        : `${tokens.inputTokens}`;
    const outputStr = tokens.outputTokens >= 1000
        ? `${(tokens.outputTokens / 1000).toFixed(0)}K`
        : `${tokens.outputTokens}`;
    const cacheStr = tokens.cacheHitTokens >= 1000
        ? `${(tokens.cacheHitTokens / 1000).toFixed(0)}K`
        : `${tokens.cacheHitTokens}`;

    const tokenCol = `${inputStr} / ${outputStr} / ${cacheStr}`;
    const costUsd = (costKes / 130).toFixed(3);  // approximate USD at 130 KES/USD

    return `| **${taskId}** | cost-track entry | ${model} | ${tokenCol} | $${costUsd} | — | ${agent} | ${today} |`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
    const opts = parseArgs();

    // Validate required args
    const missing = [];
    if (!opts.task) missing.push('--task');
    if (!opts.tokens) missing.push('--tokens');
    if (!opts.agent) missing.push('--agent');

    if (missing.length > 0) {
        console.error(`FAIL: Missing required argument(s): ${missing.join(', ')}`);
        console.error('Usage: node cost-track.js --task <id> --tokens <in>/<out>[/<cache>] --agent <slug>');
        process.exit(1);
    }

    // Parse tokens
    let tokens;
    try {
        tokens = parseTokens(opts.tokens);
    } catch (err) {
        console.error(`FAIL: ${err.message}`);
        process.exit(1);
    }

    // Calculate cost
    const costKes = calculateKesCost(tokens.inputTokens, tokens.outputTokens);

    // Validate COST-LEDGER.md exists
    if (!fs.existsSync(COST_LEDGER_PATH)) {
        console.error(`FAIL: Cost ledger not found at ${COST_LEDGER_PATH}`);
        process.exit(1);
    }

    // Build the new entry row
    const newRow = buildEntryRow(opts.task, tokens, opts.agent, costKes);

    // Read current content
    const rawContent = fs.readFileSync(COST_LEDGER_PATH, 'utf-8');

    // Detect line ending style (CRLF or LF)
    const lineEnding = rawContent.includes('\r\n') ? '\r\n' : '\n';

    // Normalize to LF for processing
    let content = rawContent.replace(/\r\n/g, '\n').trimEnd();

    // Find the Sprint Entries table end: insert the new row before the last
    // table row and the "---" separator that precedes "## Cost Calculation Reference"
    const tableEndMarker = '\n---\n\n## Cost Calculation Reference';
    const tableEndIndex = content.indexOf(tableEndMarker);

    if (tableEndIndex === -1) {
        // Fallback: append before the last ---
        const lastSep = content.lastIndexOf('\n---\n');
        if (lastSep !== -1) {
            content = content.slice(0, lastSep) + `\n${newRow}\n` + content.slice(lastSep);
        } else {
            content = content + `\n${newRow}\n`;
        }
    } else {
        // Find the last newline before the marker to insert at end of table
        const insertPos = content.lastIndexOf('\n', tableEndIndex - 1);
        if (insertPos !== -1) {
            content = content.slice(0, insertPos) + `\n${newRow}` + content.slice(insertPos);
        } else {
            content = content.slice(0, tableEndIndex) + `\n${newRow}\n` + content.slice(tableEndIndex);
        }
    }

    // Restore original line endings
    if (lineEnding === '\r\n') {
        content = content.replace(/\n/g, '\r\n');
    }

    // Ensure trailing newline
    if (!content.endsWith(lineEnding)) {
        content += lineEnding;
    }

    fs.writeFileSync(COST_LEDGER_PATH, content, 'utf-8');

    // Summary line
    const costKesFormatted = costKes.toFixed(3);
    console.log(`PASS: Entry appended to COST-LEDGER.md`);
    console.log(`  Task:   ${opts.task}`);
    console.log(`  Agent:  ${opts.agent}`);
    console.log(`  Tokens: ${tokens.inputTokens} in / ${tokens.outputTokens} out / ${tokens.cacheHitTokens} cache`);
    console.log(`  Cost:   KSh ${costKesFormatted}`);
    process.exit(0);
}

main();
