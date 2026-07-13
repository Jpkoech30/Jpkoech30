#!/usr/bin/env node
const { execSync } = require("child_process"); try { execSync("npx tsx \"" + __dirname + "/verify-loop.ts\"", { stdio: "inherit" }) } catch (e) { process.exit(1) }
