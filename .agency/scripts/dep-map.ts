#!/usr/bin/env node

// dep-map.js — Hotfix dependency mapping
// Prints dependent consumers for a changed file
// Usage: node .agency/scripts/dep-map.js --file <changed-file-path>
//        node .agency/scripts/dep-map.js --file apps/api/src/user.service.ts

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");

// Known dependency map (static — built from project structure)
const KNOWN_MAP = {
    // Backend → Backend
    "apps/api/src/controllers/": ["apps/api/src/services/", "apps/api/src/integrations/"],
    "apps/api/src/services/": ["apps/api/src/controllers/", "apps/api/src/integrations/"],
    "apps/api/src/integrations/": ["apps/api/src/services/"],
    "apps/api/prisma/": ["apps/api/src/services/", "apps/api/src/controllers/"],
    "packages/shared/": ["apps/api/src/", "apps/web/src/", "apps/mobile/src/"],

    // Backend → Frontend
    "apps/api/src/": ["apps/web/src/stores/", "apps/web/src/hooks/", "apps/mobile/src/stores/"],

    // Frontend → Frontend
    "apps/web/src/components/": ["apps/web/src/pages/", "apps/web/src/stores/"],
    "apps/web/src/stores/": ["apps/web/src/pages/", "apps/web/src/components/"],
    "apps/web/src/hooks/": ["apps/web/src/pages/", "apps/web/src/components/"],

    // Mobile → Mobile
    "apps/mobile/src/components/": ["apps/mobile/src/app/"],
    "apps/mobile/src/stores/": ["apps/mobile/src/app/"],
    "apps/mobile/src/hooks/": ["apps/mobile/src/app/"],

    // Cross-platform
    "apps/web/": ["apps/mobile/"],
    "apps/mobile/": ["apps/web/"],
};

function findDependents(filePath) {
    const results = [];

    for (const [source, dependents] of Object.entries(KNOWN_MAP)) {
        if (filePath.includes(source.replace(/\/$/, "")) || filePath.startsWith(source)) {
            results.push(...dependents);
        }
    }

    // Also check shared packages
    if (filePath.includes("packages/shared")) {
        results.push("apps/api/src/ (all)", "apps/web/src/ (all)", "apps/mobile/src/ (all)");
    }

    // Remove duplicates
    return [...new Set(results)];
}

function main() {
    const fileArg = process.argv.indexOf("--file");
    const filePath = fileArg > -1 ? process.argv[fileArg + 1] : null;

    if (!filePath) {
        console.error("❌ Usage: node .agency/scripts/dep-map.js --file <path>");
        process.exit(1);
    }

    console.log(`🔍 Dependency map for: ${filePath}`);
    console.log("");

    const dependents = findDependents(filePath);

    if (dependents.length === 0) {
        console.log("  No known dependents — isolated change, safe for hotfix");
        console.log("");
        console.log("  ⚠️  This is a static map. Manual review still recommended.");
        process.exit(0);
    }

    console.log(`  ⚠️  ${dependents.length} dependent area(s) found:`);
    console.log("");
    for (const dep of dependents) {
        console.log(`     🡒 ${dep}`);
    }
    console.log("");
    console.log("  Recommended: Run E2E tests on all dependent areas after hotfix.");
    console.log("  Run: node .agency/scripts/qa-automator.js --scope dependents");
}

main();
