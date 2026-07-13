#!/usr/bin/env node
// @ts-nocheck
/**
 * recap.js — Session Context Recap
 *
 * Shows a "where are we" summary after VSCode restart:
 *   - Agency git state
 *   - Active project git state
 *   - Last handoff/task (from session-state.json)
 *   - Recent commits
 *   - Uncommitted files
 *
 * Usage:
 *   node .agency/scripts/recap.js
 *
 * Exit codes:
 *   0 — Success (always)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const ACTIVE_PROJECT_PATH = path.join(ROOT, '.agency', '.active-project');
const PROJECTS_JSON_PATH = path.join(ROOT, '.agency', 'projects.json');
const SESSION_STATE_PATH = path.join(ROOT, '.agency', 'session-state.json');

// ── Helpers ──────────────────────────────────────────────────────────────────

function gitCommand(args, cwd) {
    try {
        return execSync(`git ${args}`, { cwd, stdio: 'pipe', timeout: 10000, encoding: 'utf-8' }).toString().trim();
    } catch {
        return null;
    }
}

function formatDate(isoString) {
    if (!isoString) return 'unknown';
    const d = new Date(isoString);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${h}:${m}`;
}

function timeAgo(isoString) {
    if (!isoString) return '';
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
}

function readJson(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        }
    } catch { /* ignore */ }
    return null;
}

// ── Section: Agency Info ─────────────────────────────────────────────────────

function printAgencyInfo() {
    const branch = gitCommand('rev-parse --abbrev-ref HEAD', ROOT);
    const lastCommit = gitCommand('log --oneline -1', ROOT);
    const status = gitCommand('status --porcelain', ROOT);
    const dirtyCount = status ? status.split('\n').filter(l => l.trim()).length : 0;

    console.log('🏢 Agency: zoocode-agency');
    if (branch) console.log(`   Branch: ${branch}`);
    if (lastCommit) console.log(`   Last commit: ${lastCommit}`);
    if (status !== null) {
        console.log(`   Status: ${dirtyCount === 0 ? '✅ Clean' : `⚠️  ${dirtyCount} uncommitted`}`);
    }
    console.log('');
}

// ── Section: Active Project Info ─────────────────────────────────────────────

function printProjectInfo() {
    const projectsConfig = readJson(PROJECTS_JSON_PATH);
    if (!projectsConfig || !projectsConfig.projects) {
        console.log('📁 Projects: No projects.json found');
        console.log('');
        return;
    }

    const activeProjectId = readJson(ACTIVE_PROJECT_PATH) || projectsConfig.activeProject;
    const activeProject = projectsConfig.projects.find(p => p.id === activeProjectId);

    if (!activeProject) {
        console.log(`📁 Active Project: "${activeProjectId}" — not found in projects.json`);
        console.log('');
        return;
    }

    const projectRoot = path.resolve(ROOT, activeProject.rootPath || '');
    const isAgency = activeProject.isAgency;

    console.log(`📁 Active Project: ${activeProject.name}`);
    console.log(`   ID: ${activeProject.id}`);
    if (activeProject.rootPath) console.log(`   Root: ${activeProject.rootPath}`);
    if (activeProject.techStack) {
        const stackStr = Object.values(activeProject.techStack).join(' / ');
        console.log(`   Stack: ${stackStr}`);
    }

    // Git state for project (skip if agency itself, already shown above)
    if (!isAgency && fs.existsSync(projectRoot)) {
        const branch = gitCommand('rev-parse --abbrev-ref HEAD', projectRoot);
        const lastCommit = gitCommand('log --oneline -1', projectRoot);
        const status = gitCommand('status --porcelain', projectRoot);
        const dirtyCount = status ? status.split('\n').filter(l => l.trim()).length : 0;

        if (branch) console.log(`   Branch: ${branch}`);
        if (lastCommit) console.log(`   Last commit: ${lastCommit}`);
        if (status !== null) {
            console.log(`   Status: ${dirtyCount === 0 ? '✅ Clean' : `⚠️  ${dirtyCount} uncommitted`}`);
        }

        // List dirty files (max 10)
        if (status && dirtyCount > 0) {
            const lines = status.split('\n').filter(l => l.trim()).slice(0, 10);
            for (const line of lines) {
                const statusChar = line.substring(0, 2).trim();
                const filePath = line.substring(3).trim();
                const icon = statusChar === '??' ? '🆕' :
                    statusChar.includes('M') ? '📝' :
                        statusChar.includes('D') ? '🗑️' : '⚡';
                console.log(`   ${icon} ${filePath}`);
            }
            if (dirtyCount > 10) {
                console.log(`   ... and ${dirtyCount - 10} more`);
            }
        }
    } else if (!isAgency) {
        console.log('   ⚠️  Project directory not found at expected path');
    }

    console.log('');
}

// ── Section: Last Session ────────────────────────────────────────────────────

function printLastSession() {
    const session = readJson(SESSION_STATE_PATH);

    console.log('🔄 Last Session');

    if (!session) {
        console.log('   No previous session recorded');
        console.log('');
        return;
    }

    if (session.lastHandoff) console.log(`   Last handoff: ${formatDate(session.lastHandoff)} (${timeAgo(session.lastHandoff)})`);
    if (session.task) console.log(`   Last task: ${session.task}`);
    if (session.fromAgent && session.toAgent) console.log(`   Agents: ${session.fromAgent} → ${session.toAgent}`);
    if (session.status) console.log(`   Status: ${session.status}`);
    if (session.scope) console.log(`   Scope: ${session.scope}`);
    if (session.commitHash) console.log(`   Commit: ${session.commitHash}`);
    if (session.project) {
        const projectLabel = session.project === 'zoocode-agency' ? 'agency' : session.project;
        console.log(`   Project: ${projectLabel}`);
    }

    console.log('');
}

// ── Section: Recent Commits ──────────────────────────────────────────────────

function printRecentCommits() {
    const log = gitCommand('log --oneline -5 --format="%h %s (%ar)"', ROOT);

    console.log('🕐 Recent Commits (agency)');

    if (log) {
        const lines = log.split('\n');
        for (const line of lines) {
            console.log(`   ${line}`);
        }
    } else {
        console.log('   No commits found');
    }

    console.log('');
}

// ── Section: Next Steps ──────────────────────────────────────────────────────

function printNextSteps() {
    console.log('➡️  Next:');
    console.log('   Ask "where are we" anytime to see this recap');
    console.log('   Or delegate a task to continue working');
    console.log('');
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
    const now = new Date();
    const tzOffset = -now.getTimezoneOffset();
    const tzSign = tzOffset >= 0 ? '+' : '-';
    const tzHours = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, '0');
    const tzLabel = `UTC${tzSign}${tzHours}`;

    console.log('');
    console.log(`📌 Current Context — ${formatDate(now.toISOString())} (${tzLabel})`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    printAgencyInfo();
    printProjectInfo();
    printLastSession();
    printRecentCommits();
    printNextSteps();

    process.exit(0);
}

main();
