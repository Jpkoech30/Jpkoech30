#!/usr/bin/env node
const { execSync } = require("child_process"); try { execSync("npx tsx \"" + __dirname + "/update-roomodes.ts\"", { stdio: "inherit" }) } catch (e) { process.exit(1) }
