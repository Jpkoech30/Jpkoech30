/**
 * validate-commit.js — Conventional Commit & HANDOFF Metadata Validator
 *
 * Reads .git/COMMIT_EDITMSG (or COMMIT_MESSAGE env var) and validates:
 *   1. Format: <type>(<scope>): <description> (>=10 characters)
 *   2. Type is one of: feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert
 *   3. Required HANDOFF metadata fields: HANDOFF, STATUS
 *   4. PROJECT field is present and references a valid enabled project in .agency/projects.json
 *
 * Usage:
 *   node .agency/scripts/validate-commit.js
 *   node .agency/scripts/validate-commit.js --project zoocode-agency
 *   node .agency/scripts/validate-commit.js --allow-global
 *   COMMIT_MESSAGE="feat(api): add user login endpoint" node .agency/scripts/validate-commit.js
 *
 * Exit codes:
 *   0 — Valid commit message
 *   1 — Invalid commit message
 */

const fs = require('fs');
const path = require('path');

const VALID_TYPES = [
    'feat', 'fix', 'docs', 'style', 'refactor',
    'perf', 'test', 'build', 'ci', 'chore', 'revert',
];

const REQUIRED_FIELDS = ['HANDOFF', 'STATUS'];

const ROOT = path.resolve(__dirname, '../..');
const PROJECTS_JSON_PATH = path.join(ROOT, '.agency/projects.json');

/**
 * Read the commit message from COMMIT_MESSAGE env var or .git/COMMIT_EDITMSG.
 * @returns {string} The full commit message.
 */
function readCommitMessage() {
    const envMsg = process.env.COMMIT_MESSAGE;
    if (envMsg) {
        return envMsg;
    }

    const gitDir = path.join(process.cwd(), '.git');
    const commitEditMsgPath = path.join(gitDir, 'COMMIT_EDITMSG');

    try {
        return fs.readFileSync(commitEditMsgPath, 'utf8').trim();
    } catch {
        console.error('ERROR: Could not read commit message.');
        console.error('  Provide via COMMIT_MESSAGE env var or ensure .git/COMMIT_EDITMSG exists.');
        return '';
    }
}

/**
 * Validate the commit message subject line format.
 * Expected: <type>(<scope>): <description>
 * - type must be one of VALID_TYPES
 * - scope is alphanumeric-with-hyphens (required)
 * - description must be >= 10 characters
 *
 * @param {string} subject The first line of the commit message.
 * @returns {{ valid: boolean, error?: string }}
 */
function validateSubject(subject) {
    if (!subject) {
        return { valid: false, error: 'Commit subject is empty.' };
    }

    const pattern = /^(\w+)\(([\w-]+)\): (.+)$/;
    const match = subject.match(pattern);

    if (!match) {
        return {
            valid: false,
            error: `Subject format invalid. Expected: <type>(<scope>): <description>\n` +
                `  Got: "${subject}"\n` +
                `  Example: "feat(api): add user login endpoint with validation"`,
        };
    }

    const [, type, scope, description] = match;

    if (!VALID_TYPES.includes(type)) {
        return {
            valid: false,
            error: `Invalid type "${type}". Must be one of: ${VALID_TYPES.join(', ')}`,
        };
    }

    if (!scope) {
        return { valid: false, error: 'Scope is required in <type>(<scope>).' };
    }

    if (description.trim().length < 10) {
        return {
            valid: false,
            error: `Description must be at least 10 characters (got ${description.trim().length}).`,
        };
    }

    return { valid: true };
}

/**
 * Validate that HANDOFF metadata fields exist in the commit body.
 * Looks for lines like "HANDOFF:<value>" in the commit body.
 *
 * @param {string} body The commit body (everything after the first line).
 * @returns {{ valid: boolean, errors?: string[] }}
 */
function validateHandoffMetadata(body) {
    const errors = [];

    for (const field of REQUIRED_FIELDS) {
        const regex = new RegExp(`^${field}:\\S+`, 'm');
        if (!regex.test(body)) {
            errors.push(`Missing required metadata field: ${field}`);
        }
    }

    if (errors.length > 0) {
        return { valid: false, errors };
    }

    return { valid: true };
}

/**
 * Load and parse .agency/projects.json.
 * @returns {{ projects: Array<{id: string, enabled: boolean}>, activeProject: string }}
 */
function loadProjectsRegistry() {
    try {
        const raw = fs.readFileSync(PROJECTS_JSON_PATH, 'utf-8');
        return JSON.parse(raw);
    } catch (err) {
        console.error(`FAIL: Could not read projects registry at ${PROJECTS_JSON_PATH}`);
        console.error(`  ${err.message}`);
        process.exit(1);
    }
}

/**
 * Validate the PROJECT field from the commit body or --project CLI flag.
 *
 * @param {string} body         Commit body text
 * @param {string|null} cliProject  Value from --project CLI flag (overrides body)
 * @param {boolean} allowGlobal     If true, commits without PROJECT are allowed
 * @returns {{ valid: boolean, errors?: string[] }}
 */
