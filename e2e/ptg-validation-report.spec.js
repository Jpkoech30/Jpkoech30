/**
 * PTG Validation Report — Sprint 14.3
 * =====================================
 * Validates PTG-G1 through PTG-G6 post-task gates.
 * Contract: agency-post-task-gate@1.0.0
 * Date: 2026-07-11
 * Agent: qa-automator
 *
 * Results: 5/6 PASS, 1 BLOCKED (source bug in handoff.js)
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const PTG_SCRIPT = path.join(ROOT, '.agency/scripts/post-task-gate.js');
const MEMORY_SCRIPT = path.join(ROOT, '.agency/scripts/memory.js');
const HANDOFF_SCRIPT = path.join(ROOT, '.agency/scripts/handoff.js');
const SENTINEL_PATH = path.join(ROOT, '.agency', '.preflight-passed');

function run(cmd, opts = {}) {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf-8', ...opts });
}

function runSafe(cmd) {
    try {
        return { ok: true, stdout: run(cmd) };
    } catch (e) {
        return { ok: false, stdout: e.stdout || '', stderr: e.stderr || '' };
    }
}

// ── PTG-G1: Memory Check ──────────────────────────────────────────────────────

test('PTG-G1: Memory check passes all 4 checkpoints', () => {
    // Store memory
    const storeResult = runSafe(
        `node "${MEMORY_SCRIPT}" store --content "PTG test" --tags "test,ptg" --task "ptg-g1-test" --agent "qa-test"`
    );
    expect(storeResult.ok).toBe(true);
    expect(storeResult.stdout).toContain('PASS: Memory stored');

    // Run PTG complete
    const ptgResult = runSafe(
        `node "${PTG_SCRIPT}" complete --task ptg-g1-test --agent qa-test --handoff "HANDOFF:X" --artifacts "test" --contract "test@1" --status DONE --memory stored`
    );
    expect(ptgResult.ok).toBe(true);
    expect(ptgResult.stdout).toContain('PTG-C1: Memory stored');
    expect(ptgResult.stdout).toContain('PTG-C2: No temp files found');
    expect(ptgResult.stdout).toContain('PTG-C3: All handoff fields valid');
    expect(ptgResult.stdout).toContain('PTG-C4: Sentinel cleared');
    expect(ptgResult.stdout).toContain('Summary: 4/4 checkpoints passed');
    expect(ptgResult.stdout).toContain('POST-TASK GATE: ALL PASS');
});

// ── PTG-G2: Cleanup Check ─────────────────────────────────────────────────────

test('PTG-G2a: Clean directory passes PTG-C2', () => {
    const result = runSafe(
        `node "${PTG_SCRIPT}" complete --task ptg-g2a --agent qa-test --handoff "HANDOFF:X" --artifacts "test" --contract "test@1" --status DONE --memory stored`
    );
    expect(result.stdout).toContain('PTG-C2: No temp files found');
});

test('PTG-G2b: Directory with temp-test.txt fails PTG-C2', () => {
    // Create temp file
    fs.writeFileSync(path.join(ROOT, 'temp-test.txt'), 'temp');

    const result = runSafe(
        `node "${PTG_SCRIPT}" complete --task ptg-g2b --agent qa-test --handoff "HANDOFF:X" --artifacts "test" --contract "test@1" --status DONE --memory stored`
    );
    expect(result.ok).toBe(false);
    expect(result.stdout).toContain('PTG-C2: Temp files found');

    // Clean up
    try { fs.unlinkSync(path.join(ROOT, 'temp-test.txt')); } catch (e) { /* ignore */ }
});

// ── PTG-G3: Handoff Metadata ──────────────────────────────────────────────────

test('PTG-G3a: Valid handoff metadata passes PTG-C3', () => {
    const result = runSafe(
        `node "${PTG_SCRIPT}" complete --task ptg-g3a --agent qa-test --handoff "HANDOFF:next" --artifacts "file.js" --contract "c@1" --status DONE --memory stored`
    );
    expect(result.stdout).toContain('PTG-C3: All handoff fields valid');
});

test('PTG-G3b: Missing MEMORY field fails PTG-C3', () => {
    const result = runSafe(
        `node "${PTG_SCRIPT}" complete --task ptg-g3b --agent qa-test --handoff "HANDOFF:next" --artifacts "file.js" --contract "c@1" --status DONE`
    );
    expect(result.ok).toBe(false);
    expect(result.stdout).toContain('PTG-C3: Missing fields: MEMORY');
});

// ── PTG-G4: Sentinel Reset ────────────────────────────────────────────────────

test('PTG-G4: PTG auto-resets PFG sentinel', () => {
    // Pass preflight first
    const preflightResult = runSafe(
        `node "${ROOT}/.agency/scripts/preflight-gate.js" pass --agent sentinel-test --task "ptg-g4"`
    );
    expect(preflightResult.ok).toBe(true);
    expect(fs.existsSync(SENTINEL_PATH)).toBe(true);

    // Run PTG — should auto-reset
    const ptgResult = runSafe(
        `node "${PTG_SCRIPT}" complete --task ptg-g4 --agent sentinel-test --handoff "HANDOFF:X" --artifacts "t" --contract "t@1" --status DONE --memory stored`
    );
    expect(ptgResult.stdout).toContain('PTG-C4: Sentinel cleared');

    // Verify sentinel is gone
    expect(fs.existsSync(SENTINEL_PATH)).toBe(false);
});

// ── PTG-G5: End-to-End Workflow ───────────────────────────────────────────────

test('PTG-G5: Full E2E workflow — all 4/4 pass', () => {
    // Store memory
    const storeResult = runSafe(
        `node "${MEMORY_SCRIPT}" store --content "E2E test" --tags "e2e,ptg" --task "ptg-e2e" --agent "qa-e2e"`
    );
    expect(storeResult.ok).toBe(true);

    // Run full PTG
    const ptgResult = runSafe(
        `node "${PTG_SCRIPT}" complete --task ptg-e2e --agent qa-e2e --handoff "HANDOFF:next" --artifacts "test.js" --contract "c@1" --status DONE --memory stored`
    );
    expect(ptgResult.ok).toBe(true);
    expect(ptgResult.stdout).toContain('PTG-C1: Memory stored');
    expect(ptgResult.stdout).toContain('PTG-C2: No temp files found');
    expect(ptgResult.stdout).toContain('PTG-C3: All handoff fields valid');
    expect(ptgResult.stdout).toContain('PTG-C4: Sentinel already clear');
    expect(ptgResult.stdout).toContain('Summary: 4/4 checkpoints passed');
});

// ── PTG-G6: handoff.js Blocks on Failure ──────────────────────────────────────
// NOTE: This test is DISABLED due to 2 blocking bugs in handoff.js.
// See: .agency/scripts/handoff.js lines 70 and 77
//
// Bug 1 (line 70): p.name === activeProject — name/id mismatch
//   .active-project has "jengabooks" (id), projects.json has name "JengaBooks"
// Bug 2 (line 77): project.path is undefined (should be project.rootPath)
//
// Until these bugs are fixed, handoff.js crashes with TypeError before
// reaching the PTG check. Re-enable once fixed.

test.skip('PTG-G6: handoff.js blocks on failed PTG', () => {
    // This test requires handoff.js to be fixed first
    // Steps once fixed:
    // 1. Run: node handoff.js --from lead-architect --to test-agent --task "ptg-g6"
    // 2. Verify: "❌ HANDOFF BLOCKED: Post-Task Gate failed"
    // 3. Verify exit code 1
});
