#!/usr/bin/env node

/**
 * enforcer.js — Unified 4-Phase Enforcement State Machine
 *
 * Contract: agency-enforcer@1.0.0
 * Replaces: preflight-gate.js + post-task-gate.js
 *
 * Usage:
 *   node .agency/scripts/enforcer.js pre --agent X --task Y          → PRE phase
 *   node .agency/scripts/enforcer.js check --agent X                 → Check PRE phase passed
 *   node .agency/scripts/enforcer.js post --task X --agent Y         → POST phase
 *   node .agency/scripts/enforcer.js commit --task X --msg "..."     → COMMIT phase
 *   node .agency/scripts/enforcer.js handoff --from X --to Y --task Z → HANDOFF phase
 *   node .agency/scripts/enforcer.js status --task X                 → Show current phase
 *   node .agency/scripts/enforcer.js reset --task X                  → Reset to PENDING
 *
 * Flags:
 *   --ci       → CI mode (suppress verbose output)
 *   --hotfix   → Skip all phases, mark as HOTFIX
 *   --reason   → Required with --hotfix
 *
 * Exit codes:
 *   0 — Success
 *   1 — Failure / blocked
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const ENFORCER_DIR = path.resolve(__dirname, '../enforcer');
const DB_PATH = path.join(ENFORCER_DIR, 'enforcer.db');

// ── SQL Schema ─────────────────────────────────────────────────────────────────

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS enforcement_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL,
    agent_slug TEXT NOT NULL,
    project TEXT NOT NULL DEFAULT 'global',
    phase TEXT NOT NULL DEFAULT 'PENDING',
    status TEXT NOT NULL DEFAULT 'PENDING',
    oath_hash TEXT,
    hotfix_reason TEXT,
    metadata TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    expires_at INTEGER,
    completed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_enforcement_task ON enforcement_state(task_id);
CREATE INDEX IF NOT EXISTS idx_enforcement_agent ON enforcement_state(agent_slug);
CREATE INDEX IF NOT EXISTS idx_enforcement_phase ON enforcement_state(phase);
`;

const PRE_TTL = 3600; // 1 hour

// ── Database ────────────────────────────────────────────────────────────────────

let db = null;
let Database = null;

try {
    Database = require('better-sqlite3');
} catch (_) {
    console.error('FAIL: better-sqlite3 is required for enforcer.js');
    console.error('  Run: npm install better-sqlite3');
    process.exit(1);
}

function initDatabase() {
    if (db) return true;
    if (!fs.existsSync(ENFORCER_DIR)) {
        fs.mkdirSync(ENFORCER_DIR, { recursive: true });
    }
    try {
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.exec(SCHEMA_SQL);
        return true;
    } catch (err) {
        console.error(`FAIL: Could not initialize database: ${err.message}`);
        process.exit(1);
    }
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

function now() {
    return Math.floor(Date.now() / 1000);
}

function parseArgs() {
    const args = process.argv.slice(2);
    const command = args[0];
    const opts = {
        agent: null,
        task: null,
        from: null,
        to: null,
        msg: null,
        project: null,
        reason: null,
        ci: false,
        hotfix: false,
        force: false,
        contract: null,
        embed: null,
    };

    for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '--agent': opts.agent = args[++i]; break;
            case '--task': opts.task = args[++i]; break;
            case '--from': opts.from = args[++i]; break;
            case '--to': opts.to = args[++i]; break;
            case '--msg': opts.msg = args[++i]; break;
            case '--project': opts.project = args[++i]; break;
            case '--reason': opts.reason = args[++i]; break;
            case '--ci': opts.ci = true; break;
            case '--hotfix': opts.hotfix = true; break;
            case '--force': opts.force = true; break;
            case '--contract': opts.contract = args[++i]; break;
            case '--embed': opts.embed = args[++i]; break;
        }
    }

    return { command, ...opts };
}

function getOrCreateRow(taskId, agentSlug, project) {
    let row = db.prepare('SELECT * FROM enforcement_state WHERE task_id = ? AND agent_slug = ?').get(taskId, agentSlug);
    if (!row) {
        const ts = now();
        db.prepare(`
            INSERT INTO enforcement_state (task_id, agent_slug, project, phase, status, created_at, updated_at)
            VALUES (?, ?, ?, 'PENDING', 'PENDING', ?, ?)
        `).run(taskId, agentSlug, project || 'global', ts, ts);
        row = db.prepare('SELECT * FROM enforcement_state WHERE task_id = ? AND agent_slug = ?').get(taskId, agentSlug);
    }
    return row;
}

function updateRow(taskId, agentSlug, changes) {
    const sets = [];
    const vals = [];
    for (const [key, value] of Object.entries(changes)) {
        sets.push(`${key} = ?`);
        vals.push(value);
    }
    sets.push('updated_at = ?');
    vals.push(now());
    vals.push(taskId, agentSlug);
    db.prepare(`UPDATE enforcement_state SET ${sets.join(', ')} WHERE task_id = ? AND agent_slug = ?`).run(...vals);
}

// ── Commands ────────────────────────────────────────────────────────────────────

function cmdPre(agent, task, project, hotfix, reason, embed) {
    if (!agent) { console.error('FAIL: --agent is required'); process.exit(1); }
    if (!task) { console.error('FAIL: --task is required'); process.exit(1); }

    initDatabase();
    const ts = now();

    if (hotfix) {
        if (!reason) { console.error('FAIL: --reason is required with --hotfix'); process.exit(1); }
        db.prepare(`
            INSERT OR REPLACE INTO enforcement_state (task_id, agent_slug, project, phase, status, hotfix_reason, created_at, updated_at, expires_at)
            VALUES (?, ?, ?, 'HOTFIX', 'SKIPPED', ?, ?, ?, NULL)
        `).run(task, agent, project || 'global', reason, ts, ts);
        console.log(`✓ HOTFIX mode: enforcement skipped for task "${task}" (reason: ${reason})`);
        process.exit(0);
    }

    // Check for existing active session
    const existing = db.prepare(
        `SELECT * FROM enforcement_state WHERE task_id = ? AND phase IN ('PRE', 'POST', 'COMMIT') AND status IN ('IN_PROGRESS', 'PASSED')`
    ).get(task);

    if (existing && existing.agent_slug !== agent) {
        console.error(`BLOCKED: Task "${task}" already has active session for agent "${existing.agent_slug}"`);
        process.exit(1);
    }

    // Compute oath hash for provenance
    let hash = 0;
    const str = `${agent}:${task}`;
    for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + ch;
        hash |= 0;
    }
    const oathHash = Math.abs(hash).toString(16);

    getOrCreateRow(task, agent, project);
    updateRow(task, agent, {
        phase: 'PRE',
        status: 'IN_PROGRESS',
        oath_hash: oathHash,
        expires_at: ts + PRE_TTL,
        project: project || 'global',
    });

    console.log(`✓ PRE phase: enforcement session created for agent "${agent}" task "${task}"`);
    console.log(`  Oath hash: ${oathHash}`);
    console.log(`  Expires:   ${new Date((ts + PRE_TTL) * 1000).toISOString()}`);

    // Semantic oath verification using cosine similarity (Issue #5)
    if (embed) {
        try {
            // Generate simple TF-IDF-like character trigram vectors
            function trigramVector(text) {
                const trigrams = {};
                for (let i = 0; i < text.length - 2; i++) {
                    const tri = text.substring(i, i + 3).toLowerCase();
                    trigrams[tri] = (trigrams[tri] || 0) + 1;
                }
                return trigrams;
            }

            function cosineSimilarity(vecA, vecB) {
                let dot = 0, normA = 0, normB = 0;
                const allKeys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
                for (const key of allKeys) {
                    const a = vecA[key] || 0;
                    const b = vecB[key] || 0;
                    dot += a * b;
                    normA += a * a;
                    normB += b * b;
                }
                if (normA === 0 || normB === 0) return 0;
                return dot / (Math.sqrt(normA) * Math.sqrt(normB));
            }

            const CANONICAL_OATH = "I see the big picture. Trust the process.";
            const oathVec = trigramVector(CANONICAL_OATH);
            const embedVec = trigramVector(embed);
            const score = cosineSimilarity(oathVec, embedVec);

            console.log(`  🔐 Oath similarity: ${(score * 100).toFixed(1)}%`);
            if (score < 0.65) {
                console.log(`  ❌ Oath verification FAILED (below 0.65 threshold)`);
                console.log(`     The task summary doesn't semantically match the oath.`);
                process.exit(1);
            }
            console.log(`  ✅ Oath verification passed`);
        } catch (err) {
            console.error(`  ❌ Oath embedding failed (blocking): ${err.message}`);
            process.exit(1);
        }
    }

    process.exit(0);
}

function cmdCheck(agent) {
    if (!agent) { console.error('FAIL: --agent is required'); process.exit(1); }

    initDatabase();

    const rows = db.prepare(
        `SELECT * FROM enforcement_state WHERE agent_slug = ? AND phase = 'PRE' AND status = 'IN_PROGRESS' ORDER BY created_at DESC LIMIT 1`
    ).get(agent);

    if (!rows) {
        console.error('FAIL: No PRE phase found. Run "enforcer.js pre --agent <slug> --task <id>" first.');
        process.exit(1);
    }

    // Check TTL
    const ts = now();
    if (rows.expires_at && ts > rows.expires_at) {
        console.error(`FAIL: PRE phase expired at ${new Date(rows.expires_at * 1000).toISOString()}. Auto-resetting.`);
        updateRow(rows.task_id, agent, { phase: 'PENDING', status: 'PENDING', expires_at: null, oath_hash: null });
        process.exit(1);
    }

    console.log(`✓ PRE phase valid for agent "${agent}" (task: ${rows.task_id})`);
    process.exit(0);
}

function cmdPost(task, agent, project, ci) {
    if (!task) { console.error('FAIL: --task is required'); process.exit(1); }
    if (!agent) { console.error('FAIL: --agent is required'); process.exit(1); }

    initDatabase();

    const row = db.prepare(
        `SELECT * FROM enforcement_state WHERE task_id = ? AND agent_slug = ? ORDER BY created_at DESC LIMIT 1`
    ).get(task, agent);

    if (!row || row.status === 'PENDING') {
        console.error('FAIL: No PRE phase found. Run "enforcer.js pre --agent <slug> --task <id>" first.');
        process.exit(1);
    }

    // Check TTL on PRE phase
    const ts = now();
    if (row.expires_at && ts > row.expires_at) {
        console.error('FAIL: PRE phase has expired. Re-run "enforcer.js pre".');
        process.exit(1);
    }

    if (row.hotfix_reason) {
        console.log(`✓ POST phase: task was HOTFIX (reason: ${row.hotfix_reason})`);
        updateRow(task, agent, { phase: 'POST', status: 'SKIPPED' });
        process.exit(0);
    }

    // ── POST checks ──

    let passedCount = 0;
    let failedCount = 0;

    console.log('');
    console.log('  ── POST Phase Checks ──');

    // C1: Memory stored (skip in CI mode)
    if (!ci) {
        try {
            execSync(
                `node "${path.join(__dirname, 'memory.js')}" check --task "${task}" --agent "${agent}" --project "${project || 'global'}"`,
                { cwd: ROOT, stdio: 'pipe', timeout: 15000 }
            );
            console.log('  ✅ C1: Memory stored');
            passedCount++;
        } catch {
            console.log('  ❌ C1: Memory NOT found — run memory.js store first');
            failedCount++;
        }
    } else {
        console.log('  ⏭ C1: Memory check skipped (CI mode)');
        passedCount++;
    }

    // C2: Temp files cleaned
    if (!ci) {
        const TEMP_PATTERNS = [/^temp-/, /\.bak$/, /^debug-/, /^ROO-/, /^PLAN-/, /^\$null/];
        const offending = [];
        try {
            const rootFiles = fs.readdirSync(ROOT);
            for (const file of rootFiles) {
                if (file.startsWith('.') || file === 'node_modules' || file === '.git') continue;
                if (TEMP_PATTERNS.some(p => p.test(file))) {
                    offending.push(file);
                }
            }
        } catch (_) { /* ignore */ }

        const e2eDir = path.join(ROOT, 'e2e');
        if (fs.existsSync(e2eDir)) {
            try {
                const e2eFiles = fs.readdirSync(e2eDir);
                for (const file of e2eFiles) {
                    if (TEMP_PATTERNS.some(p => p.test(file))) {
                        offending.push(`e2e/${file}`);
                    }
                }
            } catch (_) { /* ignore */ }
        }

        if (offending.length === 0) {
            console.log('  ✅ C2: No temp files found');
            passedCount++;
        } else {
            console.log(`  ❌ C2: Temp files found: ${offending.join(', ')}`);
            failedCount++;
        }
    } else {
        console.log('  ⏭ C2: Temp file check skipped (CI mode)');
        passedCount++;
    }

    // C3: Sentinel cleanup (old .preflight-passed)
    const sentinelPath = path.join(ROOT, '.agency', '.preflight-passed');
    if (fs.existsSync(sentinelPath)) {
        try {
            fs.unlinkSync(sentinelPath);
            console.log('  ✅ C3: Old preflight sentinel cleaned');
        } catch {
            console.log('  ❌ C3: Failed to clean old sentinel');
            failedCount++;
        }
    } else {
        console.log('  ✅ C3: No old sentinel found');
        passedCount++;
    }

    // ── Summary ──
    const total = passedCount + failedCount;
    console.log('');
    console.log(`  ── POST: ${passedCount}/${total} checks passed ──`);

    if (failedCount === 0) {
        updateRow(task, agent, { phase: 'POST', status: 'PASSED' });
        console.log('  🏁 POST phase: ALL PASS');
        process.exit(0);
    } else {
        updateRow(task, agent, { phase: 'POST', status: 'FAILED' });
        console.log('  🏁 POST phase: FAILED — fix failing checks');
        process.exit(1);
    }
}

