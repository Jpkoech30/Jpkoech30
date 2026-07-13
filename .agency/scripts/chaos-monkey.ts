#!/usr/bin/env node


/**
 * chaos-monkey.js — Chaos Monkey Test Suite
 *
 * Deliberately attempts to break the P0 guards (pre-commit hooks, cost-track,
 * handoff CWD guard, gate escalation). Exits with NON-ZERO code if ANY guard
 * fails (i.e., if a P0 guard does not block/alert as expected).
 *
 * Usage:
 *   node .agency/scripts/chaos-monkey.js
 *   node .agency/scripts/chaos-monkey.js --test <name>
 *   node .agency/scripts/chaos-monkey.js --help
 *
 * Exit codes:
 *   0 — All tests passed (every guard behaved as expected)
 *   1 — One or more tests failed
 *
 * Tests:
 *   1. Pre-commit rejects commit without HANDOFF
 *   2. cost-track requires --raw-usage for audited mode
 *   3. handoff.js blocks on CWD mismatch
 *   4. Gate escalation script detects >3 failures
 */

// ---------------------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, '../..');
const JENGABOOKS = path.join(ROOT, 'jengabooks');
const ACTIVE_PROJECT_PATH = path.join(ROOT, '.agency', '.active-project');
const PROJECTS_JSON_PATH = path.join(ROOT, '.agency', 'projects.json');
const ORCHESTRATION_PATH = path.join(ROOT, 'ORCHESTRATION.md');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Run a command and return the combined stdout+stderr.
 * Throws on non-zero exit.
 */
function run(cmd, opts = {}) {
    return execSync(cmd, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: opts.cwd || ROOT,
        timeout: 30_000,
        ...opts,
    });
}

/**
 * Run a command expecting failure. Returns { stdout, stderr, status } on
 * non-zero exit. Throws if the command exits 0.
 */
function expectFail(cmd, opts = {}) {
    try {
        run(cmd, opts);
        throw new Error(`Expected command to fail, but it succeeded:\n  ${cmd}`);
    } catch (err) {
        // execSync throws on non-zero; extract what we need
        const status = err.status !== undefined ? err.status : 1;
        const stderr = (err.stderr || '').toString();
        const stdout = (err.stdout || '').toString();
        return { stdout, stderr, status, message: stderr || stdout || err.message };
    }
}

// ---------------------------------------------------------------------------
// Test Runner
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function assert(condition, msg) {
    if (!condition) throw new Error(msg);
}

function test(name, fn) {
    try {
        fn();
        console.log(`[TEST] ${name} ... PASS`);
        passed++;
    } catch (err) {
        console.log(`[TEST] ${name} ... FAIL`);
        console.error(`       ${err.message}`);
        failed++;
    }
}

function printSummary() {
    console.log('---');
    if (failed === 0) {
        console.log('✅ ALL CHAOS MONKEY TESTS PASSED.');
        process.exit(0);
    } else {
        console.log(`❌ ${failed} CHAOS MONKEY TEST(S) FAILED.`);
        process.exit(1);
    }
}

// ============================================================================
// Main — CLI entry point
// ============================================================================

/**
 * Main entry point. Parses CLI args and runs tests.
 * Usage: node .agency/scripts/chaos-monkey.js [--test <name>]
 *        node .agency/scripts/chaos-monkey.js --help
 */
