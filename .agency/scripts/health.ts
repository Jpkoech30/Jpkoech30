#!/usr/bin/env node

/**
 * health.js — Self-Health Check (Phase 1, Self-Improvement)
 *
 * Verifies all agency subsystems are operational without an LLM.
 * Edge case guards: stale lockfile detection, orphan file safelist,
 * additive-only config sync, atomic writes, partial heal recovery.
 *
 * Usage: node .agency/scripts/health.js
 *        node .agency/scripts/health.js --output ./custom-report.json
 *        node .agency/scripts/health.js --fix   (apply auto-fixes)
 *        node .agency/scripts/health.js --fix --dry-run  (preview fixes)
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const ENFORCER_DIR = path.join(ROOT, ".agency", "enforcer");
const MEMORY_DIR = path.join(ROOT, ".agency", "memory");
const TELEMETRY_DIR = path.join(ROOT, ".agency", "telemetry");
const CONFIG_PATH = path.join(ROOT, ".agency", "config.json");
const ROOMODES_PATH = path.join(ROOT, ".roomodes");
const REPORTS_DIR = path.join(ROOT, ".agency", "reports", "health");
const OUTPUT_PATH = path.join(REPORTS_DIR, "latest.json");
const HEAL_LOG_PATH = path.join(ROOT, ".agency", "reports", "heal-log.ndjson");
const LOCKFILE_PATH = path.join(ROOT, ".agency", ".improve-lock");
const HUSKY_HOOK = path.join(ROOT, ".husky", "post-commit");

const STALE_LOCK_MS = 2 * 60 * 60 * 1000; // 2 hours
const STALE_TELEMETRY_HOURS = 24;
const TEMP_FILE_AGE_MS = 24 * 60 * 60 * 1000; // 24h
const SAFELIST = [".gitignore", ".gitattributes", ".editorconfig"];
const TEMP_PATTERNS = [/^temp-/i, /\.bak$/, /^ROO-/i, /^PLAN-/i, /^\$null/];
const HEAL_LOG_ROTATE_AT = 1000;

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

function logHeal(action, detail) {
    const entry = {
        timestamp: new Date().toISOString(),
        action,
        detail,
        host: require("os").hostname(),
    };
    ensureDir(path.dirname(HEAL_LOG_PATH));
    fs.appendFileSync(HEAL_LOG_PATH, JSON.stringify(entry) + "\n", "utf-8");
}

function isStaleLockfile() {
    if (!fs.existsSync(LOCKFILE_PATH)) return false;
    const age = Date.now() - fs.statSync(LOCKFILE_PATH).mtimeMs;
    return age > STALE_LOCK_MS;
}

function rotateHealLog() {
    if (!fs.existsSync(HEAL_LOG_PATH)) return false;
    const content = fs.readFileSync(HEAL_LOG_PATH, "utf-8");
    const lines = content.split("\n").filter(Boolean).length;
    if (lines < HEAL_LOG_ROTATE_AT) return false;

    const archiveDir = path.join(ROOT, ".agency", "reports", "heal-archive");
    ensureDir(archiveDir);
    const archiveName = `heal-log-${new Date().toISOString().substring(0, 10)}.ndjson.gz`;
    // We rotate by renaming (keeping raw for now; gzip requires zlib)
    const archivePath = path.join(archiveDir, archiveName.replace(".gz", ""));
    fs.renameSync(HEAL_LOG_PATH, archivePath);
    console.log(`  ♻️  Heal-log rotated (${lines} entries → ${archiveName})`);
    return true;
}

// ── Checks ──────────────────────────────────────────────────────────────────

function checkEnforcerDB() {
    const dbPath = path.join(ENFORCER_DIR, "enforcer.db");
    if (!fs.existsSync(dbPath)) {
        return { name: "enforcer_db", passed: false, detail: "File not found" };
    }
    try {
        const buf = Buffer.alloc(16);
        const fd = fs.openSync(dbPath, "r");
        fs.readSync(fd, buf, 0, 16, 0);
        fs.closeSync(fd);
        // Check SQLite header: starts with "SQLite format 3\0"
        const isSQLite = buf.toString("utf-8", 0, 15) === "SQLite format 3";
        if (!isSQLite) {
            return { name: "enforcer_db", passed: false, detail: "Not a valid SQLite file" };
        }
        const size = fs.statSync(dbPath).size;
        return { name: "enforcer_db", passed: true, detail: `${size}b, valid SQLite` };
    } catch (err) {
        return { name: "enforcer_db", passed: false, detail: err.message };
    }
}

function checkMemoryDB() {
    const dbPath = path.join(MEMORY_DIR, "store.db");
    if (!fs.existsSync(dbPath)) {
        return { name: "memory_db", passed: false, detail: "store.db not found" };
    }
    try {
        const buf = Buffer.alloc(16);
        const fd = fs.openSync(dbPath, "r");
        fs.readSync(fd, buf, 0, 16, 0);
        fs.closeSync(fd);
        const isSQLite = buf.toString("utf-8", 0, 15) === "SQLite format 3";
        if (!isSQLite) {
            return { name: "memory_db", passed: false, detail: "Not a valid SQLite file" };
        }
        // Check for WAL mode (presence of -shm and -wal files)
        const hasWAL =
            fs.existsSync(dbPath + "-shm") || fs.existsSync(dbPath + "-wal");
        return {
            name: "memory_db",
            passed: true,
            detail: `valid SQLite${hasWAL ? ", WAL mode" : ""}`,
        };
    } catch (err) {
        return { name: "memory_db", passed: false, detail: err.message };
    }
}

function checkTelemetry() {
    if (!fs.existsSync(TELEMETRY_DIR)) {
        return { name: "telemetry", passed: false, detail: "Directory not found" };
    }
    const files = fs.readdirSync(TELEMETRY_DIR).filter((f) => f.endsWith(".jsonl") || f.endsWith(".ndjson"));
    if (files.length === 0) {
        return { name: "telemetry", passed: false, detail: "No telemetry files found" };
    }
    // Check most recent file isn't stale (>24h since last write)
    const latest = files
        .map((f) => ({ name: f, mtime: fs.statSync(path.join(TELEMETRY_DIR, f)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime)[0];
    const ageHours = (Date.now() - latest.mtime) / (1000 * 60 * 60);
    if (ageHours > STALE_TELEMETRY_HOURS) {
        return {
            name: "telemetry",
            passed: false,
            detail: `Last event ${Math.round(ageHours)}h ago (>${STALE_TELEMETRY_HOURS}h threshold)`,
        };
    }
    return { name: "telemetry", passed: true, detail: `${files.length} file(s), last event ${Math.round(ageHours)}h ago` };
}

function checkConfigValid(dryRun, applyFixes) {
    const config = readJSON(CONFIG_PATH);
    if (!config) {
        return { name: "config_valid", passed: false, detail: "Invalid JSON or file not found" };
    }
    if (!config.agents || !config.agents.enabled) {
        return { name: "config_valid", passed: false, detail: "Missing agents.enabled array" };
    }

    // Check roomodes
    const roomodes = readJSON(ROOMODES_PATH);
    if (!roomodes || !roomodes.customModes) {
        return { name: "config_valid", passed: false, detail: ".roomodes invalid JSON" };
    }

    const rSlugs = roomodes.customModes.map((a) => a.slug);
    const cSlugs = config.agents.enabled;

    // Find slugs in .roomodes but missing from config (additive fix)
    const missing = rSlugs.filter((s) => !cSlugs.includes(s));
    // Find slugs in config but missing from .roomodes (report only — never remove)
    const extra = cSlugs.filter((s) => !rSlugs.includes(s));

    const issues = [];
    if (missing.length > 0) issues.push(`${missing.length} slug(s) in .roomodes not in config`);
    if (extra.length > 0) issues.push(`${extra.length} slug(s) in config not in .roomodes (not auto-fixable)`);

    if (issues.length === 0) {
        return { name: "config_valid", passed: true, detail: `${rSlugs.length} agents in sync` };
    }

    // Auto-fix (additive only — E15 guard)
    if (applyFixes && missing.length > 0) {
        if (dryRun) {
            return {
                name: "config_valid",
                passed: false,
                detail: issues.join("; "),
                auto_fix_preview: `Would add: ${missing.join(", ")}`,
            };
        }
        // Add missing slugs
        config.agents.enabled.push(...missing);
        // Also update hierarchy if applicable
        for (const section of ["specialists", "support"]) {
            if (config.agents.hierarchy && config.agents.hierarchy[section]) {
                for (const slug of missing) {
                    if (!config.agents.hierarchy[section].includes(slug)) {
                        config.agents.hierarchy[section].push(slug);
                    }
                }
            }
        }
        // Atomic write (E11 guard)
        const tmpPath = CONFIG_PATH + ".tmp";
        fs.writeFileSync(tmpPath, JSON.stringify(config, null, 2), "utf-8");
        fs.renameSync(tmpPath, CONFIG_PATH);
        logHeal("config_sync", { added: missing });
        return {
            name: "config_valid",
            passed: true,
            detail: `Auto-fixed: added ${missing.length} missing slug(s): ${missing.join(", ")}`,
            auto_fixed: true,
        };
    }

    return { name: "config_valid", passed: false, detail: issues.join("; ") };
}

function checkRoomodes() {
    const roomodes = readJSON(ROOMODES_PATH);
    if (!roomodes) {
        return { name: "roomodes_valid", passed: false, detail: "Invalid JSON" };
    }
    if (!roomodes.customModes || !Array.isArray(roomodes.customModes)) {
        return { name: "roomodes_valid", passed: false, detail: "Missing customModes array" };
    }
    const slugs = roomodes.customModes.map((a) => a.slug);
    const duplicates = slugs.filter((s, i) => slugs.indexOf(s) !== i);
    if (duplicates.length > 0) {
        return { name: "roomodes_valid", passed: false, detail: `Duplicate slugs: ${[...new Set(duplicates)].join(", ")}` };
    }
    // Check all agents have customInstructions
    const missingCI = roomodes.customModes.filter((a) => !a.customInstructions);
    if (missingCI.length > 0) {
        return {
            name: "roomodes_valid",
            passed: false,
            detail: `${missingCI.length} agent(s) missing customInstructions: ${missingCI.map((a) => a.slug).join(", ")}`,
        };
    }
    return { name: "roomodes_valid", passed: true, detail: `${slugs.length} agents, all valid` };
}

function checkTempFiles(dryRun, applyFixes) {
    const rootFiles = fs.readdirSync(ROOT);
    const tempFiles = [];

    for (const file of rootFiles) {
        // Skip safelisted files (E12 guard)
        if (SAFELIST.includes(file)) continue;
        // Check against temp patterns
        const matches = TEMP_PATTERNS.some((p) => p.test(file));
        if (!matches) continue;

        const filePath = path.join(ROOT, file);
        try {
            const stat = fs.statSync(filePath);
            if (!stat.isFile()) continue;

            // Age check: only delete files >24h old (E14 guard)
            const ageMs = Date.now() - stat.mtimeMs;
            if (ageMs < TEMP_FILE_AGE_MS) continue;

            tempFiles.push({ name: file, age_hours: Math.round(ageMs / (1000 * 60 * 60)), size: stat.size });
        } catch {
            // skip locked/unreadable files
        }
    }

    if (tempFiles.length === 0) {
        return { name: "temp_files", passed: true, detail: "No orphan temp files" };
    }

    if (applyFixes) {
        if (dryRun) {
            return {
                name: "temp_files",
                passed: false,
                detail: `${tempFiles.length} file(s) to clean`,
                auto_fix_preview: tempFiles.map((f) => `${f.name} (${f.age_hours}h old)`),
            };
        }
        const cleaned = [];
        for (const f of tempFiles) {
            try {
                fs.unlinkSync(path.join(ROOT, f.name));
                logHeal("clean_temp", { file: f.name, age_hours: f.age_hours });
                cleaned.push(f.name);
            } catch {
                // file may be locked
            }
        }
        return {
            name: "temp_files",
            passed: cleaned.length === tempFiles.length,
            detail: `Cleaned ${cleaned.length}/${tempFiles.length} temp file(s)`,
            files_cleaned: cleaned.length,
            auto_fixed: cleaned.length > 0,
        };
    }

    return {
        name: "temp_files",
        passed: false,
        detail: `${tempFiles.length} orphan temp file(s) found (run --fix to clean)`,
        files_found: tempFiles,
    };
}

function checkStaleSentinels(dryRun, applyFixes) {
    const sentinelPath = path.join(ROOT, ".agency", ".preflight-passed");
    if (!fs.existsSync(sentinelPath)) {
        return { name: "stale_sentinels", passed: true, detail: "No stale sentinels" };
    }

    if (applyFixes) {
        if (dryRun) {
            return { name: "stale_sentinels", passed: false, detail: "Would remove .agency/.preflight-passed", auto_fix_preview: "rm .agency/.preflight-passed" };
        }
        try {
            fs.unlinkSync(sentinelPath);
            logHeal("remove_sentinel", { path: ".agency/.preflight-passed" });
            return { name: "stale_sentinels", passed: true, detail: "Removed stale .preflight-passed sentinel", auto_fixed: true };
        } catch (err) {
            return { name: "stale_sentinels", passed: false, detail: `Failed to remove: ${err.message}` };
        }
    }

    return { name: "stale_sentinels", passed: false, detail: "Found .agency/.preflight-passed (run --fix to remove)" };
}

function checkCommitHook() {
    if (!fs.existsSync(HUSKY_HOOK)) {
        return { name: "commit_hook", passed: false, detail: "File not found" };
    }
    try {
        const stat = fs.statSync(HUSKY_HOOK);
        // Check if executable (Unix: mode & 0o111; Windows: .sh or .js)
        const isExec = process.platform !== "win32" ? (stat.mode & 0o111) !== 0 : true;
        return {
            name: "commit_hook",
            passed: isExec,
            detail: isExec ? `Exists, ${stat.size}b` : "Not executable",
        };
    } catch {
        return { name: "commit_hook", passed: false, detail: "Cannot stat" };
    }
}

function checkHealLogSize() {
    if (!fs.existsSync(HEAL_LOG_PATH)) {
        return { name: "heal_log_size", passed: true, detail: "No heal-log" };
    }
    const content = fs.readFileSync(HEAL_LOG_PATH, "utf-8");
    const lines = content.split("\n").filter(Boolean).length;
    if (lines >= HEAL_LOG_ROTATE_AT) {
        const rotated = rotateHealLog();
        return {
            name: "heal_log_size",
            passed: true,
            detail: rotated ? `Rotated (was ${lines} entries)` : `${lines} entries`,
            auto_fixed: rotated,
        };
    }
    return { name: "heal_log_size", passed: true, detail: `${lines} entries (limit: ${HEAL_LOG_ROTATE_AT})` };
}

function checkLockfile() {
    if (!fs.existsSync(LOCKFILE_PATH)) {
        return { name: "lockfile", passed: true, detail: "No lockfile" };
    }
    if (isStaleLockfile()) {
        try {
            fs.unlinkSync(LOCKFILE_PATH);
            logHeal("remove_stale_lock", { path: ".agency/.improve-lock" });
            return { name: "lockfile", passed: true, detail: "Removed stale lockfile (>2h old)", auto_fixed: true };
        } catch (err) {
            return { name: "lockfile", passed: false, detail: `Stale lockfile exists, could not remove: ${err.message}` };
        }
    }
    return { name: "lockfile", passed: true, detail: "Lockfile present (fresh)" };
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
    const outputArg = process.argv.indexOf("--output");
    const outputPath = outputArg > -1 ? process.argv[outputArg + 1] : OUTPUT_PATH;
    const applyFixes = process.argv.includes("--fix");
    const dryRun = process.argv.includes("--dry-run");

    console.log(`🩺 health.js — self-health check${applyFixes ? " (with auto-fix)" : ""}${dryRun ? " (dry-run)" : ""}`);

    // Run all checks
    const checks = [
        checkEnforcerDB(),
        checkMemoryDB(),
        checkTelemetry(),
        checkConfigValid(dryRun, applyFixes),
        checkRoomodes(),
        checkTempFiles(dryRun, applyFixes),
        checkStaleSentinels(dryRun, applyFixes),
        checkCommitHook(),
        checkHealLogSize(),
        checkLockfile(),
    ];

    const passed = checks.filter((c) => c.passed).length;
    const total = checks.length;
    const autoFixes = checks.filter((c) => c.auto_fixed).length;
    const status = passed === total ? "HEALTHY" : passed >= total - 2 ? "DEGRADED" : "UNHEALTHY";

    const result = {
        status,
        generated_at: new Date().toISOString(),
        hostname: require("os").hostname(),
        checks,
        summary: {
            passed: `${passed}/${total}`,
            auto_fixes: autoFixes,
        },
    };

    // Write output
    ensureDir(path.dirname(outputPath));
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");

    console.log(`\n  ── Health Summary ──`);
    console.log(`  Status: ${status}`);
    for (const c of checks) {
        const icon = c.passed ? "✅" : "❌";
        const fix = c.auto_fixed ? " (auto-fixed)" : "";
        console.log(`  ${icon} ${c.name}: ${c.detail}${fix}`);
    }
    console.log(`  📄 Output: ${outputPath}`);
}

main();
