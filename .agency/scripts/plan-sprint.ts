#!/usr/bin/env node

/**
 * plan-sprint.js — Generate Task Tables from Feature Descriptions
 *
 * Reads a feature description text + .roomodes agent list,
 * parses task-like bullets, and generates a markdown sprint table
 * matching ORCHESTRATION.md format.
 *
 * Usage:
 *   node .agency/scripts/plan-sprint.js --feature "<description>" [--output <path>]
 *   node .agency/scripts/plan-sprint.js --help
 *
 * Exit codes:
 *   0 — Success (table generated, or usage shown for empty input)
 *   1 — Error
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

const USAGE = `Usage:
  node .agency/scripts/plan-sprint.js --feature "<description>" [options]

Options:
  --feature <text>  Feature description with task bullets (required)
  --output <path>   Write table to file instead of stdout
  --help, -h        Show this help message

Examples:
  node .agency/scripts/plan-sprint.js --feature "Create login screen"
  node .agency/scripts/plan-sprint.js --feature "Sprint 17 tasks..." --output ORCHESTRATION.md
`;

function parseArgs() {
    const args = process.argv.slice(2);
    const opts = { feature: '', output: null, help: false };

    if (args.length === 0) {
        opts.help = true;
        return opts;
    }

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--feature':
                opts.feature = args[++i] || '';
                break;
            case '--output':
                opts.output = args[++i] || null;
                break;
            case '--help':
            case '-h':
                opts.help = true;
                break;
        }
    }

    return opts;
}

// ── Roomodes Parser ──────────────────────────────────────────────────────────

/**
 * Read and parse .roomodes file.
 * @returns {Array<{slug: string, name: string}>}
 */
function readRoomodes() {
    if (!fs.existsSync(ROOMODES_PATH)) {
        console.warn(color('WARN: .roomodes not found. Using generic agent.', C.yellow));
        return [{ slug: 'code-agent', name: '🔧 Code' }];
    }

    const content = fs.readFileSync(ROOMODES_PATH, 'utf-8');
    let parsed;

    try {
        parsed = JSON.parse(content);
    } catch (err) {
        console.warn(color(`WARN: Invalid .roomodes JSON: ${err.message}. Using generic agent.`, C.yellow));
        return [{ slug: 'code-agent', name: '🔧 Code' }];
    }

    const modes = parsed.customModes || [];
    return modes.map(m => ({
        slug: m.slug,
        name: m.name,
    }));
}

// ── Agent Matching ───────────────────────────────────────────────────────────

/**
 * Keyword-to-agent mapping for inferring the right agent from task text.
 * Maps keywords found in task descriptions to agent slugs.
 */
const AGENT_KEYWORDS = {
    script: ['code-agent', '🔧 JengaBooks Code'],
    config: ['code-agent', '🔧 JengaBooks Code'],
    bootstrap: ['code-agent', '🔧 JengaBooks Code'],
    'cleanup': ['code-agent', '🔧 JengaBooks Code'],
    api: ['backend-api', '⚙️ Backend API'],
    endpoint: ['backend-api', '⚙️ Backend API'],
    controller: ['backend-api', '⚙️ Backend API'],
    route: ['backend-api', '⚙️ Backend API'],
    dto: ['backend-api', '⚙️ Backend API'],
    validation: ['backend-api', '⚙️ Backend API'],
    service: ['backend-service', '⚙️ Backend Service & Logic'],
    business: ['backend-service', '⚙️ Backend Service & Logic'],
    logic: ['backend-service', '⚙️ Backend Service & Logic'],
    domain: ['backend-service', '⚙️ Backend Service & Logic'],
    integration: ['backend-integration', '⚙️ Backend Integration'],
    webhook: ['backend-integration', '⚙️ Backend Integration'],
    queue: ['backend-integration', '⚙️ Backend Integration'],
    adapter: ['backend-integration', '⚙️ Backend Integration'],
    schema: ['backend-database', '🗄️ Backend Database'],
    migration: ['backend-database', '🗄️ Backend Database'],
    prisma: ['backend-database', '🗄️ Backend Database'],
    sql: ['backend-database', '🗄️ Backend Database'],
    db: ['backend-database', '🗄️ Backend Database'],
    database: ['backend-database', '🗄️ Backend Database'],
    ui: ['frontend-ui', '🌐 Frontend UI'],
    component: ['frontend-ui', '🌐 Frontend UI'],
    page: ['frontend-page', '🌐 Frontend Page'],
    screen: ['mobile-screen', '📱 Mobile Screen'],
    store: ['frontend-state', '🌐 Frontend State'],
    hook: ['frontend-state', '🌐 Frontend State'],
    state: ['frontend-state', '🌐 Frontend State'],
    mobile: ['mobile-ui', '📱 Mobile UI'],
    'mobile screen': ['mobile-screen', '📱 Mobile Screen'],
    'mobile ui': ['mobile-ui', '📱 Mobile UI'],
    'mobile state': ['mobile-state', '📱 Mobile State'],
    docs: ['documentarian', '📝 Agency Documentarian'],
    documentation: ['documentarian', '📝 Agency Documentarian'],
    readme: ['documentarian', '📝 Agency Documentarian'],
    test: ['qa-automator', '🧪 QA Automator'],
    e2e: ['qa-automator', '🧪 QA Automator'],
    ci: ['devops-cicd', '🚀 DevOps CI/CD'],
    cd: ['devops-cicd', '🚀 DevOps CI/CD'],
    pipeline: ['devops-cicd', '🚀 DevOps CI/CD'],
    deploy: ['devops-cicd', '🚀 DevOps CI/CD'],
    docker: ['devops-infra', '🚀 DevOps Infrastructure'],
    infra: ['devops-infra', '🚀 DevOps Infrastructure'],
    security: ['security-auditor', '🔒 Security Auditor'],
    audit: ['compliance-guardian', '🛡️ Compliance Guardian'],
    perf: ['performance-auditor', '⚡ Performance Auditor'],
    performance: ['performance-auditor', '⚡ Performance Auditor'],
    a11y: ['accessibility-auditor', '♿ Accessibility Auditor'],
    accessibility: ['accessibility-auditor', '♿ Accessibility Auditor'],
    release: ['release-manager', '📦 Release Manager'],
    version: ['release-manager', '📦 Release Manager'],
    changelog: ['release-manager', '📦 Release Manager'],
    design: ['design-keeper', '🎨 Design System Keeper'],
    theme: ['design-keeper', '🎨 Design System Keeper'],
    token: ['design-keeper', '🎨 Design System Keeper'],
    contract: ['lead-architect', '🧠 Lead Architect & Orchestrator'],
    plan: ['lead-architect', '🧠 Lead Architect & Orchestrator'],
    architect: ['lead-architect', '🧠 Lead Architect & Orchestrator'],
};

