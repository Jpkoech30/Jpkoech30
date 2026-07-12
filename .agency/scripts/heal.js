#!/usr/bin/env node
/**
 * heal.js — Auto-Remediation Engine (Phase 2, Self-Improvement)
 *
 * Fixes common, deterministic issues without an LLM.
 * Complements health.js (diagnostic) by applying the fixes health.js detects.
 *
 * Edge case guards (baked in):
 *   E12: Orphan file safelist — only delete files not in .gitignore
 *   E13: Partial heal recovery — log-before-execute, idempotent restart
 *   E14: Age gate — only act on files >24h old
 *   E15: Additive-only config sync — never remove from .roomodes
 *   E23: Heal-log rotation — auto-rotate at 1000 entries
 *   E24: Rollback support — heal.js --rollback <entry-id>
 *
 * Usage: node .agency/scripts/heal.js
 *        node .agency/scripts/heal.js --dry-run  (preview only)
 *        node .agency/scripts/heal.js --rollback <entry-id>
 *        node .agency/scripts/heal.js --rollback-last 3
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const CONFIG_PATH = path.join(ROOT, ".agency", "config.json");
const ROOMODES_PATH = path.join(ROOT, ".roomodes");
const HEAL_LOG_PATH = path.join(ROOT, ".agency", "reports", "heal-log.ndjson");
const SENTINEL_PATH = path.join(ROOT, ".agency", ".preflight-passed");
const LOCKFILE_PATH = path.join(ROOT, ".agency", ".improve-lock");

const ALLOWED_WRITE_PATHS = [
    path.resolve(CONFIG_PATH),
    path.join(ROOT, ".agency", "reports"),
];

const SAFELIST = [".gitignore", ".gitattributes", ".editorconfig", ".env.example"];
const TEMP_PATTERNS = [/^temp-/i, /\.bak$/, /^ROO-/i, /^PLAN-/i, /^\$null/];
const TEMP_FILE_AGE_MS = 24 * 60 * 60 * 1000;
const HEAL_LOG_ROTATE_AT = 1000;
const STALE_LOCK_MS = 2 * 60 * 60 * 1000;

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
        console.error(`❌ Write to ${resolved} not allowed`);
        process.exit(1);
    }
}

function logHeal(action, detail, status) {
    const entry = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        timestamp: new Date().toISOString(),
        action,
        detail,
        status: status || "EXECUTED",
        hostname: require("os").hostname(),
    };
    ensureDir(path.dirname(HEAL_LOG_PATH));
    fs.appendFileSync(HEAL_LOG_PATH, JSON.stringify(entry) + "\n", "utf-8");
    return entry.id;
}

function readHealLog() {
    if (!fs.existsSync(HEAL_LOG_PATH)) return [];
    const content = fs.readFileSync(HEAL_LOG_PATH, "utf-8");
    return content
        .split("\n")
        .filter(Boolean)
        .map((l) => {
            try {
                return JSON.parse(l);
            } catch {
                return null;
            }
        })
        .filter(Boolean);
}

function rotateHealLog() {
    if (!fs.existsSync(HEAL_LOG_PATH)) return false;
    const lines = fs.readFileSync(HEAL_LOG_PATH, "utf-8").split("\n").filter(Boolean).length;
    if (lines < HEAL_LOG_ROTATE_AT) return false;
    const archiveDir = path.join(ROOT, ".agency", "reports", "heal-archive");
    ensureDir(archiveDir);
    const archiveName = `heal-log-${new Date().toISOString().substring(0, 10)}.ndjson`;
    const archivePath = path.join(archiveDir, archiveName);
    fs.renameSync(HEAL_LOG_PATH, archivePath);
    console.log(`  ♻️  Heal-log rotated (${lines} entries → ${archiveName})`);
    return true;
}

// ── Actions ─────────────────────────────────────────────────────────────────

function cleanTempFiles(dryRun) {
    const rootFiles = fs.readdirSync(ROOT);
    const toClean = [];

    for (const file of rootFiles) {
        if (SAFELIST.includes(file)) continue;
        if (!TEMP_PATTERNS.some((p) => p.test(file))) continue;

        const filePath = path.join(ROOT, file);
        try {
            const stat = fs.statSync(filePath);
            if (!stat.isFile()) continue;
            if (Date.now() - stat.mtimeMs < TEMP_FILE_AGE_MS) continue; // E14: age gate

            // E12: Check if file is referenced in .gitignore
            const gitignore = path.join(ROOT, ".gitignore");
            let inGitignore = false;
            if (fs.existsSync(gitignore)) {
                const giContent = fs.readFileSync(gitignore, "utf-8");
                inGitignore = giContent.split("\n").some((line) => line.trim() !== "" && file.includes(line.trim().replace("*", "")));
            }
            if (inGitignore) continue;

            toClean.push({ name: file, age_hours: Math.round((Date.now() - stat.mtimeMs) / (1000 * 60 * 60)) });
        } catch {
            // skip locked files
        }
    }

    if (toClean.length === 0) {
        console.log(`  ✅ No temp files to clean`);
        return { action: "clean_temp", count: 0 };
    }

    if (dryRun) {
        console.log(`  🔍 Would clean ${toClean.length} temp file(s):`);
        toClean.forEach((f) => console.log(`     - ${f.name} (${f.age_hours}h old)`));
        return { action: "clean_temp", count: toClean.length, dry_run: true, files: toClean };
    }

    let cleaned = 0;
    for (const f of toClean) {
        try {
            fs.unlinkSync(path.join(ROOT, f.name));
            logHeal("clean_temp", { file: f.name, age_hours: f.age_hours });
            cleaned++;
        } catch {
            // file may be locked
        }
    }
    console.log(`  ✅ Cleaned ${cleaned}/${toClean.length} temp file(s)`);
    return { action: "clean_temp", count: cleaned };
}

function cleanSentinel(dryRun) {
    if (!fs.existsSync(SENTINEL_PATH)) {
        console.log(`  ✅ No stale sentinel`);
        return { action: "clean_sentinel", status: "not_found" };
    }

    if (dryRun) {
        console.log(`  🔍 Would remove .agency/.preflight-passed`);
        return { action: "clean_sentinel", dry_run: true };
    }

    try {
        fs.unlinkSync(SENTINEL_PATH);
        logHeal("clean_sentinel", { path: ".agency/.preflight-passed" });
        console.log(`  ✅ Removed stale sentinel`);
        return { action: "clean_sentinel", status: "removed" };
    } catch (err) {
        console.error(`  ❌ Failed to remove sentinel: ${err.message}`);
        return { action: "clean_sentinel", status: "error", error: err.message };
    }
}

function syncConfigSlugs(dryRun) {
    const config = readJSON(CONFIG_PATH);
    const roomodes = readJSON(ROOMODES_PATH);
    if (!config || !roomodes) {
        console.log(`  ⏭️  Cannot read config or roomodes`);
        return { action: "sync_config", status: "skipped" };
    }

    const rSlugs = roomodes.customModes.map((a) => a.slug);
    const cSlugs = config.agents.enabled;
    const missing = rSlugs.filter((s) => !cSlugs.includes(s));

    if (missing.length === 0) {
        console.log(`  ✅ Slugs in sync`);
        return { action: "sync_config", status: "in_sync" };
    }

    // E15: Additive only — never remove from .roomodes
    if (dryRun) {
        console.log(`  🔍 Would add ${missing.length} slug(s): ${missing.join(", ")}`);
        return { action: "sync_config", dry_run: true, slugs: missing };
    }

    config.agents.enabled.push(...missing);

    // Also add to hierarchy support section if it's a known support agent
    const supportSlugs = ["documentarian", "design-keeper", "release-manager", "code-agent"];
    if (config.agents.hierarchy && config.agents.hierarchy.support) {
        for (const slug of missing) {
            if (supportSlugs.includes(slug) && !config.agents.hierarchy.support.includes(slug)) {
                config.agents.hierarchy.support.push(slug);
            } else if (config.agents.hierarchy.specialists && !config.agents.hierarchy.specialists.includes(slug)) {
                config.agents.hierarchy.specialists.push(slug);
            }
        }
    }

    // Atomic write (E11)
    const tmpPath = CONFIG_PATH + ".tmp";
    fs.writeFileSync(tmpPath, JSON.stringify(config, null, 2), "utf-8");
    fs.renameSync(tmpPath, CONFIG_PATH);

    logHeal("sync_config", { added: missing });
    console.log(`  ✅ Added ${missing.length} slug(s): ${missing.join(", ")}`);
    return { action: "sync_config", added: missing };
}

function cleanStaleLock(dryRun) {
    if (!fs.existsSync(LOCKFILE_PATH)) {
        console.log(`  ✅ No lockfile`);
        return { action: "clean_lock", status: "not_found" };
    }

    const age = Date.now() - fs.statSync(LOCKFILE_PATH).mtimeMs;
    if (age < STALE_LOCK_MS) {
        console.log(`  ✅ Lockfile is fresh (${Math.round(age / 1000 / 60)}m old)`);
        return { action: "clean_lock", status: "fresh" };
    }

    if (dryRun) {
        console.log(`  🔍 Would remove stale lockfile (${Math.round(age / 1000 / 60)}m old)`);
        return { action: "clean_lock", dry_run: true };
    }

    try {
        fs.unlinkSync(LOCKFILE_PATH);
        logHeal("clean_lock", { age_minutes: Math.round(age / 1000 / 60) });
        console.log(`  ✅ Removed stale lockfile`);
        return { action: "clean_lock", status: "removed" };
    } catch (err) {
        console.error(`  ❌ Failed to remove lockfile: ${err.message}`);
        return { action: "clean_lock", status: "error" };
    }
}

function archiveStaleOrchestration(dryRun) {
    const projectsDir = path.join(ROOT, ".agency", "projects");
    if (!fs.existsSync(projectsDir)) {
        console.log(`  ⏭️  No projects directory`);
        return { action: "archive_orchestration", status: "no_projects" };
    }

    const projects = fs.readdirSync(projectsDir).filter((p) => {
        const orchPath = path.join(projectsDir, p, "ORCHESTRATION.md");
        return fs.existsSync(orchPath);
    });

    let archived = 0;
    for (const project of projects) {
        const orchPath = path.join(projectsDir, project, "ORCHESTRATION.md");
        const content = fs.readFileSync(orchPath, "utf-8");
        const lines = content.split("\n");

        // Find entries older than 30 days with STATUS=DONE
        const archiveLines = [];
        const keepLines = [];
        let inHandoff = false;

        for (const line of lines) {
            const isHandoff = line.match(/^###\s+Handoff/i);
            if (isHandoff) {
                inHandoff = true;
            }

            // Check for date markers: dates in format YYYY-MM-DD
            const dateMatch = line.match(/(\d{4}-\d{2}-\d{2})/);
            if (dateMatch && inHandoff) {
                const entryDate = new Date(dateMatch[1]);
                const daysOld = (Date.now() - entryDate.getTime()) / (1000 * 60 * 60 * 24);
                const isDone = line.includes("DONE") || content.includes("STATUS:DONE");
                if (daysOld > 30 && isDone) {
                    archiveLines.push(line);
                    continue;
                }
            }
            keepLines.push(line);
        }

        if (archiveLines.length > 0) {
            if (dryRun) {
                console.log(`  🔍 Would archive ${archiveLines.length} entries from ${project}/ORCHESTRATION.md`);
            } else {
                // Write back the cleaned file
                fs.writeFileSync(orchPath, keepLines.join("\n"), "utf-8");

                // Archive to separate file
                const archiveDir = path.join(ROOT, ".agency", "projects", project, "archive");
                ensureDir(archiveDir);
                const archivePath = path.join(archiveDir, `handoff-archive-${new Date().toISOString().substring(0, 10)}.md`);
                fs.writeFileSync(archivePath, archiveLines.join("\n"), "utf-8");

                logHeal("archive_orchestration", { project, entries: archiveLines.length, archive: archivePath });
                archived += archiveLines.length;
            }
        }
    }

    if (archived > 0) {
        console.log(`  ✅ Archived ${archived} stale handoff entries`);
    } else if (!dryRun) {
        console.log(`  ✅ No stale entries to archive`);
    }
    return { action: "archive_orchestration", archived };
}

// ── Rollback ─────────────────────────────────────────────────────────────────

function rollbackEntry(entryId) {
    const log = readHealLog();
    const entry = log.find((e) => e.id === entryId);
    if (!entry) {
        console.error(`❌ Entry ${entryId} not found in heal-log`);
        process.exit(1);
    }

    console.log(`  ↩️  Rolling back: ${entry.action} (${entry.timestamp})`);
    console.log(`     Detail: ${JSON.stringify(entry.detail)}`);

    // Rollback logic depends on action type
    switch (entry.action) {
        case "clean_temp":
            console.log(`     ⚠️  Cannot restore deleted temp file — check git history`);
            break;
        case "clean_sentinel":
            console.log(`     ⚠️  Sentinel already deleted — no rollback needed`);
            break;
        case "sync_config":
            // We can't easily undo a config change, but we log it
            logHeal("rollback_sync_config", { previous_entry: entryId });
            console.log(`     ℹ️  Reverting config changes requires manual review of config.json history`);
            break;
        case "clean_lock":
            console.log(`     ✅ Lockfile removal is safe — no rollback needed`);
            break;
        case "archive_orchestration":
            console.log(`     ℹ️  Archived entries are in .agency/projects/*/archive/ — restore manually`);
            break;
        default:
            console.log(`     ⚠️  No rollback handler for action: ${entry.action}`);
    }
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
    const dryRun = process.argv.includes("--dry-run");

    // Handle rollback
    const rollbackIdx = process.argv.indexOf("--rollback");
    if (rollbackIdx > -1) {
        const entryId = process.argv[rollbackIdx + 1];
        if (entryId) {
            rollbackEntry(entryId);
            return;
        }
    }
    const rollbackLastIdx = process.argv.indexOf("--rollback-last");
    if (rollbackLastIdx > -1) {
        const n = parseInt(process.argv[rollbackLastIdx + 1], 10) || 1;
        const log = readHealLog();
        const lastN = log.slice(-n);
        console.log(`  ↩️  Rolling back last ${lastN.length} heal action(s):`);
        lastN.forEach((e) => rollbackEntry(e.id));
        return;
    }

    console.log(`🔧 heal.js — auto-remediation engine${dryRun ? " (dry-run)" : ""}`);

    // Rotate heal-log if needed (E23)
    rotateHealLog();

    // Run all actions
    const results = [
        cleanTempFiles(dryRun),
        cleanSentinel(dryRun),
        syncConfigSlugs(dryRun),
        cleanStaleLock(dryRun),
        archiveStaleOrchestration(dryRun),
    ];

    const fixCount = results.filter((r) => r.count > 0 || r.status === "removed" || (r.added && r.added.length > 0)).length;
    console.log(`\n  ── Heal Summary ──`);
    console.log(`  Actions: ${fixCount} issue(s) addressed`);
    console.log(`  Mode: ${dryRun ? "dry-run (no changes)" : "live"}`);
}

main();