function validateProjectField(body, cliProject, allowGlobal) {
    let projectId = cliProject;

    // If no CLI override, extract from commit body
    if (!projectId) {
        const projectMatch = body.match(/^PROJECT:\s*(\S+)/m);
        if (projectMatch) {
            projectId = projectMatch[1].trim();
        }
    }

    // Allow global commits if --allow-global is set
    if (!projectId) {
        if (allowGlobal) {
            return { valid: true };
        }
        return {
            valid: false,
            errors: [
                'Missing PROJECT field in commit body (or use --project <id>).',
                '  Add: PROJECT:<project-id>',
                '  Or use --allow-global for project-agnostic commits.',
            ],
        };
    }

    // Load projects registry
    const registry = loadProjectsRegistry();
    const project = registry.projects.find((p) => p.id === projectId);

    if (!project) {
        const validIds = registry.projects.map((p) => p.id).join(', ');
        return {
            valid: false,
            errors: [
                `Unknown project ID: "${projectId}".`,
                `  Valid projects: ${validIds}`,
            ],
        };
    }

    if (!project.enabled) {
        return {
            valid: false,
            errors: [
                `Project "${projectId}" exists but is disabled (enabled: false).`,
                `  Enable it in .agency/projects.json before committing.`,
            ],
        };
    }

    return { valid: true };
}

/**
 * Parse CLI arguments.
 * @returns {{ project: string|null, allowGlobal: boolean }}
 */
function parseCliArgs() {
    const args = process.argv.slice(2);
    const opts = { project: null, allowGlobal: false };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--project' && i + 1 < args.length) {
            opts.project = args[++i];
        }
        if (args[i] === '--allow-global') {
            opts.allowGlobal = true;
        }
    }

    return opts;
}

/**
 * Validate PREFLIGHT field (required).
 * Accepts: PREFLIGHT:PASSED or PREFLIGHT:NOT_REQUIRED
 *
 * @param {string} body The commit body.
 */
function validatePreflightField(body) {
    const preflightMatch = body.match(/^PREFLIGHT:\s*(\S+)/m);
    if (!preflightMatch) {
        console.error('FAIL: Missing PREFLIGHT field. Add PREFLIGHT:PASSED or PREFLIGHT:NOT_REQUIRED.');
        process.exit(1);
    }

    const value = preflightMatch[1].trim();
    const validValues = ['PASSED', 'NOT_REQUIRED'];
    if (validValues.includes(value)) {
        console.log(`  ✓ PREFLIGHT field valid: "${value}"`);
    } else {
        console.error(`FAIL: PREFLIGHT has unrecognized value "${value}". Expected PASSED or NOT_REQUIRED.`);
        process.exit(1);
    }
}

/**
 * Validate MEMORY field (required).
 * Accepts: MEMORY:stored or MEMORY:not-required
 *
 * @param {string} body The commit body.
 */
function validateMemoryField(body) {
    const memoryMatch = body.match(/^MEMORY:\s*(\S+)/m);
    if (!memoryMatch) {
        console.error('FAIL: Missing MEMORY field. Add MEMORY:stored or MEMORY:not-required.');
        process.exit(1);
    }

    const value = memoryMatch[1].trim();
    const validValues = ['stored', 'not-required'];
    if (validValues.includes(value)) {
        console.log(`  ✓ MEMORY field valid: "${value}"`);
    } else {
        console.error(`FAIL: MEMORY has unrecognized value "${value}". Expected stored or not-required.`);
        process.exit(1);
    }
}

/**
 * Main entry point.
 */
function main() {
    const cliOpts = parseCliArgs();
    const fullMessage = readCommitMessage();

    if (!fullMessage) {
        console.error('FAIL: No commit message to validate.');
        process.exit(1);
    }

    const lines = fullMessage.split('\n');
    const subject = lines[0];
    const body = lines.slice(1).join('\n');

    // Validate subject line
    const subjectResult = validateSubject(subject);
    if (!subjectResult.valid) {
        console.error(`FAIL: ${subjectResult.error}`);
        process.exit(1);
    }

    console.log(`  ✓ Subject format valid: "${subject}"`);

    // Validate handoff metadata in body
    const handoffResult = validateHandoffMetadata(body);
    if (!handoffResult.valid) {
        for (const err of handoffResult.errors) {
            console.error(`FAIL: ${err}`);
        }
        process.exit(1);
    }

    console.log('  ✓ HANDOFF metadata fields present (HANDOFF, STATUS)');

    // Validate PREFLIGHT field (blocking)
    validatePreflightField(body);

    // Validate MEMORY field (blocking)
    validateMemoryField(body);

    // Validate PROJECT field
    const projectResult = validateProjectField(body, cliOpts.project, cliOpts.allowGlobal);
    if (!projectResult.valid) {
        for (const err of projectResult.errors) {
            console.error(`FAIL: ${err}`);
        }
        process.exit(1);
    }

    const projectLabel = cliOpts.project || (body.match(/^PROJECT:\s*(\S+)/m) || [])[1] || '(global)';
    console.log(`  ✓ PROJECT field valid: "${projectLabel}"`);
    console.log('PASS: Commit message is valid.');
    process.exit(0);
}

main();
