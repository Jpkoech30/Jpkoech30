#!/usr/bin/env node
// @ts-nocheck

/**
 * contract-gen.js — Auto-Generate Draft Contracts from Source Code
 *
 * Scans controller/service files for route decorators and DTOs.
 * Generates DRAFT contract JSON matching TEMPLATE.api.json format.
 *
 * Usage:
 *   node .agency/scripts/contract-gen.js --file <path> --output <path>
 *   node .agency/scripts/contract-gen.js --file apps/api/src/invoices/controller.ts --output .agency/contracts/mobile-invoices.json
 *
 * Scans for:
 *   - @Get(), @Post(), @Put(), @Delete() decorators -> HTTP methods
 *   - Route paths -> endpoint URLs
 *   - Zod schemas or class-validator DTOs -> request/response types
 *
 * Warning: This generates DRAFT contracts. Always requires human review.
 *
 * Exit codes:
 *   0 — Success
 *   1 — Error
 */

const fs = require('fs');
const path = require('path');

// ── ANSI Color ───────────────────────────────────────────────────────────────

const C = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m',
    gray: '\x1b[90m',
};

function color(text, c) { return `${c}${text}${C.reset}`; }
function ok(msg) { console.log(`${C.green}✓${C.reset} ${msg}`); }
function info(msg) { console.log(`  ${C.cyan}→${C.reset} ${msg}`); }
function warn(msg) { console.log(`${C.yellow}⚠${C.reset} ${msg}`); }
function fail(msg) { console.error(`${C.red}✖${C.reset} ${msg}`); }

// ── CLI Parsing ──────────────────────────────────────────────────────────────

function parseArgs() {
    const args = process.argv.slice(2);
    const opts = { file: null, output: null, outputDir: null };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--file':
                opts.file = args[++i] || null;
                break;
            case '--output':
                opts.output = args[++i] || null;
                break;
            case '--output-dir':
                opts.outputDir = args[++i] || null;
                break;
        }
    }

    return opts;
}

// ── Route Decorator Parsing ──────────────────────────────────────────────────

/**
 * Regex patterns for detecting route decorators and class names.
 */
