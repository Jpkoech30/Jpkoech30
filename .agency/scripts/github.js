#!/usr/bin/env node

/**
 * github.js — GitHub API Service for ZooCode Agency
 *
 * Wraps the GitHub REST API for repo management, issues, and PRs.
 * Uses Node.js `https` module only — zero external dependencies.
 *
 * Usage:
 *   node .agency/scripts/github.js init <repo-name> [--private] [--description <text>]
 *   node .agency/scripts/github.js push [--message <msg>]
 *   node .agency/scripts/github.js remote <url>
 *   node .agency/scripts/github.js issue create --title <t> --body <b> [--labels <l>]
 *   node .agency/scripts/github.js pr create --title <t> --head <b> --base <b> [--body <b>]
 *   node .agency/scripts/github.js status
 *
 * Environment:
 *   GITHUB_TOKEN  — GitHub personal access token (required)
 *   GH_TOKEN      — Fallback env var for GitHub token
 *
 * Exit codes:
 *   0 — Success
 *   1 — Error
 */

const https = require('https');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ── Load .env from project root (zero-dependency) ──────────────────────────

const ROOT = path.resolve(__dirname, '..', '..');
const ENV_PATH = path.join(ROOT, '.env');
if (fs.existsSync(ENV_PATH)) {
    const lines = fs.readFileSync(ENV_PATH, 'utf-8').split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        if (key && !process.env[key]) {
            process.env[key] = val;
        }
    }
}

// ── ANSI Color Helpers ────────────────────────────────────────────────────────

const COLOR = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m',
    reset: '\x1b[0m',
};

function ok(msg) {
    console.log(`${COLOR.green}✓${COLOR.reset} ${msg}`);
}

function info(msg) {
    console.log(`  ${COLOR.cyan}→${COLOR.reset} ${msg}`);
}

function warn(msg) {
    console.log(`${COLOR.yellow}⚠${COLOR.reset} ${msg}`);
}

function fail(msg) {
    console.error(`${COLOR.red}✖${COLOR.reset} ${msg}`);
}

// ── Auth ──────────────────────────────────────────────────────────────────────

function getToken() {
    return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || null;
}

// ── Git Helpers ───────────────────────────────────────────────────────────────

