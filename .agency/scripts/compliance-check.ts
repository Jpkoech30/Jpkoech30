#!/usr/bin/env node


/**
 * compliance-check.js — Automated Compliance Checklist (CC-1 through CC-7)
 *
 * Contract: agency-quality-gate@1.0.0
 *
 * Replaces manual Compliance Guardian review with 7 automated checks:
 *   CC-1: No new Date() in financial files    — BLOCK
 *   CC-2: No TODO/FIXME in non-test files      — WARN
 *   CC-3: New modules have test files           — WARN
 *   CC-4: No hardcoded absolute paths           — BLOCK
 *   CC-5: API calls match contracts             — WARN (reuses QG-C2)
 *   CC-6: Last commit has HANDOFF metadata      — BLOCK
 *   CC-7: Last commit has MEMORY:stored         — BLOCK
 *
 * Usage:
 *   node .agency/scripts/compliance-check.js [--project <path>]
 *
 * Exit codes:
 *   0 — All checks pass (warnings allowed)
 *   1 — One or more BLOCK results
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');

// ── Helpers ─────────────────────────────────────────────────────────────────

function execGit(args, cwd) {
    try {
        const result = execSync(`git ${args} 2>nul`, { cwd: cwd || ROOT, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
        return result;
    } catch {
        return null;
    }
}

function getModifiedFiles(projectPath) {
    const diff = execGit('diff --name-only --diff-filter=ACMR HEAD', projectPath);
    if (diff !== null) {
        return diff.split('\n').filter(Boolean);
    }
    const ls = execGit('ls-files', projectPath);
    if (ls !== null) {
        return ls.split('\n').filter(Boolean);
    }
    return [];
}

function isTestFile(file) {
    return file.includes('.spec.') || file.includes('.test.') || file.includes('__tests__') || file.includes('/test/');
}

function isSourceFile(file) {
    return file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.tsx') || file.endsWith('.jsx');
}

// ── Check accumulators ──────────────────────────────────────────────────────

let passedCount = 0;
let failedCount = 0;
let blockCount = 0;
let warnCount = 0;

function pass(check) {
    console.log(`  [PASS] ${check}: OK`);
    passedCount++;
}

function warn(check, msg) {
    console.log(`  [WARN] ${check}: ${msg}`);
    warnCount++;
}

function block(check, msg) {
    console.log(`  [BLOCK] ${check}: ${msg}`);
    blockCount++;
    failedCount++;
}

// ── CC-1: No new Date() in financial files ──────────────────────────────────

/**
 * Scan financial/service files for `new Date()` usage.
 * Financial files: files in directories named finance, accounting, payment, billing, invoice, ledger.
 * Also files with "cost", "price", "invoice", "payment" in their name.
 * BLOCK if any found.
 */
function checkCc1NoNewDate(projectPath) {
    console.log('\n  ── CC-1: No new Date() in financial files ──');

    const financialPatterns = [
        /[/\\]finance[/\\]/, /[/\\]accounting[/\\]/, /[/\\]payment[/\\]/,
        /[/\\]billing[/\\]/, /[/\\]invoice[/\\]/, /[/\\]ledger[/\\]/,
        /[/\\]cost[/\\]/, /cost-/i, /price/i, /invoice/i, /payment/i,
    ];

    const files = getModifiedFiles(projectPath).filter(f =>
        isSourceFile(f) && financialPatterns.some(p => p.test(f))
    );

    if (files.length === 0) {
        pass('CC-1');
        return;
    }

    let violations = 0;
    files.forEach(file => {
        const filePath = path.join(projectPath, file);
        if (!fs.existsSync(filePath)) return;

        let content;
        try {
            content = fs.readFileSync(filePath, 'utf-8');
        } catch {
            return;
        }

        // Look for new Date() — but exclude `new Date(...)` with arguments (date parsing) or Date.now()
        const dateMatches = content.match(/new\s+Date\s*\(\s*\)/g);
        if (dateMatches) {
            violations += dateMatches.length;
            block('CC-1', `${file}: ${dateMatches.length} occurrence(s) of new Date() — use Date.now() or external timestamp instead`);
        }
    });

    if (violations === 0) {
        pass('CC-1');
    }
}

// ── CC-2: No TODO/FIXME in non-test files ───────────────────────────────────

/**
 * Scan non-test source files for TODO/FIXME markers.
 * WARN if any found.
 */
function checkCc2NoTodoFixme(projectPath) {
    console.log('\n  ── CC-2: No TODO/FIXME in non-test files ──');

    const files = getModifiedFiles(projectPath).filter(f =>
        isSourceFile(f) && !isTestFile(f)
    );

    if (files.length === 0) {
        pass('CC-2');
        return;
    }

    let violations = 0;
    files.forEach(file => {
        const filePath = path.join(projectPath, file);
        if (!fs.existsSync(filePath)) return;

        let content;
        try {
            content = fs.readFileSync(filePath, 'utf-8');
        } catch {
            return;
        }

        const markers = content.match(/\b(TODO|FIXME|HACK|XXX)\b/g);
        if (markers) {
            violations += markers.length;
            warn('CC-2', `${file}: ${markers.length} TODO/FIXME/HACK marker(s) found`);
        }
    });

    if (violations === 0) {
        pass('CC-2');
    }
}

