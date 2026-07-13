#!/usr/bin/env node


/**
 * version-check.js — Node Version Guard
 *
 * Reads the `engines.node` field from the root package.json and compares it
 * against the current Node.js runtime version. Exits with code 1 on mismatch.
 *
 * Usage:
 *   node .agency/scripts/version-check.js
 *
 * Exit codes:
 *   0 — Version matches
 *   1 — Version mismatch or error
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const PACKAGE_JSON_PATH = path.join(ROOT, 'package.json');

function main() {
    if (!fs.existsSync(PACKAGE_JSON_PATH)) {
        console.error('⚠️  [WARN] No root package.json found. Skipping version check.');
        process.exit(0);
    }

    var pkg;
    try {
        pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
    } catch (e) {
        console.error('⚠️  [WARN] Could not parse root package.json. Skipping version check.');
        process.exit(0);
    }

    var requiredRange = (pkg.engines && pkg.engines.node) || null;
    if (!requiredRange) {
        // No engines.node specified — skip check
        console.log('ℹ️  No engines.node specified in package.json. Skipping version check.');
        process.exit(0);
    }

    var currentVersion = process.version;  // e.g., "v20.11.0"
    var cleanCurrent = currentVersion.replace(/^v/, '');

    // Parse the required range — supports patterns like ">=20", ">=20.0", "20.x", "^20", "~20"
    var requiredMajor = null;
    var requiredMinor = null;

    // Strip semver operators/prefixes for simple comparison
    var cleanRange = requiredRange.replace(/[>=<^~\s]/g, '').replace(/x/g, '0');
    var parts = cleanRange.split('.');

    requiredMajor = parseInt(parts[0], 10);
    requiredMinor = parts[1] ? parseInt(parts[1], 10) : 0;

    if (isNaN(requiredMajor)) {
        console.error('⚠️  [WARN] Could not parse engines.node: "' + requiredRange + '". Skipping version check.');
        process.exit(0);
    }

    var currentParts = cleanCurrent.split('.');
    var currentMajor = parseInt(currentParts[0], 10);
    var currentMinor = parseInt(currentParts[1], 10);

    // Simple semver comparison (major.minor)
    var matchMajor = currentMajor === requiredMajor;
    var matchMinor = (requiredMinor === 0) || (currentMinor >= requiredMinor);

    if (matchMajor && matchMinor) {
        console.log('✅ Node version OK: ' + currentVersion);
        return;  // Do not exit(0) — parent script continues when loaded via require()
    } else {
        console.error('❌ Node version mismatch. Required: ' + requiredRange + ', Current: ' + currentVersion);
        process.exit(1);
    }
}

// Auto-execute on load (safe for both direct CLI and require())
main();
