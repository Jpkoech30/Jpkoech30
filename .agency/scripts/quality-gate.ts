#!/usr/bin/env node


/**
 * quality-gate.js — Quality Gate (QG) Enforcement System
 *
 * Contract: agency-quality-gate@1.0.0
 *
 * 8 automated checks that validate LLM output quality before handoff:
 *   QG-C1: Hallucination Detector    — BLOCK on secrets, WARN on TODO
 *   QG-C2: Contract Compliance        — WARN only (advisory)
 *   QG-C3: Diff Size Limiter          — WARN at 500, BLOCK at 2000
 *   QG-C4: Test Gate                  — WARN on missing, BLOCK on failures
 *   QG-C5: Plan-vs-Implementation     — WARN only (advisory)
 *   QG-C6: TypeScript Compile         — BLOCK on errors
 *   QG-C7: Dependency Sanity          — BLOCK on missing, WARN on monorepo
 *   QG-C8: Design Principles          — WARN (advisory), BLOCK at >3 violations
 *
 * Usage:
 *   node .agency/scripts/quality-gate.js check --project <path>
 *
 * Exit codes:
 *   0 — All checks pass (warnings allowed)
 *   1 — One or more BLOCK results
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── Helpers ─────────────────────────────────────────────────────────────────

function tryResolve(filePath) {
    try {
        const exts = ['.js', '.jsx', '.ts', '.tsx', '.json', '.node'];
        if (fs.existsSync(filePath)) return filePath;
        for (const ext of exts) {
            if (fs.existsSync(filePath + ext)) return filePath + ext;
        }
        const dir = path.dirname(filePath);
        const base = path.basename(filePath);
        if (fs.existsSync(path.join(dir, base, 'index.js'))) return path.join(dir, base, 'index.js');
        if (fs.existsSync(path.join(dir, base, 'index.ts'))) return path.join(dir, base, 'index.ts');
        if (fs.existsSync(path.join(dir, base, 'index.tsx'))) return path.join(dir, base, 'index.tsx');
        return null;
    } catch {
        return null;
    }
}

function execGit(args, projectPath) {
    try {
        const result = execSync(`git ${args} 2>nul`, { cwd: projectPath, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
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
    // If no HEAD (new repo/no commits), fall back to all tracked files
    const ls = execGit('ls-files', projectPath);
    if (ls !== null) {
        return ls.split('\n').filter(Boolean);
    }
    return [];
}

function getDiffStat(projectPath) {
    const stat = execGit('diff --stat HEAD', projectPath);
    if (stat !== null) return stat;
    // Try initial commit stats
    const initStat = execGit('diff --stat 4b825dc642cb6eb9a060e54bf899d153036d1f7e HEAD', projectPath);
    return initStat || '';
}

const NODE_BUILTINS = new Set([
    'assert', 'buffer', 'child_process', 'cluster', 'crypto', 'dgram', 'dns',
    'domain', 'events', 'fs', 'http', 'https', 'module', 'net', 'os', 'path',
    'process', 'punycode', 'querystring', 'readline', 'stream', 'string_decoder',
    'timers', 'tls', 'tty', 'url', 'util', 'v8', 'vm', 'zlib',
]);

// ── QG-C1: Hallucination Detector ───────────────────────────────────────────

function checkHallucination(projectPath) {
    const files = getModifiedFiles(projectPath);
    const results = { check: 'QG-C1', name: 'Hallucination Detector', pass: true, warnings: [], blocks: [] };

    files.forEach(file => {
        const filePath = path.join(projectPath, file);
        if (!fs.existsSync(filePath)) return;

        let content;
        try {
            content = fs.readFileSync(filePath, 'utf-8');
        } catch {
            return; // Binary or unreadable file
        }

        const isTest = file.includes('.spec.') || file.includes('.test.') || file.includes('__tests__') || file.includes('/test/');

        // Check for hardcoded secrets — always BLOCK
        const secretPatterns = [
            /api[_\-]?key\s*[=:]\s*['"][^'"]+['"]/i,
            /password\s*[=:]\s*['"][^'"]+['"]/i,
            /jwt_secret\s*[=:]\s*['"][^'"]+['"]/i,
            /secret\s*[=:]\s*['"][^'"]+['"]/i,
        ];
        secretPatterns.forEach(p => {
            const match = content.match(p);
            if (match && !isTest) {
                results.blocks.push(`Hardcoded secret in ${file}: ${match[0].substring(0, 60)}`);
            }
        });

        // Check for MISSING_API_DATA placeholder (hallucination marker)
        if (!isTest) {
            const missingApi = content.match(/MISSING_API_DATA|MISSING_ENDPOINT|NOT_IMPLEMENTED_YET/g);
            if (missingApi) {
                results.blocks.push(`${file}: Contains hallucination marker "${missingApi[0]}" (${missingApi.length} occurrence(s))`);
            }
        }

        // Check for TODO/FIXME/HACK/XXX in non-test files — WARN
        if (!isTest) {
            const markers = (content.match(/TODO|FIXME|HACK|XXX/g) || []);
            if (markers.length > 0) {
                results.warnings.push(`${file}: ${markers.length} TODO/FIXME/HACK marker(s)`);
            }
        }

        // Check for nonexistent relative imports
        const requireImports = content.match(/require\(['"]([^'"]+)['"]\)/g) || [];
        requireImports.forEach(imp => {
            const modulePath = imp.match(/require\(['"]([^'"]+)['"]\)/)[1];
            if (modulePath.startsWith('.')) {
                const resolved = tryResolve(path.join(path.dirname(filePath), modulePath));
                if (!resolved) {
                    results.warnings.push(`${file}: Import '${modulePath}' not found`);
                }
            }
        });

        // Check for nonexistent ES6 imports
        const esImports = content.match(/import\s+(?:\{[^}]*\}\s+from\s+)?['"]([^'"]+)['"]/g) || [];
        esImports.forEach(imp => {
            const match = imp.match(/import\s+(?:\{[^}]*\}\s+from\s+)?['"]([^'"]+)['"]/);
            if (match) {
                const modulePath = match[1];
                if (modulePath.startsWith('.')) {
                    const resolved = tryResolve(path.join(path.dirname(filePath), modulePath));
                    if (!resolved) {
                        results.warnings.push(`${file}: Import '${modulePath}' not found`);
                    }
                }
            }
        });
    });

    if (results.blocks.length > 0) results.pass = false;
    return results;
}

// ── QG-C2: Contract Compliance ──────────────────────────────────────────────

function checkContractCompliance(projectPath) {
    const results = { check: 'QG-C2', name: 'Contract Compliance', pass: true, warnings: [], blocks: [] };
    const contractsDir = path.join(projectPath, '.agency', 'contracts');

    if (!fs.existsSync(contractsDir)) {
        results.warnings.push('No .agency/contracts directory found — skipping contract compliance');
        return results;
    }

    // Read all contract JSON files
    const contractFiles = fs.readdirSync(contractsDir).filter(f => f.endsWith('.json') && f !== 'TEMPLATE.api.json' && f !== 'cost-ledger.schema.json');
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
        results.warnings.push('No API endpoints found in contracts');
        return results;
    }

    // Scan modified .ts, .js files for API calls
    const files = getModifiedFiles(projectPath);
    const apiPatterns = [
        /(?:axios|fetch|http|https|got|superagent|request)\(['"]([^'"]+)['"]/g,
        /\.(?:get|post|put|patch|delete)\(['"]([^'"]+)['"]/g,
        /(?:GET|POST|PUT|PATCH|DELETE)\s+['"]([^'"]+)['"]/g,
    ];

    files.forEach(file => {
        if (!file.endsWith('.ts') && !file.endsWith('.js') && !file.endsWith('.tsx') && !file.endsWith('.jsx')) return;

        const filePath = path.join(projectPath, file);
        if (!fs.existsSync(filePath)) return;

        let content;
        try {
            content = fs.readFileSync(filePath, 'utf-8');
        } catch {
            return;
        }

        // Find API URLs in code
        const foundUrls = [];
        apiPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                foundUrls.push(match[1]);
            }
        });

        foundUrls.forEach(url => {
            // Normalize URL: remove host, query params
            let normalized = url;
            try {
                const parsed = new URL(url);
                normalized = parsed.pathname;
            } catch {
                // Not a full URL, use as-is
            }

            // Remove query params if present
            const qIdx = normalized.indexOf('?');
            if (qIdx !== -1) normalized = normalized.substring(0, qIdx);

            // Check if URL matches any contract endpoint
            const matched = endpoints.some(ep => {
                const epPath = ep.path.endsWith('/') ? ep.path.slice(0, -1) : ep.path;
                const normPath = normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
                if (normPath === epPath) return true;
                // Support path params: /api/v1/books/:id matches /api/v1/books/123
                const epParts = epPath.split('/');
                const urlParts = normPath.split('/');
                if (epParts.length !== urlParts.length) return false;
                return epParts.every((part, i) => part.startsWith(':') || part === urlParts[i]);
            });

            if (!matched) {
                results.warnings.push(`${file}: URL '${url}' not found in any contract endpoint`);
            }
        });
    });

    return results;
}

// ── QG-C3: Diff Size Limiter ────────────────────────────────────────────────

function checkDiffSize(projectPath) {
    const results = { check: 'QG-C3', name: 'Diff Size Limiter', pass: true, warnings: [], blocks: [] };

    const stat = getDiffStat(projectPath);
    if (!stat) {
        results.warnings.push('No diff available — skipping size check');
        return results;
    }

    // Parse git diff --stat output
    const lines = stat.split('\n').filter(Boolean);
    let totalAdditions = 0;
    let totalDeletions = 0;
    let totalChanged = 0;
    const excludePatterns = [/package-lock\.json/, /yarn\.lock/, /\.min\./, /\.generated\./, /prisma\/client/];

    lines.forEach(line => {
        // Skip summary line
        if (line.includes('file changed') || line.includes('files changed')) return;

        // Extract filename from diff stat
        const fileMatch = line.match(/^\s*(.+?)\s+\|/);
        if (!fileMatch) return;

        const fileName = fileMatch[1].trim();
        // Exclude generated files
        if (excludePatterns.some(p => p.test(fileName))) return;

        // Count + and - characters
        const plusMatch = line.match(/(\d+)\s*\+/);
        const minusMatch = line.match(/(\d+)\s*-/);

        if (plusMatch) totalAdditions += parseInt(plusMatch[1], 10);
        if (minusMatch) totalDeletions += parseInt(minusMatch[1], 10);
        totalChanged++;
    });

    // Alternative: count lines from diff directly
    let totalLines;
    const diffLines = execGit('diff HEAD --numstat', projectPath);
    if (diffLines !== null) {
        const numstatLines = diffLines.split('\n').filter(Boolean);
        let rawAdd = 0;
        let rawDel = 0;
        numstatLines.forEach(l => {
            const parts = l.split('\t');
            if (parts.length >= 2) {
                const fname = parts[2] || '';
                if (excludePatterns.some(p => p.test(fname))) return;
                rawAdd += parseInt(parts[0], 10) || 0;
                rawDel += parseInt(parts[1], 10) || 0;
            }
        });
        totalLines = rawAdd + rawDel;
    } else {
        totalLines = totalAdditions + totalDeletions;
    }

    results.warnings.push(`Diff size: ${totalLines} lines changed across ${totalChanged} file(s)`);

    if (totalLines > 2000) {
        results.blocks.push(`Diff too large (${totalLines} lines). Must split into multiple tasks. Max: 2000.`);
        results.pass = false;
    } else if (totalLines > 500) {
        results.warnings.push(`Large diff (${totalLines} lines). Consider splitting into smaller tasks.`);
    }

    return results;
}

// ── QG-C4: Test Gate ────────────────────────────────────────────────────────

function checkTestGate(projectPath) {
    const results = { check: 'QG-C4', name: 'Test Gate', pass: true, warnings: [], blocks: [] };
    const files = getModifiedFiles(projectPath);

    const testFiles = files.filter(f => f.includes('.spec.') || f.includes('.test.') || f.includes('__tests__'));
    const codeFiles = files.filter(f =>
        !f.includes('.spec.') && !f.includes('.test.') && !f.includes('__tests__') &&
        (f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.tsx') || f.endsWith('.jsx'))
    );

    // Check if test files were modified
    if (testFiles.length > 0) {
        results.warnings.push(`${testFiles.length} test file(s) modified`);

        // Try to run npm test
        const pkgPath = path.join(projectPath, 'package.json');
        if (fs.existsSync(pkgPath)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
                if (pkg.scripts && pkg.scripts.test) {
                    try {
                        execSync('npm test', { cwd: projectPath, stdio: 'pipe', timeout: 30000, encoding: 'utf-8' });
                        results.warnings.push('npm test passed');
                    } catch (testErr) {
                        results.blocks.push(`npm test failed: ${testErr.message || 'Unknown error'}`);
                        results.pass = false;
                    }
                } else {
                    results.warnings.push('No "test" script found in package.json');
                }
            } catch {
                results.warnings.push('Could not parse package.json');
            }
        } else {
            results.warnings.push('No package.json found — cannot run tests');
        }
    } else {
        results.warnings.push('No test files modified — skipping test execution');
    }

    // Check if new code files have corresponding test files
    codeFiles.forEach(cf => {
        const baseName = path.basename(cf, path.extname(cf));
        const dirName = path.dirname(cf);
        const testName1 = path.join(dirName, `${baseName}.spec${path.extname(cf)}`);
        const testName2 = path.join(dirName, `${baseName}.test${path.extname(cf)}`);
        const testName3 = path.join(dirName, '__tests__', `${baseName}.spec${path.extname(cf)}`);
        const testName4 = path.join(dirName, '__tests__', `${baseName}.test${path.extname(cf)}`);

        const hasTest = [testName1, testName2, testName3, testName4].some(t => files.includes(t));
        if (!hasTest) {
            results.warnings.push(`No test file found for new/modified code file: ${cf}`);
        }
    });

    return results;
}

// ── QG-C5: Plan-vs-Implementation Diff ──────────────────────────────────────

function checkPlanVsImplementation(projectPath) {
    const results = { check: 'QG-C5', name: 'Plan-vs-Implementation', pass: true, warnings: [], blocks: [] };

    // Try to find a plan file
    let planContent = null;
    const planPaths = [
        path.join(projectPath, '.socratic-plan.md'),
    ];

    for (const pp of planPaths) {
        if (fs.existsSync(pp)) {
            try {
                planContent = fs.readFileSync(pp, 'utf-8');
                break;
            } catch {
                // Continue
            }
        }
    }

    // If no plan file, check git log for plan references
    if (!planContent) {
        try {
            const log = execSync('git log --oneline -5 --format="%s %b" HEAD', { cwd: projectPath, encoding: 'utf-8' });
            if (log && log.length > 0) {
                planContent = log; // Use recent commits as loose plan reference
            }
        } catch {
            // No git history
        }
    }

    if (!planContent) {
        results.warnings.push('No plan found (no .socratic-plan.md, no git history) — skipping plan-vs-implementation check');
        return results;
    }

    // Extract file references from plan content
    const plannedFiles = new Set();
    const fileRefs = planContent.match(/`[^`]+\.(ts|tsx|js|jsx|vue|css|scss|json|md)`|\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`/g) || [];
    fileRefs.forEach(ref => {
        // Extract filename from backtick references
        const cleanRef = ref.replace(/[`\[\]\(\)]/g, '');
        if (cleanRef.includes('.') && !cleanRef.includes(' ') && !cleanRef.includes('\n')) {
            plannedFiles.add(cleanRef);
        }
    });

    if (plannedFiles.size === 0) {
        results.warnings.push('No file references found in plan — cannot validate plan-vs-implementation');
        return results;
    }

    // Get actual modified files
    const modifiedFiles = new Set(getModifiedFiles(projectPath));

    // Files in plan but not modified
    const plannedButNotModified = [];
    plannedFiles.forEach(pf => {
        // Normalize: trim leading ./ or /
        const normalized = pf.replace(/^\.\//, '').replace(/^\//, '');
        let found = false;
        for (const mf of modifiedFiles) {
            if (mf.endsWith(normalized) || normalized.endsWith(mf)) {
                found = true;
                break;
            }
        }
        if (!found) {
            plannedButNotModified.push(normalized);
        }
    });

    // Files modified but not in plan
    const modifiedButNotPlanned = [];
    modifiedFiles.forEach(mf => {
        let found = false;
        for (const pf of plannedFiles) {
            const normalized = pf.replace(/^\.\//, '').replace(/^\//, '');
            if (mf.endsWith(normalized) || normalized.endsWith(mf)) {
                found = true;
                break;
            }
        }
        if (!found) {
            // Skip common non-code files that aren't typically in plans
            if (!mf.startsWith('.git') && !mf.startsWith('node_modules') && !mf.startsWith('.agency/memory')) {
                modifiedButNotPlanned.push(mf);
            }
        }
    });

    // Filter paths: only show first 5 of each
    if (plannedButNotModified.length > 0) {
        const display = plannedButNotModified.slice(0, 5);
        results.warnings.push(`Planned file(s) not modified (${plannedButNotModified.length} total): ${display.join(', ')}`);
    }

    if (modifiedButNotPlanned.length > 0) {
        const display = modifiedButNotPlanned.slice(0, 5);
        results.warnings.push(`Modified file(s) not in plan (${modifiedButNotPlanned.length} total): ${display.join(', ')}`);
    }

    if (plannedButNotModified.length === 0 && modifiedButNotPlanned.length === 0) {
        results.warnings.push('All planned files match modified files');
    }

    return results;
}

// ── QG-C6: TypeScript Compile Check ─────────────────────────────────────────

function checkTypeScriptCompile(projectPath) {
    const results = { check: 'QG-C6', name: 'TypeScript Compile', pass: true, warnings: [], blocks: [] };

    const tsconfigPath = path.join(projectPath, 'tsconfig.json');
    if (!fs.existsSync(tsconfigPath)) {
        results.warnings.push('No tsconfig.json found — skipping TypeScript compile check');
        return results;
    }

    try {
        const tscOutput = execSync('npx tsc --noEmit', { cwd: projectPath, stdio: 'pipe', timeout: 60000, encoding: 'utf-8' });
        results.warnings.push('TypeScript compilation: 0 errors');
    } catch (tscErr) {
        const output = tscErr.stdout || tscErr.message || '';
        // Parse error count from output
        const errorMatch = output.match(/Found\s+(\d+)\s+error/);
        const errorCount = errorMatch ? parseInt(errorMatch[1], 10) : 'some';

        // Only show first 3 errors to avoid flooding
        const errorLines = output.split('\n').filter(l => l.includes('error TS'));
        const firstErrors = errorLines.slice(0, 3).map(l => l.trim());

        results.blocks.push(`TypeScript compilation failed with ${errorCount} error(s)`);
        if (firstErrors.length > 0) {
            firstErrors.forEach(e => results.blocks.push(`  TS error: ${e}`));
            if (errorLines.length > 3) {
                results.blocks.push(`  ... and ${errorLines.length - 3} more error(s)`);
            }
        }
        results.pass = false;
    }

    return results;
}

// ── QG-C7: Dependency Sanity Check ──────────────────────────────────────────

function checkDependencySanity(projectPath) {
    const results = { check: 'QG-C7', name: 'Dependency Sanity', pass: true, warnings: [], blocks: [] };
    const files = getModifiedFiles(projectPath);

    // Read package.json
    const pkgPath = path.join(projectPath, 'package.json');
    if (!fs.existsSync(pkgPath)) {
        results.warnings.push('No package.json found — skipping dependency check');
        return results;
    }

    let pkg;
    try {
        pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    } catch {
        results.blocks.push('Could not parse package.json');
        results.pass = false;
        return results;
    }

    const allDeps = new Set([
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.devDependencies || {}),
        ...Object.keys(pkg.peerDependencies || {}),
    ]);

    // Check for monorepo structure
    const isMonorepo = !!(pkg.workspaces || (pkg.name && pkg.name.includes('/') && fs.existsSync(path.join(projectPath, '..', 'package.json'))));

    files.forEach(file => {
        const filePath = path.join(projectPath, file);
        if (!fs.existsSync(filePath)) return;
        if (!file.endsWith('.ts') && !file.endsWith('.js') && !file.endsWith('.tsx') && !file.endsWith('.jsx')) return;

        let content;
        try {
            content = fs.readFileSync(filePath, 'utf-8');
        } catch {
            return;
        }

        // Scan require() calls
        const requireMatches = content.match(/require\(['"]([^'"]+)['"]\)/g) || [];
        requireMatches.forEach(imp => {
            const m = imp.match(/require\(['"]([^'"]+)['"]\)/);
            if (!m) return;
            const modName = m[1];
            // Skip relative imports and Node built-ins
            if (modName.startsWith('.') || modName.startsWith('/') || NODE_BUILTINS.has(modName)) return;
            // Get the package name (handle scoped packages like @scope/package)
            const pkgName = modName.startsWith('@') ? modName.split('/').slice(0, 2).join('/') : modName.split('/')[0];
            if (!allDeps.has(pkgName)) {
                if (isMonorepo) {
                    results.warnings.push(`${file}: Package '${pkgName}' not in package.json (monorepo — may be hoisted)`);
                } else {
                    results.blocks.push(`${file}: Package '${pkgName}' not found in package.json dependencies`);
                    results.pass = false;
                }
            }
        });

        // Scan ES6 import statements
        const importMatches = content.match(/import\s+(?:\{[^}]*\}\s+from\s+)?['"]([^'"]+)['"]/g) || [];
        importMatches.forEach(imp => {
            const m = imp.match(/import\s+(?:\{[^}]*\}\s+from\s+)?['"]([^'"]+)['"]/);
            if (!m) return;
            const modName = m[1];
            // Skip relative imports, Node built-ins, and type-only imports
            if (modName.startsWith('.') || modName.startsWith('/') || NODE_BUILTINS.has(modName)) return;
            // Get the package name
            const pkgName = modName.startsWith('@') ? modName.split('/').slice(0, 2).join('/') : modName.split('/')[0];
            if (!allDeps.has(pkgName)) {
                if (isMonorepo) {
                    results.warnings.push(`${file}: Package '${pkgName}' not in package.json (monorepo — may be hoisted)`);
                } else {
                    results.blocks.push(`${file}: Package '${pkgName}' not found in package.json dependencies`);
                    results.pass = false;
                }
            }
        });

        // Scan dynamic import()
        const dynamicMatches = content.match(/import\(['"]([^'"]+)['"]\)/g) || [];
        dynamicMatches.forEach(imp => {
            const m = imp.match(/import\(['"]([^'"]+)['"]\)/);
            if (!m) return;
            const modName = m[1];
            if (modName.startsWith('.') || modName.startsWith('/') || NODE_BUILTINS.has(modName)) return;
            const pkgName = modName.startsWith('@') ? modName.split('/').slice(0, 2).join('/') : modName.split('/')[0];
            if (!allDeps.has(pkgName)) {
                if (isMonorepo) {
                    results.warnings.push(`${file}: Dynamic import '${pkgName}' not in package.json (monorepo — may be hoisted)`);
                } else {
                    results.blocks.push(`${file}: Dynamic import '${pkgName}' not found in package.json dependencies`);
                    results.pass = false;
                }
            }
        });
    });

    return results;
}

// ── QG-C8: Design Principles ─────────────────────────────────────────────

/**
 * Check Design Principles (DP3, DP4, DP12) across modified component files.
 *
 * DP3: 48px touch targets — scan for min-h-/min-w- values < 48.
 * DP4: fontSize 16 — scan <input>/<TextInput> without text-base or fontSize:16.
 * DP12: Offline safety — scan components for loading/error/null/empty handling.
 *
 * Severity: WARN. Blocks only if >3 total violations.
 */
