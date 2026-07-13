#!/usr/bin/env node
// @ts-nocheck

/**
 * cleanup-test-db.js — Test Database Cleanup Script
 *
 * Truncates all tables in the test database using `TRUNCATE TABLE ... CASCADE`.
 * Uses @prisma/client for safe database operations.
 *
 * Environment variables (in order of precedence):
 *   DATABASE_URL_TEST  — (preferred) test database connection string
 *   DATABASE_URL       — fallback connection string
 *
 * Usage:
 *   node .agency/scripts/cleanup-test-db.js
 *
 * Exit codes:
 *   0 — All tables truncated successfully
 *   1 — Connection failure or truncation error
 */

const { PrismaClient } = require('@prisma/client');

async function main() {
    const databaseUrl = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.error(
            'ERROR: DATABASE_URL_TEST (or DATABASE_URL) environment variable is not set.',
        );
        process.exit(1);
    }

    const prisma = new PrismaClient({
        datasources: { db: { url: databaseUrl } },
    });

    try {
        await prisma.$connect();
        console.log('Connected to test database.\n');

        // Query all user tables (exclude Prisma migration tracking table)
        const tables = await prisma.$queryRawUnsafe(
            `SELECT tablename FROM pg_tables
       WHERE schemaname = 'public'
         AND tablename != '_prisma_migrations'
       ORDER BY tablename`,
        );

        if (!Array.isArray(tables) || tables.length === 0) {
            console.log('No user tables found to truncate.');
            await prisma.$disconnect();
            process.exit(0);
        }

        for (const row of tables) {
            const tableName = row.tablename;
            await prisma.$executeRawUnsafe(
                `TRUNCATE TABLE "${tableName}" CASCADE`,
            );
            console.log(`  ✓ Truncated: ${tableName}`);
        }

        console.log(`\nSuccessfully truncated ${tables.length} table(s).`);
        await prisma.$disconnect();
        process.exit(0);
    } catch (err) {
        console.error(`ERROR: ${err.message}`);
        await prisma.$disconnect().catch(() => { });
        process.exit(1);
    }
}

main();
