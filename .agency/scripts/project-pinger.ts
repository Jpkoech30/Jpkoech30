#!/usr/bin/env node
// @ts-nocheck
// project-pinger.js — Archives memory for inactive projects
// Usage: node .agency/scripts/project-pinger.js
//        node .agency/scripts/project-pinger.js --dry-run
//        node .agency/scripts/project-pinger.js --force <project-id>

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");
const PROJECTS_DIR = path.join(ROOT, ".agency", "projects");
const ARCHIVE_DIR = path.join(ROOT, ".agency", "archives");
const MEMORY_SCRIPT = path.join(__dirname, "memory.js");
const INACTIVE_DAYS = 20;

function main() {
    const dryRun = process.argv.includes("--dry-run");
    const forceIdx = process.argv.indexOf("--force");
    const forceProject = forceIdx > -1 ? process.argv[forceIdx + 1] : null;

    console.log(`📡 project-pinger.js — checking project activity${dryRun ? " (dry-run)" : ""}`);

    if (!fs.existsSync(PROJECTS_DIR)) {
        console.log("  ⏭️  No projects directory");
        return;
    }

    const projects = fs.readdirSync(PROJECTS_DIR).filter(p => {
        return fs.statSync(path.join(PROJECTS_DIR, p)).isDirectory();
    });

    let archived = 0;

    for (const project of projects) {
        // If force flag matches, skip inactivity check
        if (forceProject && forceProject !== project) continue;

        // Check last commit date for the project directory
        let lastCommitDays = 999;
        try {
            const gitLog = execSync(
                `git log --oneline --since="${INACTIVE_DAYS} days ago" -- .agency/projects/${project}/ 2>&1`,
                { cwd: ROOT, stdio: "pipe", timeout: 10000 }
            ).toString().trim();

            if (gitLog.length > 0) {
                // Has recent activity
                lastCommitDays = 0;
            } else {
                // No recent activity — check when last commit was
                try {
                    const lastDate = execSync(
                        `git log -1 --format="%ct" -- .agency/projects/${project}/ 2>&1`,
                        { cwd: ROOT, stdio: "pipe", timeout: 10000 }
                    ).toString().trim();
                    if (lastDate) {
                        lastCommitDays = Math.floor((Date.now() - parseInt(lastDate) * 1000) / (1000 * 60 * 60 * 24));
                    }
                } catch {
                    lastCommitDays = 999;
                }
            }
        } catch {
            // If git fails, check filesystem mtime
            try {
                const projectPath = path.join(PROJECTS_DIR, project);
                const files = fs.readdirSync(projectPath);
                let latestMtime = 0;
                for (const f of files) {
                    const mtime = fs.statSync(path.join(projectPath, f)).mtimeMs;
                    if (mtime > latestMtime) latestMtime = mtime;
                }
                lastCommitDays = Math.floor((Date.now() - latestMtime) / (1000 * 60 * 60 * 24));
            } catch {
                lastCommitDays = 999;
            }
        }

        const isInactive = forceProject ? true : lastCommitDays > INACTIVE_DAYS;

        if (isInactive) {
            console.log(`  📦 ${project}: inactive for ${lastCommitDays}d — archiving memory`);

            if (!dryRun) {
                const archivePath = path.join(ARCHIVE_DIR, `${project}-memory-${new Date().toISOString().substring(0, 10)}.json`);
                if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

                try {
                    execSync(
                        `node "${MEMORY_SCRIPT}" export --project "${project}" --output "${archivePath}"`,
                        { cwd: ROOT, stdio: "pipe", timeout: 30000 }
                    );
                    console.log(`     ✅ Exported to ${archivePath}`);
                    archived++;
                } catch (err) {
                    console.error(`     ❌ Export failed: ${err.message}`);
                }
            } else {
                console.log(`     🔍 Would export to ${ARCHIVE_DIR}/${project}-memory-*.json`);
                archived++;
            }
        } else {
            console.log(`  ✅ ${project}: active (last commit ${lastCommitDays}d ago)`);
        }
    }

    console.log(`\n  📊 Archived: ${archived} project(s)`);
    if (archived === 0) {
        console.log("  ✅ All projects active — no archiving needed");
    }
}

main();
