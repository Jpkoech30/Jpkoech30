/**
 * clean-temp.js — Orphan Temp File Cleanup Checker
 *
 * Scans the project root directory for orphan temporary/scratch files and
 * warns about any leftovers in .agency/temp/. This is an informational check
 * only — exit code is always 0.
 *
 * Orphan patterns checked in root:
 *   - *.tmp, *.temp, *.bak, *.swp
 *   - plan-*.md, notes-*.md, script-*.js
 *   - .DS_Store, Thumbs.db
 *   - plan.md, notes.md, temp.js, script.js, test.js, debug.js, tmp.txt
 *
 * Usage:
 *   node .agency/scripts/clean-temp.js
 *
 * Exit code: 0 always (informational, non-blocking)
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const AGENCY_TEMP_DIR = path.join(ROOT_DIR, '.agency', 'temp');

/**
 * List of minimatch-style patterns for orphan files in root.
 * Each entry is checked via direct filename match or prefix/suffix match.
 * @type {Array<{type: string, pattern: string}>}
 */
const ROOT_PATTERNS = [
    // Extension-based patterns
    { type: 'ext', pattern: '.tmp' },
    { type: 'ext', pattern: '.temp' },
    { type: 'ext', pattern: '.bak' },
    { type: 'ext', pattern: '.swp' },
    // Prefix wildcard patterns (e.g. plan-*.md)
    { type: 'prefix-ext', pattern: 'plan-', ext: '.md' },
    { type: 'prefix-ext', pattern: 'notes-', ext: '.md' },
    { type: 'prefix-ext', pattern: 'script-', ext: '.js' },
    // Exact filenames (cross-platform)
    { type: 'exact', pattern: '.DS_Store' },
    { type: 'exact', pattern: 'Thumbs.db' },
    { type: 'exact', pattern: 'plan.md' },
    { type: 'exact', pattern: 'notes.md' },
    { type: 'exact', pattern: 'temp.js' },
    { type: 'exact', pattern: 'script.js' },
    { type: 'exact', pattern: 'test.js' },
    { type: 'exact', pattern: 'debug.js' },
    { type: 'exact', pattern: 'tmp.txt' },
];

/**
 * Check if a filename matches one of the orphan patterns.
 *
 * @param {string} filename - The bare filename to check.
 * @returns {boolean} True if the file matches any orphan pattern.
 */
function matchesOrphanPattern(filename) {
    for (const entry of ROOT_PATTERNS) {
        switch (entry.type) {
            case 'ext':
                // e.g. *.tmp
                if (filename.endsWith(entry.pattern)) {
                    return true;
                }
                break;
            case 'prefix-ext':
                // e.g. plan-*.md
                if (
                    filename.startsWith(entry.pattern) &&
                    filename.endsWith(entry.ext)
                ) {
                    return true;
                }
                break;
            case 'exact':
                if (filename === entry.pattern) {
                    return true;
                }
                break;
            default:
                break;
        }
    }
    return false;
}

/**
 * Scan the root directory for orphan files matching the predefined patterns.
 *
 * @returns {string[]} Array of full paths to orphan files found.
 */
function scanRootForOrphans() {
    const orphans = [];

    let entries;
    try {
        entries = fs.readdirSync(ROOT_DIR);
    } catch {
        console.error(`WARN: Could not read root directory: ${ROOT_DIR}`);
        return orphans;
    }

    for (const entry of entries) {
        const fullPath = path.join(ROOT_DIR, entry);

        let stat;
        try {
            stat = fs.statSync(fullPath);
        } catch {
            // Skip entries we can't stat (permissions, broken symlinks, etc.)
            continue;
        }

        // Only match files, not directories
        if (!stat.isFile()) {
            continue;
        }

        if (matchesOrphanPattern(entry)) {
            orphans.push(fullPath);
        }
    }

    return orphans;
}

/**
 * Check .agency/temp/ for any leftover files.
 *
 * @returns {string[]} Array of full paths to files found in .agency/temp/.
 */
function scanAgencyTemp() {
    const leftovers = [];

    if (!fs.existsSync(AGENCY_TEMP_DIR)) {
        return leftovers;
    }

    let entries;
    try {
        entries = fs.readdirSync(AGENCY_TEMP_DIR);
    } catch {
        console.error(`WARN: Could not read .agency/temp/ directory: ${AGENCY_TEMP_DIR}`);
        return leftovers;
    }

    for (const entry of entries) {
        if (entry === '.gitkeep') {
            // .gitkeep is intentional — skip it
            continue;
        }
        leftovers.push(path.join(AGENCY_TEMP_DIR, entry));
    }

    return leftovers;
}

/**
 * Main entry point.
 * Scans for orphans in root and leftovers in .agency/temp/, then reports.
 */
function main() {
    let hasIssues = false;

    // ---- Scan root directory ----
    const rootOrphans = scanRootForOrphans();

    if (rootOrphans.length > 0) {
        hasIssues = true;
        console.log(`Found ${rootOrphans.length} orphan file(s) in project root:\n`);
        for (const filePath of rootOrphans) {
            console.log(`  ⚠  ${filePath}`);
        }
        console.log('');
    }

    // ---- Scan .agency/temp/ ----
    const tempLeftovers = scanAgencyTemp();

    if (tempLeftovers.length > 0) {
        hasIssues = true;
        console.log(
            `Found ${tempLeftovers.length} leftover file(s) in .agency/temp/ (consider cleaning up):\n`,
        );
        for (const filePath of tempLeftovers) {
            console.log(`  ⚠  ${filePath}`);
        }
        console.log('');
    }

    // ---- Summary ----
    if (!hasIssues) {
        console.log('✅ Cleanup check complete — no orphan or temp files found.');
    } else {
        console.log('✅ Cleanup check complete — review warnings above as needed.');
    }

    // Always exit 0 — informational only, never blocking
    process.exit(0);
}

main();
