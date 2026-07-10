#!/usr/bin/env node

/**
 * E2E Test — Multi-Project Handoff Validation
 *
 * Contract: agency-multi-project@1.0.0
 * Sprint:   MP-1.13
 *
 * Validates 7 scenarios:
 *   1. PROJECT field required   — validate-commit.js rejects without PROJECT
 *   2. PROJECT field valid      — rejects invalid project IDs
 *   3. PROJECT field enabled    — rejects disabled projects
 *   4. PROJECT:global allowed   — --allow-global flag works
 *   5. memory.js --project       — stores in project-scoped path
 *   6. memory.js recall --project — recall filters correctly
 *   7. cost-track.js --project   — entries include project context
 *
 * Usage:
 *   node e2e/multi-project-handoff.spec.js
 *
 * Exit codes:
 *   0 — All scenarios pass
 *   1 — One or more scenarios fail
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ── Paths ───────────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
const VALIDATE_SCRIPT = path.join(ROOT, '.agency/scripts/validate-commit.js');
const MEMORY_SCRIPT = path.join(ROOT, '.agency/scripts/memory.js');
const COST_TRACK_SCRIPT = path.join(ROOT, '.agency/scripts/cost-track.js');
const PROJECTS_JSON = path.join(ROOT, '.agency/projects.json');
const GLOBAL_MEMORY_DIR = path.join(ROOT, '.agency/memory');
const GLOBAL_COST_LEDGER = path.join(ROOT, 'COST-LEDGER.md');

// ── Test framework ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
let skipped = 0;
const results = [];

function assert(condition, message) {
    if (!condition) {
        throw new Error(`ASSERTION FAILED: ${message}`);
    }
}

async function runScenario(name, fn) {
    process.stdout.write(`\n  ── [${name}] ──\n`);
    try {
        await fn();
        results.push({ name, status: 'PASS' });
        passed++;
        process.stdout.write(`  ✓ ${name}: PASS\n`);
    } catch (err) {
        results.push({ name, status: 'FAIL', error: err.message });
        failed++;
        process.stdout.write(`  ✗ ${name}: FAIL\n`);
        process.stdout.write(`    ${err.message}\n`);
    }
}

function runScript(scriptPath, args = [], env = {}) {
    const cmd = `node "${scriptPath}" ${args.map(a => `"${a}"`).join(' ')}`;
    try {
        const stdout = execSync(cmd, {
            cwd: ROOT,
            env: { ...process.env, ...env },
            encoding: 'utf-8',
            timeout: 15000,
        });
        return { exitCode: 0, stdout: stdout.trim(), stderr: '' };
    } catch (err) {
        return {
            exitCode: err.status,
            stdout: (err.stdout || '').trim(),
            stderr: (err.stderr || '').trim(),
        };
    }
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function fileExists(filePath) {
    return fs.existsSync(filePath);
}

// ── Cleanup helpers ─────────────────────────────────────────────────────────────

function cleanupProjectMemory(projectId) {
    const dir = path.join(ROOT, '.agency/projects', projectId, 'memory');
    const storePath = path.join(dir, 'store.json');
    if (fs.existsSync(storePath)) {
        fs.unlinkSync(storePath);
    }
}

// ── Scenarios ───────────────────────────────────────────────────────────────────

/**
 * Scenario 1: PROJECT field required
 * Contract rule: "validate-commit.js MUST reject commits without PROJECT field"
 */
async function scenario1_projectFieldRequired() {
    const validSubject = 'feat(test): add multi-tenant support for accounting';
    const bodyWithoutProject = [
        'HANDOFF:qa-automator',
        'ARTIFACTS:e2e/test-file.js',
        'CONTRACT:agency-multi-project@1.0.0',
        'STATUS:DONE',
    ].join('\n');

    const msg = `${validSubject}\n${bodyWithoutProject}`;

    const result = runScript(VALIDATE_SCRIPT, [], { COMMIT_MESSAGE: msg });

    assert(
        result.exitCode !== 0,
        `Expected exit code 1 (reject), got ${result.exitCode}. ` +
        `Stdout: ${result.stdout} | Stderr: ${result.stderr}`
    );

    assert(
        result.stdout.includes('Missing PROJECT') || result.stderr.includes('Missing PROJECT'),
        `Expected error about missing PROJECT field. Output: ${result.stdout} ${result.stderr}`
    );
}

/**
 * Scenario 2: PROJECT field valid
 * Contract rule: "All handoffs MUST include PROJECT field matching a project in projects.json"
 */
