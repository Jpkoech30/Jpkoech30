#!/usr/bin/env node

// compact-memory.js — runs compaction asynchronously in cron
// Usage: node .agency/scripts/compact-memory.js --project <id>
//        node .agency/scripts/compact-memory.js --dry-run

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");

function main() {
    const dryRun = process.argv.includes("--dry-run");
    const projectArg = process.argv.indexOf("--project");
    const project = projectArg > -1 ? process.argv[projectArg + 1] : null;

    const filter = project ? `--project ${project}` : "";
    const cmd = `node "${path.join(__dirname, "memory.js")}" compact ${filter}${dryRun ? " --dry-run" : ""}`;

    console.log(`🗜️ compact-memory.js — running compaction${dryRun ? " (dry-run)" : ""}`);
    try {
        const output = execSync(cmd, { cwd: ROOT, stdio: "pipe", timeout: 60000 });
        console.log(output.toString());
        console.log(`✅ Compaction complete`);
    } catch (err) {
        console.error(`❌ Compaction failed: ${err.message}`);
        process.exit(1);
    }
}

main();
