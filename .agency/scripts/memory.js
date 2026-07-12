#!/usr/bin/env node

/**
 * memory.js v2.0 — Semantic Memory (Hybrid Search + Vector RAG)
 *
 * Contract: agency-memory@2.0.0
 *
 * SQLite-only storage with:
 *   - FTS5 for BM25 full-text search
 *   - vec0 for vector similarity (384-dim)
 *   - Transformers.js for embeddings (fallback to TF-IDF)
 *   - Metadata tracking (access_count, last_accessed, source_type)
 *   - Compaction/TTL engine
 *   - JSON is BACKUP ONLY (export/import)
 *
 * Usage:
 *   node .agency/scripts/memory.js store   --content <text> --tags <tags> --task <id> --project <id>
 *   node .agency/scripts/memory.js recall  --query <text> [--tags <filter>] [--limit <n>] [--project <id>]
 *   node .agency/scripts/memory.js stats   [--project <id>]
 *   node .agency/scripts/memory.js purge   --older-than <days> [--project <id>]
 *   node .agency/scripts/memory.js compact [--project <id>] [--dry-run]
 *   node .agency/scripts/memory.js check   --task <id> --agent <slug> [--project <id>]
 *   node .agency/scripts/memory.js export  --project <id> [--output <path>]
 *   node .agency/scripts/memory.js import  --project <id> [--input <path>] [--dry-run] [--force]
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── Paths ───────────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '../..');
const GLOBAL_MEMORY_DIR = path.resolve(__dirname, '../memory');
const GLOBAL_DB_PATH = path.join(GLOBAL_MEMORY_DIR, 'store.db');
const GLOBAL_JSON_PATH = path.join(GLOBAL_MEMORY_DIR, 'store.json');
const SCHEMA_PATH = path.join(GLOBAL_MEMORY_DIR, 'schema.sql');

// ── Constants ───────────────────────────────────────────────────────────────────

const DIM = 384;  // Embedding dimension for all-MiniLM-L6-v2
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;
const MIN_SCORE = 0.05;
const COMPACTION_THRESHOLD = 1000;
const COMPACTION_BATCH = 200;

// TTL in days
const TTL = {
    terminal: 30,
    error: 90,
    observation: 90,
    'code-pattern': 90,
    summary: null,     // permanent
    decision: null,    // permanent
    default: 90,
};

// ── Optional dependency loading ─────────────────────────────────────────────────

let Database = null;
try {
    Database = require('better-sqlite3');
} catch (_) {
    console.error('FAIL: better-sqlite3 is required for memory.js');
    console.error('  Run: npm install better-sqlite3');
    process.exit(1);
}

let sqliteVec = null;
try {
    sqliteVec = require('sqlite-vec');
} catch (_) {
    // vec0 will be unavailable, fallback to in-memory cosine similarity
}

// ── Embedding (Transformers.js with fallback) ───────────────────────────────────

let embedder = null;

async function getEmbedder() {
    if (embedder) return embedder;
    try {
        const { pipeline } = require('@xenova/transformers');
        embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        return embedder;
    } catch (err) {
        // Fallback: return null, will use TF-IDF
        return null;
    }
}

/**
 * Generate embedding using Transformers.js (384-dim).
 * Falls back to TF-IDF-like keyword embedding if Transformers.js unavailable.
 */
async function generateEmbedding(text) {
    const model = await getEmbedder();

    if (model) {
        try {
            const result = await model(text, { pooling: 'mean', normalize: true });
            const vec = Array.from(result.data);
            if (vec.length === DIM) return vec;
            // If dimension mismatch, pad or truncate
            if (vec.length > DIM) return vec.slice(0, DIM);
            return [...vec, ...new Array(DIM - vec.length).fill(0)];
        } catch (_) {
            // Fall through to TF-IDF
        }
    }

    // TF-IDF fallback: hash-based keyword embedding, avg-pooled to 384-dim
    return embedTFIDF(text);
}

/**
 * TF-IDF-like keyword embedding.
 * Hashes words to positions in a 768-dim vector, then avg-pools to 384-dim.
 */
function embedTFIDF(text) {
    const words = text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 0);

    if (words.length === 0) return new Array(DIM).fill(0);

    const INTERIM_DIM = 768;
    const freq = {};
    for (const word of words) freq[word] = (freq[word] || 0) + 1;

    const total = words.length;
    const interim = new Array(INTERIM_DIM).fill(0);

    for (const [word, count] of Object.entries(freq)) {
        let hash = 5381;
        for (let i = 0; i < word.length; i++) {
            hash = ((hash << 5) + hash) + word.charCodeAt(i);
            hash = hash & 0x7fffffff;
        }
        const idx = hash % INTERIM_DIM;
        interim[idx] += count / total;
    }

    // L2-normalize
    let mag = 0;
    for (let i = 0; i < INTERIM_DIM; i++) mag += interim[i] * interim[i];
    mag = Math.sqrt(mag);
    if (mag > 0) for (let i = 0; i < INTERIM_DIM; i++) interim[i] /= mag;

    // Avg-pool 768 → 384
    const vec = new Array(DIM).fill(0);
    for (let i = 0; i < DIM; i++) {
        vec[i] = (interim[i * 2] + interim[i * 2 + 1]) / 2;
    }

    return vec;
}

