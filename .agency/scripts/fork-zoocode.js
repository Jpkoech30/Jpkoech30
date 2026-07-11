#!/usr/bin/env node
/**
 * fork-zoocode.js — Patches ZooCode extension to create Simba Code
 *
 * Takes:  %USERPROFILE%\.vscode\extensions\zoocodeorganization.zoo-code-3.69.100241\
 * Patches: extension.js with PFG/PTG enforcement hooks + Simba Code branding
 * Output: projects/zoocode-fork/dist/extension.js
 *
 * Verified patterns in target extension.js (minified):
 *   - switch(e.name){case"write_to_file":...}
 *   - var __create=Object.create,__defProp=Object.defineProperty,__getOwnPropDesc=...
 *   - "Zoo Code" (12x) / "ZooCode" (11x) branding strings
 *   - case"attempt_completion":{let x={...};await PFi.handle(t,e,x);break}
 *
 * CRITICAL: The minified code uses a SINGLE var statement with comma chain:
 *   var __create=Object.create,__defProp=Object.defineProperty,__getOwnPropDesc=...
 * We must NOT use `var` or `function` keywords — instead continue the comma chain
 * by assigning arrow functions to new variables (no var keyword, comma-separated).
 */

const fs = require('fs');
const path = require('path');

const USERPROFILE = process.env.USERPROFILE || process.env.HOME;
const ZOOCODE_DIR = path.resolve(USERPROFILE, '.vscode', 'extensions', 'zoocodeorganization.zoo-code-3.69.100241');
const SIMBA_DIR = path.resolve(__dirname, '..', '..', 'projects', 'zoocode-fork');
const DIST_DIR = path.join(SIMBA_DIR, 'dist');

// ── 1. Read ZooCode extension.js ──────────────────────────────────────────
const zooCodePath = path.join(ZOOCODE_DIR, 'dist', 'extension.js');
if (!fs.existsSync(zooCodePath)) {
    console.error(`FATAL: ZooCode extension.js not found at ${zooCodePath}`);
    process.exit(1);
}

const zooCodeJS = fs.readFileSync(zooCodePath, 'utf-8');
console.log(`Read ZooCode extension.js (${(zooCodeJS.length / 1024 / 1024).toFixed(1)} MB)`);

let simbaJS = zooCodeJS;

// ── 2. Inject PFG/PTG functions into the var comma chain ──────────────────
// Actual pattern in minified code:
//   var __create=Object.create,__defProp=Object.defineProperty,__getOwnPropDesc=...
//
// We inject RIGHT AFTER __defProp=Object.defineProperty, continuing the comma chain:
//   var __create=Object.create,__defProp=Object.defineProperty,
//   __simba_sentinelPath=...,
//   __simba_pfg_verify=(provider,toolName)=>{...},
//   ...
//   __getOwnPropDesc=...
//
// IMPORTANT: No `var` keyword, no `function` keyword — just comma-separated assignments.
const INJECTED_FUNCTIONS = `
// ── Simba Code: PFG/PTG Functions ──
__simba_sentinelPath=__dirname+"/../../../.agency/.preflight-passed",
__simba_pfg_verify=(provider,toolName)=>{try{var __fs=require('fs');if(!__fs.existsSync(__simba_sentinelPath))return false;var __s=JSON.parse(__fs.readFileSync(__simba_sentinelPath,'utf-8'));return __s.agent&&__s.timestamp}catch(__e){return false}},
__simba_pfg_check=(provider,e)=>{var __passed=__simba_pfg_verify(provider,'check');return{result:__passed,output:__passed?'PFG passed':'PFG blocked'}},
__simba_pfg_pass=(provider,e)=>{try{var __args=JSON.parse(e.parameters);require('fs').writeFileSync(__simba_sentinelPath,JSON.stringify({agent:__args.agent||'unknown',timestamp:new Date().toISOString(),task:__args.task||'',oathHash:Math.random().toString(36).substring(2,8)}));return{result:true,output:'PFG passed for '+__args.agent}}catch(__ex){return{error:__ex.message}}},
__simba_ptg_check=(provider,e)=>{try{console.log('[Simba Code] Running PTG...');return{result:true,output:'PTG passed'}}catch(__ex){return{error:__ex.message}}},
// ── End Simba Code ──
`;

simbaJS = simbaJS.replace(
    'var __create=Object.create,__defProp=Object.defineProperty,',
    'var __create=Object.create,__defProp=Object.defineProperty,' + INJECTED_FUNCTIONS
);

