#!/usr/bin/env node

// Top of file
try { require('./version-check'); } catch (e) { }

/**
 * projects-manager.js — Project Registry Manager
 *
 * Manages a registry of projects stored in .agency/projects.json.
 * Provides commands to register, switch, list, and remove projects.
 *
 * Usage:
 *   node .agency/scripts/projects-manager.js register <name> <path> [description]
 *   node .agency/scripts/projects-manager.js switch <name>
 *   node .agency/scripts/projects-manager.js list
 *   node .agency/scripts/projects-manager.js remove <name>
 *
 * Exit codes:
 *   0 — Success
 *   1 — Error
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const REGISTRY_PATH = path.join(ROOT, '.agency', 'projects.json');
const ACTIVE_PROJECT_PATH = path.join(ROOT, '.agency', '.active-project');

// ── ANSI Color Helpers ─────────────────────────────────────────────────────────

var GREEN = '\x1b[32m';
var YELLOW = '\x1b[33m';
var RED = '\x1b[31m';
var CYAN = '\x1b[36m';
var BOLD = '\x1b[1m';
var RESET = '\x1b[0m';

function green(text) { return GREEN + text + RESET; }
function yellow(text) { return YELLOW + text + RESET; }
function red(text) { return RED + text + RESET; }
function cyan(text) { return CYAN + text + RESET; }
function bold(text) { return BOLD + text + RESET; }

// ── Registry I/O ───────────────────────────────────────────────────────────────

/**
 * Ensure the .agency directory and projects.json exist.
 */
function ensureRegistry() {
    var dir = path.dirname(REGISTRY_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(REGISTRY_PATH)) {
        fs.writeFileSync(REGISTRY_PATH, JSON.stringify({ projects: [] }, null, 4), 'utf-8');
    }
}

/**
 * Read the registry from disk.
 * @returns {{ projects: Array }}
 */
function readRegistry() {
    ensureRegistry();
    try {
        var raw = fs.readFileSync(REGISTRY_PATH, 'utf-8');
        var data = JSON.parse(raw);
        if (!data.projects || !Array.isArray(data.projects)) {
            data.projects = [];
        }
        return data;
    } catch (e) {
        return { projects: [] };
    }
}

/**
 * Write the registry to disk.
 * @param {{ projects: Array }} data
 */
function writeRegistry(data) {
    ensureRegistry();
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify(data, null, 4), 'utf-8');
}

/**
 * Read the active project name from .active-project.
 * @returns {string|null}
 */
function readActiveProject() {
    try {
        if (fs.existsSync(ACTIVE_PROJECT_PATH)) {
            return fs.readFileSync(ACTIVE_PROJECT_PATH, 'utf-8').trim();
        }
    } catch (e) {
        // Ignore read errors
    }
    return null;
}

/**
 * Write the active project name to .active-project.
 * @param {string} name
 */