function execGit(args) {
    try {
        return execSync(`git ${args}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    } catch {
        return null;
    }
}

function getRemoteUrl() {
    return execGit('remote get-url origin');
}

function getCurrentBranch() {
    const branch = execGit('rev-parse --abbrev-ref HEAD');
    return branch || 'unknown';
}

function hasUncommittedChanges() {
    const status = execGit('status --porcelain');
    return status ? status.split('\n').filter(Boolean).length : 0;
}

// ── Remote URL Parser ─────────────────────────────────────────────────────────

function parseOwnerRepo(remoteUrl) {
    if (!remoteUrl) return { owner: null, repo: null };

    // Support both SSH (git@github.com:owner/repo.git) and HTTPS (https://github.com/owner/repo.git)
    let match;
    if (remoteUrl.includes('github.com')) {
        // SSH format: git@github.com:owner/repo.git
        match = remoteUrl.match(/github\.com[:\/]([^\/]+)\/([^\/]+?)(?:\.git)?$/);
        if (match) {
            return { owner: match[1], repo: match[2] };
        }
    }

    return { owner: null, repo: null };
}

// ── GitHub API Client ─────────────────────────────────────────────────────────

function githubRequest(method, apiPath, body = null) {
    return new Promise((resolve, reject) => {
        const token = getToken();
        if (!token) {
            reject(new Error('GITHUB_TOKEN or GH_TOKEN not set'));
            return;
        }

        const requestBody = body ? JSON.stringify(body) : null;

        const options = {
            hostname: 'api.github.com',
            path: apiPath,
            method,
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'ZooCode-Agency-GitHub-Service',
                'Content-Type': 'application/json',
            },
        };

        if (requestBody) {
            options.headers['Content-Length'] = Buffer.byteLength(requestBody);
        }

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                let parsed;
                try {
                    parsed = data ? JSON.parse(data) : {};
                } catch {
                    parsed = { raw: data };
                }

                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({ status: res.statusCode, data: parsed });
                } else {
                    const errMsg = parsed.message || parsed.errors?.[0]?.message || `HTTP ${res.statusCode}`;
                    reject(new Error(`GitHub API error (${res.statusCode}): ${errMsg}`));
                }
            });
        });

        req.on('error', (err) => {
            reject(new Error(`Network error: ${err.message}`));
        });

        if (requestBody) {
            req.write(requestBody);
        }

        req.end();
    });
}

// ── Command: status ──────────────────────────────────────────────────────────

async function cmdStatus() {
    const token = getToken();
    const remoteUrl = getRemoteUrl();
    const branch = getCurrentBranch();
    const changes = hasUncommittedChanges();
    const { owner, repo } = parseOwnerRepo(remoteUrl);

    console.log(`\n${COLOR.bold}GitHub Service Status${COLOR.reset}\n`);

    // Auth state
    if (token) {
        ok('GitHub token configured');
    } else {
        fail('GitHub token NOT configured (set GITHUB_TOKEN or GH_TOKEN)');
    }

    // Remote URL
    if (remoteUrl) {
        info(`Remote origin: ${remoteUrl}`);
        if (owner && repo) {
            info(`Parsed: ${COLOR.cyan}${owner}/${repo}${COLOR.reset}`);
        }
    } else {
        warn('No remote "origin" configured');
    }

    // Branch
    info(`Current branch: ${COLOR.cyan}${branch}${COLOR.reset}`);

    // Uncommitted changes
    if (changes > 0) {
        warn(`${changes} uncommitted change(s)`);
    } else {
        ok('Working tree clean');
    }

    console.log('');
    return 0;
}

// ── Command: remote ───────────────────────────────────────────────────────────

async function cmdRemote(url) {
    if (!url) {
        fail('Usage: node .agency/scripts/github.js remote <url>');
        return 1;
    }

    const existing = getRemoteUrl();
    if (existing) {
        execGit(`remote set-url origin "${url}"`);
        ok(`Remote "origin" updated to: ${url}`);
    } else {
        execGit(`remote add origin "${url}"`);
        ok(`Remote "origin" set to: ${url}`);
    }

    return 0;
}

// ── Command: init ─────────────────────────────────────────────────────────────

async function cmdInit(repoName, options) {
    if (!repoName) {
        fail('Usage: node .agency/scripts/github.js init <repo-name> [--private] [--description <text>]');
        return 1;
    }

    const token = getToken();
    if (!token) {
        fail('GITHUB_TOKEN or GH_TOKEN not set');
        return 1;
    }

    const body = {
        name: repoName,
        description: options.description || '',
        private: !!options.private,
        auto_init: false,
    };

    info(`Creating GitHub repository "${repoName}"...`);

    try {
        const result = await githubRequest('POST', '/user/repos', body);
        const repoUrl = result.data.clone_url || result.data.html_url;
        ok(`Repository created: ${repoUrl}`);

        // Set as git remote
        const existing = getRemoteUrl();
        if (existing) {
            execGit(`remote set-url origin "${repoUrl}"`);
        } else {
            execGit(`remote add origin "${repoUrl}"`);
        }
        ok(`Remote "origin" set to: ${repoUrl}`);

        // Stage all files, initial commit, push
        info('Staging all files...');
        execGit('add -A');
        ok('All files staged');

        info('Creating initial commit...');
        execGit('commit -m "feat: initial commit — bootstrap project"');
        ok('Initial commit created');

        info('Pushing to origin master...');
        execGit('push -u origin master');
        ok('Pushed to origin master');

        return 0;
    } catch (err) {
        fail(err.message);
        return 1;
    }
}

// ── Command: push ─────────────────────────────────────────────────────────────

async function cmdPush(message) {
    const msg = message || 'chore: auto-commit from agency';
    const remoteUrl = getRemoteUrl();

    if (!remoteUrl) {
        fail('No remote "origin" configured');
        return 1;
    }

    const changes = hasUncommittedChanges();
    if (changes === 0) {
        warn('No uncommitted changes to push');
        return 0;
    }

    try {
        info('Staging all changes...');
        execGit('add -A');
        ok(`Staged ${changes} file(s)`);

        info(`Committing: "${msg}"`);
        execGit(`commit -m "${msg.replace(/"/g, '\\"')}"`);
        ok('Committed');

        info('Pushing to origin master...');
        execGit('push origin master');
        ok('Pushed successfully');

        return 0;
    } catch (err) {
        fail(`Push failed: ${err.message}`);
        return 1;
    }
}

// ── Command: issue create ─────────────────────────────────────────────────────

