#!/usr/bin/env node
// @ts-nocheck
/**
 * close-tabs.js � Close all VS Code editor tabs
 * Usage: node .agency/scripts/close-tabs.js
 * Run from VS Code integrated terminal.
 */
try {
    const { execSync } = require("child_process");
    console.log("Closing all editor tabs...");
    execSync('code --command "workbench.action.closeAllEditors"', { stdio: "inherit", timeout: 5000 });
    console.log("All editor tabs closed");
} catch (err) {
    console.log("Could not close tabs automatically.");
    console.log("Manual: Ctrl+K Ctrl+W to close all editors");
}