// ── CC-3: New modules have test files ───────────────────────────────────────

/**
 * Check that new/modified source files have corresponding test files.
 * WARN if missing test file.
 */
function checkCc3NewModulesHaveTests(projectPath) {
    console.log('\n  ── CC-3: New modules have test files ──');

    const files = getModifiedFiles(projectPath);
    const codeFiles = files.filter(f => isSourceFile(f) && !isTestFile(f));

    if (codeFiles.length === 0) {
        pass('CC-3');
        return;
    }

    let violations = 0;
    codeFiles.forEach(cf => {
        const baseName = path.basename(cf, path.extname(cf));
        const dirName = path.dirname(cf);
        const ext = path.extname(cf);

        const possibleTests = [
            path.join(dirName, `${baseName}.spec${ext}`),
            path.join(dirName, `${baseName}.test${ext}`),
            path.join(dirName, '__tests__', `${baseName}.spec${ext}`),
            path.join(dirName, '__tests__', `${baseName}.test${ext}`),
        ];

        const hasTest = possibleTests.some(t => files.includes(t) || fs.existsSync(path.join(projectPath, t)));
        if (!hasTest) {
            violations++;
            warn('CC-3', `No test file found for: ${cf}`);
        }
    });

    if (violations === 0) {
        pass('CC-3');
    }
}

// ── CC-4: No hardcoded absolute paths ───────────────────────────────────────

/**
 * Scan for hardcoded absolute filesystem paths (e.g., C:\, /Users/, /home/).
 * BLOCK if any found.
 */
function checkCc4NoHardcodedPaths(projectPath) {
    console.log('\n  ── CC-4: No hardcoded absolute paths ──');

    const absPathPatterns = [
        /['"`][A-Za-z]:\\[^'"`]+['"`]/,     // Windows: "C:\..."
        /['"`]\/Users\/[^'"`]+['"`]/,         // macOS: "/Users/..."
        /['"`]\/home\/[^'"`]+['"`]/,           // Linux: "/home/..."
        /['"`]\/tmp\/[^'"`]+['"`]/,            // Linux: "/tmp/..."
        /['"`]\/var\/[^'"`]+['"`]/,            // Linux: "/var/..."
        /['"`]\/etc\/[^'"`]+['"`]/,            // Linux: "/etc/..."
    ];

    const files = getModifiedFiles(projectPath).filter(f => isSourceFile(f));

    if (files.length === 0) {
        pass('CC-4');
        return;
    }

    let violations = 0;
    files.forEach(file => {
        // Skip files that are specifically about paths (like configs)
        if (file.includes('tsconfig') || file.includes('.json')) return;

        const filePath = path.join(projectPath, file);
        if (!fs.existsSync(filePath)) return;

        let content;
        try {
            content = fs.readFileSync(filePath, 'utf-8');
        } catch {
            return;
        }

        absPathPatterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                // Filter out test fixtures and mock data
                const safeMatches = matches.filter(m =>
                    !m.includes('mock') && !m.includes('fixture') && !m.includes('example')
                );
                if (safeMatches.length > 0) {
                    violations += safeMatches.length;
                    block('CC-4', `${file}: Hardcoded absolute path: ${safeMatches[0].substring(0, 80)}`);
                }
            }
        });
    });

    if (violations === 0) {
        pass('CC-4');
    }
}

// ── CC-5: API calls match contracts ─────────────────────────────────────────

/**
 * Reuses QG-C2 logic: scan modified files for API URLs and check
 * against .agency/contracts/ endpoint definitions.
 * WARN on mismatches.
 */