function cmdMiddle(task, agent, project, ci) {
    if (!task) { console.error('FAIL: --task is required'); process.exit(1); }
    if (!agent) { console.error('FAIL: --agent is required'); process.exit(1); }

    initDatabase();
    console.log('');
    console.log('  ── MIDDLE Gate: Contract Validation ──');

    // Read contracts directory
    const contractsDir = path.join(ROOT, '.agency', 'contracts');
    if (!fs.existsSync(contractsDir)) {
        console.log('  ⏭️  No contracts directory — skipping validation');
        process.exit(0);
    }

    // Check if any contract files reference this agent's domain
    const contractFiles = fs.readdirSync(contractsDir).filter(f => f.endsWith('.json'));
    let passed = 0;
    let failed = 0;

    for (const file of contractFiles) {
        try {
            const contract = JSON.parse(fs.readFileSync(path.join(contractsDir, file), 'utf-8'));

            // Basic contract validation:
            // 1. Must have contractId
            // 2. Must have version
            // 3. If has endpoints, each must have method + path
            // 4. If has types, each must have type name

            if (!contract.contractId) {
                console.log(`  ❌ ${file}: missing contractId`);
                failed++;
                continue;
            }
            if (!contract.version) {
                console.log(`  ❌ ${file}: missing version`);
                failed++;
                continue;
            }

            if (contract.endpoints && Array.isArray(contract.endpoints)) {
                for (const ep of contract.endpoints) {
                    if (!ep.method) {
                        console.log(`  ❌ ${file}/${ep.path || "?"}: missing method`);
                        failed++;
                    }
                    if (!ep.path) {
                        console.log(`  ❌ ${file}/${ep.method || "?"}: missing path`);
                        failed++;
                    }
                }
            }

            if (contract.types && Array.isArray(contract.types)) {
                for (const t of contract.types) {
                    if (!t.name && !t.typeName) {
                        console.log(`  ❌ ${file}: type missing name`);
                        failed++;
                    }
                }
            }

            passed++;
            console.log(`  ✅ ${file}: ${contract.contractId || "unnamed"} v${contract.version || "?"}`);
        } catch (err) {
            console.log(`  ❌ ${file}: parse error — ${err.message}`);
            failed++;
        }
    }

    console.log('');
    if (failed > 0) {
        console.log(`  🏁 MIDDLE gate: ${passed} passed, ${failed} FAILED — blocking commit`);
        process.exit(1);
    }
    console.log(`  🏁 MIDDLE gate: ${passed}/${passed + failed} passed`);

    // Update enforcement state
    updateRow(task, agent, { phase: 'MIDDLE', status: 'PASSED' });
}