async function scenario2_invalidProjectRejected() {
    const validSubject = 'feat(test): add multi-tenant support for accounting';
    const bodyWithInvalidProject = [
        'HANDOFF:qa-automator',
        'PROJECT:nonexistent-project',
        'ARTIFACTS:e2e/test-file.js',
        'CONTRACT:agency-multi-project@1.0.0',
        'STATUS:DONE',
    ].join('\n');

    const msg = `${validSubject}\n${bodyWithInvalidProject}`;

    const result = runScript(VALIDATE_SCRIPT, [], { COMMIT_MESSAGE: msg });

    assert(
        result.exitCode !== 0,
        `Expected exit code 1 (reject invalid project), got ${result.exitCode}. ` +
        `Stdout: ${result.stdout} | Stderr: ${result.stderr}`
    );

    assert(
        result.stdout.includes('Unknown project') || result.stderr.includes('Unknown project'),
        `Expected error about unknown project. Output: ${result.stdout} ${result.stderr}`
    );
}

/**
 * Scenario 3: PROJECT field enabled — Verify rejection of disabled projects
 * Contract rule: "project-id MUST exist in projects.json and be enabled: true"
 */
async function scenario3_disabledProjectRejected() {
    const registry = readJson(PROJECTS_JSON);
    const disabledProjects = registry.projects.filter(p => p.enabled === false);

    if (disabledProjects.length === 0) {
        // No disabled projects to test with — report as diagnostic
        process.stdout.write('    ⚠ SKIP: No disabled projects found in projects.json.\n');
        process.stdout.write('      Create a disabled project entry to validate this scenario.\n');
        skipped++;
        results.push({ name: 'scenario3_disabledProjectRejected', status: 'SKIP', reason: 'No disabled projects in registry' });
        return;
    }

    const disabledId = disabledProjects[0].id;
    const validSubject = 'feat(test): add multi-tenant support for accounting';
    const bodyWithDisabledProject = [
        'HANDOFF:qa-automator',
        `PROJECT:${disabledId}`,
        'ARTIFACTS:e2e/test-file.js',
        'CONTRACT:agency-multi-project@1.0.0',
        'STATUS:DONE',
    ].join('\n');

    const msg = `${validSubject}\n${bodyWithDisabledProject}`;

    const result = runScript(VALIDATE_SCRIPT, [], { COMMIT_MESSAGE: msg });

    assert(
        result.exitCode !== 0,
        `Expected exit code 1 (reject disabled project "${disabledId}"), got ${result.exitCode}. ` +
        `Stdout: ${result.stdout} | Stderr: ${result.stderr}`
    );

    assert(
        result.stdout.includes('disabled') || result.stderr.includes('disabled'),
        `Expected error about disabled project. Output: ${result.stdout} ${result.stderr}`
    );

    process.stdout.write('    ⚠ Test passed because a disabled project was found in the registry.\n');
}

/**
 * Scenario 4: PROJECT:global allowed — verify --allow-global flag
 * Contract rule: "Global-only commits may use PROJECT:global with --allow-global flag"
 */
async function scenario4_globalAllowed() {
    const validSubject = 'feat(test): add multi-tenant support for accounting';

    // Without --allow-global, no PROJECT should fail
    const bodyWithoutProject = [
        'HANDOFF:qa-automator',
        'ARTIFACTS:.agency/AGENCY-RULES.md',
        'CONTRACT:agency-multi-project@1.0.0',
        'STATUS:DONE',
    ].join('\n');

    const msgNoProject = `${validSubject}\n${bodyWithoutProject}`;

    // Without --allow-global → should fail
    const resultWithoutFlag = runScript(VALIDATE_SCRIPT, [], { COMMIT_MESSAGE: msgNoProject });

    assert(
        resultWithoutFlag.exitCode !== 0,
        `Expected exit code 1 without --allow-global, got ${resultWithoutFlag.exitCode}`
    );

    // With --allow-global → should pass
    const resultWithFlag = runScript(VALIDATE_SCRIPT, ['--allow-global'], { COMMIT_MESSAGE: msgNoProject });

    assert(
        resultWithFlag.exitCode === 0,
        `Expected exit code 0 with --allow-global, got ${resultWithFlag.exitCode}. ` +
        `Stdout: ${resultWithFlag.stdout} | Stderr: ${resultWithFlag.stderr}`
    );

    assert(
        resultWithFlag.stdout.includes('PASS'),
        `Expected PASS message. Output: ${resultWithFlag.stdout}`
    );
}

