#!/usr/bin/env node


/**
 * cost-report.js — Sprint Cost Report Generator (§11.5)
 *
 * Generates a cost report markdown file at `.agency/reports/cost-<sprint>.md`
 * by reading from COST-LEDGER.md (root).
 *
 * Usage:
 *   node .agency/scripts/cost-report.js --sprint S14
 *   node .agency/scripts/cost-report.js --sprint S14 --output custom/path.md
 *
 * Outputs in KES (Kenyan Shillings). Default rate: 1 USD ≈ 130 KES.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const COST_LEDGER_PATH = path.join(ROOT, 'COST-LEDGER.md');
const REPORTS_DIR = path.join(ROOT, '.agency', 'reports');
const USD_TO_KES = 130;

// ── CLI Parsing ──────────────────────────────────────────────────────────────

function parseArgs() {
    const args = process.argv.slice(2);
    const opts = { sprint: 'latest', output: null };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--sprint' && i + 1 < args.length) {
            opts.sprint = args[++i];
        }
        if (args[i] === '--output' && i + 1 < args.length) {
            opts.output = args[++i];
        }
    }

    return opts;
}

// ── LEDGER Parsing ──────────────────────────────────────────────────────────

/**
 * Parse the Sprint Entries table from COST-LEDGER.md.
 * Returns an array of entry objects.
 */
function parseLedger(content) {
    const lines = content.split('\n');
    const entries = [];
    let inTable = false;
    let headerLine = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Detect the Sprint Entries table header
        if (line.startsWith('| Sprint | Feature |')) {
            inTable = true;
            headerLine = i;
            continue;
        }

        // Skip separator line (|---|)
        if (inTable && line.match(/^\|[-|\s]+\|$/)) {
            continue;
        }

        // Skip the rollup row
        if (inTable && line.includes('*rollup*')) {
            continue;
        }

        // End of table
        if (inTable && (line === '' || !line.startsWith('|'))) {
            inTable = false;
            continue;
        }

        if (inTable && line.startsWith('|')) {
            const entry = parseEntryRow(line);
            if (entry) {
                entries.push(entry);
            }
        }
    }

    return entries;
}

/**
 * Parse a single table row from the Sprint Entries table.
 *
 * Format: | Sprint | Feature | Model | Tokens (In/Out/Cache) | Cost (USD) | Duration | Agent | Date |
 */
function parseEntryRow(row) {
    const cols = row.split('|').map(c => c.trim()).filter(c => c !== '');

    if (cols.length < 8) return null;

    const sprint = cols[0].replace(/^\*\*/, '').replace(/\*\*$/, '');
    const feature = cols[1];
    const model = cols[2];

    // Parse tokens: "85K / 12K / 42K"
    const tokenStr = cols[3];
    const tokenParts = tokenStr.split('/').map(t => parseTokenValue(t.trim()));
    const inputTokens = tokenParts[0] || 0;
    const outputTokens = tokenParts[1] || 0;
    const cacheHitTokens = tokenParts[2] || 0;

    const costUsd = parseFloat(cols[4].replace(/^\$/, ''));
    const duration = cols[5];
    const agent = cols[6];
    const date = cols[7] || '';

    return {
        sprint,
        feature,
        model,
        inputTokens,
        outputTokens,
        cacheHitTokens,
        costUsd: isNaN(costUsd) ? 0 : costUsd,
        duration,
        agent,
        date,
        costKes: isNaN(costUsd) ? 0 : Math.round(costUsd * USD_TO_KES * 100) / 100,
    };
}

/**
 * Parse token values like "85K", "1200", "1.2M".
 */
function parseTokenValue(str) {
    const num = parseFloat(str);
    if (isNaN(num)) return 0;

    if (str.endsWith('K') || str.endsWith('k')) return Math.round(num * 1000);
    if (str.endsWith('M') || str.endsWith('m')) return Math.round(num * 1000000);
    return Math.round(num);
}

// ── Aggregation ──────────────────────────────────────────────────────────────

