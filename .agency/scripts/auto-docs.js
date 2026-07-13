#!/usr/bin/env node
const { execSync } = require("child_process"); try { execSync("npx tsx \"" + __dirname + "/auto-docs.ts\"", { stdio: "inherit" }) } catch (e) { process.exit(1) }
