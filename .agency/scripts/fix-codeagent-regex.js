#!/usr/bin/env node
/**
 * fix-codeagent-regex.js — Widen code-agent's fileRegex to include .roomodes
 * and other extensionless root config files.
 *
 * Sprint 11.6 — Prerequisite for PFG (Pre-Flight Gate) enforcement
 *
 * Run: node .agency/scripts/fix-codeagent-regex.js
 */
const fs = require('fs');
const path = require('path');

const ROOMODES = path.resolve(__dirname, '../..', '.roomodes');
let content = fs.readFileSync(ROOMODES, 'utf-8');

// Widen code-agent regex to include extensionless root config files
const slug = 'code-agent';
// Raw JSON file has \\ as JSON-escaped backslash, so match two backslashes
const oldRegex = '"fileRegex": "\\\\.(tsx?|jsx?|css|json)$"';
const newRegex = '"fileRegex": "(\\\\.(tsx?|jsx?|css|json)$|^\\\\.[a-z-]+\\\\.json$|^\\\\.[a-z-]+$)"';

// Find the slug and locate the fileRegex after it
const slugIndex = content.indexOf(`"slug": "${slug}"`);
if (slugIndex === -1) {
    console.error(`✗ ${slug}: slug not found`);
    process.exit(1);
}

// Find the fileRegex after the slug
const afterSlug = content.slice(slugIndex);
const fileRegexIndex = afterSlug.indexOf(oldRegex);
if (fileRegexIndex === -1) {
    console.error(`✗ ${slug}: current regex not found after slug`);
    process.exit(1);
}

// Replace only this occurrence
const globalIndex = slugIndex + fileRegexIndex;
content = content.slice(0, globalIndex) + newRegex + content.slice(globalIndex + oldRegex.length);

fs.writeFileSync(ROOMODES, content, 'utf-8');
console.log(`✓ ${slug}: fileRegex widened to include extensionless root configs`);
