#!/usr/bin/env node

// Top of file
try { require('./version-check'); } catch (e) { }

/**
 * terminal-session.js — Terminal Helper & Session Manager for AI Agents
 *
 * Features:
 *   - Command history per agent (stored in .agency/sessions/)
 *   - @-commands: @search, @find, @extract, @history, @cost, @stats, @switch, @help
 *   - Session persistence as JSON
 *   - Cost tracking (estimated token usage)
 *   - Output options: --agent, --task, --save, --json
 *   - Safety blacklist for dangerous commands
 *
 * Usage:
 *   node .agency/scripts/terminal-session.js @search "Prisma" --agent lead-architect
 *   node .agency/scripts/terminal-session.js @find "*.service.ts"
 *   node .agency/scripts/terminal-session.js @extract src/main.ts 1:50
 *   node .agency/scripts/terminal-session.js @history
 *   node .agency/scripts/terminal-session.js @cost --task 5.1
 *   node .agency/scripts/terminal-session.js @stats
 *   node .agency/scripts/terminal-session.js @help
 *
 * Exit codes:
 *   0 — Success
 *   1 — Error
 */

const fs = require('fs');
const path = require('path');
const { execSync: _rawExecSync } = require('child_process');

/**
 * Safe exec wrapper with default 2-minute timeout and error handling.
 * @param {string} cmd - Command to execute.
 * @param {object} [opts] - Options override (same as execSync options).
 * @returns {string} stdout from the command.
 */
function execSync(cmd, opts) {
    var defaultOpts = { timeout: 120000, stdio: 'pipe' };
    var mergedOpts = Object.assign({}, defaultOpts, opts || {});
    try {
        return _rawExecSync(cmd, mergedOpts);
    } catch (e) {
        if (e.killed || (e.message && e.message.indexOf('timeout') !== -1)) {
            console.error('⏱️ CI command timed out. DO NOT assume success.');
        }
        throw e;
    }
}

const ROOT = path.resolve(__dirname, '../..');
const SESSIONS_DIR = path.join(ROOT, '.agency', 'sessions');
const OUTPUTS_DIR = path.join(SESSIONS_DIR, 'outputs');