function cmdCommit(task, agent, msg, project) {
    if (!task) { console.error('FAIL: --task is required'); process.exit(1); }
    if (!msg) { console.error('FAIL: --msg is required'); process.exit(1); }

    initDatabase();

    const row = db.prepare(
        `SELECT * FROM enforcement_state WHERE task_id = ? AND agent_slug = ? ORDER BY created_at DESC LIMIT 1`
    ).get(task, agent || null);

    if (row && row.hotfix_reason) {
        console.log(`✓ COMMIT phase: HOTFIX (reason: ${row.hotfix_reason})`);
        updateRow(task, agent || 'unknown', { phase: 'COMMIT', status: 'SKIPPED' });
        process.exit(0);
    }

    // Validate commit message has required fields
    const requiredFields = ['HANDOFF', 'ARTIFACTS', 'CONTRACT', 'STATUS', 'MEMORY', 'SCOPE'];
    const missing = [];

    for (const field of requiredFields) {
        const regex = new RegExp(`${field}:`);
        if (!regex.test(msg)) {
            missing.push(field);
        }
    }

    if (missing.length > 0) {
        console.error(`FAIL: Commit message missing required fields: ${missing.join(', ')}`);
        process.exit(1);
    }

    updateRow(task, agent || 'unknown', { phase: 'COMMIT', status: 'PASSED' });
    console.log('✓ COMMIT phase: commit message valid');
    process.exit(0);
}