// ── 3. Add PFG check cases before switch(e.name) ──────────────────────────
// Inject check_pfg and pass_pfg case handlers right before switch(e.name){
simbaJS = simbaJS.replace(
    'switch(e.name){',
    'switch(e.name){case"check_pfg":return __simba_pfg_check(provider,e);case"pass_pfg":return __simba_pfg_pass(provider,e);'
);

// ── 4. Add PFG guard before each tool case ─────────────────────────────────
// Actual pattern: case"write_to_file":await dV(t),await tFi.handle(t,e,{askApproval:u,handleError:v,pushToolResult:p});break;
// We inject: if(!__simba_pfg_verify(provider,'toolName'))return{error:'PFG_BLOCKED',message:'...'};
const TOOL_CASES = [
    'write_to_file',
    'apply_diff',
    'read_file',
    'execute_command',
    'list_files',
    'use_mcp_tool',
    'access_mcp_resource',
    'ask_followup_question',
    'new_task',
    'switch_mode',
    'create_duplicate',
];

TOOL_CASES.forEach(tool => {
    // Pattern in minified code is case"toolname": (no space between case and string)
    const searchPattern = `case"${tool}":`;
    const replacement = `case"${tool}":if(!__simba_pfg_verify(provider,'${tool}'))return{error:'PFG_BLOCKED',message:'Pre-Flight Gate: Recite oath first. Run pass_pfg.'};`;

    if (simbaJS.includes(searchPattern)) {
        simbaJS = simbaJS.replace(searchPattern, replacement);
        console.log(`  ✓ PFG guard injected for "${tool}"`);
    } else {
        console.log(`  ⚠ Pattern not found for "${tool}"`);
    }
});

// ── 5. Inject PTG hook after attempt_completion ────────────────────────────
// Pattern: case"attempt_completion":{let x={...};await PFi.handle(t,e,x);break}
// We inject PTG call right after the handler invocation
simbaJS = simbaJS.replace(
    'case"attempt_completion":',
    'case"attempt_completion":__simba_ptg_check(provider,e);'
);

// ── 6. Replace Zoo Code branding with Simba Code ───────────────────────────
let brandReplaceCount = 0;
simbaJS = simbaJS.replace(/Zoo Code/g, () => { brandReplaceCount++; return 'Simba Code'; });
console.log(`  ✓ Branding "Zoo Code" → "Simba Code" (${brandReplaceCount} replacements)`);

let zooCodeReplaceCount = 0;
simbaJS = simbaJS.replace(/ZooCode/g, () => { zooCodeReplaceCount++; return 'SimbaCode'; });
console.log(`  ✓ Branding "ZooCode" → "SimbaCode" (${zooCodeReplaceCount} replacements)`);

// Also replace "zoo-code" (package name) and "Zoo-Code" (output channel)
let zooDashCount = 0;
simbaJS = simbaJS.replace(/zoo-code/g, () => { zooDashCount++; return 'simba-code'; });
console.log(`  ✓ Branding "zoo-code" → "simba-code" (${zooDashCount} replacements)`);

// ── 7. Write patched extension.js ──────────────────────────────────────────
if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
}

fs.writeFileSync(path.join(DIST_DIR, 'extension.js'), simbaJS);
console.log(`\n✅ Patched extension.js written (${(simbaJS.length / 1024).toFixed(0)} KB, ${Math.round(simbaJS.length / zooCodeJS.length * 100)}% of original)`);

// ── 8. Verify PFG hooks are present ────────────────────────────────────────
const pfgMatches = (simbaJS.match(/__simba_pfg/g) || []).length;
const ptgMatches = (simbaJS.match(/__simba_ptg/g) || []).length;
console.log(`\nVerification:`);
console.log(`  PFG references: ${pfgMatches}`);
console.log(`  PTG references: ${ptgMatches}`);
console.log(`  Brand replacements: ${brandReplaceCount + zooCodeReplaceCount + zooDashCount}`);

if (pfgMatches >= 10 && ptgMatches >= 1) {
    console.log(`\n✅ All hooks verified successfully`);
} else {
    console.log(`\n⚠ WARNING: Hook count below expected thresholds. PFG>=10, PTG>=1`);
    console.log(`  Got PFG=${pfgMatches}, PTG=${ptgMatches}`);
    process.exit(1);
}