// Ensure required directories exist
[SESSIONS_DIR, OUTPUTS_DIR].forEach(function (dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// ── Safety Blacklist ──────────────────────────────────────────────────────────

/**
 * Patterns of dangerous commands that should never be executed.
 * @type {RegExp[]}
 */
const BLACKLIST = [
    /^rm\s+-rf\s/i,
    /^rmdir\s+\/s/i,
    /^del\s+\/f/i,
    /^rd\s+\/s/i,
    /^format\s/i,
    /^dd\s/i,
    /^mkfs/i,
    /^:\(\)\s*\{/,
    /^\|.*bash/i,
    /^\|.*sh/i,
    /^sudo\s+rm/i,
    /^chmod\s+-R\s+777/i,
    /^powershell.*remove-item/i,
    /^powershell.*rmdir/i,
];

/**
 * Check if a command string matches the safety blacklist.
 * @param {string} cmd - The command to check.
 * @returns {boolean} True if blacklisted.
 */
function isBlacklisted(cmd) {
    return BLACKLIST.some(function (pattern) {
        return pattern.test(cmd.trim());
    });
}

// ── CLI Parsing ───────────────────────────────────────────────────────────────

/**
 * Parse CLI arguments into an options object.
 * Handles flags both before and after the @command.
 * @returns {{ agent: string, task: string|null, save: boolean, json: boolean, command: string|null, commandArgs: string[] }}
 */
function parseArgs() {
    var args = process.argv.slice(2);
    var opts = {
        agent: 'default',
        task: null,
        save: false,
        json: false,
        command: null,
        commandArgs: []
    };

    // Phase 1: Find the @command and its positional args first
    var commandIndex = -1;
    for (var i = 0; i < args.length; i++) {
        if (args[i].startsWith('@')) {
            opts.command = args[i];
            commandIndex = i;
            break;
        }
    }

    // Phase 2: Collect command args (everything between @command and next --flag)
    if (commandIndex >= 0) {
        var cmdArgs = [];
        var j = commandIndex + 1;
        while (j < args.length && !args[j].startsWith('--')) {
            cmdArgs.push(args[j]);
            j++;
        }
        opts.commandArgs = cmdArgs;
    }

    // Phase 3: Parse all --flags from the full arg list
    for (var k = 0; k < args.length; k++) {
        if (args[k] === '--agent' && k + 1 < args.length) {
            opts.agent = args[++k];
        } else if (args[k] === '--task' && k + 1 < args.length) {
            opts.task = args[++k];
        } else if (args[k] === '--save') {
            opts.save = true;
        } else if (args[k] === '--json') {
            opts.json = true;
        }
    }

    return opts;
}

// ── Session Management ────────────────────────────────────────────────────────

/**
 * Get the file path for an agent's session file.
 * @param {string} agent - Agent slug.
 * @returns {string} Absolute path to session JSON file.
 */
function getSessionPath(agent) {
    var safeName = agent.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(SESSIONS_DIR, safeName + '.json');
}

/**
 * Load session data for a given agent. Returns a default session if none exists.
 * @param {string} agent - Agent slug.
 * @returns {{ agent: string, commands: Array, cost: { input: number, output: number, cache: number } }}
 */
function loadSession(agent) {
    var sessionPath = getSessionPath(agent);
    if (fs.existsSync(sessionPath)) {
        try {
            var data = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
            // Ensure cost object exists
            if (!data.cost) {
                data.cost = { input: 0, output: 0, cache: 0 };
            }
            return data;
        } catch (e) {
            // Corrupt file: return default
            return { agent: agent, commands: [], cost: { input: 0, output: 0, cache: 0 } };
        }
    }
    return { agent: agent, commands: [], cost: { input: 0, output: 0, cache: 0 } };
}

/**
 * Persist session data to disk.
 * @param {{ agent: string, commands: Array, cost: { input: number, output: number, cache: number } }} session
 */
function saveSession(session) {
    var sessionPath = getSessionPath(session.agent);
    fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2), 'utf-8');
}

/**
 * Record a command in the agent's history with cost estimation.
 * @param {string} agent - Agent slug.
 * @param {string} command - The @command used.
 * @param {string} args - Arguments to the command.
 * @param {{ input: number, output: number, cache: number }} cost - Estimated token cost.
 */
function addToHistory(agent, command, args, cost) {
    var session = loadSession(agent);
    session.commands.push({
        command: command,
        args: args || '',
        timestamp: new Date().toISOString(),
        cost: cost
    });
    session.cost.input += cost.input || 0;
    session.cost.output += cost.output || 0;
    session.cost.cache += cost.cache || 0;
    saveSession(session);
}

// ── Cost Estimation ───────────────────────────────────────────────────────────

/**
 * Roughly estimate token count from string length.
 * Assumes ~4 characters per token on average.
 * @param {string} text - Input text.
 * @returns {number} Estimated tokens.
 */
function estimateTokens(text) {
    return Math.ceil((text || '').length / 4);
}

/**
 * Estimate the token cost for executing a command.
 * @param {string} command - The command name.
 * @param {string[]} args - Command arguments.
 * @returns {{ input: number, output: number, cache: number }}
 */
function estimateCommandCost(command, args) {
    var inputTokens = estimateTokens(command + ' ' + (args || []).join(' '));
    var outputTokens = 500;  // default output estimate
    var cacheTokens = Math.floor(inputTokens * 0.3);  // ~30% cache hit rate
    return { input: inputTokens, output: outputTokens, cache: cacheTokens };
}

/**
 * Format a cost object as a human-readable string.
 * @param {{ input: number, output: number, cache: number }} cost
 * @returns {string}
 */
function formatCost(cost) {
    var totalTokens = (cost.input || 0) + (cost.output || 0);
    var costKES = ((cost.input * 19) + (cost.output * 38)) / 1000000;
    return '~' + totalTokens.toLocaleString() + ' tokens (~KES ' + costKES.toFixed(2) + ')';
}

// ── Output Formatting ─────────────────────────────────────────────────────────

/**
 * Format output with a header and separator.
 * @param {string} title - Section title.
 * @param {string} body - Content body.
 * @returns {string}
 */
function formatOutput(title, body) {
    var divider = ''.padStart(60, '─');
    return title + '\n' + divider + '\n' + body;
}

/**
 * Build a JSON output object.
 * @param {string} command - The @command.
 * @param {*} data - Response data.
 * @param {{ agent: string, task: string|null }} ctx - Context.
 * @returns {object}
 */
function buildJsonOutput(command, data, ctx) {
    return {
        command: command,
        agent: ctx.agent,
        task: ctx.task || null,
        timestamp: new Date().toISOString(),
        data: data
    };
}

/**
 * Save output to a file in the outputs directory.
 * @param {string} content - Content to save.
 * @param {string} agent - Agent slug.
 * @param {string} command - The @command name.
 * @returns {string} File path of saved output.
 */
function saveOutput(content, agent, command) {
    var timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    var safeAgent = agent.replace(/[^a-zA-Z0-9_-]/g, '_');
    var safeCmd = command.replace('@', '').replace(/[^a-zA-Z0-9_-]/g, '_');
    var filename = safeAgent + '_' + safeCmd + '_' + timestamp + '.txt';
    var filePath = path.join(OUTPUTS_DIR, filename);
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
}

// ── Command Handlers ──────────────────────────────────────────────────────────

/**
 * @search <pattern> — Recursively search files using regex.
 * @param {string} pattern - Search pattern.
 * @returns {string}
 */
function cmdSearch(pattern) {
    if (!pattern) {
        return 'Error: @search requires a pattern (e.g., @search "Prisma")';
    }

    try {
        var isWin = process.platform === 'win32';
        var result;

        if (isWin) {
            // Use PowerShell Select-String for cross-platform pattern search
            var psCmd = 'powershell -NoProfile -Command "Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.jsx,*.css,*.json,*.md | Select-String -Pattern \'' +
                pattern.replace(/'/g, "''") +
                '\' | Select-Object -First 100 | Format-Table -AutoSize -Wrap"';
            result = execSync(psCmd, { cwd: ROOT, encoding: 'utf-8', timeout: 30000 });
        } else {
            result = execSync(
                'rg -n --glob=\'*.{ts,tsx,js,jsx,css,json,md}\' -i "' + pattern + '" .',
                { cwd: ROOT, encoding: 'utf-8', timeout: 30000 }
            );
        }

        if (!result || result.trim() === '') {
            return 'No matches found for: "' + pattern + '"';
        }

        var lines = result.trim().split('\n').filter(function (l) { return l.trim(); });
        var summary = 'Found ' + lines.length + ' match(es) for "' + pattern + '"\n';
        return summary + lines.slice(0, 50).join('\n') +
            (lines.length > 50 ? '\n... and ' + (lines.length - 50) + ' more' : '');
    } catch (e) {
        if (e.status === 1 && e.stdout) {
            return e.stdout.trim() || 'No matches found for: "' + pattern + '"';
        }
        return 'Error searching: ' + e.message;
    }
}

/**
 * @find <filename> — Locate a file by name.
 * @param {string} filename - File name or glob pattern.
 * @returns {string}
 */
function cmdFind(filename) {
    if (!filename) {
        return 'Error: @find requires a filename (e.g., @find "*.service.ts")';
    }

    try {
        var isWin = process.platform === 'win32';
        var result;

        if (isWin) {
            var psCmd = 'powershell -NoProfile -Command "Get-ChildItem -Recurse -Filter \'' +
                filename.replace(/'/g, "''") +
                '\' | Select-Object FullName, Length | Format-Table -AutoSize -Wrap"';
            result = execSync(psCmd, { cwd: ROOT, encoding: 'utf-8', timeout: 15000 });
        } else {
            result = execSync(
                'find . -name "' + filename + '" -type f 2>/dev/null',
                { cwd: ROOT, encoding: 'utf-8', timeout: 15000 }
            );
        }

        if (!result || result.trim() === '') {
            return 'No files found matching: "' + filename + '"';
        }

        return result.trim();
    } catch (e) {
        if (e.status === 1 && e.stdout) {
            return e.stdout.trim() || 'No files found matching: "' + filename + '"';
        }
        return 'Error finding file: ' + e.message;
    }
}

/**
 * @extract <file> <start>:<end> — Read a specific line range from a file.
 * @param {string} filePath - Relative path to the file.
 * @param {string} rangeStr - Range in format "start:end".
 * @returns {string}
 */
function cmdExtract(filePath, rangeStr) {
    if (!filePath) {
        return 'Error: @extract requires a file path (e.g., @extract src/main.ts 1:50)';
    }

    var absolutePath = path.resolve(ROOT, filePath);
    if (!fs.existsSync(absolutePath)) {
        return 'Error: File not found: ' + filePath;
    }

    try {
        // Context Chunk Guard: warn and truncate for files > 50KB (~12,500 tokens)
        var stats = fs.statSync(absolutePath);
        if (stats.size > 50000) {
            console.warn('⚠️ [WARN] File exceeds 50KB. Extracting first 4000 chars only.');
            var partial = fs.readFileSync(absolutePath, 'utf-8').slice(0, 4000);
            var header = '📄 ' + filePath + ' (TRUNCATED — file is >50KB)';
            return formatOutput(header, partial + '\n... [TRUNCATED - use @extract with smaller range]');
        }

        var content = fs.readFileSync(absolutePath, 'utf-8');
        var lines = content.split('\n');
        var totalLines = lines.length;

        var start = 1;
        var end = totalLines;

        if (rangeStr) {
            var parts = rangeStr.split(':');
            start = parseInt(parts[0], 10) || 1;
            end = parseInt(parts[1], 10) || totalLines;
        }

        // Clamp to valid range
        start = Math.max(1, Math.min(start, totalLines));
        end = Math.max(start, Math.min(end, totalLines));

        var selected = lines.slice(start - 1, end);
        var header = '📄 ' + filePath + ':' + start + '-' + end + ' (total: ' + totalLines + ' lines)';

        return formatOutput(header, selected.join('\n'));
    } catch (e) {
        return 'Error reading file: ' + e.message;
    }
}

/**
 * @history [agent] — Show command history for an agent.
 * @param {string|null} targetAgent - Agent slug (optional, uses current if omitted).
 * @param {string} currentAgent - The current --agent context.
 * @returns {string}
 */
function cmdHistory(targetAgent, currentAgent) {
    var agent = targetAgent || currentAgent || 'default';
    var session = loadSession(agent);
    var history = session.commands;

    if (history.length === 0) {
        return 'No commands in history for agent \'' + agent + '\'.';
    }

    var lines = history.map(function (entry, i) {
        var idx = String(i + 1).padStart(3, ' ');
        var time = new Date(entry.timestamp).toLocaleString();
        var cmd = entry.command || '';
        var args = entry.args || '';
        var costStr = entry.cost ? ' [' + formatCost(entry.cost) + ']' : '';
        return '  ' + idx + '. [' + time + '] ' + cmd + ' ' + args + costStr;
    });

    return formatOutput(
        '📜 Command History for \'' + agent + '\' (' + history.length + ' entries)',
        lines.join('\n')
    );
}

/**
 * @cost [task-id] — Show token cost estimates across all agents.
 * @param {string|null} taskId - Optional task ID filter.
 * @returns {string}
 */
function cmdCost(taskId) {
    var files = [];
    if (fs.existsSync(SESSIONS_DIR)) {
        files = fs.readdirSync(SESSIONS_DIR).filter(function (f) {
            return f.endsWith('.json');
        });
    }

    var totalCost = { input: 0, output: 0, cache: 0 };
    var sessionDetails = [];

    files.forEach(function (f) {
        try {
            var session = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf-8'));
            totalCost.input += session.cost.input || 0;
            totalCost.output += session.cost.output || 0;
            totalCost.cache += session.cost.cache || 0;
            sessionDetails.push({ agent: session.agent, cost: session.cost, count: session.commands.length });
        } catch (e) {
            // Skip corrupt files
        }
    });

    var totalTokens = totalCost.input + totalCost.output;
    var costKES = ((totalCost.input * 19) + (totalCost.output * 38)) / 1000000;
    var cacheKES = (totalCost.cache * 19) / 1000000;

    var output = '💰 Cost Report';
    if (taskId) {
        output += ' (Task: ' + taskId + ')';
    }
    output += '\n' + ''.padStart(60, '─');

    sessionDetails.forEach(function (s) {
        var sTokens = s.cost.input + s.cost.output;
        var sKES = ((s.cost.input * 19) + (s.cost.output * 38)) / 1000000;
        output += '\n  ' + s.agent + ': ~' + sTokens.toLocaleString() + ' tokens (~KES ' + sKES.toFixed(2) + ')';
    });

    output += '\n\n  Total: ~' + totalTokens.toLocaleString() + ' tokens (~KES ' + costKES.toFixed(2) + ')';
    output += '\n  Cache savings: ~KES ' + cacheKES.toFixed(2);

    return output;
}

/**
 * @stats [agent] — Show agent productivity statistics.
 * @param {string|null} targetAgent - Agent slug (optional, all agents if omitted).
 * @returns {string}
 */
function cmdStats(targetAgent) {
    var files = [];
    if (fs.existsSync(SESSIONS_DIR)) {
        files = fs.readdirSync(SESSIONS_DIR).filter(function (f) {
            return f.endsWith('.json');
        });
    }

    // Filter if specific agent requested
    if (targetAgent) {
        var safeName = targetAgent.replace(/[^a-zA-Z0-9_-]/g, '_');
        files = files.filter(function (f) {
            return f === safeName + '.json';
        });
    }

    if (files.length === 0) {
        return 'No session data found' + (targetAgent ? ' for agent \'' + targetAgent + '\'' : '') + '.';
    }

    var output = '📊 Agent Statistics';
    if (targetAgent) {
        output += ' for \'' + targetAgent + '\'';
    }
    output += '\n' + ''.padStart(60, '─');

    files.forEach(function (f) {
        try {
            var session = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf-8'));
            var cmdCount = session.commands.length;
            var totalTokens = (session.cost.input || 0) + (session.cost.output || 0);
            var costKES = ((session.cost.input * 19) + (session.cost.output * 38)) / 1000000;

            output += '\n\n  Agent: ' + session.agent;
            output += '\n  Commands Executed: ' + cmdCount;
            output += '\n  Total Tokens: ~' + totalTokens.toLocaleString();
            output += '\n  Total Cost: ~KES ' + costKES.toFixed(2);

            if (cmdCount > 0) {
                var lastCmd = session.commands[cmdCount - 1];
                output += '\n  Last Command: ' + (lastCmd.command || '') + ' ' + (lastCmd.args || '');
            }

            // Command type breakdown
            var typeCount = {};
            session.commands.forEach(function (c) {
                var cmdName = c.command || 'unknown';
                typeCount[cmdName] = (typeCount[cmdName] || 0) + 1;
            });
            var types = Object.keys(typeCount).sort();
            if (types.length > 0) {
                output += '\n  Breakdown:';
                types.forEach(function (t) {
                    output += '\n    ' + t + ': ' + typeCount[t] + 'x';
                });
            }
        } catch (e) {
            // Skip corrupt files
        }
    });

    return output;
}

/**
 * @switch <name> — Switch to a registered project.
 * Calls projects-manager.js switch <name> internally.
 * @param {string} name - Project name to switch to.
 * @returns {string}
 */
function cmdSwitch(name) {
    if (!name) {
        return 'Error: @switch requires a project name (e.g., @switch jengabooks)';
    }

    var scriptPath = path.resolve(ROOT, '.agency', 'scripts', 'projects-manager.js');
    if (!fs.existsSync(scriptPath)) {
        return 'Error: projects-manager.js not found. Run Task 9.1 first.';
    }

    try {
        var result = execSync(
            'node "' + scriptPath + '" switch "' + name + '"',
            { cwd: ROOT, encoding: 'utf-8', timeout: 15000 }
        );

        var lines = result.trim().split('\n');
        var divider = ''.padStart(60, '─');
        var output = '── @switch ' + name + ' ' + divider.slice(10 + name.length);
        output += '\n' + lines.join('\n');

        // Auto-open VS Code
        try {
            var registryPath = path.resolve(ROOT, '.agency', 'projects.json');
            if (fs.existsSync(registryPath)) {
                var regData = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
                var project = (regData.projects || []).find(function (p) { return p.name === name; });
                if (project) {
                    var absPath = path.resolve(ROOT, project.path);
                    execSync('code "' + absPath + '"', { stdio: 'ignore', timeout: 10000 });
                    output += '\n' + '📂 Opened in new VS Code window';
                }
            }
        } catch (e2) {
            output += '\n' + '⚠ Could not open VS Code: ' + e2.message;
        }

        return output;
    } catch (e) {
        var stderr = e.stderr ? e.stderr.toString().trim() : '';
        var stdout = e.stdout ? e.stdout.toString().trim() : '';
        return 'Error switching to project "' + name + '":\n' + (stderr || stdout || e.message);
    }
}

/**
 * @help — Display available commands and usage.
 * @returns {string}
 */
function cmdHelp() {
    return [
        '',
        '╔══════════════════════════════════════════════════════════════╗',
        '║            🤖 Terminal Session Manager — Help               ║',
        '╚══════════════════════════════════════════════════════════════╝',
        '',
        '@-COMMANDS:',
        '  @search <pattern>     Search files using regex (recursive)',
        '  @find <filename>      Locate a file by name/glob',
        '  @extract <file> <s:e> Read specific line range from a file',
        '  @history [agent]      Show command history for an agent',
        '  @cost [task-id]       Show aggregated token cost estimates',
        '  @stats [agent]        Show agent productivity statistics',
        '  @switch <name>        Switch to a registered project',
        '  @help                 Display this help message',
        '',
        'OPTIONS:',
        '  --agent <slug>   Set agent context (default: "default")',
        '  --task <id>      Associate output with a task ID',
        '  --save           Save output to .agency/sessions/outputs/',
        '  --json           Output as JSON',
        '',
        'SAFETY:',
        '  Dangerous shell commands (rm -rf, del /f, format, etc.) are',
        '  blacklisted and will be rejected if passed to @search/@find.',
        '',
        'EXAMPLES:',
        '  node .agency/scripts/terminal-session.js @search "Prisma" --agent lead-architect',
        '  node .agency/scripts/terminal-session.js @find "*.service.ts" --agent backend-api',
        '  node .agency/scripts/terminal-session.js @extract src/main.ts 1:50',
        '  node .agency/scripts/terminal-session.js @history',
        '  node .agency/scripts/terminal-session.js @cost --task 5.1',
        '  node .agency/scripts/terminal-session.js @stats',
        '  node .agency/scripts/terminal-session.js @switch jengabooks',
        '  node .agency/scripts/terminal-session.js @help',
        ''
    ].join('\n');
}

// ── JSON Helpers ──────────────────────────────────────────────────────────────

/**
 * Build a JSON output object from command results.
 * @param {string} command - The @command name.
 * @param {string} result - Text result to wrap.
 * @param {{ agent: string, task: string|null }} ctx - Context.
 * @returns {object}
 */
function jsonResult(command, result, ctx) {
    return {
        command: command,
        agent: ctx.agent,
        task: ctx.task || null,
        timestamp: new Date().toISOString(),
        result: result
    };
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
    var opts = parseArgs();
    var ctx = { agent: opts.agent, task: opts.task };

    // No @command given — show help
    if (!opts.command) {
        console.log(cmdHelp());
        process.exit(0);
    }

    var command = opts.command.toLowerCase();
    var args = opts.commandArgs;
    var result = '';

    // Safety check for dangerous input in search/find args
    var fullArgs = args.join(' ');
    if (isBlacklisted(command + ' ' + fullArgs) || isBlacklisted(fullArgs)) {
        var errMsg = '⛔ Safety block: The requested operation matches the blacklist and was rejected.';
        console.error(errMsg);
        process.exit(1);
    }

    // Dispatch commands
    switch (command) {
        case '@search':
            result = cmdSearch(args.join(' '));
            break;

        case '@find':
            result = cmdFind(args[0] || '');
            break;

        case '@extract':
            result = cmdExtract(args[0] || '', args[1] || '');
            break;

        case '@history':
            result = cmdHistory(args[0] || null, opts.agent);
            break;

        case '@cost':
            result = cmdCost(opts.task || args[0] || null);
            break;

        case '@stats':
            result = cmdStats(args[0] || null);
            break;

        case '@switch':
            result = cmdSwitch(args[0] || '');
            break;

        case '@help':
            result = cmdHelp();
            break;

        default:
            console.error('Unknown command: ' + opts.command);
            console.error('Use @help to list available commands.');
            process.exit(1);
    }

    // Estimate cost and record in history (skip for @cost, @stats, @help to avoid recursion)
    if (command !== '@cost' && command !== '@stats' && command !== '@help') {
        var cost = estimateCommandCost(command, args);
        addToHistory(opts.agent, opts.command, fullArgs, cost);
    }

    // Output
    if (opts.json) {
        var jsonOut = jsonResult(opts.command, result, ctx);
        console.log(JSON.stringify(jsonOut, null, 2));
    } else {
        console.log(result);
    }

    // Save output if requested
    if (opts.save) {
        var savedPath = saveOutput(result, opts.agent, opts.command);
        console.error('Output saved to: ' + savedPath);
    }

    process.exit(0);
}

// ── Execute ───────────────────────────────────────────────────────────────────

main();
