#!/usr/bin/env node
/**
 * TypeScript Shim — delegates to .ts implementation
 */
const { execSync } = require("child_process");
try {
    execSync('npx tsx "' + __dirname + '\\'telemetry.ts"', { stdio: "inherit" });
} catch (e) {
    process.exit(1);
}