function checkDesignPrinciples(projectPath) {
    const results = { check: 'QG-C8', name: 'Design Principles', pass: true, warnings: [], blocks: [] };
    let totalViolations = 0;
    const files = getModifiedFiles(projectPath);
    const componentFiles = files.filter(f => f.endsWith('.tsx') || f.endsWith('.jsx'));

    if (componentFiles.length === 0) {
        results.warnings.push('No component files modified — skipping design principle checks');
        return results;
    }

    componentFiles.forEach(file => {
        const filePath = path.join(projectPath, file);
        if (!fs.existsSync(filePath)) return;

        let content;
        try {
            content = fs.readFileSync(filePath, 'utf-8');
        } catch {
            return;
        }

        // ── DP3: 48px touch targets ──────────────────────────────────────

        // Check Tailwind min-h-{n} and min-w-{n} classes (n < 12 => < 48px in Tailwind spacing)
        const twMinMatches = content.match(/\bmin-[hw]-(\d+)\b/g);
        if (twMinMatches) {
            twMinMatches.forEach(m => {
                const val = parseInt(m.match(/\d+/)[0], 10);
                // Tailwind spacing: val * 4 = px. So val < 12 means < 48px.
                if (val < 12 && val >= 0) {
                    results.warnings.push(`DP3: ${file}: Touch target too small — '${m}' = ${val * 4}px (min 48px)`);
                    totalViolations++;
                }
            });
        }

        // Check arbitrary Tailwind values: min-h-[<n>px], min-w-[<n>px]
        const arbitraryMinMatches = content.match(/min-[hw]-\[(\d+)px\]/g);
        if (arbitraryMinMatches) {
            arbitraryMinMatches.forEach(m => {
                const val = parseInt(m.match(/\d+/)[0], 10);
                if (val < 48 && val >= 0) {
                    results.warnings.push(`DP3: ${file}: Touch target too small — '${m}' = ${val}px (min 48px)`);
                    totalViolations++;
                }
            });
        }

        // Check inline styles: style={{ ... minHeight: < 48 ... }}
        const inlineMinHeight = content.match(/minHeight\s*:\s*(\d+)/g);
        if (inlineMinHeight) {
            inlineMinHeight.forEach(m => {
                const val = parseInt(m.match(/\d+/)[0], 10);
                if (val < 48 && val >= 0) {
                    results.warnings.push(`DP3: ${file}: Touch target too small — inline '${m}' = ${val}px (min 48px)`);
                    totalViolations++;
                }
            });
        }

        // Check inline styles: style={{ ... minWidth: < 48 ... }}
        const inlineMinWidth = content.match(/minWidth\s*:\s*(\d+)/g);
        if (inlineMinWidth) {
            inlineMinWidth.forEach(m => {
                const val = parseInt(m.match(/\d+/)[0], 10);
                if (val < 48 && val >= 0) {
                    results.warnings.push(`DP3: ${file}: Touch target too small — inline '${m}' = ${val}px (min 48px)`);
                    totalViolations++;
                }
            });
        }

        // ── DP4: fontSize 16 for inputs ──────────────────────────────────

        if (content.includes('<input') || content.includes('<TextInput')) {
            const inputTags = content.match(/<input[^>]*>/g) || [];
            const textInputTags = content.match(/<TextInput[^>]*>/g) || [];
            const allInputTags = [...inputTags, ...textInputTags];

            allInputTags.forEach(tag => {
                const hasTextBase = /\btext-base\b/.test(tag);
                const hasFontSize16 = /fontSize\s*[:=]\s*16/.test(tag) || /fontSize\s*=\s*\{16\}/.test(tag);
                if (!hasTextBase && !hasFontSize16) {
                    results.warnings.push(`DP4: ${file}: <input>/<TextInput> missing 'text-base' class or fontSize: 16`);
                    totalViolations++;
                }
            });
        }

        // ── DP12: Offline safety (state handling) ────────────────────────

        // Only check component files (those with exports)
        const isComponent = /export\s+(default|const\s+\w+)/.test(content);
        if (isComponent) {
            const hasLoading = /\b(loading|isLoading|is_loading)\b/i.test(content);
            const hasError = /\b(error|isError)\b/i.test(content);
            const hasNullGuard = /\bnull\b/.test(content) || /\?\?/.test(content) || /\?\./.test(content);
            const hasEmptyCheck = /\b(empty|isEmpty|\.length)\b/.test(content);

            const statePatterns = [hasLoading, hasError, hasNullGuard, hasEmptyCheck];
            const presentCount = statePatterns.filter(Boolean).length;

            if (presentCount < 1) {
                results.warnings.push(`DP12: ${file}: No state handling found (loading/error/null/empty patterns)`);
                totalViolations++;
            }
        }
    });

    // Block only if >3 violations
    if (totalViolations > 3) {
        results.blocks.push(`Design Principle violations: ${totalViolations} found (max 3 allowed before block)`);
        results.pass = false;
    }

    results.warnings.push(`Total design principle violations: ${totalViolations}`);

    return results;
}