/**
 * Infer an agent for a task description by matching keywords.
 * @param {string} taskText
 * @param {Array<{slug: string, name: string}>} agents
 * @returns {{slug: string, name: string}}
 */
function inferAgent(taskText, agents) {
    const lower = taskText.toLowerCase();

    // Try exact keyword matches first (longer phrases first to prefer specificity)
    const sortedKeywords = Object.keys(AGENT_KEYWORDS).sort((a, b) => b.length - a.length);
    for (const keyword of sortedKeywords) {
        if (lower.includes(keyword)) {
            const [targetSlug] = AGENT_KEYWORDS[keyword];
            const match = agents.find(a => a.slug === targetSlug);
            if (match) return { slug: match.slug, name: match.name };
        }
    }

    // Fallback: try matching agent name against task text
    for (const agent of agents) {
        const lowerName = agent.name.toLowerCase();
        // Check if any significant word from agent name appears in task
        const nameWords = lowerName.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
        for (const word of nameWords) {
            if (lower.includes(word)) {
                return { slug: agent.slug, name: agent.name };
            }
        }
    }

    // No match — assign TBD
    return { slug: 'TBD', name: 'TBD' };
}

/**
 * Infer task type from description.
 * @param {string} taskText
 * @returns {string}
 */
function inferType(taskText) {
    const lower = taskText.toLowerCase();

    const typeMap = [
        ['script', ['script', 'create .', 'build ', 'generate']],
        ['api', ['api', 'endpoint', 'controller', 'route', 'dto']],
        ['ui', ['ui', 'component', 'page', 'screen', 'button', 'modal', 'form']],
        ['docs', ['docs', 'documentation', 'readme', 'api spec']],
        ['config', ['config', 'setup', 'init', 'bootstrap']],
        ['db', ['db', 'database', 'schema', 'migration', 'table', 'prisma']],
        ['test', ['test', 'e2e', 'spec', 'regression']],
        ['ci', ['ci', 'pipeline', 'deploy', 'workflow']],
        ['security', ['security', 'audit', 'scan', 'secret']],
        ['design', ['design', 'theme', 'token', 'storybook']],
        ['integration', ['integration', 'webhook', 'queue', 'adapter']],
        ['state', ['store', 'state', 'hook', 'query']],
        ['release', ['release', 'version', 'changelog']],
        ['plan', ['plan', 'architect', 'contract', 'spec']],
    ];

    for (const [type, keywords] of typeMap) {
        for (const kw of keywords) {
            if (lower.includes(kw)) return type;
        }
    }

    return 'task';
}

/**
 * Estimate complexity based on task description.
 * @param {string} taskText
 * @returns {string}
 */
