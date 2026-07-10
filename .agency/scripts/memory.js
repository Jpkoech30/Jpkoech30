#!/usr/bin/env node

/**
 * memory.js — Semantic Memory (Vector RAG) for Agency
 *
 * Provides long-term semantic memory using SQLite + TF-IDF-like embeddings.
 * Stores agent decisions, code patterns, and architecture rationales.
 *
 * Contract: agency-memory@1.0.0
 *
 * Commands:
 *   store   --content <text> --tags <tags> --task <id> [--agent <slug>] [--source <file>]
 *   recall  --query <text> [--tags <filter>] [--limit <n>]
 *   stats
 *   purge   --older-than <days>
 *
 * Dependencies (optional):
 *   better-sqlite3 — SQLite storage (primary)
 *   sqlite-vec     — Vector search acceleration (optional, fallback to in-memory)
 *
 * Fallback: JSON file at .agency/memory/store.json if better-sqlite3 unavailable
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── Paths ───────────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '../..');
let MEMORY_DIR = path.resolve(__dirname, '../memory');
let DB_PATH = path.join(MEMORY_DIR, 'store.db');
let JSON_PATH = path.join(MEMORY_DIR, 'store.json');
let SCHEMA_PATH = path.join(MEMORY_DIR, 'schema.sql');

/**
 * Update paths to point at a project-scoped memory directory.
 * @param {string} projectId
 */
function resolveProjectPaths(projectId) {
    MEMORY_DIR = path.resolve(ROOT, '.agency/projects', projectId, 'memory');
    DB_PATH = path.join(MEMORY_DIR, 'store.db');
    JSON_PATH = path.join(MEMORY_DIR, 'store.json');
    SCHEMA_PATH = path.join(MEMORY_DIR, 'schema.sql');
}

// ── Constants ───────────────────────────────────────────────────────────────────

const DIM = 768;          // Embedding dimension (per contract agency-memory@1.0.0)
const DEFAULT_LIMIT = 3;
const MAX_LIMIT = 10;

// ── Optional dependency loading ─────────────────────────────────────────────────

/** @type {import('better-sqlite3') | null} */
let Database = null;
try {
    Database = require('better-sqlite3');
} catch (_) {
    // fallback to JSON
}

/** @type {import('sqlite-vec') | null} */
let sqliteVec = null;
try {
    sqliteVec = require('sqlite-vec');
} catch (_) {
    // fallback to in-memory cosine similarity
}

// ── Database setup ──────────────────────────────────────────────────────────────

/** @type {import('better-sqlite3').Database | null} */
let db = null;

function initDatabase() {
    if (!Database) return false;

    // Ensure memory directory exists
    if (!fs.existsSync(MEMORY_DIR)) {
        fs.mkdirSync(MEMORY_DIR, { recursive: true });
    }

    try {
        db = new Database(DB_PATH);

        // Enable WAL mode for better concurrent read performance
        db.pragma('journal_mode = WAL');

        // Initialize schema
        if (fs.existsSync(SCHEMA_PATH)) {
            const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
            db.exec(schema);
        }

        // Try to load sqlite-vec extension
        if (sqliteVec) {
            try {
                sqliteVec.load(db);
            } catch (_) {
                // sqlite-vec load failed, will use in-memory cosine similarity
            }
        }

        return true;
    } catch (_) {
        db = null;
        return false;
    }
}

// ── TF-IDF-like embedding ───────────────────────────────────────────────────────

/**
 * Simple string hash function (djb2 variant).
 * Returns a non-negative 32-bit integer hash.
 *
 * @param {string} str
 * @returns {number}
 */
function hashString(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
        hash = hash & 0x7fffffff; // keep positive 32-bit
    }
    return hash;
}

/**
 * Generate a 768-dimensional TF-IDF-like keyword embedding vector.
 *
 * Approach:
 *   1. Tokenize into lowercase words (remove special chars)
 *   2. Count word frequencies
 *   3. Normalize by total word count
 *   4. Hash each word to an index in [0, 767] and accumulate normalized weight
 *   5. L2-normalize the final vector
 *
 * @param {string} text
 * @returns {number[]} Array of 768 floats
 */
