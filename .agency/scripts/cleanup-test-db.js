#!/usr/bin/env node
const { execSync } = require("child_process"); try { execSync("npx tsx \"" + __dirname + "/cleanup-test-db.ts\"", { stdio: "inherit" }) } catch (e) { process.exit(1) }
