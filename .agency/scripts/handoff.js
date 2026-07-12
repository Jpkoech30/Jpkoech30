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
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const TELEMETRY_SCRIPT = path.join(__dirname, 'telemetry.js');
const ROOMODES_PATH = path.join(ROOT, '.roomodes');
const ACTIVE_PROJECT_PATH = path.join(ROOT, '.agency', '.active-project');
const PROJECTS_JSON_PATH = path.join(ROOT, '.agency', 'projects.json');

const VALID_STATUSES = ['PENDING', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED', 'HOTFIX'];

const VALID_MODEL_VALUES = ['flash', 'pro', 'v4-flash', 'v4-pro'];
const MODEL_PREFIX_MAP = {
    flash: 'deepseek-flash',
    pro: 'deepseek-pro',
    'v4-flash': 'deepseek-v4-flash',
    'v4-pro': 'deepseek-v4-pro',
};

// ── CWD Guard ────────────────────────────────────────────────────────────────

/**
 * Verify that the current working directory matches the active project.
 * Prevents cross-project git commits from the wrong root.
 */
function checkCwdGuard() {
    const cwd = process.cwd();

    // Read active project name
    if (!fs.existsSync(ACTIVE_PROJECT_PATH)) {
        console.error(`FAIL: Active project file not found at ${ACTIVE_PROJECT_PATH}`);
        process.exit(1);
    }
    const activeProject = fs.readFileSync(ACTIVE_PROJECT_PATH, 'utf-8').trim();

    // Read projects.json to resolve the project path
    if (!fs.existsSync(PROJECTS_JSON_PATH)) {
        console.error(`FAIL: Projects config not found at ${PROJECTS_JSON_PATH}`);
        process.exit(1);
    }

    let projectsConfig;
    try {
        projectsConfig = JSON.parse(fs.readFileSync(PROJECTS_JSON_PATH, 'utf-8'));
    } catch (err) {
        console.error(`FAIL: Could not parse projects.json: ${err.message}`);
        process.exit(1);
    }

    const project = projectsConfig.projects.find(p => p.name === activeProject || p.id === activeProject);
    if (!project) {
        console.error(`FAIL: Active project "${activeProject}" not found in projects.json`);
        process.exit(1);
    }

    // Resolve the project's absolute path
    const projectAbsPath = path.resolve(ROOT, project.rootPath);

    // Normalize both paths for comparison
    const normalizedCwd = path.normalize(cwd);
    const normalizedProjectPath = path.normalize(projectAbsPath);

    // Allow zoocode-agency (root) or the project path
    const isAgencyRoot = normalizedCwd === path.normalize(ROOT);
    const isProjectRoot = normalizedCwd.startsWith(normalizedProjectPath);

    if (!isAgencyRoot && !isProjectRoot) {
        console.error(`❌ ERROR: CWD does not match active project. Run 'npm run project:switch -- <name>' first.`);
        console.error(`  CWD:            ${cwd}`);
        console.error(`  Active project: ${activeProject} (${projectAbsPath})`);
        process.exit(1);
    }
}

// ── CLI Parsing ──────────────────────────────────────────────────────────────

function parseArgs() {
    const args = process.argv.slice(2);
    const opts = { from: null, to: null, task: null, status: 'IN_PROGRESS', artifacts: 'pending', model: null, contract: null, scope: 'project', wordCount: null };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--from' && i + 1 < args.length) opts.from = args[++i];
        if (args[i] === '--to' && i + 1 < args.length) opts.to = args[++i];
        if (args[i] === '--task' && i + 1 < args.length) opts.task = args[++i];
        if (args[i] === '--status' && i + 1 < args.length) opts.status = args[++i].toUpperCase();
        if (args[i] === '--artifacts' && i + 1 < args.length) opts.artifacts = args[++i];
        if (args[i] === '--model' && i + 1 < args.length) opts.model = args[++i].toLowerCase();
        if (args[i] === '--contract' && i + 1 < args.length) opts.contract = args[++i];
        if (args[i] === '--scope' && i + 1 < args.length) opts.scope = args[++i].toLowerCase();
        if (args[i] === '--word-count' && i + 1 < args.length) opts.wordCount = parseInt(args[++i], 10);
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
function generateCommitBody(from, to, task, status, artifacts, model, contract, scope) {
    const lines = [
        '',
        `HANDOFF:${to}`,
        `ARTIFACTS:${artifacts || 'none'}`,
        `CONTRACT:${contract || 'pending'}`,
        `STATUS:${status}`,
        `MEMORY:stored`,
        scope ? `SCOPE:${scope}` : null,
        '',
    ].filter(Boolean);

    // Add optional context line
    if (from && to) {
        lines.splice(1, 0, `CONTEXT:Handoff from ${from} to ${to} for task ${task}`);
    }

    // Add model line if specified
    if (model) {
        const modelName = MODEL_PREFIX_MAP[model] || model;
        lines.splice(lines.length - 1, 0, `MODEL:${modelName}`);
    }

    return lines.join('\n');
}

// ── ORCHESTRATION.md Path Resolution ──────────────────────────

/**
 * Resolve the ORCHESTRATION.md path based on scope.
 * @param {string} scope - 'project' or 'global'
 * @returns {string}
 */
function getOrchestrationPath(scope) {
    if (scope === 'global') {
        return path.join(ROOT, 'ORCHESTRATION.md');
    }

    // Per-project scope: resolve based on activeProject
    const activeProject = fs.readFileSync(ACTIVE_PROJECT_PATH, 'utf-8').trim();
    const projectsConfig = JSON.parse(fs.readFileSync(PROJECTS_JSON_PATH, 'utf-8'));
    const project = projectsConfig.projects.find(p => p.name === activeProject || p.id === activeProject);

    if (!project) {
        console.error(`FAIL: Active project "${activeProject}" not found in projects.json`);
        process.exit(1);
    }

    return path.join(ROOT, '.agency', 'projects', project.id, 'ORCHESTRATION.md');
}

// ── Main ─────────────────────────────────────────────────────────────────────

const ENFORCER_SCRIPT = path.join(__dirname, 'enforcer.js');
const PTG_SCRIPT = path.join(__dirname, 'post-task-gate.js');

/**
 * Delegate to enforcer.js for handoff phase validation.
 * Blocking — exits 1 if enforcer handoff fails.
 */
function runEnforcerHandoff(from, to, task) {
    console.log('');
    console.log('  ── Enforcer Handoff Gate ──');
    try {
        execSync(
            `node "${ENFORCER_SCRIPT}" handoff --from "${from}" --to "${to}" --task "${task}"`,
            { stdio: 'inherit', timeout: 15000 }
        );
        console.log('  ✅ Enforcer handoff gate passed');
    } catch (e) {
        console.error('  ❌ HANDOFF BLOCKED: Enforcer gate failed');
        process.exit(1);
    }
}

/**
 * Run the Post-Task Gate check before allowing handoff.
 * Blocking — exits 1 if PTG fails.
 */
function runPostTaskGate(from, task, to, artifacts, status) {
    console.log('');
    console.log('  ── Post-Task Gate check ──');

    try {
        execSync(
            `node "${PTG_SCRIPT}" complete --task "${task}" --agent "${from}" --handoff "${to}" --artifacts "${artifacts}" --contract pending --status "${status}" --memory pending`,
            { cwd: ROOT, stdio: 'inherit', timeout: 30000 }
        );
        console.log('  ✅ PTG passed — proceeding with handoff');
    } catch (ptgError) {
        console.error('');
        console.error('  ❌ HANDOFF BLOCKED: Post-Task Gate failed');
        console.error('  Fix the failing checkpoints above, then re-run handoff.js');
        process.exit(1);
    }
}

function main() {
    // CWD guard — verify we are in the right project root
    checkCwdGuard();

    const opts = parseArgs();

    // Validate required args
    const missing = [];
    if (!opts.from) missing.push('--from');
    if (!opts.to) missing.push('--to');
    if (!opts.task) missing.push('--task');

    if (missing.length > 0) {
        console.error(`FAIL: Missing required argument(s): ${missing.join(', ')}`);
        console.error('Usage: node handoff.js --from <agent> --to <agent> --task <id> [--status <STATUS>] [--artifacts <files>] [--model <flash|pro|v4-flash|v4-pro>]');
        process.exit(1);
    }

    // Validate status
    if (!VALID_STATUSES.includes(opts.status)) {
        console.error(`FAIL: Invalid status "${opts.status}". Must be one of: ${VALID_STATUSES.join(', ')}`);
        process.exit(1);
    }

    // Validate model if provided
    if (opts.model && !VALID_MODEL_VALUES.includes(opts.model)) {
        console.error(`FAIL: Invalid --model value "${opts.model}". Must be one of: ${VALID_MODEL_VALUES.join(', ')}`);
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

    // Validate scope
    if (opts.scope !== 'project' && opts.scope !== 'global') {
        console.error(`FAIL: Invalid --scope value "${opts.scope}". Must be "project" or "global".`);
        process.exit(1);
    }

    // ── Issue #6: Lead Architect triage router ─────────────────────
    const originalTo = opts.to;
    const config = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, '.agency', 'config.json'), 'utf-8')); } catch { return null; } })();
    if (config && config.agents && config.agents.hierarchy && config.agents.hierarchy.triage) {
        const triage = config.agents.hierarchy.triage;
        const wordCount = opts.wordCount || (opts.task ? opts.task.split(/\s+/).length : 999);
        const taskLower = (opts.task || "").toLowerCase();
        const from = opts.from;

        // Check bypass conditions
        const hasKeyword = triage.bypass_keywords.some(kw => taskLower.includes(kw));
        const isSmall = wordCount <= triage.max_bypass_word_count;

        if ((hasKeyword || isSmall) && from === "lead-architect") {
            // Route directly to squad lead instead
            if (taskLower.includes("ui") || taskLower.includes("component")) {
                opts.to = "frontend-lead";
            } else if (taskLower.includes("mobile")) {
                opts.to = "mobile-lead";
            } else if (taskLower.includes("devops") || taskLower.includes("docker") || taskLower.includes("deploy")) {
                opts.to = "devops-lead";
            } else if (taskLower.includes("db") || taskLower.includes("migrate") || taskLower.includes("sql")) {
                opts.to = "backend-database";
            }

            if (opts.to !== originalTo) {
                console.log(`  🚦 TRIAGE: ${from} → ${opts.to} (bypassed Lead Architect: keyword=${hasKeyword}, small=${isSmall})`);
            }
        }
    }

    // ── BLOCKED Status Escalation ──────────────────────────────────
    if (opts.status && opts.status === 'BLOCKED') {
        console.log(`🚨 BLOCKED handoff detected — escalating`);

        // Append to blocked-tasks.md
        const blockedPath = path.join(ROOT, '.agency', 'reports', 'blocked-tasks.md');
        try {
            if (!fs.existsSync(path.dirname(blockedPath))) {
                fs.mkdirSync(path.dirname(blockedPath), { recursive: true });
            }
            const entry = `\n- **${new Date().toISOString()}** | ${opts.from} → ${opts.to} | Task: ${opts.task}`;
            fs.appendFileSync(blockedPath, entry, 'utf-8');
            console.log(`  ✅ Logged to ${blockedPath}`);
        } catch (e) {
            console.error(`  ⚠ Failed to write blocked-tasks.md: ${e.message}`);
        }

        // Call telemetry.js with critical-level event
        // Using agent_invocation event since --gate is restricted to specific gate types
        try {
            execSync(`node "${TELEMETRY_SCRIPT}" log --event agent_invocation --agent "${opts.from}" --task "${opts.task}" --status BLOCKED`, {
                cwd: ROOT, stdio: 'pipe', timeout: 10000
            });
            console.log(`  ✅ Telemetry logged`);
        } catch (e) {
            console.error(`  ❌ Telemetry logging failed (blocking): ${e.message}`);
            console.error('  The handoff CANNOT proceed without telemetry logging.');
            process.exit(1);
        }
    }

    // ── PRE Phase Verification: Ensure oath was recited ────────────
    try {
        execSync(`node "${ENFORCER_SCRIPT}" check --agent "${opts.from}"`, {
            cwd: ROOT, stdio: 'pipe', timeout: 15000
        });
        console.log('  ✅ PRE phase verified');
    } catch {
        console.error('  ❌ HANDOFF BLOCKED: No PRE phase recorded for this agent.');
        console.error('  Run: node .agency/scripts/enforcer.js pre --agent <slug> --task <id>');
        process.exit(1);
    }

    // ── Post-Task Gate: Blocking check before proceeding ────────────
    runPostTaskGate(opts.from, opts.task, opts.to, opts.artifacts, opts.status);

    // ── Enforcer Handoff Gate: Blocking check before proceeding ────
    runEnforcerHandoff(opts.from, opts.to, opts.task);

    // ── Git Commit: Stage and commit all changes ───────────────────
    try {
        const subject = `feat(${opts.task}): handoff from ${opts.from} to ${opts.to}`;
        const body = generateCommitBody(opts.from, opts.to, opts.task, opts.status, opts.artifacts, opts.model, opts.contract, opts.scope);
        const fullMessage = subject + '\n\n' + body;

        // Write commit message to temp file (avoids shell escaping issues)
        const msgFile = path.join(ROOT, '.handoff-msg.txt');
        fs.writeFileSync(msgFile, fullMessage, 'utf-8');

        execSync('git add -A', { cwd: ROOT, stdio: 'inherit', timeout: 30000 });
        execSync(`git commit -F "${msgFile}"`, { cwd: ROOT, stdio: 'inherit', timeout: 30000 });
        fs.unlinkSync(msgFile);

        console.log('  ✅ Changes committed successfully');

        // 20c.3 — Multi-branch push (detect current branch instead of hardcoded master)
        try {
            const defaultBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT, encoding: 'utf-8' }).toString().trim();
            execSync(`git push origin ${defaultBranch}`, { cwd: ROOT, stdio: 'inherit' });
            console.log(`  ✅ Pushed to origin/${defaultBranch}`);

            // Write session-state.json for recap.js
            try {
                const sessionState = {
                    lastHandoff: new Date().toISOString(),
                    fromAgent: opts.from,
                    toAgent: opts.to,
                    task: opts.task,
                    status: opts.status,
                    scope: opts.scope,
                    project: opts.project || 'zoocode-agency',
                    commitHash: execSync('git rev-parse --short HEAD', { cwd: ROOT, encoding: 'utf-8' }).toString().trim()
                };
                fs.writeFileSync(path.join(ROOT, '.agency', 'session-state.json'), JSON.stringify(sessionState, null, 2), 'utf-8');
                console.log('  ✅ Session state saved');
            } catch (ssError) {
                console.error('  ❌ Failed to write session state (blocking):', ssError.message);
                process.exit(1);
            }
        } catch (pushError) {
            console.error('  ❌ Git push FAILED (blocking):', pushError.message);
            console.error('  The handoff CANNOT proceed without a successful push.');
            console.error('  Check your remote credentials and network, then retry.');
            // Clean up temp file
            try { fs.unlinkSync(msgFile); } catch { }
            process.exit(1);
        }
    } catch (gitError) {
        console.error('  ❌ Git commit FAILED (blocking):', gitError.message);
        console.error('  The handoff CANNOT proceed without a git commit.');
        console.error('  Please ensure there are changes to commit, then retry.');
        // Clean up temp file
        try { fs.unlinkSync(msgFile); } catch { }
        process.exit(1);
    }

    // ── ORCHESTRATION.md: Append handoff entry ─────────────────────
    try {
        const orchestrationPath = getOrchestrationPath(opts.scope);
        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const handoffEntry = [
            '',
            `### Handoff (${timestamp})`,
            `**From:** ${opts.from} → **To:** ${opts.to}`,
            `**Task:** ${opts.task}`,
            `**Status:** ${opts.status}`,
            `**Scope:** ${opts.scope}`,
            `**Artifacts:** ${opts.artifacts || 'none'}`,
            `**Contract:** ${opts.contract || 'pending'}`,
            '',
        ].join('\n');

        fs.appendFileSync(orchestrationPath, handoffEntry, 'utf-8');
        console.log(`  ✅ Handoff logged to ${orchestrationPath}`);
    } catch (orchError) {
        console.error('  ❌ Failed to write ORCHESTRATION.md (blocking):', orchError.message);
        console.error('  The handoff CANNOT proceed without updating ORCHESTRATION.md.');
        process.exit(1);
    }

    // ── Telemetry: handoff start ─────────────────────────────────────
    try {
        execSync(
            `node ${TELEMETRY_SCRIPT} log --event agent_invocation --agent ${opts.from} --task ${opts.task} --status IN_PROGRESS`,
            { stdio: 'ignore', timeout: 10000 }
        );
    } catch (_) {
        // Telemetry failures must not block the handoff
    }

    // Generate commit body
    const body = generateCommitBody(opts.from, opts.to, opts.task, opts.status, opts.artifacts, opts.model, opts.contract, opts.scope);

    console.log(body);

    // ── Telemetry: handoff complete ──────────────────────────────────
    try {
        execSync(
            `node ${TELEMETRY_SCRIPT} log --event agent_invocation --agent ${opts.to} --task ${opts.task} --status DONE`,
            { stdio: 'ignore', timeout: 10000 }
        );
    } catch (_) {
        // Telemetry failures must not block the handoff
    }

    process.exit(0);
}

main();