function embed(text) {
    // Tokenize: lowercase, remove non-alphanumeric, split on whitespace
    const words = text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 0);

    if (words.length === 0) {
        return new Array(DIM).fill(0);
    }

    // Count word frequencies
    const freq = {};
    for (const word of words) {
        freq[word] = (freq[word] || 0) + 1;
    }

    // Normalize by total word count
    const total = words.length;
    const vec = new Array(DIM).fill(0);

    for (const [word, count] of Object.entries(freq)) {
        const normalizedWeight = count / total;
        const idx = hashString(word) % DIM;
        vec[idx] += normalizedWeight;
    }

    // L2-normalize the vector
    let magnitude = 0;
    for (let i = 0; i < DIM; i++) {
        magnitude += vec[i] * vec[i];
    }
    magnitude = Math.sqrt(magnitude);

    if (magnitude > 0) {
        for (let i = 0; i < DIM; i++) {
            vec[i] /= magnitude;
        }
    }

    return vec;
}

/**
 * Compute cosine similarity between two vectors.
 *
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number} Cosine similarity in [-1, 1]
 */
function cosineSimilarity(a, b) {
    let dot = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }

    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
}

/**
 * Convert a float array to a Float32Array Buffer (F32_BLOB format for sqlite-vec).
 *
 * @param {number[]} arr
 * @returns {Buffer}
 */
function toF32Blob(arr) {
    return Buffer.from(new Float32Array(arr).buffer);
}

// ── Storage operations (SQLite) ─────────────────────────────────────────────────

/**
 * Initialize the database. Returns true if SQLite is available and initialized.
 *
 * @returns {boolean}
 */
function isDbReady() {
    if (db) return true;
    return initDatabase();
}

/**
 * Store a memory with embedding into SQLite.
 *
 * @param {string} content
 * @param {string} tags - Comma-separated tags
 * @param {string} taskId
 * @param {string} agentSlug
 * @param {string} [sourceFile]
 * @returns {string} The generated UUID
 */
