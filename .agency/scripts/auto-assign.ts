#!/usr/bin/env node


/**
 * auto-assign.js — Auto-Assign Agent from Task Description
 *
 * Reads .roomodes → matches fileRegex against provided file paths
 * Returns top-3 agent matches with match scores.
 *
 * Usage:
 *   node .agency/scripts/auto-assign.js --task "Create invoice screen" --files "apps/mobile/src/app/invoices/create.tsx"
 *   node .agency/scripts/auto-assign.js --task "Fix API validation" --files "apps/api/src/controllers/invoice.controller.ts"
 *   node .agency/scripts/auto-assign.js --task "Update config" --files ".roomodes"
 *
 * Scoring:
 *   Exact match   = 100%  (fileRegex exactly matches the file path)
 *   Parent match  = 50%   (fileRegex is a parent directory of the file path)
 *
 * Exit codes:
 *   0 — Success (matches found)
 *   1 — Error or no matches
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const ROOMODES_PATH = path.join(ROOT, '.roomodes');

// ── ANSI Color Helpers ────────────────────────────────────────────────────────

const C = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m',
    reset: '\x1b[0m',
};

function color(text, c) { return `${c}${text}${C.reset}`; }

// ── CLI Parsing ──────────────────────────────────────────────────────────────

function parseArgs() {
    const args = process.argv.slice(2);
    const opts = { task: '', files: [], json: false };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--task':
                opts.task = args[++i] || '';
                break;
            case '--files':
                opts.files = (args[++i] || '').split(',').map(f => f.trim()).filter(Boolean);
                break;
            case '--json':
                opts.json = true;
                break;
        }
    }

    return opts;
}

// ── Roomodes Parser ──────────────────────────────────────────────────────────

/**
 * Read and parse .roomodes file.
 * @returns {Array<{slug: string, name: string, fileRegex: string|null}>}
 */
function readRoomodes() {
    if (!fs.existsSync(ROOMODES_PATH)) {
        console.error('FAIL: .roomodes not found at', ROOMODES_PATH);
        process.exit(1);
    }

    const content = fs.readFileSync(ROOMODES_PATH, 'utf-8');
    let parsed;

    try {
        parsed = JSON.parse(content);
    } catch (err) {
        console.error('FAIL: Invalid .roomodes JSON:', err.message);
        process.exit(1);
    }

    const modes = parsed.customModes || [];

    return modes.map(m => {
        // Extract fileRegex from groups array
        let fileRegex = null;
        if (Array.isArray(m.groups)) {
            for (const group of m.groups) {
                if (Array.isArray(group) && group.length >= 2 && group[0] === 'edit') {
                    const config = group[1];
                    if (config && config.fileRegex) {
                        fileRegex = config.fileRegex;
                    }
                }
            }
        }

        return {
            slug: m.slug,
            name: m.name,
            fileRegex,
        };
    }).filter(m => m.fileRegex); // Only agents with fileRegex
}

// ── Matching Logic ───────────────────────────────────────────────────────────

/**
 * Convert a fileRegex pattern to a normalized path pattern.
 * Removes `(?:...)` non-capturing groups, `^`, `$`, and simplifies.
 * @param {string} pattern
 * @returns {string}
 */