function writeActiveProject(name) {
    var dir = path.dirname(ACTIVE_PROJECT_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(ACTIVE_PROJECT_PATH, name, 'utf-8');
}

// ── Command: register ──────────────────────────────────────────────────────────

/**
 * Register a new project.
 * @param {string} name - Project name.
 * @param {string} projectPath - Path to project (relative to ROOT or absolute).
 * @param {string|null} description - Optional description.
 */
function cmdRegister(name, projectPath, description) {
    if (!name || !projectPath) {
        console.error(red('Error: register requires <name> and <path>'));
        process.exit(1);
    }

    // Resolve absolute path
    var absolutePath = path.resolve(ROOT, projectPath);

    // Validate path exists
    if (!fs.existsSync(absolutePath)) {
        console.error(red('Error: Path does not exist: ' + absolutePath));
        process.exit(1);
    }

    var registry = readRegistry();

    // Check for duplicate names
    var existing = registry.projects.find(function (p) {
        return p.name === name;
    });
    if (existing) {
        console.error(red('Error: Project "' + name + '" is already registered.'));
        process.exit(1);
    }

    // Add entry
    var today = new Date().toISOString().slice(0, 10);
    registry.projects.push({
        name: name,
        path: projectPath,
        description: description || '',
        registered: today
    });

    writeRegistry(registry);
    writeActiveProject(name);
    console.log(green('✓ Registered project "' + name + '" at ' + projectPath));
    process.exit(0);
}

// ── Command: switch ────────────────────────────────────────────────────────────

/**
 * Switch to a registered project.
 * @param {string} name - Project name.
 */
function cmdSwitch(name) {
    if (!name) {
        console.error(red('Error: switch requires <name>'));
        process.exit(1);
    }

    var registry = readRegistry();
    var project = registry.projects.find(function (p) {
        return p.name === name;
    });

    if (!project) {
        console.error(red('Error: Project "' + name + '" not found in registry.'));
        process.exit(1);
    }

    var absolutePath = path.resolve(ROOT, project.path);

    // Update active project
    writeActiveProject(name);

    // Sync CWD to the target project
    process.chdir(absolutePath);
    console.log('✅ Switched CWD to: ' + process.cwd());
    console.log('   To sync your shell, run: cd ' + absolutePath);

    console.log(green('📂 Switched to ' + bold(name) + ' at ' + absolutePath));

    // Auto-open VS Code
    try {
        execSync('code "' + absolutePath + '"', { stdio: 'ignore', timeout: 10000 });
        console.log(green('📂 Opened in new VS Code window'));
    } catch (e) {
        console.log(yellow('⚠ Could not open VS Code: ' + e.message));
    }

    process.exit(0);
}

// ── Command: list ──────────────────────────────────────────────────────────────

/**
 * List all registered projects.
 */
function cmdList() {
    var registry = readRegistry();
    var activeName = readActiveProject();

    if (registry.projects.length === 0) {
        console.log('No projects registered.');
        process.exit(0);
    }

    // Header
    var header = bold('Registered Projects');
    if (activeName) {
        header += '  (active: ' + yellow(activeName) + ')';
    }
    console.log(header);
    console.log('');

    // Column widths
    var maxNameLen = Math.max(4, registry.projects.reduce(function (m, p) { return Math.max(m, p.name.length); }, 0));
    var maxPathLen = Math.max(4, registry.projects.reduce(function (m, p) { return Math.max(m, p.path.length); }, 0));

    var nameHeader = 'Name'.padEnd(maxNameLen);
    var pathHeader = 'Path'.padEnd(maxPathLen);
    var descHeader = 'Description';
    var dateHeader = 'Registered';

    console.log('  ' + bold(nameHeader) + '  ' + bold(pathHeader) + '  ' + bold(descHeader) + '  ' + bold(dateHeader));
    console.log('  ' + ''.padEnd(maxNameLen + maxPathLen + descHeader.length + dateHeader.length + 8, '─'));

    registry.projects.forEach(function (p) {
        var isActive = p.name === activeName;
        var nameStr = isActive ? yellow(p.name.padEnd(maxNameLen)) : p.name.padEnd(maxNameLen);
        var pathStr = p.path.padEnd(maxPathLen);
        var descStr = (p.description || '-').padEnd(descHeader.length);
        var dateStr = p.registered || '-';
        var marker = isActive ? ' ▶' : '  ';
        console.log(marker + ' ' + nameStr + '  ' + pathStr + '  ' + descStr + '  ' + dateStr);
    });

    process.exit(0);
}

// ── Command: remove ────────────────────────────────────────────────────────────

/**
 * Remove a project from the registry.
 * @param {string} name - Project name.
 */
function cmdRemove(name) {
    if (!name) {
        console.error(red('Error: remove requires <name>'));
        process.exit(1);
    }

    var registry = readRegistry();
    var index = registry.projects.findIndex(function (p) {
        return p.name === name;
    });

    if (index === -1) {
        console.error(red('Error: Project "' + name + '" not found in registry.'));
        process.exit(1);
    }

    registry.projects.splice(index, 1);
    writeRegistry(registry);

    // If active project was removed, clear the active file
    var activeName = readActiveProject();
    if (activeName === name) {
        writeActiveProject('');
    }

    console.log(green('✓ Removed project "' + name + '" from registry.'));
    process.exit(0);
}

// ── Main ───────────────────────────────────────────────────────────────────────

function main() {
    var args = process.argv.slice(2);
    var command = args[0];

    if (!command) {
        console.log('');
        console.log(bold('Project Registry Manager'));
        console.log('');
        console.log('Commands:');
        console.log('  register <name> <path> [description]  Register a new project');
        console.log('  switch <name>                          Switch to a registered project');
        console.log('  list                                   List all registered projects');
        console.log('  remove <name>                          Remove a project from registry');
        console.log('');
        process.exit(0);
    }

    switch (command) {
        case 'register':
            cmdRegister(args[1], args[2], args[3] || null);
            break;

        case 'switch':
            cmdSwitch(args[1]);
            break;

        case 'list':
            cmdList();
            break;

        case 'remove':
            cmdRemove(args[1]);
            break;

        default:
            console.error(red('Unknown command: ' + command));
            console.error('Use: register, switch, list, remove');
            process.exit(1);
    }
}

main();