function storeMemorySQLite(content, tags, taskId, agentSlug, sourceFile) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const embedding = embed(content);
    const embeddingJson = JSON.stringify(embedding);

    const insertMemory = db.prepare(`
    INSERT INTO memories (id, content, embedding, tags, taskId, agentSlug, createdAt, sourceFile)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

    const insertTag = db.prepare(`
    INSERT INTO tags_index (tag, memoryId) VALUES (?, ?)
  `);

    const transaction = db.transaction(() => {
        insertMemory.run(id, content, embeddingJson, tags, taskId || null, agentSlug || null, now, sourceFile || null);

        // Index individual tags for fast filtering
        const tagList = tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);

        for (const tag of tagList) {
            insertTag.run(tag, id);
        }
    });

    transaction();

    return id;
}

/**
 * Recall memories from SQLite using semantic similarity.
 *
 * Uses sqlite-vec's vec_cosine_distance if available, otherwise
 * falls back to in-memory cosine similarity.
 *
 * @param {string} query
 * @param {string} [tagFilter] - Comma-separated tags to filter by
 * @param {number} [limit=3]
 * @returns {Array<{id: string, content: string, tags: string, taskId: string, agentSlug: string, createdAt: string, sourceFile: string, score: number}>}
 */
function recallMemoriesSQLite(query, tagFilter, limit) {
    const queryVec = embed(query);
    const rows = db.prepare('SELECT * FROM memories').all();

    // Apply tag filter if specified
    let filtered = rows;
    if (tagFilter) {
        const filterTags = tagFilter
            .split(',')
            .map((t) => t.trim().toLowerCase());

        filtered = rows.filter((row) => {
            const rowTags = (row.tags || '')
                .split(',')
                .map((t) => t.trim().toLowerCase());
            return filterTags.some((t) => rowTags.includes(t));
        });
    }

    if (filtered.length === 0) {
        return [];
    }

    // Compute similarity scores
    const withScores = filtered.map((row) => {
        let score = 0;

        if (sqliteVec && db) {
            // Try using sqlite-vec for cosine similarity
            try {
                const storedEmb = JSON.parse(row.embedding);
                const queryBlob = toF32Blob(queryVec);
                const storedBlob = toF32Blob(storedEmb);

                const stmt = db.prepare('SELECT vec_cosine_distance(?, ?) AS dist');
                const result = stmt.get(queryBlob, storedBlob);
                // vec_cosine_distance returns 0 for identical, 2 for opposite
                // Convert to similarity: 1 - (dist / 2)
                score = 1 - ((result.dist || 0) / 2);
            } catch (_) {
                // Fallback to in-memory
                const storedEmb = JSON.parse(row.embedding);
                score = cosineSimilarity(queryVec, storedEmb);
            }
        } else {
            // In-memory cosine similarity
            const storedEmb = JSON.parse(row.embedding);
            score = cosineSimilarity(queryVec, storedEmb);
        }

        return { ...row, score };
    });

    // Sort by score descending, limit results
    withScores.sort((a, b) => b.score - a.score);
    const results = withScores.slice(0, limit);

    // Strip embedding from output
    return results.map(({ embedding, ...rest }) => rest);
}

/**
 * Get memory store statistics.
 *
 * @returns {{ total: number, byTag: Record<string,number>, byAgent: Record<string,number>, bySource: Record<string,number> }}
 */
function statsSQLite() {
    const total = db.prepare('SELECT COUNT(*) AS count FROM memories').get().count;

    const tagRows = db.prepare(`
    SELECT tag, COUNT(*) AS count
    FROM tags_index
    GROUP BY tag
    ORDER BY count DESC
  `).all();

    const byTag = {};
    for (const row of tagRows) {
        byTag[row.tag] = row.count;
    }

    const agentRows = db.prepare(`
    SELECT agentSlug, COUNT(*) AS count
    FROM memories
    WHERE agentSlug IS NOT NULL
    GROUP BY agentSlug
    ORDER BY count DESC
  `).all();

    const byAgent = {};
    for (const row of agentRows) {
        byAgent[row.agentSlug] = row.count;
    }

    const sourceRows = db.prepare(`
    SELECT sourceFile, COUNT(*) AS count
    FROM memories
    WHERE sourceFile IS NOT NULL
    GROUP BY sourceFile
    ORDER BY count DESC
  `).all();

    const bySource = {};
    for (const row of sourceRows) {
        bySource[row.sourceFile] = row.count;
    }

    return { total, byTag, byAgent, bySource };
}

/**
 * Purge memories older than N days.
 *
 * @param {number} days
 * @returns {number} Number of deleted memories
 */
function purgeSQLite(days) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const transaction = db.transaction(() => {
        // Find IDs to delete
        const toDelete = db
            .prepare('SELECT id FROM memories WHERE createdAt < ?')
            .all(cutoff)
            .map((r) => r.id);

        if (toDelete.length === 0) return 0;

        // Delete from tags_index first (foreign key constraint)
        const deleteTags = db.prepare('DELETE FROM tags_index WHERE memoryId = ?');
        for (const id of toDelete) {
            deleteTags.run(id);
        }

        // Delete from memories
        const deleteMemories = db.prepare('DELETE FROM memories WHERE id = ?');
        for (const id of toDelete) {
            deleteMemories.run(id);
        }

        return toDelete.length;
    });

    return transaction();
}

// ── Storage operations (JSON fallback) ──────────────────────────────────────────

function loadJSONStore() {
    if (!fs.existsSync(JSON_PATH)) return [];
    try {
        return JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
    } catch (_) {
        return [];
    }
}

function saveJSONStore(store) {
    if (!fs.existsSync(MEMORY_DIR)) {
        fs.mkdirSync(MEMORY_DIR, { recursive: true });
    }
    fs.writeFileSync(JSON_PATH, JSON.stringify(store, null, 2));
}

function storeMemoryJSON(content, tags, taskId, agentSlug, sourceFile) {
    const store = loadJSONStore();
    const memory = {
        id: crypto.randomUUID(),
        content,
        embedding: embed(content),
        tags,
        taskId: taskId || null,
        agentSlug: agentSlug || null,
        createdAt: new Date().toISOString(),
        sourceFile: sourceFile || null,
    };
    store.push(memory);
    saveJSONStore(store);
    return memory.id;
}

function recallMemoriesJSON(query, tagFilter, limit) {
    const queryVec = embed(query);
    let store = loadJSONStore();

    // Apply tag filter
    if (tagFilter) {
        const filterTags = tagFilter.split(',').map((t) => t.trim().toLowerCase());
        store = store.filter((m) => {
            const memTags = (m.tags || '').split(',').map((t) => t.trim().toLowerCase());
            return filterTags.some((t) => memTags.includes(t));
        });
    }

    if (store.length === 0) return [];

    // Compute scores
    const withScores = store.map((m) => ({
        ...m,
        score: cosineSimilarity(queryVec, m.embedding),
    }));

    // Sort and limit
    withScores.sort((a, b) => b.score - a.score);
    return withScores.slice(0, limit).map(({ embedding, ...rest }) => rest);
}

function statsJSON() {
    const store = loadJSONStore();
    const byTag = {};
    const byAgent = {};
    const bySource = {};

    for (const m of store) {
        if (m.tags) {
            const tags = m.tags.split(',').map((t) => t.trim());
            for (const tag of tags) {
                byTag[tag] = (byTag[tag] || 0) + 1;
            }
        }
        if (m.agentSlug) {
            byAgent[m.agentSlug] = (byAgent[m.agentSlug] || 0) + 1;
        }
        if (m.sourceFile) {
            bySource[m.sourceFile] = (bySource[m.sourceFile] || 0) + 1;
        }
    }

    return {
        total: store.length,
        byTag,
        byAgent,
        bySource,
    };
}

function purgeJSON(days) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    let store = loadJSONStore();
    const before = store.length;
    store = store.filter((m) => m.createdAt >= cutoff);
    const deleted = before - store.length;
    saveJSONStore(store);
    return deleted;
}

// ── Storage dispatcher ──────────────────────────────────────────────────────────

function isSQLiteAvailable() {
    return Database !== null && isDbReady();
}

function storeMemory(content, tags, taskId, agentSlug, sourceFile) {
    if (isSQLiteAvailable()) {
        return storeMemorySQLite(content, tags, taskId, agentSlug, sourceFile);
    }
    return storeMemoryJSON(content, tags, taskId, agentSlug, sourceFile);
}

function recallMemories(query, tagFilter, limit) {
    const effectiveLimit = Math.min(limit || DEFAULT_LIMIT, MAX_LIMIT);
    if (isSQLiteAvailable()) {
        return recallMemoriesSQLite(query, tagFilter, effectiveLimit);
    }
    return recallMemoriesJSON(query, tagFilter, effectiveLimit);
}

function getStats() {
    if (isSQLiteAvailable()) {
        return statsSQLite();
    }
    return statsJSON();
}

function purgeMemories(days) {
    if (isSQLiteAvailable()) {
        return purgeSQLite(days);
    }
    return purgeJSON(days);
}

// ── CLI argument parsing ────────────────────────────────────────────────────────

function parseArgs() {
    const args = process.argv.slice(2);
    const opts = {};

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg.startsWith('--')) {
            const key = arg.slice(2);
            // Convert hyphenated names to camelCase (e.g., older-than -> olderThan)
            const camelKey = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
            if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
                opts[camelKey] = args[++i];
            } else {
                opts[camelKey] = true;
            }
        } else if (!opts._command) {
            opts._command = arg;
        }
    }

    return opts;
}

// ── Output formatting ───────────────────────────────────────────────────────────

function formatResults(results) {
    if (results.length === 0) {
        console.log('  No matching memories found.');
        return;
    }

    for (let i = 0; i < results.length; i++) {
        const r = results[i];
        console.log(`  ${'─'.repeat(56)}`);
        console.log(`  [${i + 1}] Score:      ${(r.score * 100).toFixed(1)}%`);
        console.log(`      Content:    ${r.content}`);
        console.log(`      Tags:       ${r.tags || '(none)'}`);
        console.log(`      Task:       ${r.taskId || '(none)'}`);
        console.log(`      Agent:      ${r.agentSlug || '(none)'}`);
        console.log(`      Created:    ${r.createdAt || '(unknown)'}`);
        if (r.sourceFile) {
            console.log(`      Source:     ${r.sourceFile}`);
        }
    }
    console.log(`  ${'─'.repeat(56)}`);
}

function formatStats(stats) {
    console.log('');
    console.log('  📊 Memory Store Statistics');
    console.log(`  ${'─'.repeat(40)}`);
    console.log(`  Total memories:   ${stats.total}`);
    console.log('');

    if (Object.keys(stats.byTag).length > 0) {
        console.log('  By tag:');
        const sortedTags = Object.entries(stats.byTag).sort((a, b) => b[1] - a[1]);
        for (const [tag, count] of sortedTags) {
            console.log(`    ${tag.padEnd(25)} ${count}`);
        }
        console.log('');
    }

    if (Object.keys(stats.byAgent).length > 0) {
        console.log('  By agent:');
        const sortedAgents = Object.entries(stats.byAgent).sort((a, b) => b[1] - a[1]);
        for (const [agent, count] of sortedAgents) {
            console.log(`    ${agent.padEnd(25)} ${count}`);
        }
        console.log('');
    }

    if (Object.keys(stats.bySource).length > 0) {
        console.log('  By source file:');
        const sortedSources = Object.entries(stats.bySource).sort((a, b) => b[1] - a[1]);
        for (const [source, count] of sortedSources) {
            console.log(`    ${source.padEnd(25)} ${count}`);
        }
        console.log('');
    }
}

function showUsage() {
    const script = path.basename(process.argv[1]);
    console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║     Agency Semantic Memory — Store, Recall, Stats    ║
  ╚══════════════════════════════════════════════════════╝

  Usage:
    node ${script} store   --content <text> --tags <tags> --task <id> [--agent <slug>] [--source <file>] [--project <id>]
    node ${script} recall  --query <text> [--tags <filter>] [--limit <n>] [--project <id>]
    node ${script} stats   [--project <id>]
    node ${script} purge   --older-than <days> [--project <id>]

  Global flags:
    --project <id>  Scope to a specific project (uses .agency/projects/<id>/memory/).
                    Omit to use the global store at .agency/memory/.

  Commands:

    store     Store a memory with automatic TF-IDF embedding.
              --content   Text content to remember (required)
              --tags      Comma-separated tags, e.g. "architecture,decision" (required)
              --task      Task ID this memory originates from (required)
              --agent     Agent slug (default: lead-architect)
              --source    Optional source file path

    recall    Retrieve top-N semantically similar memories.
              --query     Search query text (required)
              --tags      Optional comma-separated tag filter
              --limit     Number of results (default: 3, max: 10)

    stats     Show memory store statistics (total, by tag, by agent).

    purge     Remove memories older than N days.
              --older-than  Age in days (required)

  Storage:
    Global:   .agency/memory/store.db (SQLite) / store.json (JSON fallback)
    Project:  .agency/projects/<id>/memory/store.db (SQLite) / store.json (JSON fallback)

  Embedding:
    TF-IDF-like keyword embedding, 768-dim, cosine similarity search.
`);
}

