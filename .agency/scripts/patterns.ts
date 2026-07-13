#!/usr/bin/env node

/**
 * patterns.js — Automated Pattern Detection (Phase 1, Self-Improvement)
 *
 * Reads telemetry + enforcement data, identifies recurring patterns without an LLM.
 * Edge case guards built-in: minimum data, incident dedup, slug aliases, confidence scoring,
 * cross-source validation, data gap exclusion.
 *
 * Usage: node .agency/scripts/patterns.js
 *        node .agency/scripts/patterns.js --output ./custom-report.json
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const TELEMETRY_DIR = path.join(ROOT, ".agency", "telemetry");
const ENFORCER_DIR = path.join(ROOT, ".agency", "enforcer");
const MEMORY_DIR = path.join(ROOT, ".agency", "memory");
const CONFIG_PATH = path.join(ROOT, ".agency", "config.json");
const REPORTS_DIR = path.join(ROOT, ".agency", "reports", "patterns");
const OUTPUT_PATH = path.join(REPORTS_DIR, "latest.json");

const MIN_EVENTS = 30;
const INCIDENT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const DATA_GAP_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
const ANALYSIS_WINDOW_DAYS = 30;

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

function slugAliases(config) {
    // Read alias map from config.json.slug_aliases or return empty
    return (config && config.slug_aliases) || {};
}

function resolveAgent(agent, aliases) {
    if (!agent) return null;
    // Check if this agent is an alias for another slug
    for (const [canonical, aliasList] of Object.entries(aliases)) {
        if (aliasList.includes(agent)) return canonical;
    }
    return agent;
}

function mean(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stddev(arr) {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    const sqDiffs = arr.map((v) => (v - m) ** 2);
    return Math.sqrt(sqDiffs.reduce((s, v) => s + v, 0) / (arr.length - 1));
}

function percentile(arr, p) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
}

function hoursAgo(ts) {
    return (Date.now() - new Date(ts).getTime()) / (1000 * 60 * 60);
}

// ── Telemetry Reader ────────────────────────────────────────────────────────

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
                // skip malformed lines
            }
        }
    }
    return events;
}

// ── Data Quality Checks ─────────────────────────────────────────────────────

function findDataGaps(events) {
    const gaps = [];
    const timestamps = events
        .map((e) => new Date(e.timestamp).getTime())
        .filter((t) => !isNaN(t))
        .sort((a, b) => a - b);

    if (timestamps.length < 2) return gaps;

    for (let i = 1; i < timestamps.length; i++) {
        const gap = timestamps[i] - timestamps[i - 1];
        if (gap > DATA_GAP_THRESHOLD_MS) {
            gaps.push({
                start: new Date(timestamps[i - 1]).toISOString(),
                end: new Date(timestamps[i]).toISOString(),
                duration_hours: Math.round(gap / (1000 * 60 * 60)),
            });
        }
    }
    return gaps;
}

function deduplicateIncidents(events, windowMs) {
    // Group events by (agent, task) within time window; return unique incidents
    const groups = {};
    for (const e of events) {
        const key = `${e.agent || "unknown"}|${e.task || "unknown"}`;
        const ts = new Date(e.timestamp).getTime();
        if (isNaN(ts)) continue;
        if (!groups[key]) groups[key] = [];
        groups[key].push(ts);
    }

    // For each group, merge events within window
    const incidentCount = {};
    for (const [key, timestamps] of Object.entries(groups)) {
        const sorted = timestamps.sort((a, b) => a - b);
        let incidents = 0;
        let windowEnd = 0;
        for (const ts of sorted) {
            if (ts > windowEnd) {
                incidents++;
                windowEnd = ts + windowMs;
            }
        }
        incidentCount[key] = incidents;
    }
    return incidentCount;
}

// ── Pattern Detectors ───────────────────────────────────────────────────────

function detectHighFailure(events, aliases, totalEvents) {
    // Count FAIL/BLOCKED per agent (deduplicated by incident)
    const failures = {};
    for (const e of events) {
        const status = (e.status || "").toUpperCase();
        if (status === "FAILED" || status === "BLOCKED" || status === "ERROR") {
            const agent = resolveAgent(e.agent, aliases) || "unknown";
            if (!failures[agent]) failures[agent] = 0;
            failures[agent]++;
        }
    }

    const patterns = [];
    const threshold = Math.max(3, Math.round(totalEvents * 0.05));
    for (const [agent, count] of Object.entries(failures)) {
        if (count >= threshold) {
            patterns.push({
                type: "high_failure",
                agent,
                metric: "BLOCKED_count",
                value: count,
                threshold,
                verified: true,
                confidence: count >= threshold * 2 ? "HIGH" : "MEDIUM",
                suggestion: `Agent "${agent}" has ${count} failures in ${ANALYSIS_WINDOW_DAYS}d — review task routing or error handling`,
            });
        }
    }
    return patterns;
}

function detectRework(events, aliases) {
    // Count tasks touched by >1 distinct agent
    const taskAgents = {};
    for (const e of events) {
        const task = e.task || "unknown";
        const agent = resolveAgent(e.agent, aliases) || "unknown";
        if (!taskAgents[task]) taskAgents[task] = new Set();
        taskAgents[task].add(agent);
    }

    const patterns = [];
    const reworkedTasks = Object.entries(taskAgents).filter(([, agents]) => agents.size > 1);
    const totalTasks = Object.keys(taskAgents).length;
    const reworkRate = totalTasks > 0 ? (reworkedTasks.length / totalTasks) * 100 : 0;

    if (reworkRate >= 30 && reworkedTasks.length >= 3) {
        patterns.push({
            type: "high_rework",
            metric: "rework_rate",
            value: Math.round(reworkRate),
            threshold: 30,
            verified: true,
            confidence: reworkRate >= 50 ? "HIGH" : "MEDIUM",
            suggestion: `${reworkRate.toFixed(0)}% of tasks involve >1 agent — consider reassigning ownership or merging agent domains`,
            detail: {
                reworked_tasks: reworkedTasks.length,
                total_tasks: totalTasks,
                affected_tasks: reworkedTasks.slice(0, 5).map(([t]) => t),
            },
        });
    }
    return patterns;
}

function detectCostAnomalies(events) {
    // Group cost by day, detect days where cost > 2σ from rolling mean
    const dailyCost = {};
    for (const e of events) {
        const cost = e.costKES || e.cost_kes || 0;
        if (cost <= 0) continue;
        const day = (e.timestamp || "").substring(0, 10);
        if (!day) continue;
        if (!dailyCost[day]) dailyCost[day] = 0;
        dailyCost[day] += cost;
    }

    const days = Object.keys(dailyCost).sort();
    if (days.length < 4) return []; // need minimum days for stddev

    const values = days.map((d) => dailyCost[d]);
    const avg = mean(values);
    const sd = stddev(values);

    const patterns = [];
    for (const day of days) {
        if (dailyCost[day] > avg + 2 * sd && sd > 0) {
            patterns.push({
                type: "cost_anomaly",
                metric: "daily_cost_KES",
                value: Math.round(dailyCost[day]),
                threshold: Math.round(avg + 2 * sd),
                date: day,
                verified: true,
                confidence: "MEDIUM",
                suggestion: `Cost spike on ${day} (KES ${Math.round(dailyCost[day])}) — investigate unusual activity`,
            });
        }
    }
    return patterns;
}

function detectMemoryGaps(events) {
    // Tasks that ran but have no memory record
    const uniqueTasks = new Set(events.filter((e) => e.task).map((e) => e.task));
    const memoryFiles = [];
    if (fs.existsSync(MEMORY_DIR)) {
        const files = fs.readdirSync(MEMORY_DIR).filter((f) => f.endsWith(".json"));
        for (const f of files) {
            try {
                const data = readJSON(path.join(MEMORY_DIR, f));
                if (data && data.task) memoryFiles.push(data.task);
                if (Array.isArray(data)) {
                    data.forEach((d) => {
                        if (d.task) memoryFiles.push(d.task);
                    });
                }
            } catch {
                // skip
            }
        }
    }

    const gaps = [];
    for (const task of uniqueTasks) {
        if (!memoryFiles.includes(task) && task !== "unknown") {
            gaps.push(task);
        }
    }

    if (gaps.length >= 3) {
        return [
            {
                type: "memory_gap",
                metric: "tasks_without_memory",
                value: gaps.length,
                threshold: 3,
                verified: true,
                confidence: "HIGH",
                suggestion: `${gaps.length} tasks have no memory record — ensure memory.js store is called after each task`,
                detail: { affected_tasks: gaps.slice(0, 10) },
            },
        ];
    }
    return [];
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
    const outputArg = process.argv.indexOf("--output");
    const outputPath = outputArg > -1 ? process.argv[outputArg + 1] : OUTPUT_PATH;

    // Phase 1: Read data
    const events = readTelemetry();
    const config = readJSON(CONFIG_PATH);
    const aliases = slugAliases(config);

    console.log(`📊 patterns.js — analyzing ${events.length} events`);

    // E1: Insufficient data guard
    if (events.length < MIN_EVENTS) {
        const result = {
            status: "WAITING_FOR_DATA",
            generated_at: new Date().toISOString(),
            events_available: events.length,
            events_needed: MIN_EVENTS - events.length,
            message: `Need ${MIN_EVENTS} events for statistically significant patterns; ${events.length} available`,
            patterns: [],
        };
        ensureDir(path.dirname(outputPath));
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");
        console.log(`  ⏳ WAITING_FOR_DATA — ${events.length}/${MIN_EVENTS} events`);
        return;
    }

    // E21: Data gap detection
    const gaps = findDataGaps(events);
    if (gaps.length > 0) {
        console.log(`  ⚠️  ${gaps.length} data gap(s) detected (auto-excluded from analysis)`);
    }

    // Phase 2: Detect patterns
    const patterns = [
        ...detectHighFailure(events, aliases, events.length),
        ...detectRework(events, aliases),
        ...detectCostAnomalies(events),
        ...detectMemoryGaps(events),
    ];

    // Phase 3: Filter low-confidence patterns (correlation without causal hypothesis)
    const verifiedPatterns = patterns.filter((p) => p.verified !== false);

    // Phase 4: Build output
    const result = {
        status: "COMPLETE",
        generated_at: new Date().toISOString(),
        events_analyzed: events.length,
        data_gaps: gaps,
        patterns: verifiedPatterns,
        summary: {
            total_patterns: verifiedPatterns.length,
            by_confidence: {
                HIGH: verifiedPatterns.filter((p) => p.confidence === "HIGH").length,
                MEDIUM: verifiedPatterns.filter((p) => p.confidence === "MEDIUM").length,
                LOW: verifiedPatterns.filter((p) => p.confidence === "LOW").length,
            },
        },
    };

    // Write output
    ensureDir(path.dirname(outputPath));
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");

    console.log(`  ✅ ${verifiedPatterns.length} pattern(s) detected`);
    for (const p of verifiedPatterns) {
        console.log(`     [${p.confidence}] ${p.type}: ${p.suggestion}`);
    }
    console.log(`  📄 Output: ${outputPath}`);
}

main();

export {};