function estimateComplexity(taskText) {
    const lower = taskText.toLowerCase();
    const words = lower.split(/\s+/).length;

    // Simple heuristic: word count + keyword indicators
    if (lower.includes('complex') || lower.includes('multiple') || lower.includes('full')) {
        return '2d';
    }
    if (lower.includes('simple') || lower.includes('basic') || lower.includes('minor')) {
        return '0.5d';
    }
    if (words > 15 || lower.includes('integrat') || lower.includes('implement')) {
        return '1d';
    }

    return 'TBD';
}

// ── Feature Description Parser ───────────────────────────────────────────────

/**
 * Parse a feature description into task bullets.
 * Supports:
 *   - Dash bullets: "- Task description"
 *   - Asterisk bullets: "* Task description"
 *   - Numbered items: "1. Task description" or "1) Task description"
 *
 * @param {string} text
 * @returns {Array<string>} Array of task description strings
 */
function parseBullets(text) {
    const lines = text.split('\n');
    const bullets = [];

    // Regex for bullets: optional leading whitespace, then bullet marker
    const bulletRegex = /^\s*[-*]\s+(.+)/;
    const numberedRegex = /^\s*\d+[.)]\s+(.+)/;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        let match = trimmed.match(bulletRegex);
        if (match) {
            bullets.push(match[1].trim());
            continue;
        }

        match = trimmed.match(numberedRegex);
        if (match) {
            bullets.push(match[1].trim());
            continue;
        }
    }

    return bullets;
}

// ── Table Generator ──────────────────────────────────────────────────────────

/**
 * Generate a markdown sprint table from parsed tasks.
 *
 * @param {Array<{task: string, type: string, agent: {slug: string, name: string}, est: string}>} tasks
 * @param {string} featureDesc - Original feature description for the sprint header
 * @returns {string}
 */
function generateTable(tasks, featureDesc) {
    const lines = [];

    // Sprint header from first line of feature description
    const headerText = featureDesc.split('\n')[0].trim().substring(0, 80);
    lines.push(`### Sprint Plan — ${headerText}`);
    lines.push('');
    lines.push('| # | Task | Type | Agent | Est. | Status |');
    lines.push('|---|------|------|-------|------|--------|');

    for (let i = 0; i < tasks.length; i++) {
        const t = tasks[i];
        const num = i + 1;
        // Escape pipe characters in task description
        const taskEscaped = t.task.replace(/\|/g, '\\|');
        const agentName = t.agent.slug === 'TBD' ? 'TBD' : t.agent.name;
        lines.push(`| **${num}** | ${taskEscaped} | \`${t.type}\` | ${agentName} | ${t.est} | ⬜ Pending |`);
    }

    lines.push('');
    return lines.join('\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
    const opts = parseArgs();

    if (opts.help || !opts.feature) {
        console.log(USAGE);
        process.exit(0);
    }

    const featureText = opts.feature;

    // Edge case: empty feature description
    if (!featureText.trim()) {
        console.log(color('Empty feature description. Nothing to do.', C.yellow));
        console.log(USAGE);
        process.exit(0);
    }

    // Edge case: very long descriptions
    const lineCount = featureText.split('\n').length;
    if (lineCount > 100) {
        console.warn(color(`WARN: Feature description has ${lineCount} lines (>100). Processing anyway...`, C.yellow));
    }

    // Read agents from .roomodes
    const agents = readRoomodes();

    // Parse bullets from feature description
    const bullets = parseBullets(featureText);

    if (bullets.length === 0) {
        // No bullets found — treat entire text as a single task
        console.warn(color('WARN: No bullet points found. Treating entire description as one task.', C.yellow));
        const agent = inferAgent(featureText, agents);
        const type = inferType(featureText);
        const est = estimateComplexity(featureText);
        const table = generateTable([
            { task: featureText.substring(0, 120), type, agent, est },
        ], featureText);
        outputTable(table, opts.output);
        return;
    }

    // Process each bullet into a task entry
    const tasks = bullets.map(bullet => {
        const agent = inferAgent(bullet, agents);
        const type = inferType(bullet);
        const est = estimateComplexity(bullet);
        return { task: bullet, type, agent, est };
    });

    const table = generateTable(tasks, featureText);

    outputTable(table, opts.output);
}

/**
 * Output the table to stdout or write to file.
 * @param {string} table
 * @param {string|null} outputPath
 */
function outputTable(table, outputPath) {
    if (outputPath) {
        const resolvedPath = path.resolve(ROOT, outputPath);
        fs.writeFileSync(resolvedPath, table + '\n', 'utf-8');
        console.log(color(`✓ Table written to ${resolvedPath}`, C.green));
    } else {
        console.log(table);
    }

    process.exit(0);
}

main();

export { };