const PATTERNS = {
    // @Get(), @Post(), @Put(), @Delete(), @Patch()
    routeDecorator: /@(Get|Post|Put|Delete|Patch)\s*\(\s*(['"`])([^'"`]+)\2\s*\)/g,

    // Controller class: export class XxxController
    controllerClass: /(?:export\s+)?class\s+(\w+Controller)/,

    // Method definitions: async methodName(
    methodDef: /(?:async\s+)?(\w+)\s*\(/g,

    // Zod schema imports/variables: const XxxSchema = z.object({
    zodSchema: /(?:export\s+)?(?:const|let|var)\s+(\w+Schema)\s*=\s*z\./g,

    // Zod object type references: z.object({ ... })
    zodObject: /z\.object\s*\(\s*\{/g,

    // DTO class: class XxxDto or export class XxxDto
    dtoClass: /(?:export\s+)?class\s+(\w+Dto)\b/g,

    // DTO property decorators: @IsString(), @IsNumber(), etc.
    dtoProperty: /@Is(\w+)/g,

    // Route path prefix from @Controller() decorator
    controllerPrefix: /@Controller\s*\(\s*(['"`])([^'"`]+)\1\s*\)/,
};

/**
 * Parse a controller file and extract endpoints.
 * @param {string} filePath
 * @returns {{ endpoints: object[], schemas: string[], className: string|null, controllerPrefix: string }}
 */
function parseController(filePath) {
    if (!fs.existsSync(filePath)) {
        fail(`File not found: ${filePath}`);
        process.exit(1);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    const endpoints = [];
    const schemas = [];
    let className = null;
    let controllerPrefix = '';

    // Extract controller prefix
    const prefixMatch = content.match(PATTERNS.controllerPrefix);
    if (prefixMatch) {
        controllerPrefix = prefixMatch[2];
        info(`Controller prefix: ${controllerPrefix}`);
    }

    // Extract class name
    const classMatch = content.match(PATTERNS.controllerClass);
    if (classMatch) {
        className = classMatch[1];
        info(`Controller class: ${className}`);
    }

    // Extract Zod schemas
    let schemaMatch;
    while ((schemaMatch = PATTERNS.zodSchema.exec(content)) !== null) {
        schemas.push(schemaMatch[1]);
    }

    // Extract DTO classes
    let dtoMatch;
    while ((dtoMatch = PATTERNS.dtoClass.exec(content)) !== null) {
        schemas.push(dtoMatch[1]);
    }

    if (schemas.length > 0) {
        info(`Schemas/DTOs found: ${schemas.join(', ')}`);
    }

    // Parse route decorators line by line to associate with method names
    let currentMethod = null;
    let currentDecorator = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check for route decorator
        const decoratorMatch = line.match(/@(Get|Post|Put|Delete|Patch)\s*\(\s*(['"`])([^'"`]+)\2\s*\)/);
        if (decoratorMatch) {
            currentDecorator = {
                method: decoratorMatch[1].toUpperCase(),
                route: decoratorMatch[3],
                line: i + 1,
            };
            continue;
        }

        // Check for method definition (after decorator)
        if (currentDecorator) {
            const methodMatch = line.match(/(?:async\s+)?(\w+)\s*\(/);
            if (methodMatch && !line.trim().startsWith('@') && !line.trim().startsWith('//')) {
                const methodName = methodMatch[1];

                // Skip if it's a lifecycle method or constructor
                if (['constructor', 'ngOnInit', 'ngOnDestroy', 'use', 'catch', 'then', 'finally'].includes(methodName)) {
                    currentDecorator = null;
                    continue;
                }

                // Build full endpoint path
                const endpointPath = path.join(controllerPrefix, currentDecorator.route).replace(/\\/g, '/');

                // Look ahead for return type or response schema
                const contextLines = lines.slice(i, Math.min(i + 15, lines.length)).join('\n');
                const returnType = inferReturnType(contextLines);
                const requestBody = inferRequestBody(contextLines, currentDecorator.method);

                endpoints.push({
                    method: currentDecorator.method,
                    path: endpointPath,
                    functionName: methodName,
                    line: currentDecorator.line,
                    returnType,
                    requestBody,
                });

                info(`${currentDecorator.method} ${endpointPath} → ${methodName}()`);
                currentDecorator = null;
            }
        }
    }

    return { endpoints, schemas, className, controllerPrefix };
}

/**
 * Infer return type from context lines after a method.
 * @param {string} context
 * @returns {string|null}
 */
function inferReturnType(context) {
    // Look for return statements with type indicators
    const returnMatch = context.match(/return\s+(?:this\.)?(\w+Service)\.(\w+)\(/);
    if (returnMatch) return `${returnMatch[1]}.${returnMatch[2]}()`;

    const promiseMatch = context.match(/Promise<(\w+)>/);
    if (promiseMatch) return promiseMatch[1];

    const observableMatch = context.match(/Observable<(\w+)>/);
    if (observableMatch) return observableMatch[1];

    // Check for return type annotation
    const typeMatch = context.match(/\):\s*(Promise<)?(\w+)(\[\])?/);
    if (typeMatch) return typeMatch[2] + (typeMatch[3] || '');

    return null;
}

/**
 * Infer request body schema from context.
 * @param {string} context
 * @param {string} method
 * @returns {string|null}
 */
function inferRequestBody(context, method) {
    if (!['POST', 'PUT', 'PATCH'].includes(method)) return null;

    // Look for @Body() decorator with type
    const bodyMatch = context.match(/@Body\s*\([^)]*\)\s*(\w+)/);
    if (bodyMatch) return bodyMatch[1];

    // Look for DTO in parameter
    const dtoParam = context.match(/:\s*(\w+Dto)\b/);
    if (dtoParam) return dtoParam[1];

    // Look for Zod schema type
    const schemaParam = context.match(/:\s*(\w+Schema)\b/);
    if (schemaParam) return schemaParam[1];

    return null;
}

/**
 * Build the endpoint ID from method and path.
 */
function buildEndpointId(method, routePath) {
    const cleanPath = routePath.replace(/[:\/]/g, '-').replace(/^-/, '').replace(/-+/g, '-').toLowerCase();
    return `${method.toLowerCase()}-${cleanPath}`;
}

/**
 * Convert a file path to a contract ID.
 */
function filePathToContractId(filePath) {
    const basename = path.basename(filePath, path.extname(filePath));
    // Remove "controller", "service", "route" suffixes
    const clean = basename
        .replace(/[.-]?(controller|service|route|handler)$/i, '')
        .replace(/[.-]/g, '-')
        .toLowerCase();
    return `draft-${clean}`;
}

/**
 * Generate a contract name from the file path.
 */
function filePathToContractName(filePath) {
    const basename = path.basename(filePath, path.extname(filePath));
    const clean = basename
        .replace(/[.-]?(controller|service|route|handler)$/i, '')
        .replace(/[.-]/g, ' ');
    // Title case
    return clean.replace(/\b\w/g, c => c.toUpperCase()).trim();
}

/**
 * Generate a draft contract JSON from parsed controller data.
 * @param {string} filePath
 * @param {object} parsed
 * @returns {object}
 */
function generateContract(filePath, parsed) {
    const contractId = filePathToContractId(filePath);
    const contractName = filePathToContractName(filePath);
    const now = new Date().toISOString();

    const contract = {
        contractId: `${contractId}@0.1.0-draft`,
        name: `${contractName} — Auto-Generated Draft`,
        description: `DRAFT contract auto-generated from ${filePath}. Requires human review.`,
        version: '0.1.0-draft',
        status: 'draft',
        generatedAt: now,
        sourceFile: filePath,
        endpoints: [],
        schemas: [],
    };

    for (const ep of parsed.endpoints) {
        const endpointId = buildEndpointId(ep.method, ep.path);

        const endpoint = {
            id: endpointId,
            method: ep.method,
            path: ep.path,
            description: `Auto-detected from ${ep.functionName}() at line ${ep.line}`,
            request: {
                headers: [
                    { name: 'Authorization', type: 'string', required: true, description: 'Bearer token' },
                    { name: 'Content-Type', type: 'string', required: true, value: 'application/json' },
                ],
                query: [],
                params: [],
                body: null,
            },
            responses: {
                '200': {
                    description: 'Success',
                    body: null,
                },
                '400': {
                    description: 'Validation error',
                    body: null,
                },
                '401': {
                    description: 'Unauthorized',
                    body: null,
                },
            },
        };

        // Extract path params from route (e.g., /:id)
        const pathParams = ep.path.match(/:(\w+)/g);
        if (pathParams) {
            for (const pp of pathParams) {
                endpoint.request.params.push({
                    name: pp.replace(':', ''),
                    type: 'string',
                    required: true,
                    description: 'Path parameter',
                    in: 'path',
                });
            }
        }

        // Set request body for POST/PUT/PATCH
        if (ep.requestBody) {
            endpoint.request.body = {
                type: 'object',
                properties: {},
                required: [],
                description: `Refer to ${ep.requestBody} schema`,
                ref: ep.requestBody,
            };
        }

        // Set return type
        if (ep.returnType) {
            endpoint.responses['200'].body = {
                type: 'object',
                properties: {},
                description: `Response from ${ep.returnType}`,
            };
        }

        contract.endpoints.push(endpoint);
    }

    // Add detected schemas
    for (const schema of parsed.schemas) {
        contract.schemas.push({
            name: schema,
            type: 'object',
            properties: {},
            required: [],
            description: `Auto-detected ${schema} — populate manually`,
            source: 'code-scan',
        });
    }

    return contract;
}

// ── Glob Matching ────────────────────────────────────────────────────────────

/**
 * Simple glob matching for file patterns using wildcards.
 * @param {string} pattern
 * @returns {string[]}
 */
function expandGlob(pattern) {
    // Simple glob expansion — just check if it contains wildcards
    if (!pattern.includes('*') && !pattern.includes('?')) {
        return [pattern];
    }

    const ROOT = path.resolve(__dirname, '../..');
    const results = [];

    // Extract base directory and file pattern
    const wildcardIdx = pattern.indexOf('*');
    const baseDir = pattern.substring(0, pattern.lastIndexOf('/', wildcardIdx));
    const filePattern = pattern.substring(pattern.lastIndexOf('/') + 1);

    const fullBase = path.resolve(ROOT, baseDir);

    function walk(dir) {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (!entry.name.startsWith('node_modules') && !entry.name.startsWith('.')) {
                    walk(fullPath);
                }
            } else if (entry.isFile()) {
                // Check if file matches pattern
                const regex = new RegExp('^' + filePattern.replace(/\*/g, '.*') + '$');
                if (regex.test(entry.name)) {
                    results.push(fullPath);
                }
            }
        }
    }

    walk(fullBase);
    return results;
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
    const opts = parseArgs();

    if (!opts.file) {
        console.log(`Usage:
  node .agency/scripts/contract-gen.js --file <path> --output <path>
  node .agency/scripts/contract-gen.js --file <path> --output-dir <dir>
  node .agency/scripts/contract-gen.js --file "apps/api/src/**/*.controller.ts" --output-dir .agency/contracts/generated/

Options:
  --file        Path to controller/service file (supports basic glob patterns)
  --output      Specific output path for single file
  --output-dir  Output directory (used with glob patterns or for all outputs)`);
        process.exit(0);
    }

    // Expand glob patterns
    const files = expandGlob(opts.file);

    if (files.length === 0) {
        fail(`No files matched: ${opts.file}`);
        process.exit(1);
    }

    info(`Processing ${files.length} file(s)...`);

    for (const filePath of files) {
        const relativePath = path.relative(path.resolve(__dirname, '../..'), filePath);
        console.log(`\n${C.bold}── ${relativePath}${C.reset}`);

        const parsed = parseController(filePath);

        if (parsed.endpoints.length === 0) {
            warn(`No route decorators found in ${relativePath}`);
            continue;
        }

        const contract = generateContract(relativePath, parsed);

        // Determine output path
        let outputPath = opts.output;
        if (!outputPath) {
            if (opts.outputDir) {
                const outDir = path.resolve(__dirname, '../..', opts.outputDir);
                if (!fs.existsSync(outDir)) {
                    fs.mkdirSync(outDir, { recursive: true });
                }
                const baseName = path.basename(filePath, path.extname(filePath))
                    .replace(/[.-]?(controller|service|route|handler)$/i, '');
                outputPath = path.join(outDir, `${baseName}-contract.json`);
            } else {
                // Default: same directory as source file
                const dir = path.dirname(filePath);
                const baseName = path.basename(filePath, path.extname(filePath))
                    .replace(/[.-]?(controller|service|route|handler)$/i, '');
                outputPath = path.join(dir, `${baseName}-contract.json`);
            }
        }

        // Write contract
        fs.writeFileSync(outputPath, JSON.stringify(contract, null, 2), 'utf-8');

        ok(`Draft contract written to ${outputPath}`);
        info(`Endpoints:  ${parsed.endpoints.length}`);
        info(`Schemas:    ${parsed.schemas.length}`);
        info(`Contract:   ${contract.contractId}`);
    }

    process.exit(0);
}

main();