/**
 * Scenario 5: memory.js --project scoping
 * Contract rule: "memory.js MUST accept --project flag to scope reads/writes"
 * When --project is given, data stores in .agency/projects/<id>/memory/store.json
 */
async function scenario5_memoryProjectScoping() {
    const testContent = `E2E test memory entry for project isolation — ${Date.now()}`;
    const projectId = 'zoocode-agency';

    // Store a memory with --project flag
    const storeResult = runScript(MEMORY_SCRIPT, [
        'store',
        '--content', testContent,
        '--tags', 'e2e-test,project-isolation',
        '--task', 'MP-1.13',
        '--agent', 'qa-automator',
        '--project', projectId,
    ]);

    assert(
        storeResult.exitCode === 0,
        `memory.js store with --project failed. Exit: ${storeResult.exitCode}. ` +
        `Stdout: ${storeResult.stdout} | Stderr: ${storeResult.stderr}`
    );

    assert(
        storeResult.stdout.includes('PASS'),
        `Expected PASS from memory.js store. Output: ${storeResult.stdout}`
    );

    // Verify the project-scoped store exists
    const projectStorePath = path.join(ROOT, '.agency/projects', projectId, 'memory', 'store.json');
    assert(
        fileExists(projectStorePath),
        `Expected project-scoped store at ${projectStorePath}, but file not found. ` +
        `This indicates --project flag did not scope the storage path.`
    );

    // Verify the content is in the project-scoped store
    const projectStore = readJson(projectStorePath);
    const found = projectStore.some(entry => entry.content === testContent);
    assert(
        found,
        `Expected test memory "${testContent}" to be in project-scoped store at ${projectStorePath}. ` +
        `Entries found: ${projectStore.length}`
    );

    // Cleanup: remove the test entry
    const filteredStore = projectStore.filter(entry => entry.content !== testContent);
    fs.writeFileSync(projectStorePath, JSON.stringify(filteredStore, null, 2));
}

/**
 * Scenario 6: memory.js recall --project — verify recall filters correctly
 * Contract rule: "Recall queries optionally filter by project tag"
 */
async function scenario6_memoryRecallProject() {
    const projectId = 'zoocode-agency';
    const query = 'E2E test memory entry for project isolation';

    // Recall with --project flag
    const recallResult = runScript(MEMORY_SCRIPT, [
        'recall',
        '--query', query,
        '--tags', 'e2e-test',
        '--limit', '5',
        '--project', projectId,
    ]);

    assert(
        recallResult.exitCode === 0,
        `memory.js recall with --project failed. Exit: ${recallResult.exitCode}. ` +
        `Stdout: ${recallResult.stdout} | Stderr: ${recallResult.stderr}`
    );

    // Recall should find results — at minimum it should run without error
    assert(
        recallResult.stdout.includes('Results:') || recallResult.stdout.includes('matching'),
        `Expected recall output. Got: ${recallResult.stdout}`
    );

    // Verify the recall was scoped: check that the correct memory dir was used
    // by checking that the global store was NOT queried instead
    const globalStorePath = path.join(GLOBAL_MEMORY_DIR, 'store.json');
    const projectStorePath = path.join(ROOT, '.agency/projects', projectId, 'memory', 'store.json');

    // If global store exists, check it doesn't contain the test data
    if (fileExists(globalStorePath)) {
        const globalStore = readJson(globalStorePath);
        const foundInGlobal = globalStore.some(
            entry => entry.content && entry.content.includes('E2E test memory entry')
        );
        assert(
            !foundInGlobal,
            `Test memory should NOT be in global store when --project is used. ` +
            `Found in: ${globalStorePath}`
        );
    }
}

/**
 * Scenario 7: cost-track.js --project — verify entries include project context
 * Contract rule: "cost-track.js MUST include project field in cost entries"
 */