// ── Main ────────────────────────────────────────────────────────────────────────

function main() {
    const opts = parseArgs();
    const command = opts._command;

    // Resolve project-scoped paths if --project provided
    if (opts.project) {
        resolveProjectPaths(opts.project);
    }

    if (!command || command === '--help' || command === '-h') {
        showUsage();
        process.exit(0);
    }

    switch (command) {
        case 'store': {
            // Validate required args
            const missing = [];
            if (!opts.content) missing.push('--content');
            if (!opts.tags) missing.push('--tags');
            if (!opts.task) missing.push('--task');

            if (missing.length > 0) {
                console.error(`FAIL: Missing required argument(s): ${missing.join(', ')}`);
                console.error('Usage: node memory.js store --content <text> --tags <tags> --task <id> [--agent <slug>] [--source <file>]');
                process.exit(1);
            }

            const agentSlug = opts.agent || 'lead-architect';
            const id = storeMemory(opts.content, opts.tags, opts.task, agentSlug, opts.source || null);

            const storageType = isSQLiteAvailable() ? 'SQLite' : 'JSON';
            console.log(`PASS: Memory stored (${storageType})`);
            console.log(`  ID:      ${id}`);
            console.log(`  Content: ${opts.content}`);
            console.log(`  Tags:    ${opts.tags}`);
            console.log(`  Task:    ${opts.task}`);
            console.log(`  Agent:   ${agentSlug}`);
            if (opts.source) console.log(`  Source:  ${opts.source}`);
            process.exit(0);
        }

        case 'recall': {
            // Validate required args
            if (!opts.query) {
                console.error('FAIL: Missing required argument: --query');
                console.error('Usage: node memory.js recall --query <text> [--tags <filter>] [--limit <n>]');
                process.exit(1);
            }

            const limit = opts.limit ? parseInt(opts.limit, 10) : DEFAULT_LIMIT;
            if (isNaN(limit) || limit < 1 || limit > MAX_LIMIT) {
                console.error(`FAIL: --limit must be a number between 1 and ${MAX_LIMIT}`);
                process.exit(1);
            }

            const results = recallMemories(opts.query, opts.tags || null, limit);

            console.log('');
            console.log(`  🔍 Recall: "${opts.query}"`);
            if (opts.tags) console.log(`  Filter:    tags in [${opts.tags}]`);
            console.log(`  Results:   ${results.length}`);
            formatResults(results);
            process.exit(0);
        }

        case 'stats': {
            const stats = getStats();
            formatStats(stats);
            process.exit(0);
        }

        case 'purge': {
            // Validate required args
            if (!opts.olderThan) {
                console.error('FAIL: Missing required argument: --older-than');
                console.error('Usage: node memory.js purge --older-than <days>');
                process.exit(1);
            }

            const days = parseInt(opts.olderThan, 10);
            if (isNaN(days) || days < 0) {
                console.error('FAIL: --older-than must be a non-negative integer (days)');
                process.exit(1);
            }

            const deleted = purgeMemories(days);
            console.log(`PASS: Purged ${deleted} memories older than ${days} days.`);
            process.exit(0);
        }

        default: {
            console.error(`\n  ❌ Unknown command: "${command}"`);
            console.error(`  Run "node ${path.basename(process.argv[1])} --help" for available commands.\n`);
            process.exit(1);
        }
    }
}

main();