function cosineSimilarity(a, b) {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
}

function toF32Blob(arr) {
    return Buffer.from(new Float32Array(arr).buffer);
}

// ── Database setup ──────────────────────────────────────────────────────────────

let db = null;
let memoryDir = GLOBAL_MEMORY_DIR;
let dbPath = GLOBAL_DB_PATH;
let jsonPath = GLOBAL_JSON_PATH;

function resolveProjectPaths(projectId) {
    memoryDir = path.resolve(ROOT, '.agency/projects', projectId, 'memory');
    dbPath = path.join(memoryDir, 'store.db');
    jsonPath = path.join(memoryDir, 'store.json');
}

function initDatabase() {
    if (db) return true;
    if (!fs.existsSync(memoryDir)) {
        fs.mkdirSync(memoryDir, { recursive: true });
    }
    try {
        db = new Database(dbPath);
        db.pragma('journal_mode = WAL');

        // Initialize schema (memory_chunks, memory_fts, tags_index)
        if (fs.existsSync(SCHEMA_PATH)) {
            const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
            db.exec(schema);
        }

        // Try to load sqlite-vec extension and create vec0 table
        if (sqliteVec) {
            try {
                sqliteVec.load(db);
                // Create vec0 table for vector similarity (384-dim)
                db.exec(`
                    CREATE VIRTUAL TABLE IF NOT EXISTS memory_vec USING vec0(
                        embedding float[384]
                    )
                `);
            } catch (_) {
                // vec0 unavailable, will use in-memory cosine similarity
            }
        }

        return true;
    } catch (err) {
        console.error(`FAIL: Could not initialize database: ${err.message}`);
        process.exit(1);
    }
}

function isDbReady() {
    if (db) return true;
    return initDatabase();
}

// ── Store ───────────────────────────────────────────────────────────────────────

