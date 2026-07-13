#!/usr/bin/env node
const { execSync } = require("child_process"); try { execSync("npx tsx \"" + __dirname + "/version-check.ts\"", { stdio: "inherit" }) } catch (e) { process.exit(1) }
