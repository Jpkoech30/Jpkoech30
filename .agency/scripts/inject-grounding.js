#!/usr/bin/env node
/**
 * inject-grounding.js — Injects GROUNDING (Hybrid Retrieval) section into ALL 31 agents
 * Run: node .agency/scripts/inject-grounding.js
 *
 * Replaces `## SEMANTIC MEMORY INTEGRATION` with `## GROUNDING (Hybrid Retrieval)`
 * in .roomodes customInstructions for every agent. For agents without the SEMANTIC
 * section, inserts the GROUNDING section before the first `##` heading.
 * Also replaces "Read PROJECT.md and ORCHESTRATION.md" references.
 */
const fs = require('fs');
const path = require('path');

const ROOMODES_PATH = path.resolve(__dirname, '../..', '.roomodes');

const GROUNDING_SECTION = `## GROUNDING (Hybrid Retrieval — saves ~95% tokens)
Before starting ANY new task:
1. RECALL: node .agency/scripts/memory.js recall --query "<brief description>" --limit 5
2. If top result > 50% → proceed with recalled context
3. If no result > 50% → read specific sections of AGENCY-RULES.md using findstr/rg
4. If no results at all → read PROJECT.md + relevant ORCHESTRATION.md sections

## SAFETY: If task involves:
- SECURITY → always read PRINCIPAL 1 (AGENCY-RULES.md:56-77)
- FINANCE → always read PRINCIPAL 2 (AGENCY-RULES.md:79-93)
- MOBILE → always read Key Constraints from PROJECT.md
- COMMIT/HANDOFF → always read §8 GIT HANDSHAKE (AGENCY-RULES.md:159-188)
- CODE → always read PRINCIPAL 7 (AGENCY-RULES.md:144-156)`;

const OLD_SEMANTIC_PATTERN = /## SEMANTIC MEMORY INTEGRATION[\s\S]*?(?=\n## |\n*$)/;

/**
 * Replace or inject GROUNDING section into a customInstructions string.
 * @param {string} instructions
 * @returns {string}
 */
function injectGrounding(instructions) {
    let result = instructions;

    // 1. Replace "Read PROJECT.md and ORCHESTRATION.md" references
    result = result.replace(
        /Read PROJECT\.md and ORCHESTRATION\.md/g,
        'Use hybrid retrieval (see GROUNDING section above)'
    );

    // 2. Replace existing SEMANTIC MEMORY section if present
    if (OLD_SEMANTIC_PATTERN.test(result)) {
        result = result.replace(OLD_SEMANTIC_PATTERN, GROUNDING_SECTION);
        return result;
    }

    // 3. No SEMANTIC section found — inject before first `## ` heading
    //    (which is typically ## DOMAIN or similar)
    const firstHeadingMatch = result.match(/\n(## )/);
    if (firstHeadingMatch) {
        const insertPos = result.indexOf(firstHeadingMatch[1]);
        if (insertPos > 0) {
            result = result.slice(0, insertPos) + GROUNDING_SECTION + '\n\n' + result.slice(insertPos);
            return result;
        }
    }

    // 4. Fallback: append at the end
    result += '\n\n' + GROUNDING_SECTION;
    return result;
}

function main() {
    console.log('🔧 Injecting GROUNDING (Hybrid Retrieval) section into .roomodes...\n');

    // Read and parse .roomodes
    const raw = fs.readFileSync(ROOMODES_PATH, 'utf-8');
    let config;
    try {
        config = JSON.parse(raw);
    } catch (err) {
        console.error(`FAIL: Could not parse .roomodes: ${err.message}`);
        process.exit(1);
    }

    if (!config.customModes || !Array.isArray(config.customModes)) {
        console.error('FAIL: .roomodes missing customModes array');
        process.exit(1);
    }

    console.log(`  Found ${config.customModes.length} agents\n`);

    // Track changes
    let replaced = 0;
    let added = 0;
    let refsReplaced = 0;

    for (const agent of config.customModes) {
        const slug = agent.slug;
        const before = agent.customInstructions;

        if (!before) {
            console.log(`  ⚠ ${slug}: no customInstructions, skipping`);
            continue;
        }

        const hadSemantic = OLD_SEMANTIC_PATTERN.test(before);
        const hadRefs = /Read PROJECT\.md and ORCHESTRATION\.md/.test(before);

        const after = injectGrounding(before);

        if (after !== before) {
            agent.customInstructions = after;
            if (hadSemantic) {
                replaced++;
                console.log(`  ✓ ${slug}: SEMANTIC → GROUNDING (replaced)`);
            } else {
                added++;
                console.log(`  ✓ ${slug}: GROUNDING added`);
            }
            if (hadRefs) {
                refsReplaced++;
            }
        } else {
            console.log(`  — ${slug}: unchanged`);
        }
    }

    // Write back
    const output = JSON.stringify(config, null, 2) + '\n';
    fs.writeFileSync(ROOMODES_PATH, output, 'utf-8');

    console.log(`\nDone. ${replaced} replaced, ${added} added, ${refsReplaced} refs updated.`);

    // Verification
    const verifyRaw = fs.readFileSync(ROOMODES_PATH, 'utf-8');
    const verifyConfig = JSON.parse(verifyRaw);
    let groundingCount = 0;
    let semanticCount = 0;

    for (const agent of verifyConfig.customModes) {
        if (agent.customInstructions.includes('## GROUNDING (Hybrid Retrieval')) {
            groundingCount++;
        }
        if (agent.customInstructions.includes('## SEMANTIC MEMORY INTEGRATION')) {
            semanticCount++;
        }
    }

    console.log(`\nVerification:`);
    console.log(`  Agents with GROUNDING section: ${groundingCount}/${verifyConfig.customModes.length}`);
    console.log(`  Agents with old SEMANTIC section: ${semanticCount}`);

    if (groundingCount === verifyConfig.customModes.length && semanticCount === 0) {
        console.log('\n✅ All agents updated successfully.');
        process.exit(0);
    } else {
        console.log('\n❌ Verification FAILED — some agents not updated correctly.');
        process.exit(1);
    }
}

main();
