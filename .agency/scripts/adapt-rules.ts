#!/usr/bin/env node

/**
 * adapt-rules.js — Rule Evolution Suggestions (Phase 2, Self-Improvement)
 *
 * Reads pattern data from patterns.js and generates AGENCY-RULES.md amendment
 * suggestions. Output is suggestions only — never auto-applies.
 *
 * Edge case guards:
 *   E22: Never modifies rules — output is .md file only
 *   E26: Review overhead acknowledged in output header
 *   E28: Suggestion categorization (AUTO-FIXABLE / SUGGEST-ONLY / ESCALATE)
 *
 * Usage: node .agency/scripts/adapt-rules.js
 *        node .agency/scripts/adapt-rules.js --patterns ./custom-patterns.json
 *        node .agency/scripts/adapt-rules.js --output ./custom-suggestions.md
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const PATTERNS_PATH = path.join(ROOT, ".agency", "reports", "patterns", "latest.json");
const REPORTS_DIR = path.join(ROOT, ".agency", "reports");
const OUTPUT_PATH = path.join(REPORTS_DIR, "rule-suggestions.md");
const AGENCY_RULES_PATH = path.join(ROOT, ".agency", "AGENCY-RULES.md");

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

function slugToName(slug) {
    const names = {
        "lead-architect": "Lead Architect & Orchestrator",
        "code-agent": "JengaBooks Code",
        "backend-lead": "Backend Lead",
        "backend-api": "Backend API",
        "backend-service": "Backend Service",
        "backend-integration": "Backend Integration",
        "backend-logic": "Backend Logic",
        "backend-database": "Backend Database",
        "frontend-lead": "Frontend Web Lead",
        "frontend-ui": "Frontend UI",
        "frontend-page": "Frontend Page",
        "frontend-state": "Frontend State",
        "frontend-web": "Frontend Web",
        "frontend-mobile": "Frontend Mobile",
        "mobile-lead": "Mobile Lead",
        "mobile-ui": "Mobile UI",
        "mobile-screen": "Mobile Screen",
        "mobile-state": "Mobile State",
        "devops-lead": "DevOps Lead",
        "devops-infra": "DevOps Infrastructure",
        "devops-cicd": "DevOps CI/CD",
        "devops-db": "DevOps Database Admin",
        devops: "DevOps",
        "compliance-guardian": "Compliance Guardian",
        "security-auditor": "Security Auditor",
        "performance-auditor": "Performance Auditor",
        "accessibility-auditor": "Accessibility Auditor",
        "qa-automator": "QA Automator",
        documentarian: "Agency Documentarian",
        "design-keeper": "Design System Keeper",
        "release-manager": "Release Manager",
    };
    return names[slug] || slug;
}

// ── Suggestion Templates ────────────────────────────────────────────────────

function suggestForHighFailure(pattern, rulesContent) {
    const lines = [];
    lines.push(`### [SUGGEST-ONLY] Review "${slugToName(pattern.agent)}" task routing`);
    lines.push(`**Evidence:** Agent "${pattern.agent}" has ${pattern.value} blocked/failed tasks in the last 30 days`);
    lines.push(`**Pattern confidence:** ${pattern.confidence}`);
    lines.push(`**Analysis:** High failure rate may indicate unclear domain boundaries, missing contracts,`);
    lines.push(`or tasks being routed to the wrong specialist.`);
    lines.push(`**Current rule:** config.json → agents.hierarchy`);
    lines.push(`**Suggested action:** Review the agent's fileRegex and task assignments in .roomodes`);
    lines.push(`**Category:** SUGGEST-ONLY — requires Lead Architect review`);
    lines.push("");
    return lines;
}

function suggestForHighRework(pattern, rulesContent) {
    const lines = [];
    lines.push(`### [SUGGEST-ONLY] Reduce cross-agent task rework`);
    lines.push(`**Evidence:** ${pattern.value}% of tasks involve more than one agent (threshold: ${pattern.threshold}%)`);
    lines.push(`**Pattern confidence:** ${pattern.confidence}`);
    if (pattern.detail && pattern.detail.affected_tasks) {
        lines.push(`**Affected tasks:** ${pattern.detail.affected_tasks.join(", ")}`);
    }
    lines.push(`**Analysis:** High rework rate suggests domain boundaries need clarification.`);
    lines.push(`Tasks frequently passed between agents indicate overlapping responsibilities.`);
    lines.push(`**Current rule:** config.json → agents.hierarchy`);
    lines.push(`**Suggested action:** Review agent domain definitions in .roomodes groups.fileRegex`);
    lines.push(`**Category:** SUGGEST-ONLY — requires Lead Architect review`);
    lines.push("");
    return lines;
}

function suggestForCostAnomaly(pattern, rulesContent) {
    const lines = [];
    lines.push(`### [SUGGEST-ONLY] Investigate cost spike on ${pattern.date}`);
    lines.push(`**Evidence:** Daily cost of KES ${pattern.value} exceeded threshold of KES ${pattern.threshold}`);
    lines.push(`**Pattern confidence:** ${pattern.confidence}`);
    lines.push(`**Analysis:** Unusual cost spike may indicate a runaway task, excessive retries,`);
    lines.push(`or an unusually large task that consumed more tokens than expected.`);
    lines.push(`**Current rule:** AGENCY-RULES.md §11 COST AWARENESS`);
    lines.push(`**Suggested action:** Review telemetry for ${pattern.date} to identify root cause`);
    lines.push(`**Category:** SUGGEST-ONLY — requires Lead Architect review`);
    lines.push("");
    return lines;
}

function suggestForMemoryGap(pattern, rulesContent) {
    const lines = [];
    lines.push(`### [AUTO-FIXABLE] Address memory store gaps`);
    lines.push(`**Evidence:** ${pattern.value} tasks have no corresponding memory record`);
    lines.push(`**Pattern confidence:** ${pattern.confidence}`);
    lines.push(`**Analysis:** Tasks are being completed but their context is not persisted to memory.js.`);
    lines.push(`This means future agents cannot recall what was done or why decisions were made.`);
    if (pattern.detail && pattern.detail.affected_tasks) {
        lines.push(`**Affected tasks (sample):** ${pattern.detail.affected_tasks.slice(0, 5).join(", ")}`);
    }
    lines.push(`**Current rule:** AGENCY-RULES.md §4 GROUNDING`);
    lines.push(`**Suggested action:** Verify enforcer.js POST phase calls memory.js store after each task`);
    lines.push(`**Category:** AUTO-FIXABLE — handled by updating enforcer.js POST phase`);
    lines.push("");
    return lines;
}

function generalSuggestions(patterns) {
    const lines = [];

    // Check if we have data gaps
    const dataGaps = patterns.data_gaps || [];
    if (dataGaps.length > 0) {
        lines.push(`### [ESCALATE] Telemetry data gaps detected`);
        lines.push(`**Evidence:** ${dataGaps.length} gap(s) in telemetry data (>24h without events)`);
        for (const gap of dataGaps) {
            lines.push(`- ${gap.start} → ${gap.end} (${gap.duration_hours}h)`);
        }
        lines.push(`**Analysis:** Data gaps may indicate system downtime, network issues, or telemetry storage failures.`);
        lines.push(`**Category:** ESCALATE — requires DevOps Lead to investigate infrastructure`);
        lines.push("");
    }

    // Check if no patterns at all
    if (patterns.patterns && patterns.patterns.length === 0) {
        lines.push(`### [INFO] No patterns detected — system is stable`);
        lines.push(`**Evidence:** ${patterns.events_analyzed} events analyzed, zero patterns triggered thresholds`);
        lines.push(`**Analysis:** Current configuration and agent routing appear healthy.`);
        lines.push(`**Action:** No changes needed. Continue monitoring.`);
        lines.push("");
    }

    return lines;
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
    const patternsArg = process.argv.indexOf("--patterns");
    const patternsPath = patternsArg > -1 ? process.argv[patternsArg + 1] : PATTERNS_PATH;
    const outputArg = process.argv.indexOf("--output");
    const outputPath = outputArg > -1 ? process.argv[outputArg + 1] : OUTPUT_PATH;

    console.log(`📝 adapt-rules.js — generating rule evolution suggestions`);

    // Read patterns
    const patterns = readJSON(patternsPath);
    if (!patterns) {
        console.error(`❌ Cannot read patterns from ${patternsPath}`);
        console.error(`   Run patterns.js first to generate pattern data`);
        process.exit(1);
    }

    if (patterns.status === "WAITING_FOR_DATA") {
        console.log(`  ⏳ Patterns system still waiting for data (${patterns.events_available}/${patterns.events_needed} events needed)`);
        console.log(`  No suggestions to generate yet.`);
        const result = [
            `# Rule Adaptation Suggestions — ${new Date().toISOString().substring(0, 10)}`,
            ``,
            `> **Status:** WAITING_FOR_DATA — insufficient telemetry for pattern detection`,
            `> **Data:** ${patterns.events_available}/${patterns.events_needed} events`,
            ``,
            `No suggestions generated. Run patterns.js after more tasks are completed.`,
            ``,
        ].join("\n");
        ensureDir(path.dirname(outputPath));
        fs.writeFileSync(outputPath, result, "utf-8");
        console.log(`  📄 Output: ${outputPath}`);
        return;
    }

    // Read current rules for context
    let rulesContent = "";
    if (fs.existsSync(AGENCY_RULES_PATH)) {
        rulesContent = fs.readFileSync(AGENCY_RULES_PATH, "utf-8");
    }

    // Generate suggestions
    const lines = [];
    lines.push(`# Rule Adaptation Suggestions — ${new Date().toISOString().substring(0, 10)}`);
    lines.push(``);
    lines.push(`> **Generated from:** ${patternsPath}`);
    lines.push(`> **Events analyzed:** ${patterns.events_analyzed || 0}`);
    lines.push(`> **Patterns found:** ${(patterns.patterns || []).length}`);
    lines.push(`> **Estimated review time:** ~5 min (KES 67.50 at flash rates)`);
    lines.push(``);
    lines.push(`## Legend`);
    lines.push(`| Category | Meaning | Action Required |`);
    lines.push(`|----------|---------|-----------------|`);
    lines.push(`| AUTO-FIXABLE | Script can handle this automatically | No LLM needed |`);
    lines.push(`| SUGGEST-ONLY | Requires human/LLM to modify rules/config | Lead Architect review |`);
    lines.push(`| ESCALATE | Infrastructure or code issue | DevOps/Lead Architect |`);
    lines.push(`| INFO | System status notification | No action needed |`);
    lines.push(``);
    lines.push(`---`);
    lines.push(``);

    // Generate per-pattern suggestions
    for (const p of patterns.patterns || []) {
        switch (p.type) {
            case "high_failure":
                lines.push(...suggestForHighFailure(p, rulesContent));
                break;
            case "high_rework":
                lines.push(...suggestForHighRework(p, rulesContent));
                break;
            case "cost_anomaly":
                lines.push(...suggestForCostAnomaly(p, rulesContent));
                break;
            case "memory_gap":
                lines.push(...suggestForMemoryGap(p, rulesContent));
                break;
            default:
                lines.push(`### [INFO] Unrecognized pattern type: ${p.type}`);
                lines.push(`**Detail:** ${JSON.stringify(p)}`);
                lines.push(``);
        }
    }

    // Add general suggestions
    lines.push(...generalSuggestions(patterns));

    // Summary
    const autoFixable = lines.filter((l) => l.includes("AUTO-FIXABLE")).length;
    const suggestOnly = lines.filter((l) => l.includes("SUGGEST-ONLY")).length;
    const escalate = lines.filter((l) => l.includes("ESCALATE")).length;

    lines.push(`---`);
    lines.push(``);
    lines.push(`## Summary`);
    lines.push(``);
    lines.push(`| Category | Count |`);
    lines.push(`|----------|-------|`);
    lines.push(`| AUTO-FIXABLE | ${autoFixable} |`);
    lines.push(`| SUGGEST-ONLY | ${suggestOnly} |`);
    lines.push(`| ESCALATE | ${escalate} |`);
    lines.push(``);
    lines.push(`_Generated by adapt-rules.js at ${new Date().toISOString()}_`);
    lines.push(``);

    // Write output
    const output = lines.join("\n");
    ensureDir(path.dirname(outputPath));
    fs.writeFileSync(outputPath, output, "utf-8");

    console.log(`  ✅ ${(patterns.patterns || []).length} pattern(s) → ${autoFixable + suggestOnly + escalate} suggestion(s)`);
    console.log(`     AUTO-FIXABLE: ${autoFixable}`);
    console.log(`     SUGGEST-ONLY: ${suggestOnly}`);
    console.log(`     ESCALATE: ${escalate}`);
    console.log(`  📄 Output: ${outputPath}`);
}

main();
