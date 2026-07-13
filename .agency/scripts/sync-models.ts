#!/usr/bin/env node
// @ts-nocheck

/**
 * sync-models.js — Model Override Sync
 *
 * Reads model_overrides from .zoo/config.json and syncs them into
 * .roomodes agent configurations.
 *
 * Contract: agency-model-routing@1.0.0
 *
 * Usage:
 *   node .agency/scripts/sync-models.js          # Apply changes
 *   node .agency/scripts/sync-models.js --dry-run # Preview only
 *
 * Config (.zoo/config.json):
 *   model_overrides  — Map of agent slug → model identifier
 *   fallback_model   — Default model when no override is specified
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const ZOO_CONFIG_PATH = path.join(ROOT, '.zoo', 'config.json');
const ROOMODES_PATH = path.join(ROOT, '.roomodes');

const VALID_MODELS = [
    'deepseek-flash',
    'deepseek-pro',
    'deepseek-v4-flash',
    'deepseek-v4-pro',
];

// ── CLI Parsing ───────────────────────────────────────────────────────────────

function isDryRun() {
    return process.argv.slice(2).includes('--dry-run');
}

// ── Config Readers ────────────────────────────────────────────────────────────

function readZooConfig() {
    if (!fs.existsSync(ZOO_CONFIG_PATH)) {
        console.error(`FAIL: .zoo/config.json not found at ${ZOO_CONFIG_PATH}`);
        process.exit(1);
    }

    let config;
    try {
        config = JSON.parse(fs.readFileSync(ZOO_CONFIG_PATH, 'utf-8'));
    } catch (err) {
        console.error(`FAIL: Could not parse .zoo/config.json: ${err.message}`);
        process.exit(1);
    }

    return {
        modelOverrides: config.model_overrides || {},
        fallbackModel: config.fallback_model || 'deepseek-flash',
    };
}

function readRoomodes() {
    if (!fs.existsSync(ROOMODES_PATH)) {
        console.error(`FAIL: .roomodes not found at ${ROOMODES_PATH}`);
        process.exit(1);
    }

    let config;
    try {
        config = JSON.parse(fs.readFileSync(ROOMODES_PATH, 'utf-8'));
    } catch (err) {
        console.error(`FAIL: Could not parse .roomodes: ${err.message}`);
        process.exit(1);
    }

    return config;
}

// ── Model Resolution ──────────────────────────────────────────────────────────

/**
 * Determine the target model for an agent slug.
 * Uses model_overrides first, then fallback_model.
 *
 * @param {string} slug
 * @param {object} modelOverrides
 * @param {string} fallbackModel
 * @returns {string}
 */
function resolveModel(slug, modelOverrides, fallbackModel) {
    return modelOverrides[slug] || fallbackModel;
}

// ── Sync Logic ────────────────────────────────────────────────────────────────

/**
 * Sync model configurations from .zoo/config.json into .roomodes.
 *
 * @param {boolean} dryRun — If true, only log changes without writing
 * @returns {number} Number of agents updated
 */
function syncModels(dryRun) {
    const { modelOverrides, fallbackModel } = readZooConfig();
    const roomodes = readRoomodes();

    const modes = roomodes.customModes || roomodes.groups || [];
    let updatedCount = 0;

    for (const agent of modes) {
        const slug = agent.slug;
        if (!slug) continue;

        const targetModel = resolveModel(slug, modelOverrides, fallbackModel);

        // Ensure apiConfiguration exists
        if (!agent.apiConfiguration) {
            agent.apiConfiguration = {};
        }

        const currentModel = agent.apiConfiguration.model;

        if (currentModel === targetModel) {
            continue;
        }

        updatedCount++;
        const action = dryRun ? 'WOULD UPDATE' : 'UPDATED';
        console.log(`  ${action}: ${slug} → ${targetModel} (was: ${currentModel || 'not set'})`);

        if (!dryRun) {
            agent.apiConfiguration.model = targetModel;
        }
    }

    if (updatedCount === 0) {
        console.log('  No agents need updating.');
    }

    // Write back to .roomodes if not a dry run
    if (!dryRun && updatedCount > 0) {
        fs.writeFileSync(ROOMODES_PATH, JSON.stringify(roomodes, null, 2) + '\n', 'utf-8');
    }

    return updatedCount;
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
    const dryRun = isDryRun();

    console.log(dryRun ? '🔍 DRY RUN — No changes will be written' : '🔄 Syncing model overrides into .roomodes...');
    console.log('');

    const { modelOverrides, fallbackModel } = readZooConfig();
    console.log(`  Config: ${Object.keys(modelOverrides).length} overrides, fallback: ${fallbackModel}`);
    console.log('');

    const updatedCount = syncModels(dryRun);

    console.log('');
    if (dryRun) {
        console.log(`🔍 Dry-run complete. ${updatedCount} agent(s) would be updated.`);
    } else {
        console.log(`✅ Sync complete. ${updatedCount} agent(s) updated.`);
    }

    process.exit(0);
}

main();
