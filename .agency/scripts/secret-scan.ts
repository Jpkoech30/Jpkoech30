#!/usr/bin/env node

/**
 * secret-scan.js — Pre-commit Secret Scanner
 *
 * Scans staged files for hardcoded secrets, API keys, and credentials.
 * Designed to be run as a pre-commit hook.
 *
 * Usage:
 *   node .agency/scripts/secret-scan.js
 *   node .agency/scripts/secret-scan.js --show-details
 *
 * Contract: agency-secret-scan@1.0.0
 *
 * Exit codes:
 *   0 — No secrets detected (commit allowed)
 *   1 — Secrets detected (commit blocked)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const CONFIG_PATH = path.join(ROOT, '.agency', 'config.json');

// ── Scan Patterns (from agency-secret-scan@1.0.0 contract) ──────────────────

const SCAN_PATTERNS = [
    { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/, severity: 'CRITICAL' },
    {
        name: 'Generic Secret',
        regex: /(secret|password|api[_-]?key|private[_-]?key|token)\s*[:=]\s*['\"][A-Za-z0-9_\-]{16,}['\"]/i,
        severity: 'HIGH',
    },
    {
        name: 'JWT Secret',
        regex: /(jwt[_-]?secret|session[_-]?secret)\s*[:=]\s*['\"][A-Za-z0-9_\-]{16,}['\"]/i,
        severity: 'CRITICAL',
    },
    {
        name: 'Private Key Block',
        regex: /-----BEGIN\s+(RSA|DSA|EC|OPENSSH)\s+PRIVATE\s+KEY-----/,
        severity: 'CRITICAL',
    },
    { name: 'GitHub Token', regex: /gh[pousr]_[A-Za-z0-9_]{36,}/, severity: 'HIGH' },
    { name: 'Slack Token', regex: /xox[baprs]-[A-Za-z0-9\-]{10,}/, severity: 'HIGH' },
    { name: 'Heroku API Key', regex: /heroku[a-z0-9_\-]*\s*[:=]\s*['\"][A-Za-z0-9\-]{36,}['\"]/i, severity: 'HIGH' },
    { name: 'MongoDB Connection String', regex: /mongodb[+srv]*:\/\/[^\s]+/, severity: 'HIGH' },
    { name: 'PostgreSQL Connection String', regex: /postgresql?:\/\/[^\s]+/, severity: 'HIGH' },
];

/** .env File detection — matches against filename, not content */
const ENV_FILE_PATTERN = { name: '.env File', regex: /\.env$/, severity: 'HIGH', matchFilename: true };

// ── Excluded Files (from contract) ──────────────────────────────────────────

const EXCLUDED_PATTERNS = [
    /\.spec\.ts$/,
    /\.test\.ts$/,
    /\.md$/,
    /package-lock\.json$/,
    /yarn\.lock$/,
    /\.min\.js$/,
    /\.min\.css$/,
];

// ── Default Whitelist (fallback when config.json lacks secretScan.whitelist) ─

const DEFAULT_WHITELIST = [
    'TEST_PASSWORD',
    'EXAMPLE_API_KEY',
    'placeholder',
    '.env.example',
];

// ── CLI ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const showDetails = args.includes('--show-details');

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Check if a file path matches any excluded pattern.
 * @param {string} filePath
 * @returns {boolean}
 */
function isExcluded(filePath) {
    return EXCLUDED_PATTERNS.some(pattern => pattern.test(filePath));
}

/**
 * Load whitelist patterns from .agency/config.json secretScan.whitelist.
 * Falls back to DEFAULT_WHITELIST if config is missing or lacks the key.
 * @returns {string[]}
 */
function loadWhitelist() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
            const whitelist = config.secretScan?.whitelist;
            if (Array.isArray(whitelist) && whitelist.length > 0) {
                return whitelist.map(w => (typeof w === 'string' ? w : w.pattern));
            }
        }
    } catch {
        // Fall through to defaults
    }
    return DEFAULT_WHITELIST;
}

/**
 * Check if a line contains any whitelisted pattern.
 * @param {string} line
 * @param {string[]} whitelist
 * @returns {boolean}
 */
function isWhitelisted(line, whitelist) {
    return whitelist.some(pattern => line.includes(pattern));
}

/**
 * Get the list of staged files from `git diff --cached --name-only`.
 * @returns {string[]}
 */
function getStagedFiles() {
    try {
        const output = execSync('git diff --cached --name-only', {
            encoding: 'utf-8',
            cwd: ROOT,
        });
        return output.split('\n').map(s => s.trim()).filter(Boolean);
    } catch (err) {
        console.error('FAIL: Could not get staged files. Are you in a git repository?');
        process.exit(1);
    }
}

/**
 * Scan a single file for secret patterns.
 * @param {string} filePath — relative path from repo root
 * @param {string[]} whitelist
 * @returns {Array<{file: string, line: number, pattern_name: string, severity: string, match: string}>}
 */
function scanFile(filePath, whitelist) {
    const results = [];
    const fullPath = path.resolve(ROOT, filePath);

    if (!fs.existsSync(fullPath)) return results;

    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');

    // Check if filename matches .env pattern
    if (ENV_FILE_PATTERN.matchFilename && ENV_FILE_PATTERN.regex.test(filePath)) {
        if (!isWhitelisted(filePath, whitelist)) {
            results.push({
                file: filePath,
                line: 0,
                pattern_name: ENV_FILE_PATTERN.name,
                severity: ENV_FILE_PATTERN.severity,
                match: filePath,
            });
        }
    }

    // Scan each line for content-based patterns
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        for (const pattern of SCAN_PATTERNS) {
            const matches = line.match(pattern.regex);
            if (matches) {
                for (const match of matches) {
                    if (!isWhitelisted(line, whitelist)) {
                        results.push({
                            file: filePath,
                            line: i + 1,
                            pattern_name: pattern.name,
                            severity: pattern.severity,
                            match,
                        });
                    }
                }
            }
        }
    }

    return results;
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
    const whitelist = loadWhitelist();
    const stagedFiles = getStagedFiles();

    const allResults = [];

    for (const file of stagedFiles) {
        if (isExcluded(file)) continue;
        const results = scanFile(file, whitelist);
        allResults.push(...results);
    }

    if (allResults.length === 0) {
        console.log('✅ Secret scan passed — no secrets detected in staged files');
        process.exit(0);
    } else {
        console.log(`❌ SECURITY BLOCK: ${allResults.length} potential secret(s) detected in staged files:`);

        for (const r of allResults) {
            const lineInfo = r.line > 0 ? `:${r.line}` : '';
            console.log(`  - ${r.file}${lineInfo} — ${r.pattern_name} (${r.severity})`);
        }

        console.log("\nRun 'node .agency/scripts/secret-scan.js --show-details' to see exact matches, then remove them before committing.");

        if (showDetails) {
            console.log('\n── Exact Matches ──');
            for (const r of allResults) {
                const lineInfo = r.line > 0 ? `:${r.line}` : '';
                console.log(`  ${r.file}${lineInfo}: ${r.match}`);
            }
        }

        process.exit(1);
    }
}

main();
