#!/usr/bin/env node
/**
 * repair-pfg-json-escape.js — Fix unescaped double quotes in PFG oath text
 *
 * Run: node .agency/scripts/repair-pfg-json-escape.js
 */
const fs = require('fs');
const path = require('path');

const ROOMODES = path.resolve(__dirname, '../..', '.roomodes');
let content = fs.readFileSync(ROOMODES, 'utf-8');

// The PFG line has unescaped double quotes in these patterns:
// 1. Output: "🧠...  => Output: \"🧠...
// 2. ...sections]." => ...sections].\"
// and also: --task "<brief description>" => --task \"<brief description>\"

let count = 0;

// Pattern 1: Output: "🧠... (unescaped quote before 🧠)
let match;
const regex1 = /Output: "(🧠)/g;
while ((match = regex1.exec(content)) !== null) {
    count++;
}
content = content.replace(/Output: "(🧠)/g, 'Output: \\"$1');

// Pattern 2: ...sections]." (unescaped quote after ])
const regex2 = /(sections\]\.)"/g;
while ((match = regex2.exec(content)) !== null) {
    count++;
}
content = content.replace(/(sections\]\.)"/g, '$1\\"');

// Pattern 3: --task "<brief description>"  (unescaped quotes around <brief description>)
const regex3 = /(--task )"(<brief description>)"\./g;
while ((match = regex3.exec(content)) !== null) {
    count++;
}
content = content.replace(/(--task )"(<brief description>)"\./g, '$1\\"$2\\".');

fs.writeFileSync(ROOMODES, content, 'utf-8');
console.log(`Fixed ${count} unescaped quote(s) in PFG text.`);

// Validate JSON
try {
    JSON.parse(content);
    console.log('JSON validation: PASSED');
} catch (e) {
    console.error('JSON validation: FAILED -', e.message);
    process.exit(1);
}
