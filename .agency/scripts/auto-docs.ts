#!/usr/bin/env node
// @ts-nocheck

/**
 * auto-docs.js — Self-Updating Documentation
 *
 * Parses .agency/scripts/ JSDoc annotations, package.json scripts, and Git
 * history to auto-generate a scripts reference table and structured changelog.
 *
 * @desc Self-updating documentation — parses JSDoc, package scripts, and Git log to sync AGENCY-RULES.md and CHANGELOG.md
 * @param --sync Run full documentation sync (scripts reference + changelog)
 * @param --dry-run Show what would change without modifying files
 * @param --scripts-only Only update the Scripts Reference table
 * @param --changelog-only Only generate changelog from Git history
 * @example node .agency/scripts/auto-docs.js --sync
 * @example node .agency/scripts/auto-docs.js --sync --dry-run
 * @example node .agency/scripts/auto-docs.js --scripts-only
 * @example node .agency/scripts/auto-docs.js --changelog-only
 *
 * Contract: agency-auto-docs@1.0.0
 *
 * Exit codes:
 *   0 — Success
 *   1 — Error
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const SCRIPTS_DIR = path.resolve(__dirname);
const AGENCY_DIR = path.join(ROOT, '.agency');
const AGENCY_RULES_PATH = path.join(AGENCY_DIR, 'AGENCY-RULES.md');
const CHANGELOG_PATH = path.join(ROOT, 'CHANGELOG.md');
const PACKAGE_JSON_PATH = path.join(ROOT, 'package.json');
const ACTIVE_PROJECT_PATH = path.join(AGENCY_DIR, '.active-project');

/**
 * Get the active project ID from .agency/.active-project, if any.
 * @returns {string|null}
 */
function getActiveProject() {
    try {
        if (fs.existsSync(ACTIVE_PROJECT_PATH)) {
            return fs.readFileSync(ACTIVE_PROJECT_PATH, 'utf-8').trim() || null;
        }
    } catch (_) {
        // ignore
    }
    return null;
}

/**
 * Get the project-specific ORCHESTRATION.md path.
 * For jengabooks, this is .agency/projects/jengabooks/ORCHESTRATION.md
 * instead of root ORCHESTRATION.md.
 * @returns {string}
 */
function getOrchestrationPath() {
    const project = getActiveProject();
    if (project) {
        const projectOrch = path.join(AGENCY_DIR, 'projects', project, 'ORCHESTRATION.md');
        if (fs.existsSync(projectOrch)) {
            return projectOrch;
        }
    }
    return path.join(ROOT, 'ORCHESTRATION.md');
}

// Changelog section mapping from conventional commit types
const CHANGELOG_SECTIONS = {
    feat: '✨ Features',
    fix: '🐛 Bug Fixes',
    security: '🛡️ Security',
    perf: '⚡ Performance',
    docs: '📝 Documentation',
    refactor: '♻️ Refactoring',
    test: '🧪 Testing',
    ci: '🚀 CI/CD',
};

// ── CLI Parsing ──────────────────────────────────────────────────────────────

function parseArgs() {
    const args = process.argv.slice(2);
    const opts = {
        sync: false,
        dryRun: false,
        scriptsOnly: false,
        changelogOnly: false,
    };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--sync') opts.sync = true;
        if (args[i] === '--dry-run') opts.dryRun = true;
        if (args[i] === '--scripts-only') opts.scriptsOnly = true;
        if (args[i] === '--changelog-only') opts.changelogOnly = true;
    }

    return opts;
}

// ── Scripts Reference ────────────────────────────────────────────────────────

/**
 * Parse a single JS file for JSDoc annotations.
 * @param {string} filePath
 * @returns {{ desc: string|null, params: string[], examples: string[] }|null}
 */
function parseJsDoc(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    let desc = null;
    const params = [];
    const examples = [];
    let inComment = false;

    for (const line of lines) {
        const trimmed = line.trim();

        // Detect start of JSDoc comment
        if (trimmed.startsWith('/**')) {
            inComment = true;
            desc = null;
            params.length = 0;
            examples.length = 0;
            continue;
        }

        if (!inComment) continue;

        // Detect end of JSDoc comment
        if (trimmed.startsWith('*/')) {
            inComment = false;
            // Return first complete JSDoc block found (the module-level one)
            if (desc || params.length > 0 || examples.length > 0) {
                return { desc, params, examples };
            }
            continue;
        }

        // Strip leading * and whitespace
        const clean = trimmed.replace(/^\*\s*/, '').trim();

        // @desc annotation
        const descMatch = clean.match(/^@desc\s+(.+)$/);
        if (descMatch) {
            desc = descMatch[1].trim();
            continue;
        }

        // @param annotation
        const paramMatch = clean.match(/^@param\s+(.+)$/);
        if (paramMatch) {
            params.push(paramMatch[1].trim());
            continue;
        }

        // @example annotation
        const exampleMatch = clean.match(/^@example\s+(.+)$/);
        if (exampleMatch) {
            examples.push(exampleMatch[1].trim());
            continue;
        }
    }

    return null;
}