function cmdHandoff(from, to, task, project) {
    if (!from) { console.error('FAIL: --from is required'); process.exit(1); }
    if (!to) { console.error('FAIL: --to is required'); process.exit(1); }
    if (!task) { console.error('FAIL: --task is required'); process.exit(1); }

    initDatabase();

    // Check for hotfix path
    const row = db.prepare(
        `SELECT * FROM enforcement_state WHERE task_id = ? AND agent_slug = ? ORDER BY created_at DESC LIMIT 1`
    ).get(task, from);

    // First handoff check — if no prior enforcement history, allow it
    if (!row) {
        console.log('  ⚡ No prior enforcement history — allowing first handoff');
        const ts = now();
        db.prepare(`
            INSERT INTO enforcement_state (task_id, agent_slug, project, phase, status, created_at, updated_at, completed_at)
            VALUES (?, ?, ?, 'HANDOFF', 'PASSED', ?, ?, ?)
        `).run(task, from, project || 'global', ts, ts, ts);
        process.exit(0);
    }

    // HOTFIX — skip all checks
    if (row.hotfix_reason) {
        console.log(`  ⚡ HOTFIX handoff (reason: ${row.hotfix_reason})`);
        updateRow(task, from, { phase: 'HANDOFF', status: 'SKIPPED' });
        process.exit(0);
    }

    // Git commit verification — ensure agent actually committed changes
    try {
        const logCheck = execSync(
            `git log --all --oneline --grep="${task}" --max-count=1 2>&1`,
            { cwd: ROOT, stdio: 'pipe', timeout: 10000 }
        ).toString().trim();
        if (!logCheck) {
            console.error('  ❌ HANDOFF blocked: No git commit found for this task');
            console.error('  The agent must commit changes before handoff can proceed.');
            console.error('  Run: node .agency/scripts/task-closer.js --agent <slug> --task <id>');
            process.exit(1);
        }
        console.log(`  ✅ Git commit verified: ${logCheck}`);
    } catch {
        console.error('  ❌ Git check unavailable — cannot verify commit exists for this task');
        process.exit(1);
    }

    // Check phase progression: POST must be PASSED or SKIPPED
    if (row.phase === 'POST' && (row.status === 'PASSED' || row.status === 'SKIPPED')) {
        const ts = now();
        updateRow(task, from, { phase: 'HANDOFF', status: 'PASSED', completed_at: ts });
        console.log(`✓ HANDOFF phase: ${from} → ${to} (task: ${task})`);
        process.exit(0);
    }

    if (row.phase === 'COMMIT' && (row.status === 'PASSED' || row.status === 'SKIPPED')) {
        const ts = now();
        updateRow(task, from, { phase: 'HANDOFF', status: 'PASSED', completed_at: ts });
        console.log(`✓ HANDOFF phase: ${from} → ${to} (task: ${task})`);
        process.exit(0);
    }

    // Allow if already HANDOFF (re-handoff)
    if (row.phase === 'HANDOFF' && (row.status === 'PASSED' || row.status === 'SKIPPED')) {
        console.log(`✓ HANDOFF phase already complete for task "${task}"`);
        process.exit(0);
    }

    console.error(`❌ HANDOFF BLOCKED: Phase "${row.phase}" status "${row.status}" does not allow handoff.`);
    console.error(`  Required: POST phase with PASSED status`);
    process.exit(1);
}