function checkCc5ApiContracts(projectPath) {
    console.log('\n  ── CC-5: API calls match contracts ──');

    const contractsDir = path.join(projectPath, '.agency', 'contracts');

    if (!fs.existsSync(contractsDir)) {
        warn('CC-5', 'No .agency/contracts directory found — skipping contract compliance');
        return;
    }

    const contractFiles = fs.readdirSync(contractsDir).filter(f =>
        f.endsWith('.json') && f !== 'TEMPLATE.api.json' && f !== 'cost-ledger.schema.json'
    );

    const endpoints = [];
    contractFiles.forEach(cf => {
        try {
            const contract = JSON.parse(fs.readFileSync(path.join(contractsDir, cf), 'utf-8'));
            if (contract.endpoints && Array.isArray(contract.endpoints)) {
                contract.endpoints.forEach(ep => {
                    endpoints.push({
                        method: (ep.method || '').toUpperCase(),
                        path: ep.path || '',
                        file: cf,
                    });
                });
            }
        } catch {
            // Skip unparseable contracts
        }
    });

    if (endpoints.length === 0) {
        warn('CC-5', 'No API endpoints found in contracts');
        return;
    }

    const files = getModifiedFiles(projectPath).filter(f => isSourceFile(f));
    const apiPatterns = [
        /(?:axios|fetch|http|https|got|superagent|request)\(['"]([^'"]+)['"]/g,
        /\.(?:get|post|put|patch|delete)\(['"]([^'"]+)['"]/g,
        /(?:GET|POST|PUT|PATCH|DELETE)\s+['"]([^'"]+)['"]/g,
    ];

    let violations = 0;
    files.forEach(file => {
        const filePath = path.join(projectPath, file);
        if (!fs.existsSync(filePath)) return;

        let content;
        try {
            content = fs.readFileSync(filePath, 'utf-8');
        } catch {
            return;
        }

        const foundUrls = [];
        apiPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                foundUrls.push(match[1]);
            }
        });

        foundUrls.forEach(url => {
            let normalized = url;
            try {
                const parsed = new URL(url);
                normalized = parsed.pathname;
            } catch {
                // Not a full URL, use as-is
            }

            const qIdx = normalized.indexOf('?');
            if (qIdx !== -1) normalized = normalized.substring(0, qIdx);

            const matched = endpoints.some(ep => {
                const epPath = ep.path.endsWith('/') ? ep.path.slice(0, -1) : ep.path;
                const normPath = normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
                if (normPath === epPath) return true;
                const epParts = epPath.split('/');
                const urlParts = normPath.split('/');
                if (epParts.length !== urlParts.length) return false;
                return epParts.every((part, i) => part.startsWith(':') || part === urlParts[i]);
            });

            if (!matched) {
                violations++;
                warn('CC-5', `${file}: URL '${url}' not found in any contract endpoint`);
            }
        });
    });

    if (violations === 0) {
        pass('CC-5');
    }
}

// ── CC-6: Last commit has HANDOFF metadata ──────────────────────────────────

/**
 * Check the last commit for HANDOFF metadata field.
 * BLOCK if missing.
 */
function checkCc6HandoffMetadata(projectPath) {
    console.log('\n  ── CC-6: Last commit has HANDOFF metadata ──');

    const lastCommitMsg = execGit('log -1 --format="%B"', projectPath);
    if (!lastCommitMsg) {
        warn('CC-6', 'No commits found — cannot check HANDOFF metadata');
        return;
    }

    const hasHandoff = /^HANDOFF:\S+/m.test(lastCommitMsg);
    if (hasHandoff) {
        pass('CC-6');
    } else {
        block('CC-6', 'Last commit is missing HANDOFF metadata field');
    }
}

// ── CC-7: Last commit has MEMORY:stored ─────────────────────────────────────

/**
 * Check the last commit for MEMORY:stored in the body.
 * BLOCK if missing.
 */
function checkCc7MemoryStored(projectPath) {
    console.log('\n  ── CC-7: Last commit has MEMORY:stored ──');

    const lastCommitMsg = execGit('log -1 --format="%B"', projectPath);
    if (!lastCommitMsg) {
        warn('CC-7', 'No commits found — cannot check MEMORY field');
        return;
    }

    const hasMemoryStored = /^MEMORY:\s*stored/m.test(lastCommitMsg);
    if (hasMemoryStored) {
        pass('CC-7');
    } else {
        block('CC-7', 'Last commit is missing MEMORY:stored in body');
    }
}

// ── CLI Parsing ─────────────────────────────────────────────────────────────

function parseArgs() {
    const args = process.argv.slice(2);
    const opts = { project: null };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--project': opts.project = path.resolve(args[++i]); break;
        }
    }

    return opts;
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
    const opts = parseArgs();
    const projectPath = opts.project || ROOT;

    if (!fs.existsSync(projectPath)) {
        console.error(`FAIL: Project path does not exist: ${projectPath}`);
        process.exit(1);
    }

    console.log('');
    console.log(`  ╔══════════════════════════════════════════╗`);
    console.log(`  ║   COMPLIANCE CHECK — ${path.basename(projectPath).padEnd(28)}║`);
    console.log(`  ╚══════════════════════════════════════════╝`);

    // ── Run all 7 checks ───────────────────────────────────────────────

    checkCc1NoNewDate(projectPath);
    checkCc2NoTodoFixme(projectPath);
    checkCc3NewModulesHaveTests(projectPath);
    checkCc4NoHardcodedPaths(projectPath);
    checkCc5ApiContracts(projectPath);
    checkCc6HandoffMetadata(projectPath);
    checkCc7MemoryStored(projectPath);

    // ── Summary ────────────────────────────────────────────────────────

    console.log('');
    console.log(`  ── Summary: ${passedCount}/7 checks passed, ${warnCount} warning(s), ${blockCount} block(s) ──`);

    if (blockCount > 0) {
        console.log('');
        console.log('  🏁 COMPLIANCE CHECK: BLOCKED — fix blocking issues above');
        process.exit(1);
    } else {
        console.log('');
        console.log('  🏁 COMPLIANCE CHECK: ALL PASS');
        process.exit(0);
    }
}

main();