/**
 * Build a scripts reference table from JSDoc annotations in .agency/scripts/.
 * @returns {string}
 */
function buildScriptsReferenceTable() {
    const files = fs.readdirSync(SCRIPTS_DIR)
        .filter(f => f.endsWith('.js'))
        .sort();

    const rows = [];

    for (const file of files) {
        const filePath = path.join(SCRIPTS_DIR, file);
        const parsed = parseJsDoc(filePath);

        if (!parsed || !parsed.desc) continue;

        const usage = parsed.params.length > 0
            ? parsed.params.map(p => `\`${p}\``).join(' ')
            : '—';

        const example = parsed.examples.length > 0
            ? parsed.examples[0]
            : '—';

        rows.push({
            script: file,
            description: parsed.desc,
            usage,
            example,
        });
    }

    if (rows.length === 0) {
        return 'No scripts with JSDoc @desc annotations found.\n';
    }

    const lines = [];
    lines.push('| Script | Description | Usage | Example |');
    lines.push('|--------|-------------|-------|---------|');

    for (const row of rows) {
        lines.push(`| \`${row.script}\` | ${row.description} | ${row.usage} | \`${row.example}\` |`);
    }

    return lines.join('\n') + '\n';
}

/**
 * Build the npm scripts reference section from package.json.
 * @returns {string}
 */
function buildNpmScriptsSection() {
    if (!fs.existsSync(PACKAGE_JSON_PATH)) {
        return 'Package.json not found.\n';
    }

    const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
    const scripts = pkg.scripts || {};

    const entries = Object.entries(scripts).sort((a, b) => a[0].localeCompare(b[0]));

    if (entries.length === 0) {
        return 'No npm scripts found.\n';
    }

    const lines = [];
    lines.push('| Script | Command |');
    lines.push('|--------|---------|');

    for (const [name, command] of entries) {
        // Split command for readability
        const cmdStr = command.length > 60 ? command.substring(0, 57) + '...' : command;
        lines.push(`| \`npm run ${name}\` | \`${cmdStr}\` |`);
    }

    return lines.join('\n') + '\n';
}

// ── Changelog Generation ────────────────────────────────────────────────────

/**
 * Get the latest git tag.
 * @returns {string|null}
 */
function getLatestTag() {
    try {
        const tags = execSync('git tag --sort=-version:refname', {
            encoding: 'utf-8',
            cwd: ROOT,
            timeout: 10000,
        }).trim().split('\n').filter(Boolean);

        return tags.length > 0 ? tags[0] : null;
    } catch (_) {
        return null;
    }
}

/**
 * Read git log since the last tag, grouped by conventional commit type.
 * @returns {object|null} { version: string, sections: object, rawCommits: string[] }
 */
function readGitChangelog() {
    const lastTag = getLatestTag();

    let logRange;
    if (lastTag) {
        logRange = `${lastTag}..HEAD`;
    } else {
        // No tags yet — read all commits
        logRange = 'HEAD';
    }

    let logOutput;
    try {
        logOutput = execSync(`git log --oneline ${logRange}`, {
            encoding: 'utf-8',
            cwd: ROOT,
            timeout: 15000,
        }).trim();
    } catch (_) {
        return null;
    }

    if (!logOutput) return null;

    const rawLines = logOutput.split('\n').filter(Boolean);
    const commits = rawLines.map(line => {
        // Strip hash prefix: "abc1234 feat(scope): description"
        const hashMatch = line.match(/^[a-f0-9]+\s+(.*)/);
        return hashMatch ? hashMatch[1] : line;
    });

    // Group by conventional commit type
    const sections = {};
    const uncategorized = [];

    for (const commit of commits) {
        // Match: type(scope): description or type: description
        const typeMatch = commit.match(/^(\w+)(?:\([^)]*\))?:\s*(.*)/);
        if (typeMatch) {
            const type = typeMatch[1];
            const description = typeMatch[2].trim();

            if (CHANGELOG_SECTIONS[type]) {
                if (!sections[type]) sections[type] = [];
                sections[type].push(description);
            } else {
                uncategorized.push(commit);
            }
        } else {
            uncategorized.push(commit);
        }
    }

    // Determine next version
    let version = 'v1.0.3'; // default bump
    if (lastTag) {
        const nextPatch = lastTag.replace(/v?(\d+)\.(\d+)\.(\d+)/, (_, major, minor, patch) => {
            return `v${major}.${minor}.${parseInt(patch) + 1}`;
        });
        version = nextPatch;
    }

    return {
        version,
        sections,
        uncategorized,
        rawCommits: rawLines,
        totalCommits: rawLines.length,
    };
}