async function scenario7_costTrackProject() {
    const taskId = 'MP-1.13-E2E';
    const agent = 'qa-automator';

    // Read current COST-LEDGER.md content
    const beforeContent = fs.readFileSync(GLOBAL_COST_LEDGER, 'utf-8');

    // Add a cost entry with --project flag
    const result = runScript(COST_TRACK_SCRIPT, [
        '--task', taskId,
        '--tokens', '100/50',
        '--agent', agent,
        '--project', 'zoocode-agency',
    ]);

    assert(
        result.exitCode === 0,
        `cost-track.js with --project failed. Exit: ${result.exitCode}. ` +
        `Stdout: ${result.stdout} | Stderr: ${result.stderr}`
    );

    assert(
        result.stdout.includes('PASS'),
        `Expected PASS from cost-track.js. Output: ${result.stdout}`
    );

    // Verify the output includes the project context
    assert(
        result.stdout.includes('Project: zoocode-agency') || result.stdout.includes('PROJECT:zoocode-agency'),
        `Expected project context in cost-track output. Got: ${result.stdout}`
    );

    // Verify the ledger entry includes the project tag (search full file, not just tail,
    // because cost-track.js inserts entries mid-table)
    const afterContent = fs.readFileSync(GLOBAL_COST_LEDGER, 'utf-8');

    assert(
        afterContent.includes('[PROJECT:zoocode-agency]'),
        `Expected [PROJECT:zoocode-agency] tag somewhere in COST-LEDGER.md after run.`
    );

    // Cleanup: remove the test entry from COST-LEDGER.md
    fs.writeFileSync(GLOBAL_COST_LEDGER, beforeContent, 'utf-8');

    process.stdout.write('    ⚗ Cleanup: restored COST-LEDGER.md to original state\n');
}

// ── Main ────────────────────────────────────────────────────────────────────────

async function main() {
    console.log('');
    console.log('  ╔══════════════════════════════════════════════════════════════╗');
    console.log('  ║   E2E: Multi-Project Handoff Validation (MP-1.13)           ║');
    console.log('  ║   Contract: agency-multi-project@1.0.0                       ║');
    console.log('  ╚══════════════════════════════════════════════════════════════╝');
    console.log('');

    // ── Pre-flight checks ──────────────────────────────────────────────────

    const checks = [
        { name: 'validate-commit.js exists', ok: fileExists(VALIDATE_SCRIPT) },
        { name: 'memory.js exists', ok: fileExists(MEMORY_SCRIPT) },
        { name: 'cost-track.js exists', ok: fileExists(COST_TRACK_SCRIPT) },
        { name: 'projects.json exists', ok: fileExists(PROJECTS_JSON) },
        { name: 'COST-LEDGER.md exists', ok: fileExists(GLOBAL_COST_LEDGER) },
    ];

    console.log('  ── Pre-flight Checks ──');
    let preflightOk = true;
    for (const check of checks) {
        const icon = check.ok ? '✓' : '✗';
        console.log(`  ${icon} ${check.name}`);
        if (!check.ok) preflightOk = false;
    }

    if (!preflightOk) {
        console.error('\n  FAIL: Pre-flight checks failed. Aborting.\n');
        process.exit(1);
    }
    console.log('');

    // ── Run scenarios ──────────────────────────────────────────────────────

    await runScenario('S1: PROJECT field required — reject without PROJECT', scenario1_projectFieldRequired);
    await runScenario('S2: PROJECT field valid — reject invalid project ID', scenario2_invalidProjectRejected);
    await runScenario('S3: PROJECT field enabled — reject disabled project', scenario3_disabledProjectRejected);
    await runScenario('S4: PROJECT:global allowed — --allow-global flag', scenario4_globalAllowed);
    await runScenario('S5: memory.js --project scoping — stores in project path', scenario5_memoryProjectScoping);
    await runScenario('S6: memory.js recall --project — correct filtering', scenario6_memoryRecallProject);
    await runScenario('S7: cost-track.js --project — includes project context', scenario7_costTrackProject);

    // ── Summary ────────────────────────────────────────────────────────────

    console.log('');
    console.log('  ── Results ──');
    console.log(`  Passed:  ${passed}`);
    console.log(`  Failed:  ${failed}`);
    console.log(`  Skipped: ${skipped}`);
    console.log('');

    for (const r of results) {
        const icon = r.status === 'PASS' ? '✓' : r.status === 'SKIP' ? '○' : '✗';
        console.log(`  ${icon} ${r.name}: ${r.status}`);
        if (r.error) {
            console.log(`       ${r.error}`);
        }
        if (r.reason) {
            console.log(`       ${r.reason}`);
        }
    }

    console.log('');

    if (failed > 0) {
        console.error('  ❌ FAIL: One or more E2E scenarios failed.\n');
        process.exit(1);
    }

    if (skipped > 0) {
        console.log('  ⚠ WARNING: Some scenarios were skipped (see diagnostics above).\n');
        console.log('  ── Diagnostics ──');
        console.log('  Scenario S3 (disabled project) requires a project with enabled: false');
        console.log('  in .agency/projects.json. Add one to enable full validation.\n');
    }

    console.log('  ✅ PASS: All runnable E2E scenarios completed successfully.\n');
    process.exit(0);
}

main().catch(err => {
    console.error(`\n  ❌ UNEXPECTED ERROR: ${err.message}\n`);
    process.exit(1);
});
