#!/usr/bin/env node
/**
 * inject-pfg-oath.js — Inject PFG oath customInstructions[0] for all agents
 *
 * Sprint 11.2 — For ALL agents in .roomodes, prepend the PFG oath line to
 * the beginning of each agent's customInstructions.
 *
 * Run: node .agency/scripts/inject-pfg-oath.js
 */
const fs = require('fs');
const path = require('path');

const ROOMODES = path.resolve(__dirname, '../..', '.roomodes');
let content = fs.readFileSync(ROOMODES, 'utf-8');

const PFG_LINE = `CRITICAL — FIRST ACTION: You MUST recite the pre-task oath from AGENCY-RULES.md v5.0 §PRE-TASK OATH BEFORE executing ANY tool. Output: "🧠 Bound by AGENCY-RULES v5.0. Pre-flight passed. Cost estimate: ~X,XXX tokens (~KES Y.YY). Sections: [applicable sections]." Then run: node .agency/scripts/preflight-gate.js pass --agent <slug> --task "<brief description>".\n\n`;

// Parse as JSON to iterate agents
const data = JSON.parse(content);
const agents = data.customModes;
let modified = 0;

for (const agent of agents) {
    const slug = agent.slug;
    const ci = agent.customInstructions;

    // Check if already has PFG line
    if (ci.startsWith(PFG_LINE)) {
        console.log(`  - ${slug}: already has PFG oath, skipping`);
        continue;
    }

    // Build updated instructions
    const updated = PFG_LINE + ci;

    // Find this agent's customInstructions in the raw text
    // Use slug as anchor, then find customInstructions after it
    const slugAnchor = `"slug": "${slug}"`;
    const slugIdx = content.indexOf(slugAnchor);
    if (slugIdx === -1) {
        console.log(`  ✗ ${slug}: slug not found in raw text`);
        continue;
    }

    const ciKey = `"customInstructions": "`;
    const afterSlug = content.slice(slugIdx);
    const ciKeyIdx = afterSlug.indexOf(ciKey);
    if (ciKeyIdx === -1) {
        console.log(`  ✗ ${slug}: customInstructions key not found after slug`);
        continue;
    }

    const ciStart = slugIdx + ciKeyIdx + ciKey.length;

    // Find the end of the customInstructions value.
    // JSON strings escape internal quotes, so we need to find the
    // closing quote that is NOT preceded by a backslash.
    // We scan character by character from ciStart.
    let ciEnd = ciStart;
    let escaped = false;
    while (ciEnd < content.length) {
        const ch = content[ciEnd];
        if (escaped) {
            escaped = false;
        } else if (ch === '\\') {
            escaped = true;
        } else if (ch === '"') {
            break;
        }
        ciEnd++;
    }

    // Extract the old value
    const oldValue = content.substring(ciStart, ciEnd);

    // Build the new value by prepending PFG line
    const newValue = PFG_LINE.replace(/\n/g, '\\n') + oldValue;

    // Replace in content
    content = content.slice(0, ciStart) + newValue + content.slice(ciEnd);
    modified++;
    console.log(`  ✓ ${slug}: PFG oath prepended`);
}

fs.writeFileSync(ROOMODES, content, 'utf-8');
console.log(`\nDone. ${modified} agent(s) modified.`);
