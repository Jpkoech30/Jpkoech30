#!/usr/bin/env node


/**
 * retro-report.js — Sprint Retrospective Report Generator
 *
 * Reads: .agency/memory/store.json, .agency/telemetry/events.jsonl, git log
 * Outputs: .agency/reports/retro-sprint<#>.md
 *
 * Usage:
 *   node .agency/scripts/retro-report.js --sprint 18
 *   node .agency/scripts/retro-report.js --sprint 18 --output custom/path.md
 *   node .agency/scripts/retro-report.js --sprint 18 --dry-run
 *
 * Exit codes:
 *   0 — Success
 *   1 — Error
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const MEMORY_PATH = path.join(ROOT, '.agency', 'memory', 'store.json');
const TELEMETRY_PATH = path.join(ROOT, '.agency', 'telemetry', 'events.jsonl');
const REPORTS_DIR = path.join(ROOT, '.agency', 'reports');

// ── ANSI Color ───────────────────────────────────────────────────────────────

const C = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m',
};

function color(text, c) { return `${c}${text}${C.reset}`; }
function ok(msg) { console.log(`${C.green}✓${C.reset} ${msg}`); }
function info(msg) { console.log(`  ${C.cyan}→${C.reset} ${msg}`); }
function fail(msg) { console.error(`${C.red}✖${C.reset} ${msg}`); }

// ── CLI Parsing ──────────────────────────────────────────────────────────────

function parseArgs() {
    const args = process.argv.slice(2);
    const opts = { sprint: null, output: null, dryRun: false };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--sprint':
                opts.sprint = args[++i] || null;
                break;
            case '--output':
                opts.output = args[++i] || null;
                break;
            case '--dry-run':
                opts.dryRun = true;
                break;
        }
    }

    return opts;
}

// ── Data Sources ─────────────────────────────────────────────────────────────

/**
 * Read telemetry events from JSONL file.
 * @returns {object[]}
 */