function normalizePattern(pattern) {
    return pattern
        .replace(/\\\^/g, '^')
        .replace(/\\\$/g, '$')
        .replace(/\\\./g, '.')
        .replace(/\\\//g, '/')
        .replace(/\\\(\\\?:/g, '(?:')
        .replace(/\\\)/g, ')')
        .replace(/\\\[/g, '[')
        .replace(/\\\]/g, ']');
}

/**
 * Score a file path against an agent's fileRegex.
 *
 * @param {string} filePath - The file path to match (e.g., "apps/mobile/src/app/invoices/create.tsx")
 * @param {string} regexStr - The fileRegex from .roomodes (e.g., "^(?:projects/[^/]+/)?(?:[^/]+/)?apps/mobile/src/app/.*")
 * @returns {{ score: number, matchType: string }}
 */
function scoreMatch(filePath, regexStr) {
    try {
        // First try exact regex match
        const regex = new RegExp(regexStr);
        if (regex.test(filePath)) {
            return { score: 100, matchType: 'exact' };
        }

        // Check if the regex is a parent of the file path
        // Extract the base directory pattern from the regex
        const basePattern = regexStr
            .replace(/\.\*$/g, '')           // Remove trailing .*
            .replace(/\\\.\.\./g, '')         // Remove ...
            .replace(/\[/g, '\\[')
            .replace(/\]/g, '\\]');

        // Try matching the path against the base pattern (parent match)
        // A parent match means the regex covers a parent directory of the file
        const parentRegex = new RegExp(basePattern);
        if (parentRegex.test(filePath)) {
            return { score: 50, matchType: 'parent' };
        }

        // Check if the directory prefix of the file matches the regex
        const dirs = filePath.split('/');
        for (let i = dirs.length - 1; i > 0; i--) {
            const dirPrefix = dirs.slice(0, i).join('/');
            if (regex.test(dirPrefix)) {
                return { score: 50, matchType: 'parent' };
            }
        }
    } catch (err) {
        // Invalid regex, skip this agent
        return { score: 0, matchType: 'none' };
    }

    return { score: 0, matchType: 'none' };
}

/**
 * Compute a semantic relevance hint from the task description matching agent names.
 * @param {string} taskDesc
 * @param {string} agentName
 * @returns {number} Bonus score 0-20
 */
function semanticHint(taskDesc, agentName) {
    const lowerTask = taskDesc.toLowerCase();
    const lowerName = agentName.toLowerCase();

    // Keywords that map to specific agent types
    const hints = {
        screen: ['mobile Screen', 'mobile screen'],
        page: ['frontend page', 'web page'],
        ui: ['frontend ui', 'mobile ui', 'ui'],
        component: ['frontend ui', 'mobile ui', 'ui'],
        store: ['frontend state', 'mobile state', 'state'],
        hook: ['frontend state', 'mobile state'],
        api: ['backend api', 'backend', 'api'],
        service: ['backend service', 'backend', 'service'],
        controller: ['backend api', 'controller'],
        dto: ['backend api'],
        contract: ['lead architect', 'contract'],
        test: ['qa automator', 'test'],
        e2e: ['qa automator'],
        config: ['devops', 'config'],
        docs: ['agency documentarian', 'docs', 'document'],
        deploy: ['devops', 'deploy'],
        ci: ['devops cicd', 'ci/cd'],
        db: ['backend database', 'devops database', 'database', 'migration', 'prisma'],
        schema: ['backend database', 'database'],
        migration: ['backend database'],
        security: ['security auditor'],
        audit: ['compliance guardian', 'security auditor', 'accessibility auditor'],
        perf: ['performance auditor'],
        a11y: ['accessibility auditor'],
        accessibility: ['accessibility auditor'],
        release: ['release manager'],
    };

    let bonus = 0;

    for (const [keyword, targets] of Object.entries(hints)) {
        if (lowerTask.includes(keyword)) {
            for (const target of targets) {
                if (lowerName.includes(target)) {
                    bonus += 10;
                }
            }
        }
    }

    return Math.min(bonus, 20);
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
    const opts = parseArgs();

    if (!opts.task || opts.files.length === 0) {
        console.log(`Usage:
  node .agency/scripts/auto-assign.js --task "<description>" --files "path1,path2"

Options:
  --task   Task description (required)
  --files  Comma-separated file paths (required)
  --json   Output as JSON`);
        process.exit(0);
    }

    const agents = readRoomodes();
    const allScores = [];

    for (const agent of agents) {
        let totalScore = 0;
        let matchCount = 0;
        let bestMatchType = 'none';

        for (const filePath of opts.files) {
            const result = scoreMatch(filePath, agent.fileRegex);
            if (result.score > 0) {
                totalScore += result.score;
                matchCount++;
                if (result.matchType === 'exact') bestMatchType = 'exact';
                if (result.matchType === 'parent' && bestMatchType !== 'exact') bestMatchType = 'parent';
            }
        }

        // Calculate average score across all files
        const avgScore = opts.files.length > 0 ? Math.round(totalScore / opts.files.length) : 0;

        // Add semantic bonus from task description
        const bonus = semanticHint(opts.task, agent.name);
        const finalScore = Math.min(avgScore + bonus, 100);

        if (finalScore > 0) {
            allScores.push({
                slug: agent.slug,
                name: agent.name,
                score: finalScore,
                matchType: bestMatchType,
                fileRegex: agent.fileRegex,
            });
        }
    }

    // Sort by score descending, then by name
    allScores.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.name.localeCompare(b.name);
    });

    // Top 3
    const top3 = allScores.slice(0, 3);

    if (opts.json) {
        console.log(JSON.stringify({
            task: opts.task,
            files: opts.files,
            matches: top3,
            totalCandidates: allScores.length,
        }, null, 2));
        process.exit(top3.length > 0 ? 0 : 1);
    }

    // Human-readable output
    console.log(color(`\n  Auto-Assign: ${opts.task}`, C.bold));
    console.log(`  Files: ${opts.files.join(', ')}\n`);

    if (top3.length === 0) {
        console.log(color(`  ✖ No matching agents found`, C.red));
        process.exit(1);
    }

    console.log(color(`  Top ${top3.length} Agent Matches\n`, C.cyan));

    for (let i = 0; i < top3.length; i++) {
        const m = top3[i];
        const scoreColor = m.score >= 80 ? C.green : m.score >= 50 ? C.yellow : C.red;
        const typeLabel = m.matchType === 'exact' ? 'EXACT' : 'PARENT';

        console.log(`  ${i + 1}. ${color(m.name, C.bold)}`);
        console.log(`     Slug:       ${m.slug}`);
        console.log(`     Score:      ${color(`${m.score}%`, scoreColor)} (${typeLabel})`);
        console.log(`     FileRegex:  ${m.fileRegex}`);
        console.log('');
    }

    process.exit(0);
}

main();

export {};
