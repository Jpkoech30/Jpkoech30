#!/usr/bin/env node
/**
 * fix-roomodes.js — Fix backend-service and backend-integration regexes
 * Both got backend-api's controller/route/dto pattern by mistake.
 *
 * Uses agent slug as anchor, finds the fileRegex on the NEXT line after
 * the slug's edit group start, and replaces it.
 */
const fs = require('fs');
const path = require('path');

const ROOMODES = path.resolve(__dirname, '../..', '.roomodes');
let content = fs.readFileSync(ROOMODES, 'utf-8');

const fixes = [
    {
        slug: 'backend-service',
        current: '"fileRegex": "^(?:[^/]+/)?(apps/api/src/.*\\.controller\\.ts|apps/api/src/.*\\.route\\.ts|apps/api/src/.*\\.dto\\.ts)$"',
        replacement: '"fileRegex": "^(?:[^/]+/)?(apps/api/src/.*\\.service\\.ts|apps/api/src/.*\\.provider\\.ts|apps/api/src/.*\\.module\\.ts)$"',
    },
    {
        slug: 'backend-integration',
        current: '"fileRegex": "^(?:[^/]+/)?(apps/api/src/.*\\.controller\\.ts|apps/api/src/.*\\.route\\.ts|apps/api/src/.*\\.dto\\.ts)$"',
        replacement: '"fileRegex": "^(?:[^/]+/)?(apps/api/src/.*\\.integration\\.ts|apps/api/src/.*\\.adapter\\.ts|apps/api/src/.*\\.client\\.ts)$"',
    },
];

for (const { slug, current, replacement } of fixes) {
    // Escape strings for regex
    const escSlug = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escCurrent = current.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Find the slug and locate the fileRegex after it
    const slugIndex = content.indexOf(`"slug": "${slug}"`);
    if (slugIndex === -1) {
        console.log(`  ✗ ${slug}: slug not found`);
        continue;
    }

    // Find the fileRegex after the slug
    const afterSlug = content.slice(slugIndex);
    const fileRegexIndex = afterSlug.indexOf(current);
    if (fileRegexIndex === -1) {
        console.log(`  ✗ ${slug}: current regex not found after slug`);
        continue;
    }

    // Replace only this occurrence
    const globalIndex = slugIndex + fileRegexIndex;
    content = content.slice(0, globalIndex) + replacement + content.slice(globalIndex + current.length);
    console.log(`  ✓ ${slug}: fixed`);
}

fs.writeFileSync(ROOMODES, content, 'utf-8');

// Verify
const verifications = [
    { slug: 'backend-service', shouldContain: 'service\\.ts' },
    { slug: 'backend-integration', shouldContain: 'integration\\.ts' },
];
let allOk = true;
for (const { slug, shouldContain } of verifications) {
    const escSlug = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`"slug":\\s*"${escSlug}"[\\s\\S]*?${shouldContain}`);
    if (regex.test(content)) {
        console.log(`  ✓ VERIFY: ${slug} has correct pattern`);
    } else {
        console.log(`  ✗ VERIFY FAIL: ${slug} does not have correct pattern`);
        allOk = false;
    }
}

process.exit(allOk ? 0 : 1);
