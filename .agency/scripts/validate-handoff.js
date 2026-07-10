/**
 * validate-handoff.js — HANDOFF Metadata Validator
 *
 * Reads from COMMIT_MESSAGE env var or CLI arguments and validates:
 *   1. All 4 required fields exist: HANDOFF, ARTIFACTS, CONTRACT, STATUS
 *   2. STATUS is one of: PENDING, IN_PROGRESS, REVIEW, DONE, BLOCKED, HOTFIX
 *
 * Usage:
 *   node .agency/scripts/validate-handoff.js --message "feat(api): add endpoint\n\nHANDOFF:frontend-web\nARTIFACTS:service.ts\nCONTRACT:mobile-billing@1.0.0\nSTATUS:DONE"
 *   COMMIT_MESSAGE="..." node .agency/scripts/validate-handoff.js
 *   node .agency/scripts/validate-handoff.js  # reads from COMMIT_MESSAGE env var
 *
 * Exit codes:
 *   0 — Valid handoff metadata
 *   1 — Invalid handoff metadata
 */

const VALID_STATUSES = ['PENDING', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED', 'HOTFIX'];
const REQUIRED_FIELDS = ['HANDOFF', 'ARTIFACTS', 'CONTRACT', 'STATUS'];

/**
 * Parse CLI arguments for --message <value>.
 * @returns {string|null}
 */
function getMessageFromArgs() {
    const args = process.argv.slice(2);
    const msgIndex = args.indexOf('--message');
    if (msgIndex !== -1 && msgIndex + 1 < args.length) {
        return args[msgIndex + 1];
    }
    return null;
}

/**
 * Read the commit message from CLI args, COMMIT_MESSAGE env var, or stdin fallback.
 * @returns {string}
 */
function readCommitMessage() {
    const fromArgs = getMessageFromArgs();
    if (fromArgs) return fromArgs;

    const fromEnv = process.env.COMMIT_MESSAGE;
    if (fromEnv) return fromEnv;

    return '';
}

/**
 * Extract a metadata field value from the commit message body.
 * Looks for lines matching "^FIELD:<value>" (case-sensitive).
 *
 * @param {string} body The commit body text.
 * @param {string} field The field name to extract.
 * @returns {string|null}
 */
function extractField(body, field) {
    const regex = new RegExp(`^${field}:(.+)$`, 'm');
    const match = body.match(regex);
    return match ? match[1].trim() : null;
}

/**
 * Validate that all required HANDOFF fields exist.
 *
 * @param {string} body The commit body text.
 * @returns {{ valid: boolean, errors?: string[], missing?: string[] }}
 */
function validateRequiredFields(body) {
    const missing = [];

    for (const field of REQUIRED_FIELDS) {
        const value = extractField(body, field);
        if (!value) {
            missing.push(field);
        }
    }

    if (missing.length > 0) {
        return {
            valid: false,
            errors: [`Missing required field(s): ${missing.join(', ')}`],
            missing,
        };
    }

    return { valid: true };
}

/**
 * Validate that STATUS is one of the allowed values.
 *
 * @param {string} body The commit body text.
 * @returns {{ valid: boolean, error?: string }}
 */
function validateStatus(body) {
    const statusValue = extractField(body, 'STATUS');

    if (!statusValue) {
        return { valid: false, error: 'STATUS field not found in commit body.' };
    }

    const normalized = statusValue.toUpperCase();

    if (!VALID_STATUSES.includes(normalized)) {
        return {
            valid: false,
            error: `Invalid STATUS "${statusValue}". Must be one of: ${VALID_STATUSES.join(', ')}`,
        };
    }

    return { valid: true };
}

/**
 * Main entry point.
 */
function main() {
    const fullMessage = readCommitMessage();

    if (!fullMessage) {
        console.error('FAIL: No commit message provided.');
        console.error('  Provide via --message <text>, COMMIT_MESSAGE env var.');
        process.exit(1);
    }

    const lines = fullMessage.split('\n');
    // Subject is first line, body is everything after
    const body = lines.slice(1).join('\n').trim();

    if (!body) {
        console.error('FAIL: Commit message has no body. HANDOFF metadata goes in the body.');
        process.exit(1);
    }

    // Validate all required fields exist
    const fieldsResult = validateRequiredFields(body);
    if (!fieldsResult.valid) {
        for (const err of fieldsResult.errors) {
            console.error(`FAIL: ${err}`);
        }
        process.exit(1);
    }

    console.log('  ✓ All required HANDOFF fields present:');
    for (const field of REQUIRED_FIELDS) {
        const value = extractField(body, field);
        console.log(`    ${field}: ${value}`);
    }

    // Validate STATUS value
    const statusResult = validateStatus(body);
    if (!statusResult.valid) {
        console.error(`FAIL: ${statusResult.error}`);
        process.exit(1);
    }

    console.log(`  ✓ STATUS is valid`);
    console.log('PASS: HANDOFF metadata is valid.');
    process.exit(0);
}

main();
