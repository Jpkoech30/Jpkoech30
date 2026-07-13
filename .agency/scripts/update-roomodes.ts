#!/usr/bin/env node

/**
 * update-roomodes.js — Updates .roomodes fileRegex patterns (Phase B)
 * Run: node .agency/scripts/update-roomodes.js
 *
 * Uses agent slug as anchor for precise targeting since multiple agents
 * may share the same initial regex pattern.
 */
const fs = require('fs');
const path = require('path');

/**
 * Main entry point.
 */
function main() {
    const ROOMODES = path.resolve(__dirname, '../..', '.roomodes');
    let content = fs.readFileSync(ROOMODES, 'utf-8');

    // Tuple: [slug, oldRegex, newRegex]
    const replacements = [
        // 1. backend-api — controllers, routes, DTOs
        [
            'backend-api',
            '"fileRegex": "^(?:[^/]+/)?apps/api/src/(?!prisma).*"',
            '"fileRegex": "^(?:[^/]+/)?(apps/api/src/.*\\.controller\\.ts|apps/api/src/.*\\.route\\.ts|apps/api/src/.*\\.dto\\.ts)$"',
        ],
        // 2. backend-service — services, providers, modules
        [
            'backend-service',
            '"fileRegex": "^(?:[^/]+/)?apps/api/src/(?!prisma).*"',
            '"fileRegex": "^(?:[^/]+/)?(apps/api/src/.*\\.service\\.ts|apps/api/src/.*\\.provider\\.ts|apps/api/src/.*\\.module\\.ts)$"',
        ],
        // 3. backend-integration — integrations, adapters, clients
        [
            'backend-integration',
            '"fileRegex": "^(?:[^/]+/)?apps/api/src/(?!prisma).*"',
            '"fileRegex": "^(?:[^/]+/)?(apps/api/src/.*\\.integration\\.ts|apps/api/src/.*\\.adapter\\.ts|apps/api/src/.*\\.client\\.ts)$"',
        ],
        // 4. backend-logic — logic, business, shared
        [
            'backend-logic',
            '"fileRegex": "^(?:[^/]+/)?(apps/api/src/(?!prisma).*|packages/shared/src/).*"',
            '"fileRegex": "^(?:[^/]+/)?(apps/api/src/.*\\.logic\\.ts|apps/api/src/.*\\.business\\.ts|packages/shared/src/.*)$"',
        ],
        // 5. frontend-ui — components only (add $ anchor)
        [
            'frontend-ui',
            '"fileRegex": "^(?:[^/]+/)?apps/web/src/components/.*"',
            '"fileRegex": "^(?:[^/]+/)?apps/web/src/components/.*$"',
        ],
        // 6. frontend-page — pages only (add $ anchor)
        [
            'frontend-page',
            '"fileRegex": "^(?:[^/]+/)?apps/web/src/pages/.*"',
            '"fileRegex": "^(?:[^/]+/)?apps/web/src/pages/.*$"',
        ],
        // 7. frontend-state — stores and hooks only (remove lib/, add $)
        [
            'frontend-state',
            '"fileRegex": "^(?:[^/]+/)?apps/web/src/(stores/|hooks/|lib/).*"',
            '"fileRegex": "^(?:[^/]+/)?apps/web/src/(stores/|hooks/).*$"',
        ],
    ];

    let replaced = 0;
    for (const [slug, oldRegex, newRegex] of replacements) {
        // Build a pattern that matches: slug line, then any content, then the old fileRegex
        // This ensures we target the correct agent's regex
        const escapedSlug = slug.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
        const escapedOld = oldRegex.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');

        // Pattern: find slug, then content up to the fileRegex on the same group
        // We use a non-greedy match to find the FIRST fileRegex after the slug
        const pattern = new RegExp(
            `("slug":\\s*"${escapedSlug}"[\\s\\S]*?${escapedOld})`,
            'g'
        );

        const match = content.match(pattern);
        if (match && match.length > 0) {
            // Replace the oldRegex within the matched block
            const matchedBlock = match[0];
            const oldRegexEscapedForReplace = oldRegex.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
            const blockRegex = new RegExp(oldRegexEscapedForReplace, 'g');
            const newBlock = matchedBlock.replace(blockRegex, newRegex);
            content = content.replace(matchedBlock, newBlock);
            replaced++;
            console.log(`  ✓ ${slug}: replaced`);
        } else {
            console.log(`  ✗ ${slug}: pattern NOT FOUND (trying fallback)`);
            // Fallback: try to find the exact oldRegex string somewhere
            const oldRegexEscaped = oldRegex.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
            const fallbackRegex = new RegExp(oldRegexEscaped, 'g');
            const fallbackMatch = content.match(fallbackRegex);
            if (fallbackMatch) {
                content = content.replace(fallbackRegex, newRegex);
                replaced++;
                console.log(`    ✓ ${slug}: fallback replaced (${fallbackMatch.length} occurrence(s))`);
            }
        }
    }

    fs.writeFileSync(ROOMODES, content, 'utf-8');
    console.log(`\nDone. ${replaced} replacement(s) made.`);
    // Check for correct patterns
    const checks = [
        ['backend-api', 'controller\\.ts'],
        ['backend-service', 'service\\.ts'],
        ['backend-integration', 'integration\\.ts'],
        ['backend-logic', 'logic\\.ts'],
        ['frontend-ui', 'components/'],
        ['frontend-page', 'pages/'],
        ['frontend-state', 'stores/|hooks/'],
    ];
    let failures = 0;
    for (const [slug, pattern] of checks) {
        const slugRegex = new RegExp(`"slug":\\s*"${slug}"[\\s\\S]*?${pattern}`);
        if (!slugRegex.test(content)) {
            console.log(`  ✗ VERIFY FAIL: ${slug} does not contain pattern "${pattern}"`);
            failures++;
        } else {
            console.log(`  ✓ VERIFY OK: ${slug}`);
        }
    }
    process.exit(failures > 0 ? 1 : 0);
}

main();