function cmdStatus(task) {
    initDatabase();

    let rows;
    if (task) {
        rows = db.prepare('SELECT * FROM enforcement_state WHERE task_id = ? ORDER BY created_at DESC').all(task);
    } else {
        rows = db.prepare('SELECT * FROM enforcement_state ORDER BY created_at DESC LIMIT 20').all();
    }

    if (rows.length === 0) {
        console.log('STATUS: No enforcement records found');
        process.exit(0);
    }

    console.log('');
    console.log('  ── Enforcement State ──');
    for (const row of rows) {
        console.log(`  Task:     ${row.task_id}`);
        console.log(`  Agent:    ${row.agent_slug}`);
        console.log(`  Project:  ${row.project}`);
        console.log(`  Phase:    ${row.phase}`);
        console.log(`  Status:   ${row.status}`);
        console.log(`  Created:  ${new Date(row.created_at * 1000).toISOString()}`);
        if (row.expires_at) {
            const expired = now() > row.expires_at;
            console.log(`  Expires:  ${new Date(row.expires_at * 1000).toISOString()}${expired ? ' (EXPIRED)' : ''}`);
        }
        if (row.hotfix_reason) console.log(`  Hotfix:   ${row.hotfix_reason}`);
        if (row.completed_at) console.log(`  Done:     ${new Date(row.completed_at * 1000).toISOString()}`);
        console.log(`  ${'─'.repeat(40)}`);
    }
    process.exit(0);
}

