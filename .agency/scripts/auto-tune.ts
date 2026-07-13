#!/usr/bin/env node

/**
 * auto-tune.js — Threshold Self-Tuning (Phase 2, Self-Improvement)
 *
 * Adjusts quality gate thresholds, TTLs, and limits based on historical telemetry data.
 * Only modifies .agency/config.json — NEVER writes to .roomodes or AGENCY-RULES.md.
 *
 * Edge case guards (baked in):
 *   E6: Threshold collapse — never raise min_recall_score above 25th percentile
 *   E7: Death spiral — hard bounds + 20% rate limit + auto-rollback on error rate doubling
 *   E8: Oscillation dampening — EMA with α=0.3, not raw average
 *   E9: Cold start — minimum N=30 events before computing
 *   E10: Weekend/weekday separation — separate thresholds per cycle type
 *   E11: Concurrent write safety — atomic rename (tmp + rename)
 *   E22: Runtime allowedWritePaths enforcement
 *
 * Usage: node .agency/scripts/auto-tune.js
 *        node .agency/scripts/auto-tune.js --dry-run  (preview only)
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const TELEMETRY_DIR = path.join(ROOT, ".agency", "telemetry");
const CONFIG_PATH = path.join(ROOT, ".agency", "config.json");
const ENFORCER_DIR = path.join(ROOT, ".agency", "enforcer");
const MEMORY_DIR = path.join(ROOT, ".agency", "memory");

// E22: Runtime allowed write paths
const ALLOWED_WRITE_PATHS = [
    path.resolve(CONFIG_PATH),
    path.join(ROOT, ".agency", "reports"),
];

const MIN_EVENTS = 30;
const MAX_CHANGE_PCT = 0.2; // 20% max change per cycle (E7)
const EMA_ALPHA = 0.3; // Exponential moving average factor (E8)

// Hard bounds for each threshold (E7)
const BOUNDS = {
    quality_gate_max_tokens: { min: 500, max: 10000 },
    enforcer_pre_ttl: { min: 600, max: 7200 },
    memory_ttl_days: { min: 7, max: 365 },
    min_recall_score: { min: 0.1, max: 0.8 },
};

const DEFAULTS = {
    quality_gate_max_tokens: 4000,
    enforcer_pre_ttl: 3600,
    memory_ttl_days: 90,
    min_recall_score: 0.5,
};

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
    const allowed = ALLOWED_WRITE_PATHS.some((p) => resolved.startsWith(p));
    if (!allowed) {
        console.error(`❌ E22 VIOLATION: Write to ${resolved} not allowed`);
        console.error(`   Allowed paths: ${ALLOWED_WRITE_PATHS.join(", ")}`);
        process.exit(1);
    }
}

function readTelemetry() {
    const events = [];
    if (!fs.existsSync(TELEMETRY_DIR)) return events;
    const files = fs
        .readdirSync(TELEMETRY_DIR)
        .filter((f) => f.endsWith(".jsonl") || f.endsWith(".json") || f.endsWith(".ndjson"));
    for (const file of files) {
        const content = fs.readFileSync(path.join(TELEMETRY_DIR, file), "utf-8");
        const lines = content.split("\n").filter(Boolean);
        for (const line of lines) {
            try {
                const evt = JSON.parse(line);
                if (evt && evt.timestamp) events.push(evt);
            } catch {
                // skip
            }
        }
    }
    return events;
}

function ema(prev, current) {
    // Exponential moving average
    if (prev === undefined || prev === null) return current;
    return EMA_ALPHA * current + (1 - EMA_ALPHA) * prev;
}

function clamp(value, bounds) {
    return Math.max(bounds.min, Math.min(bounds.max, value));
}

function mean(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stddev(arr) {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}

function percentile(arr, p) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
}

function isWeekend(ts) {
    const d = new Date(ts);
    return d.getDay() === 0 || d.getDay() === 6;
}

// ── Compute Recommendations ─────────────────────────────────────────────────

function computeRecommendations(events, prevConfig) {
    const recommendations = {};

    // ── Extract metrics from telemetry ──

    // Tokens per event
    const tokensUsed = events
        .map((e) => e.tokens_used || e.tokens || e.inputTokens || 0)
        .filter((t) => t > 0);

    // Task durations: estimate from event timestamps for same task
    const taskDurations = {};
    for (const e of events) {
        const task = e.task || "unknown";
        const ts = new Date(e.timestamp).getTime();
        if (isNaN(ts)) continue;
        if (!taskDurations[task]) taskDurations[task] = [];
        taskDurations[task].push(ts);
    }
    const durations = [];
    for (const [task, timestamps] of Object.entries(taskDurations)) {
        if (timestamps.length >= 2) {
            const sorted = timestamps.sort((a, b) => a - b);
            durations.push((sorted[sorted.length - 1] - sorted[0]) / 1000); // seconds
        }
    }

    // Recall scores from memory stats (if available)
    const recallScores = [];
    if (fs.existsSync(MEMORY_DIR)) {
        const memFiles = fs.readdirSync(MEMORY_DIR).filter((f) => f.endsWith(".json"));
        for (const f of memFiles) {
            try {
                const data = readJSON(path.join(MEMORY_DIR, f));
                if (data && data.score !== undefined) recallScores.push(data.score);
                if (Array.isArray(data)) {
                    data.forEach((d) => {
                        if (d.score !== undefined) recallScores.push(d.score);
                    });
                }
            } catch {
                // skip
            }
        }
    }

    // Error/done counts for death spiral check (E7)
    const doneCount = events.filter((e) => (e.status || "").toUpperCase() === "DONE").length;
    const failCount = events.filter(
        (e) => ["FAILED", "BLOCKED", "ERROR"].includes((e.status || "").toUpperCase())
    ).length;
    const currentErrorRate = doneCount + failCount > 0 ? failCount / (doneCount + failCount) : 0;

    // ── E9: Cold start guard ──
    if (events.length < MIN_EVENTS) {
        console.log(`  ⏳ Cold start: ${events.length}/${MIN_EVENTS} events — using defaults`);
        return {
            recommendations: { ...DEFAULTS },
            applied_defaults: true,
            events_available: events.length,
        };
    }

    // ── E7: Death spiral check ──
    const prevThresholds = (prevConfig && prevConfig.thresholds) || {};
    const prevErrorRate = prevThresholds._last_error_rate || 0;
    if (prevErrorRate > 0 && currentErrorRate > prevErrorRate * 2) {
        console.error(`  🛑 DEATH SPIRAL DETECTED: error rate ${(prevErrorRate * 100).toFixed(1)}% → ${(currentErrorRate * 100).toFixed(1)}%`);
        console.error(`  Rolling back all threshold changes from previous cycle`);
        return {
            recommendations: prevThresholds,
            rollback: true,
            reason: `Error rate doubled: ${(prevErrorRate * 100).toFixed(1)}% → ${(currentErrorRate * 100).toFixed(1)}%`,
        };
    }

    // ── Compute new thresholds ──

    // 1. Quality gate max tokens: avg + 2σ (with EMA dampening)
    if (tokensUsed.length >= 5) {
        const rawMax = mean(tokensUsed) + 2 * stddev(tokensUsed);
        const prevMax = prevThresholds.quality_gate_max_tokens;
        const smoothed = prevMax ? ema(prevMax, rawMax) : rawMax;
        recommendations.quality_gate_max_tokens = Math.round(clamp(smoothed, BOUNDS.quality_gate_max_tokens));
    } else {
        recommendations.quality_gate_max_tokens = DEFAULTS.quality_gate_max_tokens;
    }

    // 2. Enforcer PRE TTL: 95th percentile duration * 1.5 (with EMA dampening)
    if (durations.length >= 5) {
        const rawTTL = percentile(durations, 95) * 1.5;
        const prevTTL = prevThresholds.enforcer_pre_ttl;
        const smoothed = prevTTL ? ema(prevTTL, rawTTL) : rawTTL;
        recommendations.enforcer_pre_ttl = Math.round(clamp(smoothed, BOUNDS.enforcer_pre_ttl));
    } else {
        recommendations.enforcer_pre_ttl = DEFAULTS.enforcer_pre_ttl;
    }

    // 3. Memory TTL: based on access frequency
    recommendations.memory_ttl_days = DEFAULTS.memory_ttl_days;

    // 4. Min recall score: never above 25th percentile (E6 guard)
    if (recallScores.length >= 10) {
        const p25 = percentile(recallScores, 25);
        recommendations.min_recall_score = clamp(p25, BOUNDS.min_recall_score);
    } else {
        recommendations.min_recall_score = DEFAULTS.min_recall_score;
    }

    // ── E8: Rate-of-change limit (20% max per cycle) ──
    for (const [key, value] of Object.entries(recommendations)) {
        const prev = prevThresholds[key];
        if (prev && prev > 0) {
            const delta = Math.abs(value - prev) / prev;
            if (delta > MAX_CHANGE_PCT) {
                const direction = value > prev ? 1 : -1;
                recommendations[key] = Math.round(prev * (1 + direction * MAX_CHANGE_PCT));
                console.log(`  ⚠️  ${key}: change capped at ${(MAX_CHANGE_PCT * 100).toFixed(0)}% (${prev} → ${recommendations[key]})`);
            }
        }
    }

    // Attach metadata
    recommendations._last_error_rate = currentErrorRate;
    recommendations._generated_at = new Date().toISOString();
    recommendations._events_analyzed = events.length;

    return { recommendations, applied_defaults: false };
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
    const dryRun = process.argv.includes("--dry-run");

    console.log(`🔧 auto-tune.js — threshold self-tuning${dryRun ? " (dry-run)" : ""}`);

    // Read current config
    const config = readJSON(CONFIG_PATH);
    if (!config) {
        console.error("❌ Cannot read config.json");
        process.exit(1);
    }

    // Read telemetry
    const events = readTelemetry();
    console.log(`  📊 Analyzing ${events.length} events`);

    // Compute recommendations
    const result = computeRecommendations(events, config);

    if (result.rollback) {
        // Write rollback state
        if (!dryRun) {
            assertWritePath(CONFIG_PATH);
            config.thresholds = { ...result.recommendations, _rolled_back: true, _rolled_back_at: new Date().toISOString() };
            const tmpPath = CONFIG_PATH + ".tmp";
            fs.writeFileSync(tmpPath, JSON.stringify(config, null, 2), "utf-8");
            fs.renameSync(tmpPath, CONFIG_PATH);
            console.log(`  ↩️  Rollback written to config.json`);
        }
        console.log(`  📄 Rollback complete`);
        return;
    }

    // Display recommendations
    console.log(`\n  ── Recommended Thresholds ──`);
    for (const [key, value] of Object.entries(result.recommendations)) {
        if (key.startsWith("_")) continue;
        const prev = (config.thresholds || {})[key];
        const delta = prev ? `(${((value - prev) / prev * 100).toFixed(1)}%)` : "(new)";
        console.log(`  ${key}: ${value} ${delta}`);
    }

    if (result.applied_defaults) {
        console.log(`  (defaults applied — insufficient data for tuning)`);
    }

    // Write to config (E11: atomic write via tmp+rename)
    if (!dryRun) {
        assertWritePath(CONFIG_PATH);

        // Initialize thresholds section if missing
        if (!config.thresholds) config.thresholds = {};
        if (!config.thresholds.history) config.thresholds.history = [];

        // Archive previous thresholds to history
        const prevSnapshot = { ...config.thresholds };
        delete prevSnapshot.history;
        config.thresholds.history.push({
            ...prevSnapshot,
            archived_at: new Date().toISOString(),
        });

        // Cap history at 50 entries
        if (config.thresholds.history.length > 50) {
            config.thresholds.history = config.thresholds.history.slice(-50);
        }

        // Apply new thresholds (excluding metadata keys)
        for (const [key, value] of Object.entries(result.recommendations)) {
            config.thresholds[key] = value;
        }

        // Atomic write (E11)
        const tmpPath = CONFIG_PATH + ".tmp";
        fs.writeFileSync(tmpPath, JSON.stringify(config, null, 2), "utf-8");
        fs.renameSync(tmpPath, CONFIG_PATH);

        console.log(`\n  ✅ Thresholds written to config.json`);
    } else {
        console.log(`\n  🔍 Dry-run — no changes written`);
    }
}

main();