function aggregateByAgent(entries) {
    const map = new Map();

    for (const e of entries) {
        // Some agents are comma-separated
        const agents = e.agent.split(',').map(a => a.trim());
        for (const agent of agents) {
            if (!map.has(agent)) {
                map.set(agent, { agent, inputTokens: 0, outputTokens: 0, cacheHitTokens: 0, costUsd: 0, costKes: 0, count: 0 });
            }
            const acc = map.get(agent);
            acc.inputTokens += e.inputTokens;
            acc.outputTokens += e.outputTokens;
            acc.cacheHitTokens += e.cacheHitTokens;
            acc.costUsd += e.costUsd;
            acc.costKes += e.costKes;
            acc.count++;
        }
    }

    return Array.from(map.values()).sort((a, b) => b.costKes - a.costKes);
}

function aggregateByFeature(entries) {
    const map = new Map();

    for (const e of entries) {
        if (!map.has(e.feature)) {
            map.set(e.feature, { feature: e.feature, inputTokens: 0, outputTokens: 0, cacheHitTokens: 0, costUsd: 0, costKes: 0, count: 0 });
        }
        const acc = map.get(e.feature);
        acc.inputTokens += e.inputTokens;
        acc.outputTokens += e.outputTokens;
        acc.cacheHitTokens += e.cacheHitTokens;
        acc.costUsd += e.costUsd;
        acc.costKes += e.costKes;
        acc.count++;
    }

    return Array.from(map.values()).sort((a, b) => b.costKes - a.costKes);
}

// ── Report Generation ─────────────────────────────────────────────────────────

