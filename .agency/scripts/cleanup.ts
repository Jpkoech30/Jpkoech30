// @ts-nocheck
/**
 * cleanup.js — File Cleanup Script (§15 of AGENCY-RULES)
 *
 * Deletes obsolete files and renames CLAUDE.md → PROJECT.md as specified
 * in AGENCY-RULES v5.0 Section 15 (File Cleanup Action Plan).
 *
 * Files to DELETE:
 *   - jengabooks/.roomodes       (obsolete, replaced by root .roomodes)
 *   - AGENCY-PLAYBOOK.md          (merged into AGENCY-RULES.md)
 *   - .agency/principals.md       (replaced by AGENCY-RULES.md)
 *
 * Files to RENAME:
 *   - jengabooks/CLAUDE.md → jengabooks/PROJECT.md
 *
 * Usage:
 *   node .agency/scripts/cleanup.js          # Execute cleanup
 *   node .agency/scripts/cleanup.js --dry-run  # Preview without making changes
 *
 * Exit codes:
 *   0 — All operations completed successfully (or dry-run finished)
 *   1 — One or more operations failed
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '../..');

const OPERATIONS = {
    delete: [
        {
            path: path.join(BASE_DIR, 'jengabooks', '.roomodes'),
            reason: 'Obsolete — replaced by root .roomodes',
        },
        {
            path: path.join(BASE_DIR, 'AGENCY-PLAYBOOK.md'),
            reason: 'Merged into .agency/AGENCY-RULES.md',
        },
        {
            path: path.join(BASE_DIR, '.agency', 'principals.md'),
            reason: 'Replaced by .agency/AGENCY-RULES.md',
        },
    ],
    rename: [
        {
            from: path.join(BASE_DIR, 'jengabooks', 'CLAUDE.md'),
            to: path.join(BASE_DIR, 'jengabooks', 'PROJECT.md'),
            reason: 'Renamed to neutral name (CLAUDE.md → PROJECT.md)',
        },
    ],
};

let hasError = false;

/**
 * Check if --dry-run flag is present in CLI arguments.
 * @returns {boolean}
 */
function isDryRun() {
    return process.argv.includes('--dry-run');
}

/**
 * Log a formatted status message.
 * @param {'ok'|'warn'|'error'|'info'} level
 * @param {string} message
 */
function log(level, message) {
    const prefix = {
        ok: '  ✓',
        warn: '  ⚠',
        error: '  ✗',
        info: '  →',
    }[level] || '  ·';

    console.log(`${prefix} ${message}`);
}

/**
 * Delete a file if it exists. In dry-run mode, only log what would happen.
 * @param {string} filePath Absolute path to the file.
 * @param {string} reason Why the file is being deleted.
 * @param {boolean} dryRun If true, preview only.
 */
function deleteFile(filePath, reason, dryRun) {
    const relativePath = path.relative(BASE_DIR, filePath);
    const display = relativePath.replace(/\\/g, '/');

    if (!fs.existsSync(filePath)) {
        log('warn', `[SKIP] ${display} — does not exist (${reason})`);
        return;
    }

    if (dryRun) {
        log('info', `[DRY-RUN] Would DELETE ${display} — ${reason}`);
        return;
    }

    try {
        fs.unlinkSync(filePath);
        log('ok', `[DELETED] ${display} — ${reason}`);
    } catch (err) {
        log('error', `[FAIL] Could not delete ${display}: ${err.message}`);
        hasError = true;
    }
}

/**
 * Rename a file if it exists. In dry-run mode, only log what would happen.
 * @param {string} fromPath Absolute source path.
 * @param {string} toPath Absolute destination path.
 * @param {string} reason Why the file is being renamed.
 * @param {boolean} dryRun If true, preview only.
 */
function renameFile(fromPath, toPath, reason, dryRun) {
    const relFrom = path.relative(BASE_DIR, fromPath).replace(/\\/g, '/');
    const relTo = path.relative(BASE_DIR, toPath).replace(/\\/g, '/');

    if (!fs.existsSync(fromPath)) {
        log('warn', `[SKIP] ${relFrom} — does not exist (${reason})`);
        return;
    }

    if (dryRun) {
        log('info', `[DRY-RUN] Would RENAME ${relFrom} → ${relTo} — ${reason}`);
        return;
    }

    try {
        // If destination already exists, warn and skip
        if (fs.existsSync(toPath)) {
            log('warn', `[SKIP] ${relTo} — already exists, skipping rename`);
            return;
        }

        fs.renameSync(fromPath, toPath);
        log('ok', `[RENAMED] ${relFrom} → ${relTo} — ${reason}`);
    } catch (err) {
        log('error', `[FAIL] Could not rename ${relFrom}: ${err.message}`);
        hasError = true;
    }
}

/**
 * Main entry point.
 */
function main() {
    const dryRun = isDryRun();
    const mode = dryRun ? 'DRY-RUN (no changes will be made)' : 'EXECUTION';

    console.log(`\n=== AGENCY FILE CLEANUP (${mode}) ===\n`);

    // Process deletions
    console.log('--- Deletions ---');
    for (const entry of OPERATIONS.delete) {
        deleteFile(entry.path, entry.reason, dryRun);
    }

    // Process renames
    console.log('\n--- Renames ---');
    for (const entry of OPERATIONS.rename) {
        renameFile(entry.from, entry.to, entry.reason, dryRun);
    }

    console.log('');

    if (dryRun) {
        console.log('Dry-run complete. Pass --dry-run to preview; omit to execute.');
    } else if (hasError) {
        console.log('Cleanup completed with errors. See above for details.');
        process.exit(1);
    } else {
        console.log('Cleanup complete.');
    }

    process.exit(0);
}

main();
