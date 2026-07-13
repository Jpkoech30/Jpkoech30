#!/usr/bin/env node


/**
 * cost-track.js — Simple Cost Tracker
 *
 * Records a single task's token consumption by appending a new entry to
 * COST-LEDGER.md at the project root. Calculates KES cost using the formula:
 *   (input_tokens × 19 + output_tokens × 38) / 1,000,000
 *
 * Usage:
 *   node .agency/scripts/cost-track.js --task S14.6 --tokens 15000/3000/5000 --agent code-agent
 *   node .agency/scripts/cost-track.js --task S14.6 --tokens 15000/3000 --agent code-agent
 *   node .agency/scripts/cost-track.js --task S14.6 --raw-usage '{"input_tokens":5000,"output_tokens":1000}' --agent code-agent
 *
 * Token format: <input>/<output>[/<cache>]
 *   e.g., 15000/3000/5000  or  15000/3000
 *
 * --raw-usage <json>:
 *   Accepts a JSON string like '{"input_tokens":5000,"output_tokens":1000}'.
 *   Overrides --tokens when provided. Logs a WARNING if manual --tokens flag
 *   differs by >10%. Writes [AUDITED] tag to the ledger entry.
 *
 * Exit codes:
 *   0 — Entry appended successfully
 *   1 — Invalid arguments or file error
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const TELEMETRY_SCRIPT = path.join(__dirname, 'telemetry.js');
const COST_LEDGER_PATH = path.join(ROOT, 'COST-LEDGER.md');

// KES rates per million tokens
const INPUT_RATE_KES = 19;   // 19 KES per 1M input tokens
const OUTPUT_RATE_KES = 38;  // 38 KES per 1M output tokens

// Default model mapping (can be extended)
const MODEL_MAP = {
    'code-agent': 'deepseek-v4-flash',
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
    const opts = { task: null, tokens: null, agent: null, rawUsage: null, project: null };

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
        if (args[i] === '--raw-usage' && i + 1 < args.length) {
            opts.rawUsage = args[++i];
        }
        if (args[i] === '--project' && i + 1 < args.length) {
            opts.project = args[++i];
        }
    }

    return opts;
}

/**
 * Parse --raw-usage JSON string.
 * Returns { inputTokens, outputTokens } or null on failure.
 */
function parseRawUsage(rawJson) {
    try {
        const data = JSON.parse(rawJson);
        const inputTokens = parseInt(data.input_tokens, 10);
        const outputTokens = parseInt(data.output_tokens, 10);

        if (isNaN(inputTokens) || isNaN(outputTokens)) {
            throw new Error('input_tokens and output_tokens must be numbers');
        }

        return { inputTokens, outputTokens };
    } catch (err) {
        console.error(`FAIL: Invalid --raw-usage JSON: ${err.message}`);
        process.exit(1);
    }
}

/**
 * Calculate the percentage difference between two values.
 * Returns absolute percentage difference.
 */
function percentDiff(a, b) {
    if (a === 0 && b === 0) return 0;
    if (a === 0 || b === 0) return 100;
    return Math.abs((a - b) / b) * 100;
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
function buildEntryRow(taskId, tokens, agent, costKes, isAudited, project) {
    const model = MODEL_MAP[agent] || 'deepseek-v4-flash';
    const today = new Date().toISOString().split('T')[0];
    const auditedTag = isAudited ? ' [AUDITED]' : '';
    const projectTag = project ? ` [PROJECT:${project}]` : '';

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

    return `| **${taskId}** | cost-track entry${auditedTag}${projectTag} | ${model} | ${tokenCol} | $${costUsd} | — | ${agent} | ${today} |`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
    const opts = parseArgs();

    // Validate required args
    const missing = [];
    if (!opts.task) missing.push('--task');
    if (!opts.agent) missing.push('--agent');

    // --tokens is required unless --raw-usage is provided
    if (!opts.tokens && !opts.rawUsage) missing.push('--tokens or --raw-usage');

    if (missing.length > 0) {
        console.error(`FAIL: Missing required argument(s): ${missing.join(', ')}`);
        console.error('Usage: node cost-track.js --task <id> --tokens <in>/<out>[/<cache>] --agent <slug> [--project <id>]');
        console.error('   or: node cost-track.js --task <id> --raw-usage \'{"input_tokens":5000,"output_tokens":1000}\' --agent <slug> [--project <id>]');
        process.exit(1);
    }

    // Parse --raw-usage if provided (overrides --tokens)
    let isAudited = false;
    let apiTokens = null;
    if (opts.rawUsage) {
        isAudited = true;
        apiTokens = parseRawUsage(opts.rawUsage);

        // If manual --tokens also provided, compare and warn
        if (opts.tokens) {
            let manualTokens;
            try {
                manualTokens = parseTokens(opts.tokens);
            } catch (err) {
                console.error(`FAIL: ${err.message}`);
                process.exit(1);
            }

            const inDiff = percentDiff(manualTokens.inputTokens, apiTokens.inputTokens);
            const outDiff = percentDiff(manualTokens.outputTokens, apiTokens.outputTokens);

            if (inDiff > 10 || outDiff > 10) {
                const maxDiff = Math.max(inDiff, outDiff);
                console.warn(`⚠️ Manual token count differs from API by ${maxDiff.toFixed(1)}%`);
            }
        }
    }

    // Parse manual tokens (used directly or as fallback when --raw-usage not provided)
    let tokens;
    if (isAudited) {
        // Use API tokens, but keep cache from manual if available
        tokens = {
            inputTokens: apiTokens.inputTokens,
            outputTokens: apiTokens.outputTokens,
            cacheHitTokens: 0,
        };
        // If manual tokens were provided, carry over cache hit info
        if (opts.tokens) {
            try {
                const manualTokens = parseTokens(opts.tokens);
                tokens.cacheHitTokens = manualTokens.cacheHitTokens;
            } catch (_) { /* ignore */ }
        }
    } else {
        try {
            tokens = parseTokens(opts.tokens);
        } catch (err) {
            console.error(`FAIL: ${err.message}`);
            process.exit(1);
        }
    }

    // Calculate cost
    const costKes = calculateKesCost(tokens.inputTokens, tokens.outputTokens);

    // Validate COST-LEDGER.md exists
    if (!fs.existsSync(COST_LEDGER_PATH)) {
        console.error(`FAIL: Cost ledger not found at ${COST_LEDGER_PATH}`);
        process.exit(1);
    }

    // Build the new entry row
    const newRow = buildEntryRow(opts.task, tokens, opts.agent, costKes, isAudited, opts.project);

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
    if (opts.project) {
        console.log(`  Project: ${opts.project}`);
    }
    if (isAudited) {
        console.log(`  Audit:  Entry tagged [AUDITED] — API-reported usage used`);
    }

    // ── Telemetry: cost event ────────────────────────────────────────
    try {
        execSync(
            `node ${TELEMETRY_SCRIPT} log --event cost_event --task ${opts.task} --agent ${opts.agent} --inputTokens ${tokens.inputTokens} --outputTokens ${tokens.outputTokens} --cacheHit ${tokens.cacheHitTokens} --costKES ${costKesFormatted}${opts.project ? ` --project ${opts.project}` : ''}`,
            { stdio: 'ignore', timeout: 10000 }
        );
    } catch (_) {
        // Telemetry failures must not block cost tracking
    }

    process.exit(0);
}

main();
