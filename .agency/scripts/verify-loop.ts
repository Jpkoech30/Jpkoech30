#!/usr/bin/env node
// @ts-nocheck
/**
 * verify-loop.js — Closing the Self-Improvement Loop (Phase 3)
 *
 * Snapshot metrics before adaptation, compare after, rollback if degraded.
 * Edge case guards:
 *   E16: Incomparable time windows — both snapshots must cover same duration
 *   E17: One change per cycle — serializes adaptations
 *   E18: No baseline — first 3 runs are observation only
 *
 * Usage: node .agency/scripts/verify-loop.js
 *        node .agency/scripts/verify-loop.js --force-snapshot  (capture baseline now)
 *        node .agency/scripts/verify-loop.js --reset-baseline   (clear and restart)
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const TELEMETRY_DIR = path.join(ROOT, ".agency", "telemetry");
const CONFIG_PATH = path.join(ROOT, ".agency", "config.json");
const BASELINE_PATH = path.join(ROOT, ".agency", "reports", "baseline.json");
const REPORTS_DIR = path.join(ROOT, ".agency", "reports");

const ALLOWED_WRITE_PATHS = [path.resolve(CONFIG_PATH), path.resolve(REPORTS_DIR)];
const OBSERVATION_RUNS = 3;
const DEGRADE_THRESHOLD = 0.10; // 10% degradation triggers rollback

// ── Helpers ─────────────────────────────────────────────────────────────────

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJSON(file) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    } catch {
        return null;
    }
}

function assertWritePath(filePath) {
    const resolved = path.resolve(filePath);
    if (!ALLOWED_WRITE_PATHS.some((p) => resolved.startsWith(p))) {
        console.error(`❌ Write to ${resolved} not allowed`);
        process.exit(1);
    }
}

// ── Metric Collection ──────────────────────────────────────────────────────

function collectMetrics() {
    const metrics = {
        collected_at: new Date().toISOString(),
        completion_rate: 0,
        error_rate: 0,
        rework_rate: 0,
        avg_tokens: 0,
        gate_failures: 0,
        total_events: 0,
        time_window_hours: 0,
    };

    // Read telemetry
    if (!fs.existsSync(TELEMETRY_DIR)) return metrics;

    const files = fs
        .readdirSync(TELEMETRY_DIR)
        .filter((f) => f.endsWith(".jsonl") || f.endsWith(".json") || f.endsWith(".ndjson"));

    const events = [];
    for (const file of files) {
        const content = fs.readFileSync(path.join(TELEMETRY_DIR, file), "utf-8");
        for (const line of content.split("\n").filter(Boolean)) {
            try {
                const evt = JSON.parse(line);
                if (evt && evt.timestamp) events.push(evt);
            } catch {
                // skip
            }
        }
    }

    if (events.length === 0) return metrics;

    metrics.total_events = events.length;

    // Time window
    const timestamps = events
        .map((e) => new Date(e.timestamp).getTime())
        .filter((t) => !isNaN(t))
        .sort((a, b) => a - b);

    if (timestamps.length >= 2) {
        metrics.time_window_hours = (timestamps[timestamps.length - 1] - timestamps[0]) / (1000 * 60 * 60);
    }

    // Completion rate: DONE / (DONE + FAILED)
    const done = events.filter((e) => (e.status || "").toUpperCase() === "DONE").length;
    const failed = events.filter((e) => ["FAILED", "BLOCKED", "ERROR"].includes((e.status || "").toUpperCase())).length;
    metrics.completion_rate = done + failed > 0 ? done / (done + failed) : 0;
    metrics.error_rate = events.length > 0 ? failed / events.length : 0;

    // Rework rate: tasks touched by >1 agent
    const taskAgents = {};
    for (const e of events) {
        const task = e.task || "unknown";
        const agent = e.agent || "unknown";
        if (!taskAgents[task]) taskAgents[task] = new Set();
        taskAgents[task].add(agent);
    }
    const reworked = Object.values(taskAgents).filter((s) => s.size > 1).length;
    const totalTasks = Object.keys(taskAgents).length;
    metrics.rework_rate = totalTasks > 0 ? reworked / totalTasks : 0;

    // Avg tokens
    const tokenEvents = events.filter((e) => e.tokens_used || e.tokens || e.inputTokens);
    const totalTokens = tokenEvents.reduce((s, e) => s + (e.tokens_used || e.tokens || e.inputTokens || 0), 0);
    metrics.avg_tokens = tokenEvents.length > 0 ? Math.round(totalTokens / tokenEvents.length) : 0;

    // Gate failures: count "FAILED" status for gate events
    metrics.gate_failures = events.filter((e) => {
        const isGate = (e.event || "").includes("gate") || (e.event || "").includes("enforcer");
        return isGate && ["FAILED", "BLOCKED", "ERROR"].includes((e.status || "").toUpperCase());
    }).length;

    return metrics;
}

// ── Comparison ──────────────────────────────────────────────────────────────

function compareMetrics(baselines, current) {
    // baselines is now an array of { snapshot, ... } from the last 3 days
    const warnings = [];
    const keys = ["completion_rate", "error_rate", "rework_rate", "avg_tokens", "gate_failures"];

    // Compute average of baselines for each metric
    const avgBaseline = {};
    for (const key of keys) {
        const values = baselines.map(b => b[key] || 0).filter(v => v > 0);
        avgBaseline[key] = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
    }

    for (const key of keys) {
        const b = avgBaseline[key] || 0;
        const c = current[key] || 0;
        const delta = b > 0 ? (c - b) / b : c > 0 ? 1 : 0;

        let isDegradation = false;
        if (key === "completion_rate") {
            isDegradation = delta < -0.10; // 10% degradation threshold
        } else {
            isDegradation = delta > 0.10;
        }

        if (isDegradation) {
            warnings.push({
                metric: key,
                baseline: b,
                current: c,
                delta: Math.round(delta * 100) + "%",
                direction: key === "completion_rate" ? "DOWN" : "UP",
            });
        }
    }

    return { warnings, degraded: warnings.length > 0 };
}

// ── Rollback ────────────────────────────────────────────────────────────────

function rollbackThresholds(config) {
    const history = (config.thresholds && config.thresholds.history) || [];
    if (history.length < 2) {
        console.log(`  ⚠️  No previous threshold state to roll back to`);
        return false;
    }

    // Get the state before the last change
    const prevState = history[history.length - 2];
    if (!prevState || !prevState.quality_gate_max_tokens) {
        console.log(`  ⚠️  Previous state has no threshold values to restore`);
        return false;
    }

    // Restore keys from previous state (skip metadata keys)
    for (const key of Object.keys(prevState)) {
        if (!key.startsWith("_") && key !== "history" && key !== "archived_at") {
            config.thresholds[key] = prevState[key];
        }
    }
    config.thresholds._rolled_back = true;
    config.thresholds._rolled_back_at = new Date().toISOString();

    // Atomic write
    const tmpPath = CONFIG_PATH + ".tmp";
    fs.writeFileSync(tmpPath, JSON.stringify(config, null, 2), "utf-8");
    fs.renameSync(tmpPath, CONFIG_PATH);

    console.log(`  ↩️  Rolled back thresholds to state from ${prevState.archived_at || "previous cycle"}`);
    return true;
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
    const forceSnapshot = process.argv.includes("--force-snapshot");
    const resetBaseline = process.argv.includes("--reset-baseline");

    console.log(`🔄 verify-loop.js — closing the self-improvement loop`);

    // Read config
    const config = readJSON(CONFIG_PATH);
    if (!config) {
        console.error("❌ Cannot read config.json");
        process.exit(1);
    }

    // Read or create baseline (now supports sliding window)
    let baseline = readJSON(BASELINE_PATH);

    // Track baseline history for sliding window
    const baselineHistory = baseline ? (baseline._history || [baseline]) : [];

    // Reset if requested
    if (resetBaseline) {
        console.log(`  🔄 Resetting baseline...`);
        baselineHistory.length = 0;
        baseline = null;
    }

    // Collect current metrics
    const currentMetrics = collectMetrics();
    console.log(`  📊 Current: ${currentMetrics.total_events} events, ${currentMetrics.time_window_hours.toFixed(1)}h window`);
    console.log(`     Completion: ${(currentMetrics.completion_rate * 100).toFixed(1)}%`);
    console.log(`     Error rate: ${(currentMetrics.error_rate * 100).toFixed(1)}%`);
    console.log(`     Rework: ${(currentMetrics.rework_rate * 100).toFixed(1)}%`);

    // In observation mode — just collect, don't verify
    if (baselineHistory.length < 3 || forceSnapshot) {
        // Add current to history (keep last 7)
        baselineHistory.push({ ...currentMetrics, _recorded_at: new Date().toISOString() });
        if (baselineHistory.length > 7) baselineHistory.shift();

        const newBaseline = {
            ...currentMetrics,
            _history: baselineHistory,
            _observation_runs: baselineHistory.length,
            _created_at: baseline ? baseline._created_at : new Date().toISOString(),
            _updated_at: new Date().toISOString(),
        };

        // Save
        assertWritePath(BASELINE_PATH);
        ensureDir(path.dirname(BASELINE_PATH));
        fs.writeFileSync(BASELINE_PATH, JSON.stringify(newBaseline, null, 2), "utf-8");

        const obsRun = baselineHistory.length;
        console.log(`\n  🔭 Observation run ${obsRun}/3 — building baseline`);
        console.log(`  ${Math.max(0, 3 - obsRun)} more run(s) before verification begins`);
        return;
    }

    // E16: Time window comparison
    const windowDiff = Math.abs(
        (currentMetrics.time_window_hours - baseline.time_window_hours) / (baseline.time_window_hours || 1)
    );
    if (windowDiff > 0.1 && baseline.time_window_hours > 0) {
        console.log(`\n  ⚠️  E16: Time windows differ by ${(windowDiff * 100).toFixed(0)}% (baseline: ${baseline.time_window_hours.toFixed(1)}h, current: ${currentMetrics.time_window_hours.toFixed(1)}h)`);
        console.log(`  Skipping verification this cycle — retry next cycle`);
        return;
    }

    // Compare current against sliding window average
    const result = compareMetrics(baselineHistory, currentMetrics);

    console.log(`\n  ── Verification Results ──`);
    for (const w of result.warnings) {
        console.log(`     ${w.metric}: ${(w.baseline * 100).toFixed(1)}% → ${(w.current * 100).toFixed(1)}% (${w.direction} ${w.delta})`);
    }

    if (result.degraded) {
        console.log(`\n  🛑 Degradation detected (sliding window: ${baselineHistory.length} baselines):`);
        for (const w of result.warnings) {
            console.log(`     ${w.metric}: ${(w.baseline * 100).toFixed(1)}% → ${(w.current * 100).toFixed(1)}% (${w.direction} ${w.delta})`);
        }

        // Auto-rollback (E7)
        console.log(`\n  ↩️  Auto-rollback triggered...`);
        const rolledBack = rollbackThresholds(config);
        if (rolledBack) {
            console.log(`  ✅ Thresholds rolled back`);
        }

        // Save verification result
        const verifyResult = {
            passed: false,
            generated_at: new Date().toISOString(),
            baseline: baseline._updated_at,
            warnings: result.warnings,
            rolled_back: rolledBack,
        };
        const verifyPath = path.join(REPORTS_DIR, "verify-result.json");
        assertWritePath(verifyPath);
        fs.writeFileSync(verifyPath, JSON.stringify(verifyResult, null, 2), "utf-8");
        console.log(`  📄 Result saved to verify-result.json`);
    } else {
        console.log(`\n  ✅ All metrics stable — no rollback needed`);

        // Update baseline with new metrics
        const updatedBaseline = {
            ...currentMetrics,
            _observation_runs: baseline._observation_runs || OBSERVATION_RUNS,
            _created_at: baseline._created_at,
            _updated_at: new Date().toISOString(),
        };
        assertWritePath(BASELINE_PATH);
        fs.writeFileSync(BASELINE_PATH, JSON.stringify(updatedBaseline, null, 2), "utf-8");

        // Save verification result
        const verifyResult = {
            passed: true,
            generated_at: new Date().toISOString(),
            baseline: baseline._updated_at,
            warnings: [],
            rolled_back: false,
        };
        const verifyPath = path.join(REPORTS_DIR, "verify-result.json");
        assertWritePath(verifyPath);
        fs.writeFileSync(verifyPath, JSON.stringify(verifyResult, null, 2), "utf-8");
    }
}

main();