function generateReport(entries, sprintName) {
    const byAgent = aggregateByAgent(entries);
    const byFeature = aggregateByFeature(entries);
    const top5 = [...entries].sort((a, b) => b.costKes - a.costKes).slice(0, 5);

    const totalInput = entries.reduce((s, e) => s + e.inputTokens, 0);
    const totalOutput = entries.reduce((s, e) => s + e.outputTokens, 0);
    const totalCache = entries.reduce((s, e) => s + e.cacheHitTokens, 0);
    const totalCostUsd = entries.reduce((s, e) => s + e.costUsd, 0);
    const totalCostKes = entries.reduce((s, e) => s + e.costKes, 0);

    const usdToKesNote = `1 USD = KSh ${USD_TO_KES}`;

    let md = `# 💰 Sprint ${sprintName} — Cost Report

> **Generated:** ${new Date().toISOString().split('T')[0]}
> **Exchange Rate:** ${usdToKesNote}
> **Source:** [COST-LEDGER.md](../../COST-LEDGER.md)

---

## Summary

| Metric | Value |
|--------|-------|
| **Tasks Tracked** | ${entries.length} |
| **Total Input Tokens** | ${totalInput.toLocaleString()} |
| **Total Output Tokens** | ${totalOutput.toLocaleString()} |
| **Cache Hit Tokens** | ${totalCache.toLocaleString()} |
| **Total Cost (USD)** | $${totalCostUsd.toFixed(3)} |
| **Total Cost (KES)** | KSh ${totalCostKes.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} |

---

## Tokens Per Agent

| Agent | Tasks | Input Tokens | Output Tokens | Cache Hit | Cost (USD) | Cost (KES) |
|-------|-------|-------------|--------------|-----------|------------|------------|
`;

    for (const a of byAgent) {
        md += `| ${a.agent} | ${a.count} | ${a.inputTokens.toLocaleString()} | ${a.outputTokens.toLocaleString()} | ${a.cacheHitTokens.toLocaleString()} | $${a.costUsd.toFixed(3)} | KSh ${a.costKes.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} |\n`;
    }

    md += `| **Total** | **${entries.length}** | **${totalInput.toLocaleString()}** | **${totalOutput.toLocaleString()}** | **${totalCache.toLocaleString()}** | **$${totalCostUsd.toFixed(3)}** | **KSh ${totalCostKes.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** |\n`;

    md += `\n---\n\n## Tokens Per Feature\n\n| Feature | Tasks | Input Tokens | Output Tokens | Cost (KES) |\n|---------|-------|-------------|--------------|------------|\n`;

    for (const f of byFeature) {
        md += `| ${f.feature} | ${f.count} | ${f.inputTokens.toLocaleString()} | ${f.outputTokens.toLocaleString()} | KSh ${f.costKes.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} |\n`;
    }

    md += `\n---\n\n## Top 5 Most Expensive Tasks\n\n| # | Sprint | Feature | Agent | Cost (USD) | Cost (KES) |\n|---|--------|---------|-------|------------|------------|\n`;

    top5.forEach((e, i) => {
        md += `| ${i + 1} | ${e.sprint} | ${e.feature} | ${e.agent} | $${e.costUsd.toFixed(3)} | KSh ${e.costKes.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} |\n`;
    });

    md += `\n---\n\n## Recommendations\n\n`;

    // Generate recommendations based on data
    const recommendations = [];

    if (totalCache > 0) {
        const cacheRate = ((totalCache / (totalInput + totalCache)) * 100).toFixed(1);
        recommendations.push(`- **Cache Hit Rate: ${cacheRate}%** — Continue leveraging context caching to reduce costs. Target > 40% cache hit rate.`);
    } else {
        recommendations.push('- **Cache Strategy:** Enable context caching to reduce input token costs by up to 99.6%.');
    }

    if (byFeature.length > 0 && byFeature[0].costKes > byFeature[1]?.costKes * 1.5) {
        recommendations.push(`- **High-Cost Feature:** "${byFeature[0].feature}" is the most expensive (KSh ${byFeature[0].costKes.toFixed(2)}). Consider splitting into smaller sub-tasks to optimize token usage.`);
    }

    // Check if V4 Pro is used
    const proEntries = entries.filter(e => e.model === 'deepseek-v4-pro');
    if (proEntries.length > 0) {
        const proCost = proEntries.reduce((s, e) => s + e.costKes, 0);
        recommendations.push(`- **Model Choice:** deepseek-v4-pro was used for ${proEntries.length} task(s) costing KSh ${proCost.toFixed(2)}. Reserve pro models only for complex reasoning to minimize cost.`);
    }

    recommendations.push(`- **Frequency:** ${entries.length} task(s) tracked. Review if any tasks can be batched to reduce setup overhead.`);
    recommendations.push(`- **Budget Tracking:** Set per-sprint budget caps in KES to prevent cost overruns.`);

    md += recommendations.join('\n');
    md += '\n\n---\n\n*Report generated by [`.agency/scripts/cost-report.js`](cost-report.js)*\n';

    return md;
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
    const opts = parseArgs();

    // Validate sprint name
    const sprintName = opts.sprint;

    // Read COST-LEDGER.md
    if (!fs.existsSync(COST_LEDGER_PATH)) {
        console.error(`FAIL: Cost ledger not found at ${COST_LEDGER_PATH}`);
        process.exit(1);
    }

    const content = fs.readFileSync(COST_LEDGER_PATH, 'utf-8');
    const allEntries = parseLedger(content);

    if (allEntries.length === 0) {
        console.error('FAIL: No sprint entries found in COST-LEDGER.md');
        process.exit(1);
    }

    // If sprint is 'latest', use the last entry's sprint ID
    let effectiveSprint = sprintName;
    if (sprintName === 'latest') {
        effectiveSprint = allEntries[allEntries.length - 1].sprint;
    }

    // Filter entries for this sprint (prefix match)
    const entries = allEntries.filter(e => e.sprint.startsWith(effectiveSprint.replace(/^S/, 'S')));

    if (entries.length === 0) {
        console.error(`FAIL: No entries found for sprint "${sprintName}" (effective: "${effectiveSprint}")`);
        process.exit(1);
    }

    // Generate report
    const report = generateReport(entries, effectiveSprint);

    // Write output
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    const outputPath = opts.output || path.join(REPORTS_DIR, `cost-${effectiveSprint}.md`);
    fs.writeFileSync(outputPath, report, 'utf-8');

    console.log(`PASS: Cost report written to ${outputPath}`);
    console.log(`  Sprint:      ${effectiveSprint}`);
    console.log(`  Entries:     ${entries.length}`);
    console.log(`  Total Cost:  KSh ${entries.reduce((s, e) => s + e.costKes, 0).toFixed(2)}`);
    process.exit(0);
}

main();