async function cmdIssueCreate(options) {
    if (!options.title) {
        fail('Usage: node .agency/scripts/github.js issue create --title <t> --body <b> [--labels <l>]');
        return 1;
    }

    const remoteUrl = getRemoteUrl();
    if (!remoteUrl) {
        fail('No remote "origin" configured. Use --owner flag or set up remote first.');
        return 1;
    }

    const { owner, repo } = parseOwnerRepo(remoteUrl);

    if (!owner || !repo) {
        fail('Could not parse owner/repo from remote URL');
        return 1;
    }

    const body = { title: options.title };
    if (options.body) body.body = options.body;
    if (options.labels) {
        body.labels = options.labels.split(',').map(l => l.trim()).filter(Boolean);
    }

    try {
        info(`Creating issue in ${owner}/${repo}...`);
        const result = await githubRequest('POST', `/repos/${owner}/${repo}/issues`, body);
        ok(`Issue #${result.data.number} created: ${result.data.html_url}`);
        return 0;
    } catch (err) {
        fail(err.message);
        return 1;
    }
}

// ── Command: pr create ────────────────────────────────────────────────────────

async function cmdPrCreate(options) {
    if (!options.title || !options.head || !options.base) {
        fail('Usage: node .agency/scripts/github.js pr create --title <t> --head <b> --base <b> [--body <b>]');
        return 1;
    }

    const remoteUrl = getRemoteUrl();
    if (!remoteUrl) {
        fail('No remote "origin" configured. Set up remote first.');
        return 1;
    }

    const { owner, repo } = parseOwnerRepo(remoteUrl);

    if (!owner || !repo) {
        fail('Could not parse owner/repo from remote URL');
        return 1;
    }

    const body = {
        title: options.title,
        head: options.head,
        base: options.base,
    };
    if (options.body) body.body = options.body;

    try {
        info(`Creating PR in ${owner}/${repo}...`);
        const result = await githubRequest('POST', `/repos/${owner}/${repo}/pulls`, body);
        ok(`PR #${result.data.number} created: ${result.data.html_url}`);
        return 0;
    } catch (err) {
        fail(err.message);
        return 1;
    }
}

// ── Argument Parser ───────────────────────────────────────────────────────────

function parseArgs(args) {
    const parsed = {};
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--')) {
            const key = args[i].replace(/^--/, '');
            const next = args[i + 1];
            if (next && !next.startsWith('--')) {
                parsed[key] = next;
                i++;
            } else {
                parsed[key] = true;
            }
        }
    }
    return parsed;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log(`
  ${COLOR.bold}GitHub API Service${COLOR.reset}

  Usage:
    node .agency/scripts/github.js init <repo-name> [--private] [--description <text>]
    node .agency/scripts/github.js push [--message <msg>]
    node .agency/scripts/github.js remote <url>
    node .agency/scripts/github.js issue create --title <t> --body <b> [--labels <l>]
    node .agency/scripts/github.js pr create --title <t> --head <b> --base <b> [--body <b>]
    node .agency/scripts/github.js status

  Environment:
    GITHUB_TOKEN  GitHub personal access token (required)
    GH_TOKEN      Alternative env var (fallback)
`);
        return 0;
    }

    const command = args[0];

    try {
        switch (command) {
            case 'status':
                return await cmdStatus();

            case 'remote':
                return await cmdRemote(args[1]);

            case 'init': {
                const opts = parseArgs(args.slice(2));
                return await cmdInit(args[1], {
                    private: opts.private || false,
                    description: opts.description || null,
                });
            }

            case 'push': {
                const opts = parseArgs(args.slice(1));
                return await cmdPush(opts.message || null);
            }

            case 'issue': {
                const subCmd = args[1];
                if (subCmd === 'create') {
                    const opts = parseArgs(args.slice(2));
                    return await cmdIssueCreate({
                        title: opts.title,
                        body: opts.body,
                        labels: opts.labels,
                    });
                }
                fail('Unknown issue subcommand. Use: issue create');
                return 1;
            }

            case 'pr': {
                const subCmd = args[1];
                if (subCmd === 'create') {
                    const opts = parseArgs(args.slice(2));
                    return await cmdPrCreate({
                        title: opts.title,
                        head: opts.head,
                        base: opts.base,
                        body: opts.body,
                    });
                }
                fail('Unknown pr subcommand. Use: pr create');
                return 1;
            }

            default:
                fail(`Unknown command: "${command}"`);
                return 1;
        }
    } catch (err) {
        fail(err.message);
        return 1;
    }
}

// ── Run ───────────────────────────────────────────────────────────────────────

main().then((code) => {
    process.exit(code);
}).catch((err) => {
    fail(`Unexpected error: ${err.message}`);
    process.exit(1);
});
