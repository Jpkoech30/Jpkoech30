#!/usr/bin/env node
const { execSync } = require("child_process"); try { execSync("npx tsx \"" + __dirname + "/escalate-lead.ts\"", { stdio: "inherit" }) } catch (e) { process.exit(1) }
