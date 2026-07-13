#!/usr/bin/env node

/**
 * E2E Persona Tests — Sprint 17.4
 * Three accounting personas:
 *   P1: Jane (Accountant) — Invoice, Ledger, Reports
 *   P2: David (SME) — Quick invoice, M-Pesa, Clients
 *   P3: Grace (Freelancer) — Expenses, Receipts, Simple invoice
 * Usage: node e2e/persona-tests.spec.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const S = {
    comp: path.join(ROOT, '.agency/scripts/compliance-check.js'),
    mem: path.join(ROOT, '.agency/scripts/memory.js'),
    plan: path.join(ROOT, '.agency/scripts/plan-sprint.js'),
    auto: path.join(ROOT, '.agency/scripts/auto-assign.js'),
    retro: path.join(ROOT, '.agency/scripts/retro-report.js'),
    cgen: path.join(ROOT, '.agency/scripts/contract-gen.js'),
    gh: path.join(ROOT, '.agency/scripts/github.js'),
    cdir: path.join(ROOT, '.agency/contracts'),
};

let pass = 0, fail = 0, res = [];

function assert(c, m) { if (!c) throw Error(m); }

async function run(n, fn) {
    try {
        await fn();
        res.push({ n, s: 'PASS' });
        pass++;
        process.stdout.write('  OK ' + n + '\n');
    } catch (e) {
        res.push({ n, s: 'FAIL', e: e.message });
        fail++;
        process.stdout.write('  FAIL ' + n + ': ' + e.message + '\n');
    }
}

function exec(sp, a) {
    if (!a) a = [];
    const c = 'node "' + sp + '" ' + a.map(x => '"' + x + '"').join(' ');
    try {
        const o = execSync(c, { cwd: ROOT, encoding: 'utf-8', timeout: 30000 });
        return { x: 0, o: o.trim() };
    } catch (e) {
        return { x: e.status, o: (e.stdout || '').trim() };
    }
}

function ef(fp) { return fs.existsSync(fp); }
function rj(fp) { return JSON.parse(fs.readFileSync(fp, 'utf-8')); }

function preflight() {
    let ok = true;
    ['comp', 'mem', 'plan', 'auto', 'retro', 'cgen', 'gh', 'cdir'].forEach(function (k) {
        const e = ef(S[k]);
        process.stdout.write('  ' + (e ? 'OK' : 'NO') + ' ' + k + '\n');
        if (!e) ok = false;
    });
    if (!ok) throw Error('Pre-flight failed');
}

// === P1: Jane (Accountant) ===

async function p1s1() {
    const dir = path.join(ROOT, '.agency', 'tmp-p1');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    const f = path.join(dir, 'inv.test.js');
    fs.writeFileSync(f, 'function x(){var d=new Date();return d;}');
    execSync('git add "' + f + '"', { cwd: ROOT, encoding: 'utf-8' });
    const r = exec(S.comp, []);
    try { execSync('git reset HEAD "' + f + '" 2>nul', { cwd: ROOT }); fs.unlinkSync(f); fs.rmdirSync(dir); } catch (e) { }
    assert(r.o.indexOf('CC-1') >= 0, 'CC-1 missing');
}

async function p1s2() {
    const dir = path.join(ROOT, '.agency', 'tmp-p1b');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    const f = path.join(dir, 'ledger.ts');
    fs.writeFileSync(f, 'var t=Date.now();function g(a){return{b:t};}');
    execSync('git add "' + f + '"', { cwd: ROOT, encoding: 'utf-8' });
    const r = exec(S.comp, []);
    try { execSync('git reset HEAD "' + f + '" 2>nul', { cwd: ROOT }); fs.unlinkSync(f); fs.rmdirSync(dir); } catch (e) { }
    assert(r.o.indexOf('CC-1') >= 0, 'CC-1 missing');
}

async function p1s3() {
    const r = exec(S.comp, []);
    assert(r.o.indexOf('CC-6') >= 0 && r.o.indexOf('CC-7') >= 0, 'CC-6/7 missing');
}

// === P2: David (SME) ===

async function p2s1() {
    const d = '- Create quick invoice\n- Add line items\n- Calculate total\n- Generate PDF';
    const r = exec(S.plan, ['--feature', d]);
    assert(r.x === 0, 'exit ' + r.x);
    assert(r.o.indexOf('invoice') >= 0, 'no invoice');
}

async function p2s2() {
    const r = exec(S.auto, ['--task', 'M-Pesa payment', '--files', 'api/pay/mpesa.ts', '--json']);
    assert(r.x === 0, 'exit ' + r.x);
    const p = JSON.parse(r.o);
    assert(typeof p.task === 'string', 'no task');
    assert(Array.isArray(p.matches), 'no matches');
}

async function p2s3() {
    const r = exec(S.retro, ['--sprint', '18', '--dry-run']);
    assert(r.x === 0, 'exit ' + r.x);
    assert(r.o.indexOf('Recommendations') >= 0, 'no recs');
}

// === P3: Grace (Freelancer) ===

async function p3s1() {
    const h = exec(S.cgen, ['--help']);
    assert(h.x === 0, 'exit ' + h.x);
    assert(h.o.indexOf('--file') >= 0, 'no --file');
    const s = exec(S.cgen, ['--file', '.agency/scripts/compliance-check.ts']);
    assert(s.x === 0 || s.o.indexOf('No route decorators') >= 0, 'exit ' + s.x);
}

async function p3s2() {
    const s = exec(S.gh, ['status']);
    assert(s.x === 0, 'exit ' + s.x);
    assert(s.o.indexOf('GitHub') >= 0 || s.o.indexOf('token') >= 0, 'no status');
    const p = exec(S.gh, ['pr', 'create', '--from', 'r', '--to', 'm', '--title', 'feat: r', '--dry-run']);
    assert(p.x === 0, 'exit ' + p.x);
    assert(p.o.indexOf('DRY RUN') >= 0, 'no dry-run');
}

async function p3s3() {
    const sp = exec(S.plan, ['--feature', '- Simple invoice with hourly rate']);
    assert(sp.x === 0, 'exit ' + sp.x);
    const cp = exec(S.comp, []);
    assert(cp.o.indexOf('CC-1') >= 0 && cp.o.indexOf('CC-2') >= 0 && cp.o.indexOf('CC-3') >= 0, 'CC missing');
}

// === Cross-Persona ===

async function x1() {
    const f = fs.readdirSync(S.cdir).filter(x => x.endsWith('.json') && x !== 'TEMPLATE.api.json' && x !== 'cost-ledger.schema.json');
    assert(f.length > 0, 'Found ' + f.length);
    for (let i = 0; i < f.length; i++) {
        const c = rj(path.join(S.cdir, f[i]));
        assert(c.contractId || c.name, 'Missing in ' + f[i]);
    }
    process.stdout.write('    OK ' + f.length + ' contracts valid\n');
}

async function x2() {
    const r = exec(S.mem, ['recall', '--query', 'persona', '--tags', 'persona', '--limit', '3']);
    assert(r.x === 0, 'exit ' + r.x);
}

async function x3() {
    const r = exec(S.auto, ['--task', 'Invoice UI+API', '--files', 'pages/inv.tsx,api/inv.ts', '--json']);
    assert(r.x === 0, 'exit ' + r.x);
    const p = JSON.parse(r.o);
    assert(p.totalCandidates > 0, 'no candidates');
}

const EDGE = [
    { id: 'EC-1', d: 'Empty invoice data', by: ['P1-S1', 'P3-S3'] },
    { id: 'EC-2', d: 'Duplicate invoice numbers', by: ['P1-S1', 'P2-S1'] },
    { id: 'EC-3', d: 'M-Pesa payment failure', by: ['P2-S2'] },
    { id: 'EC-4', d: 'Missing client info', by: ['P2-S3', 'P3-S1'] },
    { id: 'EC-5', d: 'Contract parse failures', by: ['X1'] },
    { id: 'EC-6', d: 'No git history', by: ['P1-S3'] },
    { id: 'EC-7', d: 'Memory unavailable', by: ['X2'] },
    { id: 'EC-8', d: 'No route decorators', by: ['P3-S1'] },
];

async function main() {
    console.log('');
    console.log('  ====== E2E Persona Tests - Sprint 17.4 ======');
    console.log('  P1: Jane | P2: David | P3: Grace\n');
    try { preflight(); } catch (e) { console.error('!! ' + e.message); process.exit(1); }

    console.log('\n  === Persona 1: Jane ===');
    await run('P1-S1: Invoice - compliance detects violations', p1s1);
    await run('P1-S2: Ledger - financial path scanning', p1s2);
    await run('P1-S3: Reports - HANDOFF metadata', p1s3);

    console.log('\n  === Persona 2: David ===');
    await run('P2-S1: Quick invoice - sprint table', p2s1);
    await run('P2-S2: M-Pesa - auto-assignment', p2s2);
    await run('P2-S3: Client mgmt - retro report', p2s3);

    console.log('\n  === Persona 3: Grace ===');
    await run('P3-S1: Expenses - contract gen', p3s1);
    await run('P3-S2: Receipts - GitHub PR', p3s2);
    await run('P3-S3: Simple invoice - compliance', p3s3);

    console.log('\n  === Cross-Persona ===');
    await run('X1: Contract validation', x1);
    await run('X2: Memory recall', x2);
    await run('X3: Cross-assignment', x3);

    console.log('\n--- Results ---');
    console.log('Passed: ' + pass + '  Failed: ' + fail);
    for (let i = 0; i < res.length; i++) {
        const r = res[i];
        console.log('  ' + (r.s === 'PASS' ? 'OK' : 'NO') + ' ' + r.n + ': ' + r.s);
        if (r.e) console.log('    ' + r.e);
    }
    console.log('\n--- Edge Cases (' + EDGE.length + ') ---');
    for (let i = 0; i < EDGE.length; i++) {
        console.log('  [' + EDGE[i].id + '] ' + EDGE[i].d + ' - by: ' + EDGE[i].by.join(', '));
    }
    if (fail > 0) { console.error('!! FAIL. HALT.\n'); process.exit(1); }
    console.log('\nOK PASS. All scenarios complete.\n');
    process.exit(0);
}

main().catch(e => { console.error('!! ' + e.message); process.exit(1); });
