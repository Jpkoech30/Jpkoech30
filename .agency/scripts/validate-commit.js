/**
 * validate-commit.js — Conventional Commit & HANDOFF Metadata Validator
 *
 * Reads .git/COMMIT_EDITMSG (or COMMIT_MESSAGE env var) and validates:
 *   1. Format: <type>(<scope>): <description> (>=10 characters)
 *   2. Type is one of: feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert
 *   3. Required HANDOFF metadata fields: HANDOFF, STATUS
 *
 * Usage:
 *   node .agency/scripts/validate-commit.js
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
 * Main entry point.
 */
function main() {
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
    console.log('PASS: Commit message is valid.');
    process.exit(0);
}

main();