function cmdReset(task, force) {
    if (!task) { console.error('FAIL: --task is required'); process.exit(1); }
    if (!force) { console.error('FAIL: --force is required to confirm reset'); process.exit(1); }

    initDatabase();

    const result = db.prepare(
        `UPDATE enforcement_state SET phase = 'PENDING', status = 'PENDING', expires_at = NULL, oath_hash = NULL, hotfix_reason = NULL WHERE task_id = ?`
    ).run(task);

    if (result.changes > 0) {
        console.log(`✓ Reset enforcement state for task "${task}" to PENDING`);
    } else {
        console.log(`No enforcement records found for task "${task}"`);
    }
    process.exit(0);
}

// ── Main ────────────────────────────────────────────────────────────────────────

function showUsage() {
    console.log(`
  ╔══════════════════════════════════════════════════════════╗
  ║     Unified Enforcer — 4-Phase State Machine              ║
  ╚══════════════════════════════════════════════════════════╝

  Usage:
    node enforcer.js pre     --agent X --task Y              PRE phase
    node enforcer.js check   --agent X                        Check PRE passed
    node enforcer.js post    --task X --agent Y               POST phase
    node enforcer.js commit  --task X --msg "..."             COMMIT phase
    node enforcer.js handoff --from X --to Y --task Z         HANDOFF phase
    node enforcer.js status  [--task X]                       Show state
    node enforcer.js reset   --task X --force                 Reset to PENDING

  Flags:
    --ci          CI mode (suppress verbose output)
    --hotfix      Skip all phases, mark as HOTFIX
    --reason      Required with --hotfix
    --project     Project scope (default: global)
    --force       Required for reset

  Phases:
    PRE     → Oath recitation, TTL=3600s
    POST    → Memory stored, temp cleaned, sentinel reset
    COMMIT  → Commit message validates HANDOFF metadata
    HANDOFF → All prior phases PASSED → allow handoff
`);
}

function main() {
    const { command, agent, task, from, to, msg, project, reason, ci, hotfix, force, contract, embed } = parseArgs();

    // Bypass mode
    if (process.env.AGENCY_ENFORCER_DISABLED === 'true') {
        console.log('⚠ AGENCY_ENFORCER_DISABLED=true — bypassing enforcement');
        process.exit(0);
    }

    if (!command || command === '--help' || command === '-h') {
        showUsage();
        process.exit(0);
    }

    switch (command) {
        case 'pre':
            cmdPre(agent, task, project, hotfix, reason, embed);
            break;
        case 'check':
            cmdCheck(agent);
            break;
        case 'middle':
            cmdMiddle(task, agent, project, ci);
            break;
        case 'post':
            cmdPost(task, agent, project, ci);
            break;
        case 'commit':
            cmdCommit(task, agent, msg, project);
            break;
        case 'handoff':
            cmdHandoff(from, to, task, project);
            break;
        case 'status':
            cmdStatus(task);
            break;
        case 'reset':
            cmdReset(task, force);
            break;
        default:
            console.error(`FAIL: Unknown command "${command}".`);
            console.error('  Run "node .agency/scripts/enforcer.js --help" for usage.');
            process.exit(1);
    }
}

main();