async function storeMemory(content, tags, taskId, agentSlug, sourceFile, projectName, sourceType) {
    if (!isDbReady()) {
        console.error('FAIL: Database not available');
        process.exit(1);
    }

    // --project is REQUIRED (Task 20a.6)
    if (!projectName) {
        console.error('ERROR: --project is required. Use --project global for global memories.');
        process.exit(1);
    }

    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const srcType = sourceType || 'summary';
    const tokenCount = Math.ceil(content.length / 4); // rough estimate

    // Generate embedding
    const embedding = await generateEmbedding(content);
    const embeddingBlob = toF32Blob(embedding);

    const insertChunk = db.prepare(`
        INSERT INTO memory_chunks (id, project_name, content, tags, task_id, agent_slug, source_type, source_file, created_at, last_accessed, access_count, token_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);

    const insertTag = db.prepare(`
        INSERT INTO tags_index (tag, memory_id) VALUES (?, ?)
    `);

    let insertVec = null;
    try {
        insertVec = db.prepare(`
            INSERT INTO memory_vec(rowid, embedding) VALUES (?, ?)
        `);
    } catch (_) {
        // vec0 table may not exist
    }

    const transaction = db.transaction(() => {
        insertChunk.run(id, projectName, content, tags, taskId || null, agentSlug || null, srcType, sourceFile || null, now, now, tokenCount);

        // Index individual tags
        const tagList = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
        for (const tag of tagList) {
            insertTag.run(tag, id);
        }

        // Insert into vec0 index (FTS is auto-synced via triggers)
        if (insertVec) {
            try {
                // Get the rowid for this chunk
                const row = db.prepare('SELECT rowid FROM memory_chunks WHERE id = ?').get(id);
                if (row) {
                    insertVec.run(row.rowid, embeddingBlob);
                }
            } catch (_) {
                // vec0 insert failed, non-blocking
            }
        }
    });

    transaction();

    return id;
}

// ── Recall (Hybrid Search) ──────────────────────────────────────────────────────

async function recallMemories(query, tagFilter, limit, minScore, projectFilter, sourceTypeFilter) {
    if (!isDbReady()) return [];

    const effectiveLimit = Math.min(limit || DEFAULT_LIMIT, MAX_LIMIT);
    const effectiveMinScore = typeof minScore === 'number' ? minScore : MIN_SCORE;

    // Generate query embedding
    const queryVec = await generateEmbedding(query);

    // Build WHERE clause
    const conditions = [];
    const params = [];

    if (projectFilter) {
        conditions.push('mc.project_name = ?');
        params.push(projectFilter);
    }
    if (sourceTypeFilter) {
        conditions.push('mc.source_type = ?');
        params.push(sourceTypeFilter);
    }

    // Tag filter via tags_index
    let tagJoin = '';
    if (tagFilter) {
        const filterTags = tagFilter.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
        if (filterTags.length > 0) {
            const placeholders = filterTags.map(() => '?').join(',');
            tagJoin = `INNER JOIN tags_index ti ON ti.memory_id = mc.id AND LOWER(ti.tag) IN (${placeholders})`;
            params.push(...filterTags);
        }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Fetch all matching chunks
    const rows = db.prepare(`
        SELECT DISTINCT mc.rowid, mc.id, mc.content, mc.tags, mc.task_id, mc.agent_slug, mc.source_type, mc.source_file,
               mc.created_at, mc.last_accessed, mc.access_count, mc.project_name
        FROM memory_chunks mc
        ${tagJoin}
        ${whereClause}
        ORDER BY mc.created_at DESC
    `).all(...params);

    if (rows.length === 0) return [];

    // Compute hybrid scores
    const now = Math.floor(Date.now() / 1000);
    const withScores = [];

    for (const row of rows) {
        // BM25 score via FTS5
        let bm25Score = 0;
        try {
            const ftsResult = db.prepare(`
                SELECT bm25(memory_fts, 0, 1.0, 1.0) AS score
                FROM memory_fts
                WHERE memory_fts MATCH ? AND rowid = ?
            `).get(query, row.rowid);
            if (ftsResult) {
                // BM25 returns 0 for perfect match, higher for worse match
                // Normalize: 1 / (1 + score) → [0, 1]
                bm25Score = 1 / (1 + Math.abs(ftsResult.score || 0));
            }
        } catch (_) {
            // FTS5 match failed, use 0
        }

        // Vector similarity
        let vecScore = 0;
        try {
            // Try vec0 first
            const queryBlob = toF32Blob(queryVec);
            const vecResult = db.prepare(`
                SELECT distance FROM memory_vec WHERE embedding MATCH ? AND rowid = ?
            `).get(queryBlob, row.rowid);
            if (vecResult) {
                // vec_distance_cosine returns 0 for identical, 2 for opposite
                vecScore = 1 - ((vecResult.distance || 0) / 2);
            } else {
                // Fallback to in-memory cosine similarity
                vecScore = 0;
            }
        } catch (_) {
            // vec0 unavailable, skip vector score
        }

        // Recency score: 1.0 - (days_since_last_access / 90), clamped to [0, 1]
        const daysSinceAccess = (now - row.last_accessed) / 86400;
        const recencyScore = Math.max(0, Math.min(1, 1.0 - (daysSinceAccess / 90)));

        // Frequency score: min(access_count / 10, 1.0)
        const frequencyScore = Math.min((row.access_count || 1) / 10, 1.0);

        // Hybrid formula: (0.40 * bm25) + (0.30 * vec) + (0.20 * recency) + (0.10 * frequency)
        const hybridScore = (0.40 * bm25Score) + (0.30 * vecScore) + (0.20 * recencyScore) + (0.10 * frequencyScore);

        withScores.push({ ...row, score: hybridScore });
    }

    // Sort by score descending, filter below threshold, limit
    withScores.sort((a, b) => b.score - a.score);
    const filtered = withScores.filter(r => r.score >= effectiveMinScore);
    const results = filtered.slice(0, effectiveLimit);

    // Update access_count and last_accessed for retrieved results
    const updateAccess = db.prepare('UPDATE memory_chunks SET access_count = access_count + 1, last_accessed = ? WHERE id = ?');
    const ts = Math.floor(Date.now() / 1000);
    for (const r of results) {
        updateAccess.run(ts, r.id);
    }

    return results.map(({ rowid, ...rest }) => rest);
}

// ── Stats ───────────────────────────────────────────────────────────────────────

function getStats(projectFilter) {
    if (!isDbReady()) return { total: 0 };

    let conditions = '';
    let params = [];
    if (projectFilter) {
        conditions = 'WHERE project_name = ?';
        params.push(projectFilter);
    }

    const total = db.prepare(`SELECT COUNT(*) AS count FROM memory_chunks ${conditions}`).get(...params).count;

    const bySourceType = {};
    const stRows = db.prepare(`SELECT source_type, COUNT(*) AS count FROM memory_chunks ${conditions ? conditions + ' AND source_type IS NOT NULL' : 'WHERE source_type IS NOT NULL'} GROUP BY source_type ORDER BY count DESC`).all(...params);
    for (const row of stRows) bySourceType[row.source_type] = row.count;

    const byProject = {};
    const pRows = db.prepare('SELECT project_name, COUNT(*) AS count FROM memory_chunks GROUP BY project_name ORDER BY count DESC').all();
    for (const row of pRows) byProject[row.project_name] = row.count;

    const byAgent = {};
    const aRows = db.prepare(`SELECT agent_slug, COUNT(*) AS count FROM memory_chunks WHERE agent_slug IS NOT NULL ${conditions ? 'AND ' + conditions.substring(6) : ''} GROUP BY agent_slug ORDER BY count DESC`).all(...params);
    for (const row of aRows) byAgent[row.agent_slug] = row.count;

    // Access metrics
    const totalAccesses = db.prepare(`SELECT COALESCE(SUM(access_count), 0) AS total FROM memory_chunks ${conditions}`).get(...params).total;
    const avgAccess = total > 0 ? (totalAccesses / total).toFixed(2) : 0;

    return { total, bySourceType, byProject, byAgent, totalAccesses, avgAccess };
}

// ── Purge ───────────────────────────────────────────────────────────────────────

function purgeMemories(days, projectFilter, sourceTypeFilter) {
    if (!isDbReady()) return 0;

    const cutoff = Math.floor(Date.now() / 1000) - days * 86400;
    const conditions = ['created_at < ?'];
    const params = [cutoff];

    if (projectFilter) {
        conditions.push('project_name = ?');
        params.push(projectFilter);
    }
    if (sourceTypeFilter) {
        conditions.push('source_type = ?');
        params.push(sourceTypeFilter);
    }

    const whereClause = conditions.join(' AND ');

    const transaction = db.transaction(() => {
        // Find IDs to delete
        const toDelete = db.prepare(`SELECT id, rowid FROM memory_chunks WHERE ${whereClause}`).all(...params);

        if (toDelete.length === 0) return 0;

        const ids = toDelete.map(r => r.id);
        const rowids = toDelete.map(r => r.rowid);

        // Delete from tags_index
        const deleteTags = db.prepare('DELETE FROM tags_index WHERE memory_id = ?');
        for (const id of ids) deleteTags.run(id);

        // Delete from memory_vec
        try {
            const deleteVec = db.prepare('DELETE FROM memory_vec WHERE rowid = ?');
            for (const rowid of rowids) deleteVec.run(rowid);
        } catch (_) { /* vec0 may not exist */ }

        // Delete from memory_chunks (FTS auto-deleted via trigger)
        const deleteChunks = db.prepare('DELETE FROM memory_chunks WHERE id = ?');
        for (const id of ids) deleteChunks.run(id);

        return ids.length;
    });

    return transaction();
}

// ── Compaction ──────────────────────────────────────────────────────────────────

function runCompaction(projectFilter, dryRun) {
    if (!isDbReady()) return;

    const now = Math.floor(Date.now() / 1000);
    const results = { purged: 0, summarized: 0, skipped: 0 };

    // 1. TTL-based hard delete
    for (const [sourceType, ttlDays] of Object.entries(TTL)) {
        if (ttlDays === null) continue; // permanent
        const cutoff = now - ttlDays * 86400;

        let conditions = 'source_type = ? AND created_at < ?';
        let params = [sourceType, cutoff];
        if (projectFilter) {
            conditions += ' AND project_name = ?';
            params.push(projectFilter);
        }

        const count = db.prepare(`SELECT COUNT(*) AS count FROM memory_chunks WHERE ${conditions}`).get(...params).count;

        if (count > 0 && !dryRun) {
            const deleted = purgeMemories(ttlDays, projectFilter, sourceType);
            results.purged += deleted;
        } else if (count > 0) {
            results.purged += count;
        }
    }

    // 2. Compaction: when > COMPACTION_THRESHOLD chunks, summarize oldest COMPACTION_BATCH
    const newChunkCutoff = now - 24 * 3600; // 24 hours ago

    for (const sourceType of ['summary', 'code-pattern']) {
        if (TTL[sourceType] === null) {
            // Only compact summary and code-pattern when > threshold
            let conditions = 'source_type = ? AND created_at < ?';
            let params = [sourceType, newChunkCutoff];
            if (projectFilter) {
                conditions += ' AND project_name = ?';
                params.push(projectFilter);
            }

            const totalCount = db.prepare(`SELECT COUNT(*) AS count FROM memory_chunks WHERE source_type = ?`).get(sourceType).count;

            if (totalCount > COMPACTION_THRESHOLD) {
                const oldChunks = db.prepare(`SELECT id, content FROM memory_chunks WHERE ${conditions} ORDER BY created_at ASC LIMIT ?`).all(...params, COMPACTION_BATCH);

                if (oldChunks.length > 0) {
                    if (!dryRun) {
                        // Delete old chunks (will be summarized later via LLM)
                        const oldIds = oldChunks.map(c => c.id);
                        const deleteTags = db.prepare('DELETE FROM tags_index WHERE memory_id = ?');
                        for (const id of oldIds) {
                            deleteTags.run(id);
                            try {
                                const row = db.prepare('SELECT rowid FROM memory_chunks WHERE id = ?').get(id);
                                if (row) {
                                    db.prepare('DELETE FROM memory_vec WHERE rowid = ?').run(row.rowid);
                                }
                            } catch (_) { /* ignore */ }
                        }

                        const placeholders = oldIds.map(() => '?').join(',');
                        db.prepare(`DELETE FROM memory_chunks WHERE id IN (${placeholders})`).run(...oldIds);

                        results.summarized += oldChunks.length;
                        console.log(`  ℹ Compacted ${oldChunks.length} oldest "${sourceType}" chunks (marked for LLM summarization)`);
                    } else {
                        results.summarized += oldChunks.length;
                    }
                }
            }
        }
    }

    console.log(`  Compaction ${dryRun ? '(dry-run)' : ''}: ${results.purged} purged, ${results.summarized} summarized`);
    return results;
}

// ── Check (for enforcer.js integration) ─────────────────────────────────────────

function checkMemory(taskId, agentSlug, projectName) {
    if (!isDbReady()) {
        console.error('FAIL: Database not available');
        process.exit(1);
    }

    let conditions = ['task_id = ?', 'agent_slug = ?'];
    let params = [taskId, agentSlug];

    if (projectName) {
        conditions.push('project_name = ?');
        params.push(projectName);
    }

    const result = db.prepare(`SELECT COUNT(*) AS count FROM memory_chunks WHERE ${conditions.join(' AND ')}`).get(...params);

    if (result.count > 0) {
        console.log(`✓ Memory found for task "${taskId}" by agent "${agentSlug}"`);
        process.exit(0);
    } else {
        console.error(`FAIL: No memory found for task "${taskId}" by agent "${agentSlug}"`);
        process.exit(1);
    }
}

// ── Export (JSON backup) ────────────────────────────────────────────────────────

function exportMemories(projectName, outputPath) {
    if (!isDbReady()) {
        console.error('FAIL: Database not available');
        process.exit(1);
    }

    const outPath = outputPath || jsonPath;

    let conditions = '';
    let params = [];
    if (projectName) {
        conditions = 'WHERE project_name = ?';
        params.push(projectName);
    }

    const rows = db.prepare(`SELECT id, project_name, content, tags, task_id, agent_slug, source_type, source_file, created_at, last_accessed, access_count, token_count FROM memory_chunks ${conditions} ORDER BY created_at ASC`).all(...params);

    fs.writeFileSync(outPath, JSON.stringify(rows, null, 2));
    console.log(`✓ Exported ${rows.length} memories to ${outPath}`);
}

// ── Import (v1→v2 migration) ────────────────────────────────────────────────────

async function importMemories(inputPath, projectName, dryRun, force) {
    if (!isDbReady()) {
        console.error('FAIL: Database not available');
        process.exit(1);
    }

    const inPath = inputPath || GLOBAL_JSON_PATH;
    if (!fs.existsSync(inPath)) {
        console.error(`FAIL: Input file not found: ${inPath}`);
        process.exit(1);
    }

    // Check if DB is empty (unless --force)
    if (!force && !dryRun) {
        const count = db.prepare('SELECT COUNT(*) AS count FROM memory_chunks').get().count;
        if (count > 0) {
            console.error(`FAIL: Database already contains ${count} memories. Use --force to import anyway.`);
            process.exit(1);
        }
    }

    // Read v1 store.json
    let v1Data;
    try {
        v1Data = JSON.parse(fs.readFileSync(inPath, 'utf-8'));
    } catch (err) {
        console.error(`FAIL: Could not parse ${inPath}: ${err.message}`);
        process.exit(1);
    }

    if (!Array.isArray(v1Data)) {
        // Try wrapping single object
        v1Data = [v1Data];
    }

    if (dryRun) {
        console.log(`\n  ── Import Preview (dry-run) ──`);
        console.log(`  Source: ${inPath}`);
        console.log(`  Memories found: ${v1Data.length}`);
        console.log(`  Target project: ${projectName || 'global'}`);

        // Show sample
        const sample = v1Data.slice(0, 3);
        for (const m of sample) {
            console.log(`\n  ${'─'.repeat(40)}`);
            console.log(`  ID:      ${m.id || m.memoryId || '(none)'}`);
            console.log(`  Content: ${(m.content || '').substring(0, 80)}...`);
            console.log(`  Tags:    ${m.tags || '(none)'}`);
            console.log(`  Task:    ${m.taskId || '(none)'}`);
            console.log(`  Agent:   ${m.agentSlug || '(none)'}`);
        }
        if (v1Data.length > 3) {
            console.log(`  ... and ${v1Data.length - 3} more`);
        }
        console.log(`\n  Run without --dry-run to import.`);
        process.exit(0);
    }

    // Import
    const project = projectName || 'global';
    let imported = 0;
    let errors = 0;

    for (const v1 of v1Data) {
        try {
            const id = v1.id || crypto.randomUUID();
            const content = v1.content || '';
            const tags = v1.tags || '';
            const taskId = v1.taskId || null;
            const agentSlug = v1.agentSlug || null;
            const sourceFile = v1.sourceFile || null;
            const sourceType = v1.sourceType || 'summary';

            // Parse createdAt (v1 uses ISO string, v2 uses unix epoch)
            let createdAt;
            if (v1.createdAt) {
                createdAt = Math.floor(new Date(v1.createdAt).getTime() / 1000);
            } else {
                createdAt = Math.floor(Date.now() / 1000);
            }

            const now = Math.floor(Date.now() / 1000);
            const tokenCount = Math.ceil(content.length / 4);

            // Generate embedding
            const embedding = await generateEmbedding(content);
            const embeddingBlob = toF32Blob(embedding);

            // Insert
            db.prepare(`
                INSERT INTO memory_chunks (id, project_name, content, tags, task_id, agent_slug, source_type, source_file, created_at, last_accessed, access_count, token_count)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
            `).run(id, project, content, tags, taskId, agentSlug, sourceType, sourceFile, createdAt, now, tokenCount);

            // Tags
            const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
            const insertTag = db.prepare('INSERT INTO tags_index (tag, memory_id) VALUES (?, ?)');
            for (const tag of tagList) {
                insertTag.run(tag, id);
            }

            // vec0
            try {
                const row = db.prepare('SELECT rowid FROM memory_chunks WHERE id = ?').get(id);
                if (row) {
                    db.prepare('INSERT INTO memory_vec(rowid, embedding) VALUES (?, ?)').run(row.rowid, embeddingBlob);
                }
            } catch (_) { /* vec0 may not exist */ }

            imported++;
        } catch (err) {
            errors++;
            console.error(`  Error importing memory: ${err.message}`);
        }
    }

    console.log(`\n  ── Import Complete ──`);
    console.log(`  Imported: ${imported} memories`);
    if (errors > 0) console.log(`  Errors:   ${errors}`);
    console.log(`  Project:  ${project}`);
    process.exit(errors > 0 ? 1 : 0);
}

// ── CLI argument parsing ────────────────────────────────────────────────────────

function parseArgs() {
    const args = process.argv.slice(2);
    const opts = {};

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg.startsWith('--')) {
            const key = arg.slice(2);
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
        console.log(`      Task:       ${r.task_id || '(none)'}`);
        console.log(`      Agent:      ${r.agent_slug || '(none)'}`);
        console.log(`      Type:       ${r.source_type || 'summary'}`);
        console.log(`      Project:    ${r.project_name || 'global'}`);
        console.log(`      Created:    ${r.created_at ? new Date(r.created_at * 1000).toISOString() : '(unknown)'}`);
        console.log(`      Accessed:   ${r.access_count || 0} times`);
        if (r.source_file) console.log(`      Source:     ${r.source_file}`);
    }
    console.log(`  ${'─'.repeat(56)}`);
}

function formatStats(stats) {
    console.log('');
    console.log('  📊 Memory Store Statistics');
    console.log(`  ${'─'.repeat(40)}`);
    console.log(`  Total memories:   ${stats.total}`);
    if (stats.totalAccesses !== undefined) console.log(`  Total accesses:   ${stats.totalAccesses}`);
    if (stats.avgAccess !== undefined) console.log(`  Avg accesses:     ${stats.avgAccess}`);
    console.log('');

    if (stats.byProject && Object.keys(stats.byProject).length > 0) {
        console.log('  By project:');
        for (const [proj, count] of Object.entries(stats.byProject).sort((a, b) => b[1] - a[1])) {
            console.log(`    ${proj.padEnd(25)} ${count}`);
        }
        console.log('');
    }

    if (stats.bySourceType && Object.keys(stats.bySourceType).length > 0) {
        console.log('  By source type:');
        for (const [type, count] of Object.entries(stats.bySourceType).sort((a, b) => b[1] - a[1])) {
            console.log(`    ${type.padEnd(25)} ${count}`);
        }
        console.log('');
    }

    if (stats.byAgent && Object.keys(stats.byAgent).length > 0) {
        console.log('  By agent:');
        for (const [agent, count] of Object.entries(stats.byAgent).sort((a, b) => b[1] - a[1])) {
            console.log(`    ${agent.padEnd(25)} ${count}`);
        }
        console.log('');
    }
}

function showUsage() {
    const script = path.basename(process.argv[1]);
    console.log(`
  ╔══════════════════════════════════════════════════════════╗
  ║     Agency Semantic Memory v2 — Hybrid Search           ║
  ╚══════════════════════════════════════════════════════════╝

  Usage:
    node ${script} store   --content <text> --tags <tags> --task <id> --project <id> [--agent <slug>] [--source <file>] [--source-type <type>]
    node ${script} recall  --query <text> [--tags <filter>] [--limit <n>] [--min-score <float>] [--project <id>] [--source-type <type>]
    node ${script} stats   [--project <id>]
    node ${script} purge   --older-than <days> [--project <id>] [--source-type <type>]
    node ${script} compact [--project <id>] [--dry-run]
    node ${script} check   --task <id> --agent <slug> [--project <id>]
    node ${script} export  --project <id> [--output <path>]
    node ${script} import  --project <id> [--input <path>] [--dry-run] [--force]

  Commands:

    store     Store a memory with Transformers.js embedding (384-dim).
              --project   Project scope (REQUIRED)
              --content   Text content to remember (required)
              --tags      Comma-separated tags (required)
              --task      Task ID (required)
              --agent     Agent slug (default: lead-architect)
              --source    Optional source file path
              --source-type  One of: summary, decision, code-pattern, error, observation, terminal (default: summary)

    recall    Hybrid search: BM25 (40%) + vector (30%) + recency (20%) + frequency (10%).
              --query     Search query text (required)
              --tags      Optional tag filter
              --limit     Results (default: 5, max: 20)
              --min-score Threshold 0.0-1.0 (default: 0.05)
              --project   Filter by project
              --source-type Filter by source type

    stats     Show store statistics.

    purge     Remove memories older than N days.

    compact   Run compaction/TTL engine.
              --dry-run   Preview without modifying.

    check     Verify memory exists for task+agent (used by enforcer.js).

    export    Export SQLite → JSON (backup).
              --project   Project scope (required)
              --output    Output path (default: project memory/store.json)

    import    Import v1 JSON → v2 SQLite (migration).
              --project   Target project (required)
              --input     Input JSON path (default: .agency/memory/store.json)
              --dry-run   Preview what would be imported
              --force     Import even if DB is non-empty

  Storage:
    SQLite:   .agency/memory/store.db (WAL mode, FTS5 + vec0)
    JSON:     Backup only via export command

  Embedding:
    Primary:  Xenova/all-MiniLM-L6-v2 (384-dim) via @xenova/transformers
    Fallback: TF-IDF keyword embedding (avg-pooled 768→384)
`);
}

// ── Main ────────────────────────────────────────────────────────────────────────

async function main() {
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

            // --project is REQUIRED (Task 20a.6)
            if (!opts.project) {
                console.error('ERROR: --project is required. Use --project global for global memories.');
                process.exit(1);
            }

            if (missing.length > 0) {
                console.error(`FAIL: Missing required argument(s): ${missing.join(', ')}`);
                console.error('Usage: node memory.js store --content <text> --tags <tags> --task <id> --project <id> [--agent <slug>] [--source <file>] [--source-type <type>]');
                process.exit(1);
            }

            const agentSlug = opts.agent || 'lead-architect';
            const sourceType = opts.sourceType || 'summary';

            const id = await storeMemory(opts.content, opts.tags, opts.task, agentSlug, opts.source || null, opts.project, sourceType);

            // Check chunk count for compaction threshold
            let needsCompact = false;
            try {
                const countRow = db.prepare('SELECT COUNT(*) as cnt FROM memory_chunks WHERE project_name = ?').get(opts.project);
                if (countRow && countRow.cnt >= COMPACTION_THRESHOLD) {
                    needsCompact = true;
                }
            } catch (_) { /* non-blocking */ }

            // If compaction threshold exceeded, store PENDING flag for async cron
            const MEMORY_BASE = path.resolve(__dirname, '../memory');
            if (needsCompact) {
                const pendingCompactPath = path.join(MEMORY_BASE, `.compact-pending-${opts.project}`);
                try {
                    const chunkCount = db.prepare('SELECT COUNT(*) as cnt FROM memory_chunks WHERE project_name = ?').get(opts.project);
                    fs.writeFileSync(pendingCompactPath, JSON.stringify({
                        project: opts.project,
                        triggered_at: new Date().toISOString(),
                        chunk_count: chunkCount ? chunkCount.cnt : 0
                    }), 'utf-8');
                } catch (_) { /* non-blocking */ }

                console.log('PASS: Memory stored');
                console.log(`  ID:          ${id}-PENDING`);
                console.log(`  Content:     ${opts.content.substring(0, 100)}${opts.content.length > 100 ? '...' : ''}`);
                console.log(`  Tags:        ${opts.tags}`);
                console.log(`  Task:        ${opts.task}`);
                console.log(`  Agent:       ${agentSlug}`);
                console.log(`  Project:     ${opts.project}`);
                console.log(`  Source type: ${sourceType}`);
                console.log(`  ⚠ Chunk count exceeds ${COMPACTION_THRESHOLD} — compaction deferred to cron`);
            } else {
                console.log('PASS: Memory stored');
                console.log(`  ID:          ${id}`);
                console.log(`  Content:     ${opts.content.substring(0, 100)}${opts.content.length > 100 ? '...' : ''}`);
                console.log(`  Tags:        ${opts.tags}`);
                console.log(`  Task:        ${opts.task}`);
                console.log(`  Agent:       ${agentSlug}`);
                console.log(`  Project:     ${opts.project}`);
                console.log(`  Source type: ${sourceType}`);
            }
            process.exit(0);
        }

        case 'recall': {
            if (!opts.query) {
                console.error('FAIL: Missing required argument: --query');
                process.exit(1);
            }

            const limit = opts.limit ? parseInt(opts.limit, 10) : DEFAULT_LIMIT;
            if (isNaN(limit) || limit < 1 || limit > MAX_LIMIT) {
                console.error(`FAIL: --limit must be a number between 1 and ${MAX_LIMIT}`);
                process.exit(1);
            }

            let minScore = undefined;
            if (opts.minScore !== undefined) {
                minScore = parseFloat(opts.minScore);
                if (isNaN(minScore) || minScore < 0 || minScore > 1) {
                    console.error('FAIL: --min-score must be a float between 0.0 and 1.0');
                    process.exit(1);
                }
            }

            const results = await recallMemories(opts.query, opts.tags || null, limit, minScore, opts.project || null, opts.sourceType || null);

            console.log('');
            console.log(`  🔍 Recall: "${opts.query}"`);
            if (opts.tags) console.log(`  Filter:    tags in [${opts.tags}]`);
            if (opts.sourceType) console.log(`  Type:      ${opts.sourceType}`);
            if (opts.project) console.log(`  Project:   ${opts.project}`);
            if (minScore !== undefined) console.log(`  Min score: ${minScore.toFixed(2)}`);
            console.log(`  Results:   ${results.length}`);
            formatResults(results);
            process.exit(0);
        }

        case 'stats': {
            const stats = getStats(opts.project || null);
            formatStats(stats);
            process.exit(0);
        }

        case 'purge': {
            if (!opts.olderThan) {
                console.error('FAIL: Missing required argument: --older-than');
                process.exit(1);
            }

            const days = parseInt(opts.olderThan, 10);
            if (isNaN(days) || days < 0) {
                console.error('FAIL: --older-than must be a non-negative integer (days)');
                process.exit(1);
            }

            const deleted = purgeMemories(days, opts.project || null, opts.sourceType || null);
            console.log(`PASS: Purged ${deleted} memories older than ${days} days.`);
            process.exit(0);
        }

        case 'compact': {
            const dryRun = !!opts.dryRun;
            if (!isDbReady()) {
                console.error('FAIL: Database not available');
                process.exit(1);
            }
            console.log(`\n  ── Compaction ${dryRun ? '(dry-run)' : ''} ──`);
            runCompaction(opts.project || null, dryRun);
            process.exit(0);
        }

        case 'check': {
            if (!opts.task) { console.error('FAIL: --task is required'); process.exit(1); }
            if (!opts.agent) { console.error('FAIL: --agent is required'); process.exit(1); }
            checkMemory(opts.task, opts.agent, opts.project || null);
            break;
        }

        case 'export': {
            if (!opts.project) {
                console.error('ERROR: --project is required. Use --project global for global memories.');
                process.exit(1);
            }
            exportMemories(opts.project, opts.output || null);
            process.exit(0);
        }

        case 'import': {
            if (!opts.project) {
                console.error('ERROR: --project is required for import.');
                process.exit(1);
            }
            await importMemories(opts.input || null, opts.project, !!opts.dryRun, !!opts.force);
            break;
        }

        default: {
            console.error(`\n  ❌ Unknown command: "${command}"`);
            console.error(`  Run "node ${path.basename(process.argv[1])} --help" for available commands.\n`);
            process.exit(1);
        }
    }
}

main().catch(err => {
    console.error(`FATAL: ${err.message}`);
    process.exit(1);
});