// ── CLI Parsing ──────────────────────────────────────────────────────────────

function parseArgs() {
    const args = process.argv.slice(2);
    const command = args[0];
    const opts = { project: null };

    for (let i = 1; i < args.length; i++) {
        switch (args[i]) {
            case '--project': opts.project = path.resolve(args[++i]); break;
        }
    }

    return { command, opts };
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
    const { command, opts } = parseArgs();

    if (!command || command === '--help' || command === '-h') {
        console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║          Quality Gate — 8 Check Enforcement           ║
  ╚══════════════════════════════════════════════════════╝

  Usage:
    node .agency/scripts/quality-gate.js check --project <path>

  Checks:
    QG-C1  Hallucination Detector    — BLOCK on secrets, WARN on TODO
    QG-C2  Contract Compliance        — WARN only (advisory)
    QG-C3  Diff Size Limiter          — WARN at 500, BLOCK at 2000
    QG-C4  Test Gate                  — WARN on missing, BLOCK on failures
    QG-C5  Plan-vs-Implementation     — WARN only (advisory)
    QG-C6  TypeScript Compile         — BLOCK on errors
    QG-C7  Dependency Sanity          — BLOCK on missing, WARN on monorepo
    QG-C8  Design Principles          — WARN (advisory), BLOCK at >3 violations

  Exit codes:
    0 — All checks pass (warnings allowed)
    1 — One or more BLOCK results
`);
        process.exit(0);
    }

    if (command !== 'check') {
        console.error(`FAIL: Unknown command "${command}". Use "check" to run all checks.`);
        process.exit(1);
    }

    if (!opts.project) {
        console.error('FAIL: Missing required --project <path>');
        process.exit(1);
    }

    if (!fs.existsSync(opts.project)) {
        console.error(`FAIL: Project path does not exist: ${opts.project}`);
        process.exit(1);
    }

    console.log('');
    console.log(`  ╔══════════════════════════════════════════╗`);
    console.log(`  ║      QUALITY GATE — ${path.basename(opts.project).padEnd(28)}║`);
    console.log(`  ╚══════════════════════════════════════════╝`);

    // ── Run all 8 checks ───────────────────────────────────────────────

    const checks = [
        checkHallucination(opts.project),
        checkContractCompliance(opts.project),
        checkDiffSize(opts.project),
        checkTestGate(opts.project),
        checkPlanVsImplementation(opts.project),
        checkTypeScriptCompile(opts.project),
        checkDependencySanity(opts.project),
        checkDesignPrinciples(opts.project),
    ];

    // ── Print results ──────────────────────────────────────────────────

    let totalPass = 0;
    let totalWarn = 0;
    let totalBlock = 0;

    checks.forEach(result => {
        console.log('');
        console.log(`  ── ${result.check}: ${result.name} ──`);

        if (result.pass && result.blocks.length === 0 && result.warnings.length === 0) {
            console.log(`  [PASS] ${result.check}: No issues found`);
            totalPass++;
            return;
        }

        if (result.blocks.length > 0) {
            result.blocks.forEach(b => console.log(`  [BLOCK] ${b}`));
            totalBlock += result.blocks.length;
        }

        if (result.warnings.length > 0) {
            // Filter out size info lines from warnings for cleaner output
            result.warnings.forEach(w => {
                if (!w.startsWith('Diff size:')) {
                    console.log(`  [WARN] ${w}`);
                }
            });
            totalWarn += result.warnings.length;
        }

        // Always print the diff size line separately at the end
        const sizeWarn = result.warnings.find(w => w.startsWith('Diff size:'));
        if (sizeWarn) console.log(`  [INFO] ${sizeWarn}`);

        if (result.pass && result.blocks.length === 0) {
            console.log(`  [PASS] ${result.check}: Passed with warnings`);
            totalPass++;
        } else {
            console.log(`  [FAIL] ${result.check}: Blocked`);
        }
    });

    // ── Summary ────────────────────────────────────────────────────────

    const totalChecks = checks.length;
    console.log('');
    console.log(`  ── Summary: ${totalPass}/${totalChecks} checks passed, ${totalWarn} warning(s), ${totalBlock} block(s) ──`);

    if (totalBlock > 0) {
        console.log('');
        console.log('  🏁 QUALITY GATE: BLOCKED — fix blocking issues above');
        process.exit(1);
    } else {
        console.log('');
        console.log('  🏁 QUALITY GATE: ALL PASS');
        process.exit(0);
    }
}

main();

export {};