/**
 * Format changelog sections as markdown.
 * @param {object} changelog
 * @returns {string}
 */
function formatChangelogEntry(changelog) {
    const date = new Date().toISOString().split('T')[0];
    const lines = [];

    lines.push(`## ${changelog.version} (${date})`);
    lines.push('');

    const orderedTypes = Object.keys(CHANGELOG_SECTIONS);

    for (const type of orderedTypes) {
        const commits = changelog.sections[type];
        if (!commits || commits.length === 0) continue;

        lines.push(`### ${CHANGELOG_SECTIONS[type]}`);
        for (const commit of commits) {
            lines.push(`- ${commit}`);
        }
        lines.push('');
    }

    if (changelog.uncategorized.length > 0) {
        lines.push('### 🔄 Other Changes');
        for (const commit of changelog.uncategorized) {
            lines.push(`- ${commit}`);
        }
        lines.push('');
    }

    const entry = lines.join('\n');
    return entry;
}

/**
 * Append a changelog entry to CHANGELOG.md.
 * @param {string} entry
 * @param {boolean} dryRun
 * @returns {boolean} true if changes would be made
 */
function updateChangelog(entry, dryRun) {
    if (!fs.existsSync(CHANGELOG_PATH)) {
        if (dryRun) {
            console.log('[DRY-RUN] Would create CHANGELOG.md with new entry');
            return true;
        }
        const content = `# Changelog\n\n${entry}\n`;
        fs.writeFileSync(CHANGELOG_PATH, content, 'utf-8');
        console.log('Created CHANGELOG.md with new entry.');
        return true;
    }

    const existing = fs.readFileSync(CHANGELOG_PATH, 'utf-8');

    // Check if entry already exists (by version)
    const versionHeader = entry.split('\n')[0].trim(); // "## v1.0.3 (2026-07-10)"
    if (existing.includes(versionHeader)) {
        console.log(`Changelog entry for ${versionHeader.replace('## ', '')} already exists. Skipping.`);
        return false;
    }

    if (dryRun) {
        console.log(`[DRY-RUN] Would append changelog entry:\n${entry}`);
        return true;
    }

    // Insert after the "# Changelog" header
    const headerMatch = existing.match(/^# Changelog\n\n/);
    if (headerMatch) {
        const updated = existing.replace(/^# Changelog\n\n/, `# Changelog\n\n${entry}\n`);
        fs.writeFileSync(CHANGELOG_PATH, updated, 'utf-8');
    } else {
        // Fallback: prepend
        const updated = `# Changelog\n\n${entry}\n${existing.replace(/^# Changelog\n?\n?/i, '')}`;
        fs.writeFileSync(CHANGELOG_PATH, updated, 'utf-8');
    }

    console.log(`Appended changelog entry for ${versionHeader.replace('## ', '')}.`);
    return true;
}

// ── AGENCY-RULES.md Update ──────────────────────────────────────────────────

/**
 * Update or add the Scripts Reference section in AGENCY-RULES.md.
 * @param {string} tableContent
 * @param {boolean} dryRun
 * @returns {boolean} true if changes would be made
 */
function updateScriptsReference(tableContent, dryRun) {
    const sectionHeader = '## Scripts Reference';
    const npmHeader = '## npm Scripts';

    // Read existing AGENCY-RULES.md
    let content = '';
    let exists = fs.existsSync(AGENCY_RULES_PATH);
    if (exists) {
        content = fs.readFileSync(AGENCY_RULES_PATH, 'utf-8');
    }

    const scriptsBlock = `${sectionHeader}\n\n${tableContent}`;

    if (exists && content.includes(sectionHeader)) {
        // Replace existing section
        const startIdx = content.indexOf(sectionHeader);
        const endIdx = content.indexOf('## ', startIdx + 3);
        const sectionEnd = endIdx > startIdx ? endIdx : content.length;

        if (dryRun) {
            console.log(`[DRY-RUN] Would update existing Scripts Reference section in AGENCY-RULES.md`);
            return true;
        }

        const before = content.substring(0, startIdx);
        const after = content.substring(sectionEnd);
        const updated = before + scriptsBlock + '\n\n' + after;
        fs.writeFileSync(AGENCY_RULES_PATH, updated, 'utf-8');
        console.log('Updated Scripts Reference section in AGENCY-RULES.md.');
        return true;
    }

    if (dryRun) {
        console.log(`[DRY-RUN] Would add Scripts Reference section to AGENCY-RULES.md`);
        return true;
    }

    // Append to end of file
    const append = `\n\n${scriptsBlock}\n`;
    fs.appendFileSync(AGENCY_RULES_PATH, append, 'utf-8');
    console.log('Added Scripts Reference section to AGENCY-RULES.md.');
    return true;
}

/**
 * Update or add the npm Scripts section in AGENCY-RULES.md.
 * @param {string} tableContent
 * @param {boolean} dryRun
 * @returns {boolean} true if changes would be made
 */
function updateNpmScripts(tableContent, dryRun) {
    const npmHeader = '## npm Scripts';

    let content = '';
    let exists = fs.existsSync(AGENCY_RULES_PATH);
    if (exists) {
        content = fs.readFileSync(AGENCY_RULES_PATH, 'utf-8');
    }

    const npmBlock = `${npmHeader}\n\n${tableContent}`;

    if (exists && content.includes(npmHeader)) {
        const startIdx = content.indexOf(npmHeader);
        const endIdx = content.indexOf('## ', startIdx + 3);
        const sectionEnd = endIdx > startIdx ? endIdx : content.length;

        if (dryRun) {
            console.log(`[DRY-RUN] Would update existing npm Scripts section in AGENCY-RULES.md`);
            return true;
        }

        const before = content.substring(0, startIdx);
        const after = content.substring(sectionEnd);
        const updated = before + npmBlock + '\n\n' + after;
        fs.writeFileSync(AGENCY_RULES_PATH, updated, 'utf-8');
        console.log('Updated npm Scripts section in AGENCY-RULES.md.');
        return true;
    }

    if (dryRun) {
        console.log(`[DRY-RUN] Would add npm Scripts section to AGENCY-RULES.md`);
        return true;
    }

    const append = `\n\n${npmBlock}\n`;
    fs.appendFileSync(AGENCY_RULES_PATH, append, 'utf-8');
    console.log('Added npm Scripts section to AGENCY-RULES.md.');
    return true;
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
    const opts = parseArgs();

    // Must have at least one mode flag
    if (!opts.sync && !opts.scriptsOnly && !opts.changelogOnly) {
        console.error('FAIL: No mode specified.');
        console.error('Usage:');
        console.error('  node .agency/scripts/auto-docs.js --sync [--dry-run]');
        console.error('  node .agency/scripts/auto-docs.js --scripts-only');
        console.error('  node .agency/scripts/auto-docs.js --changelog-only');
        process.exit(1);
    }

    const doScripts = opts.sync || opts.scriptsOnly;
    const doChangelog = opts.sync || opts.changelogOnly;

    let changed = false;

    // ── Scripts Reference ──
    if (doScripts) {
        const scriptsTable = buildScriptsReferenceTable();
        const npmTable = buildNpmScriptsSection();

        if (opts.dryRun) {
            console.log('── DRY RUN: Scripts Reference ──');
            console.log('');
            console.log('Scripts Reference table that would be written:');
            console.log(scriptsTable);
            console.log('');
            console.log('npm Scripts table that would be written:');
            console.log(npmTable);
            changed = true;
        } else {
            const scriptsUpdated = updateScriptsReference(scriptsTable, false);
            const npmUpdated = updateNpmScripts(npmTable, false);
            if (scriptsUpdated || npmUpdated) {
                changed = true;
            }
        }
    }

    // ── Changelog Generation ──
    if (doChangelog) {
        const changelog = readGitChangelog();

        if (!changelog) {
            console.log('No new commits found since last tag (or git not available).');
        } else if (changelog.totalCommits === 0) {
            console.log('No new commits found since last tag.');
        } else {
            const entry = formatChangelogEntry(changelog);

            if (opts.dryRun) {
                console.log('── DRY RUN: Changelog ──');
                console.log('');
                console.log(`Last tag: ${getLatestTag() || '(none)'}`);
                console.log(`New commits: ${changelog.totalCommits}`);
                console.log('');
                console.log('Changelog entry that would be appended:');
                console.log(entry);
                changed = true;
            } else {
                const changelogUpdated = updateChangelog(entry, false);
                if (changelogUpdated) {
                    changed = true;
                }
            }
        }
    }

    if (!changed) {
        console.log('No changes needed.');
    }

    process.exit(0);
}

main();