function main() {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Chaos Monkey Test Suite — deliberately attempts to break P0 guards.

Usage:
  node .agency/scripts/chaos-monkey.js                Run all tests
  node .agency/scripts/chaos-monkey.js --test <name>  Run a specific test
  node .agency/scripts/chaos-monkey.js --help          Show this help

Tests:
  1. Pre-commit rejects commit without HANDOFF
  2. cost-track requires --raw-usage for audited mode
  3. handoff.js blocks on CWD mismatch
  4. Gate escalation script detects >3 failures
`);
        process.exit(0);
    }

    const testIndex = args.indexOf('--test');
    let testName = null;
    if (testIndex !== -1 && testIndex + 1 < args.length) {
        testName = args[testIndex + 1];
    }

    // ============================================================================
    // TEST 1: Pre-commit rejects commit without HANDOFF
    // ============================================================================

    function runTest1() {
        test('Pre-commit rejects commit without HANDOFF', () => {
            const TEMP_FILE = '.chaos-test-temp.txt';
            const TEMP_FILE_ABS = path.join(JENGABOOKS, TEMP_FILE);
            const COMMIT_MSG = 'test(chaos): intentional commit without handoff metadata';

            try {
                // Create a temp file inside the jengabooks working tree
                fs.writeFileSync(TEMP_FILE_ABS, 'chaos-monkey-test-' + Date.now(), 'utf-8');

                // Stage it
                run(`git add "${TEMP_FILE}"`, { cwd: JENGABOOKS });

                // Attempt a commit — the commit-msg hook runs validate-commit.js which
                // requires HANDOFF and STATUS metadata in the body. Since we provide
                // none, it MUST exit 1 with an error mentioning HANDOFF.
                const result = expectFail(`git commit -m "${COMMIT_MSG}"`, {
                    cwd: JENGABOOKS,
                });

                // Verify exit code 1
                assert(
                    result.status === 1,
                    `Expected exit code 1, got ${result.status}. Output: ${result.message}`
                );

                // Verify error message mentions HANDOFF
                const output = (result.stderr + result.stdout).toLowerCase();
                assert(
                    output.includes('handoff') || result.message.toLowerCase().includes('handoff'),
                    `Expected error mentioning HANDOFF, got: ${result.message.slice(0, 500)}`
                );
            } finally {
                // Clean up: unstage and delete temp file
                try {
                    run(`git reset HEAD -- "${TEMP_FILE}"`, { cwd: JENGABOOKS });
                } catch (_) { /* ignore */ }
                try {
                    fs.unlinkSync(TEMP_FILE_ABS);
                } catch (_) { /* ignore */ }
            }
        });
    }

    // ============================================================================
    // TEST 2: cost-track.js requires --raw-usage for audited mode
    // ============================================================================

    function runTest2() {
        test('cost-track requires --raw-usage', () => {
            // Run cost-track.js without --raw-usage (and without --tokens) so that
            // the error message tells the user they need --raw-usage.
            const result = expectFail(
                'node .agency/scripts/cost-track.js --task TEST --agent chaos'
            );

            assert(
                result.status === 1,
                `Expected exit code 1, got ${result.status}. Output: ${result.message}`
            );

            // The error must mention --raw-usage
            const output = (result.stderr + result.stdout).toLowerCase();
            assert(
                output.includes('--raw-usage') || result.message.toLowerCase().includes('--raw-usage'),
                `Expected error mentioning --raw-usage, got: ${result.message.slice(0, 500)}`
            );
        });
    }

    // ============================================================================
    // TEST 3: handoff.js blocks on CWD mismatch
    // ============================================================================

    function runTest3() {
        test('handoff blocks on CWD mismatch', () => {
            const HANDOFF_SCRIPT = path.join(ROOT, '.agency/scripts/handoff.js');

            // Save original files
            const origActiveProject = fs.readFileSync(ACTIVE_PROJECT_PATH, 'utf-8');
            const origProjectsJson = fs.readFileSync(PROJECTS_JSON_PATH, 'utf-8');

            try {
                // Write a fake project name to .active-project
                fs.writeFileSync(ACTIVE_PROJECT_PATH, 'fake-project', 'utf-8');

                // Add "fake-project" to projects.json with a non-matching path so
                // the CWD guard triggers (project path != CWD after normalization).
                const projects = JSON.parse(origProjectsJson);
                projects.projects.push({
                    name: 'fake-project',
                    path: 'nonexistent',
                    description: 'Chaos monkey test project',
                    registered: new Date().toISOString().split('T')[0],
                });
                fs.writeFileSync(PROJECTS_JSON_PATH, JSON.stringify(projects, null, 4), 'utf-8');

                // Run handoff.js from the jengabooks CWD — which does NOT match the
                // fake-project's path ("nonexistent") and is NOT the agency root.
                // Use absolute path to handoff.js since CWD is different from ROOT.
                const result = expectFail(
                    `node "${HANDOFF_SCRIPT}" --from chaos --to chaos --task TEST`,
                    { cwd: JENGABOOKS }
                );

                // Verify exit code 1
                assert(
                    result.status === 1,
                    `Expected exit code 1, got ${result.status}. Output: ${result.message}`
                );

                // Verify error message mentions CWD
                const output = (result.stderr + result.stdout).toLowerCase();
                assert(
                    output.includes('cwd') || result.message.toLowerCase().includes('cwd'),
                    `Expected error mentioning CWD, got: ${result.message.slice(0, 500)}`
                );
            } finally {
                // Restore original files
                try {
                    fs.writeFileSync(ACTIVE_PROJECT_PATH, origActiveProject, 'utf-8');
                } catch (_) { /* ignore */ }
                try {
                    fs.writeFileSync(PROJECTS_JSON_PATH, origProjectsJson, 'utf-8');
                } catch (_) { /* ignore */ }
            }
        });
    }

    // ============================================================================
    // TEST 4: Gate escalation script detects >3 failures
    // ============================================================================

    function runTest4() {
        test('Gate escalation detects >3 failures', () => {
            // Save original ORCHESTRATION.md
            const origOrchestration = fs.readFileSync(ORCHESTRATION_PATH, 'utf-8');

            try {
                // Insert a fake table row with fail_count=4 INTO the last table in the
                // file (before the trailing blank line). The row must be within a
                // markdown table (after |--- separator and before blank line) for
                // escalate-lead.js's parser to pick it up.
                const fakeRow =
                    '| **chaos-test-4** | Chaos monkey test | FAIL | 4 | NO | — |\r\n';

                // Insert before the trailing newline (which is the last line)
                const lines = origOrchestration.split(/\r?\n/);
                // Insert at second-to-last position (before the trailing blank)
                lines.splice(lines.length - 1, 0, fakeRow.trimEnd());
                const modified = lines.join('\r\n') + '\r\n';

                fs.writeFileSync(ORCHESTRATION_PATH, modified, 'utf-8');

                // Run escalate-lead.js with --all flag
                // Note: escalate-lead.js exits code 1 when it finds failures (by design)
                const result = expectFail(
                    'node .agency/scripts/escalate-lead.js --all'
                );

                // Verify exit code 1
                assert(
                    result.status === 1,
                    `Expected exit code 1, got ${result.status}. Output: ${result.message}`
                );

                // Verify output mentions the fake task and "Escalation Required"
                const output = result.message.toLowerCase();
                assert(
                    output.includes('chaos-test-4'),
                    `Expected output to mention "chaos-test-4", got: ${result.message.slice(0, 500)}`
                );
                assert(
                    output.includes('escalation required') ||
                    output.includes('🚨'),
                    `Expected output to mention "Escalation Required", got: ${result.message.slice(0, 500)}`
                );
            } finally {
                // Restore original ORCHESTRATION.md
                try {
                    fs.writeFileSync(ORCHESTRATION_PATH, origOrchestration, 'utf-8');
                } catch (_) { /* ignore */ }
            }
        });
    }

    // Dispatch
    const testRunners = {
        'pre-commit': runTest1,
        'cost-track': runTest2,
        'handoff-cwd': runTest3,
        'gate-escalation': runTest4,
    };

    if (testName) {
        const runner = testRunners[testName];
        if (!runner) {
            console.error(`Unknown test: "${testName}". Use --help to list available tests.`);
            process.exit(1);
        }
        runner();
        printSummary();
        return;
    }

    // Run all tests
    runTest1();
    runTest2();
    runTest3();
    runTest4();
    printSummary();
}

main();