function readTelemetry() {
    if (!fs.existsSync(TELEMETRY_PATH)) return [];
    const content = fs.readFileSync(TELEMETRY_PATH, 'utf-8');
    return content.split('\n').filter(Boolean).map(line => {
        try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
}

/**
 * Read memory store.json.
 * @returns {object[]}
 */
function readMemory() {
    if (!fs.existsSync(MEMORY_PATH)) return [];
    const content = fs.readFileSync(MEMORY_PATH, 'utf-8');
    try { return JSON.parse(content); } catch { return []; }
}

/**
 * Get git log entries for the sprint period.
 * @param {string} sprintTag - e.g., "S18" to find tags
 * @returns {object[]}
 */
function getGitLog(sprintTag) {
    try {
        // Try to find a tag matching the sprint
        const tagCmd = `tag --list "*${sprintTag}*"`;
        const tags = execSync(`git ${tagCmd}`, {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
        }).trim().split('\n').filter(Boolean);

        let range;
        if (tags.length > 0) {
            // Use the latest matching tag as start
            const startTag = tags[tags.length - 1];
            range = `${startTag}..HEAD`;
        } else {
            // Fallback: last 50 commits
            range = `-50 HEAD`;
        }

        const logCmd = `log --oneline --format="%h|%s|%ai" ${range}`;
        const output = execSync(`git ${logCmd}`, {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
        }).trim();

        return output.split('\n').filter(Boolean).map(line => {
            const parts = line.split('|');
            return {
                hash: parts[0] || '',
                message: parts[1] || '',
                date: parts[2] || '',
            };
        });
    } catch {
        return [];
    }
}

/**
 * Get a list of unique agents from telemetry.
 * @param {object[]} events
 * @returns {string[]}
 */
function getAgents(events) {
    const agents = new Set();
    for (const e of events) {
        if (e.agent) agents.add(e.agent);
    }
    return Array.from(agents).sort();
}

/**
 * Calculate cost per agent from telemetry cost events.
 * @param {object[]} events
 * @returns {object}
 */
function calcCostPerAgent(events) {
    const costs = {};
    for (const e of events) {
        if (e.inputTokens !== undefined && e.agent) {
            if (!costs[e.agent]) {
                costs[e.agent] = { inputTokens: 0, outputTokens: 0, costKES: 0, count: 0 };
            }
            costs[e.agent].inputTokens += e.inputTokens || 0;
            costs[e.agent].outputTokens += e.outputTokens || 0;
            costs[e.agent].costKES += e.costKES || 0;
            costs[e.agent].count++;
        }
    }
    return costs;
}

/**
 * Analyze quality gates from telemetry.
 * @param {object[]} events
 * @returns {object[]}
 */
function analyzeQualityGates(events) {
    const gates = [];
    for (const e of events) {
        if (e.gate) {
            gates.push({
                gate: e.gate,
                failCount: e.failCount || 0,
                escalated: e.escalated || false,
                timestamp: e.timestamp || '',
            });
        }
    }
    return gates;
}

// ── Report Generation ────────────────────────────────────────────────────────

function generateReport(sprintNumber, events, memory, commits, agents, costPerAgent, qualityGates) {
    const sprintLabel = `Sprint ${sprintNumber}`;

    // Task counts
    const taskEvents = events.filter(e => e.task && e.event === 'start');
    const uniqueTasks = new Set(taskEvents.map(e => e.task));
    const completedTasks = events.filter(e => e.status === 'DONE');
    const completedCount = new Set(completedTasks.map(e => e.task)).size;

    // Memory entries count
    const sprintMemory = memory.filter(m => {
        if (!m.taskId) return false;
        return m.taskId.toLowerCase().includes(`sprint${sprintNumber}`.toLowerCase()) ||
            m.tags?.toLowerCase().includes(`sprint${sprintNumber}`.toLowerCase());
    });

    // Total cost
    let totalCostKES = 0;
    for (const [, cost] of Object.entries(costPerAgent)) {
        totalCostKES += cost.costKES;
    }

    // Quality gate analysis
    const gateResults = {};
    for (const g of qualityGates) {
        if (!gateResults[g.gate]) {
            gateResults[g.gate] = { total: 0, failures: 0, escalated: false };
        }
        gateResults[g.gate].total++;
        gateResults[g.gate].failures += g.failCount;
        if (g.escalated) gateResults[g.gate].escalated = true;
    }

    // Recommendations
    const recommendations = [];

    if (Object.keys(gateResults).length > 0) {
        const worstGate = Object.entries(gateResults)
            .sort((a, b) => b[1].failures - a[1].failures)[0];
        if (worstGate && worstGate[1].failures > 0) {
            recommendations.push(`- **${worstGate[0].toUpperCase()} gate** had ${worstGate[1].failures} failure(s) — investigate recurring issues`);
        }
    }

    const highCostAgents = Object.entries(costPerAgent)
        .sort((a, b) => b[1].costKES - a[1].costKES)
        .slice(0, 2);

    for (const [agent, cost] of highCostAgents) {
        if (cost.costKES > 0.5) {
            recommendations.push(`- **${agent}** had highest token cost (KES ${cost.costKES.toFixed(3)}) — consider splitting tasks or using flash model`);
        }
    }

    if (completedCount < uniqueTasks.size) {
        recommendations.push(`- **${uniqueTasks.size - completedCount} task(s)** not marked DONE — verify completion status before closing sprint`);
    }

    if (commits.length === 0) {
        recommendations.push('- **No commits detected** — ensure changes are committed before sprint end');
    } else {
        recommendations.push(`- **${commits.length} commit(s)** — ${commits.filter(c => c.message.startsWith('feat')).length} features, ${commits.filter(c => c.message.startsWith('fix')).length} fixes`);
    }

    if (recommendations.length === 0) {
        recommendations.push('- No issues detected — sprint ran cleanly');
    }

    // ── Build Markdown ──

    let md = `# ${sprintLabel} Retrospective

> **Generated:** ${new Date().toISOString().split('T')[0]}
> **Source:** Telemetry, Memory, Git Log

---

## Summary

| Metric | Value |
|--------|-------|
| **Tasks Tracked** | ${uniqueTasks.size} |
| **Completed** | ${completedCount}/${uniqueTasks.size} tasks |
| **Total Cost** | KES ${totalCostKES.toFixed(3)} |
| **Memory Entries** | ${sprintMemory.length} |
| **Commits** | ${commits.length} |
| **Agents Involved** | ${agents.length} |

---

## Tasks

| # | Task | Agent | Status |
|---|------|-------|--------|
`;

    // Build task table from telemetry
    const taskMap = new Map();
    for (const e of taskEvents) {
        if (!taskMap.has(e.task)) {
            taskMap.set(e.task, { task: e.task, agent: e.agent || '?', status: e.status || 'PENDING' });
        }
    }
    // Update status from completion events
    for (const e of completedTasks) {
        if (taskMap.has(e.task)) {
            taskMap.get(e.task).status = 'DONE';
        }
    }

    let taskIdx = 1;
    for (const [, t] of taskMap) {
        const statusIcon = t.status === 'DONE' ? '✅' : t.status === 'IN_PROGRESS' ? '🔄' : '⏳';
        md += `| ${taskIdx++} | ${t.task} | ${t.agent} | ${statusIcon} ${t.status} |\n`;
    }

    md += `
---

## Agents

| Agent | Contributions | Input Tokens | Output Tokens | Cost (KES) |
|-------|--------------|-------------|--------------|------------|
`;

    const sortedAgents = [...agents].sort((a, b) => {
        const costA = costPerAgent[a]?.costKES || 0;
        const costB = costPerAgent[b]?.costKES || 0;
        return costB - costA;
    });

    for (const agent of sortedAgents) {
        const cost = costPerAgent[agent];
        if (cost) {
            md += `| ${agent} | ${cost.count} | ${cost.inputTokens.toLocaleString()} | ${cost.outputTokens.toLocaleString()} | KES ${cost.costKES.toFixed(3)} |\n`;
        } else {
            md += `| ${agent} | 0 | 0 | 0 | KES 0.000 |\n`;
        }
    }

    const totalInput = Object.values(costPerAgent).reduce((s, c) => s + c.inputTokens, 0);
    const totalOutput = Object.values(costPerAgent).reduce((s, c) => s + c.outputTokens, 0);
    md += `| **Total** | **${Object.values(costPerAgent).reduce((s, c) => s + c.count, 0)}** | **${totalInput.toLocaleString()}** | **${totalOutput.toLocaleString()}** | **KES ${totalCostKES.toFixed(3)}** |\n`;

    md += `
---

## Quality Gates

| Gate | Checks | Failures | Escalated | Result |
|------|--------|----------|-----------|--------|
`;

    if (Object.keys(gateResults).length === 0) {
        md += '| *(none)* | 0 | 0 | — | ⚠️ No gate data recorded |\n';
    } else {
        for (const [gate, result] of Object.entries(gateResults)) {
            const status = result.failures === 0 ? '✅ PASS' : result.escalated ? '🔴 ESCALATED' : '⚠️ FAIL';
            md += `| ${gate} | ${result.total} | ${result.failures} | ${result.escalated ? 'Yes' : 'No'} | ${status} |\n`;
        }
    }

    md += `
---

## Memory Entries
`;

    if (sprintMemory.length === 0) {
        md += '\n*No memory entries recorded for this sprint.*\n';
    } else {
        for (const m of sprintMemory.slice(0, 10)) {
            const date = m.createdAt ? m.createdAt.split('T')[0] : '?';
            const preview = m.content.length > 100 ? m.content.slice(0, 100) + '...' : m.content;
            md += `- [${date}] **${m.agentSlug || m.sourceFile || '?'}**: ${preview}\n`;
        }
        if (sprintMemory.length > 10) {
            md += `- *...and ${sprintMemory.length - 10} more entries*\n`;
        }
    }

    md += `
---

## Commits
`;

    if (commits.length === 0) {
        md += '\n*No commits found.*\n';
    } else {
        md += '| Hash | Message | Date |\n|------|---------|------|\n';
        for (const c of commits.slice(0, 20)) {
            const date = c.date ? c.date.split('T')[0].split(' ')[0] : '?';
            md += `| \`${c.hash}\` | ${c.message} | ${date} |\n`;
        }
        if (commits.length > 20) {
            md += `| *...and ${commits.length - 20} more* | | |\n`;
        }
    }

    md += `
---

## Recommendations

${recommendations.join('\n')}

---

*Report generated by [\`.agency/scripts/retro-report.js\`](retro-report.js)*
`;

    return md;
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
    const opts = parseArgs();

    if (!opts.sprint) {
        console.log(`Usage:
  node .agency/scripts/retro-report.js --sprint <number>
  node .agency/scripts/retro-report.js --sprint 18 --output custom/path.md
  node .agency/scripts/retro-report.js --sprint 18 --dry-run`);
        process.exit(0);
    }

    const sprintNumber = opts.sprint;

    info(`Generating Sprint ${sprintNumber} retrospective...`);

    // Read data sources
    const events = readTelemetry();
    ok(`Telemetry: ${events.length} events`);

    const memory = readMemory();
    ok(`Memory: ${memory.length} entries`);

    const commits = getGitLog(`S${sprintNumber}`);
    ok(`Git log: ${commits.length} commits`);

    const agents = getAgents(events);
    ok(`Agents: ${agents.length}`);

    const costPerAgent = calcCostPerAgent(events);
    const qualityGates = analyzeQualityGates(events);
    ok(`Quality gates: ${qualityGates.length}`);

    // Generate report
    const report = generateReport(sprintNumber, events, memory, commits, agents, costPerAgent, qualityGates);

    // Output
    if (opts.dryRun) {
        console.log(`\n${C.bold}=== DRY RUN: Sprint ${sprintNumber} Retrospective ===${C.reset}\n`);
        console.log(report);
        ok('Dry-run complete. No file written.');
        process.exit(0);
    }

    // Ensure reports directory
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    const outputPath = opts.output || path.join(REPORTS_DIR, `retro-sprint${sprintNumber}.md`);
    fs.writeFileSync(outputPath, report, 'utf-8');

    ok(`Retrospective written to ${outputPath}`);
    info(`Sprint:      ${sprintNumber}`);
    info(`Tasks:       ${new Set(events.filter(e => e.task && e.event === 'start').map(e => e.task)).size}`);
    info(`Agents:      ${agents.length}`);
    info(`Total cost:  KES ${Object.values(costPerAgent).reduce((s, c) => s + c.costKES, 0).toFixed(3)}`);
    process.exit(0);
}

main();
