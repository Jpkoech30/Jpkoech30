#!/usr/bin/env node
// node .agency/scripts/metrics.js
// Reads telemetry events and computes:
// - Completion rate: DONE / (DONE + FAILED)
// - Error rate: FAILED / total
// - Rework rate: tasks touched by >1 agent
// - Average tokens per task

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const TELEMETRY_DIR = path.join(ROOT, '.agency', 'telemetry');
const MEMORY_SCRIPT = path.join(__dirname, 'memory.js');

function getTelemetryEvents() {
    const events = [];
    if (!fs.existsSync(TELEMETRY_DIR)) return events;

    const files = fs.readdirSync(TELEMETRY_DIR).filter(f => f.endsWith('.json') || f.endsWith('.ndjson'));
    for (const file of files) {
        const filePath = path.join(TELEMETRY_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter(Boolean);
        for (const line of lines) {
            try {
                events.push(JSON.parse(line));
            } catch (_) {
                // skip malformed lines
            }
        }
    }
    return events;
}

function computeMetrics(events) {
    const total = events.length;
    const done = events.filter(e => e.status === 'DONE' || e.status === 'completed').length;
    const failed = events.filter(e => e.status === 'FAILED' || e.status === 'error').length;
    const inProgress = events.filter(e => e.status === 'IN_PROGRESS' || e.status === 'pending').length;

    const completionRate = total > 0 ? (done / (done + failed)) * 100 : 0;
    const errorRate = total > 0 ? (failed / total) * 100 : 0;

    // Rework rate: count tasks touched by more than one distinct agent
    const taskAgents = {};
    for (const e of events) {
        const task = e.task || e.task_id || 'unknown';
        if (!taskAgents[task]) taskAgents[task] = new Set();
        if (e.agent) taskAgents[task].add(e.agent);
    }
    const reworkedTasks = Object.values(taskAgents).filter(s => s.size > 1).length;
    const totalTasks = Object.keys(taskAgents).length;
    const reworkRate = totalTasks > 0 ? (reworkedTasks / totalTasks) * 100 : 0;

    // Average tokens per task
    const tasksWithTokens = events.filter(e => e.tokens_used || e.tokens);
    const totalTokens = tasksWithTokens.reduce((sum, e) => sum + (e.tokens_used || e.tokens || 0), 0);
    const avgTokens = tasksWithTokens.length > 0 ? Math.round(totalTokens / tasksWithTokens.length) : 0;

    return {
        total,
        done,
        failed,
        inProgress,
        completionRate: completionRate.toFixed(1),
        errorRate: errorRate.toFixed(1),
        reworkRate: reworkRate.toFixed(1),
        reworkedTasks,
        totalTasks,
        avgTokens,
    };
}

function main() {
    const events = getTelemetryEvents();
    const metrics = computeMetrics(events);

    console.log('');
    console.log('  \u{1F4CA} Agent Metrics');
    console.log('  \u2500'.repeat(40));
    console.log(`  Total events:     ${metrics.total}`);
    console.log(`  Completed (DONE): ${metrics.done}`);
    console.log(`  Failed:           ${metrics.failed}`);
    console.log(`  In progress:      ${metrics.inProgress}`);
    console.log('');
    console.log(`  Completion rate:  ${metrics.completionRate}%`);
    console.log(`  Error rate:       ${metrics.errorRate}%`);
    console.log(`  Rework rate:      ${metrics.reworkRate}% (${metrics.reworkedTasks}/${metrics.totalTasks} tasks)`);
    console.log(`  Avg tokens/task:  ${metrics.avgTokens}`);
    console.log('');
}

main();
