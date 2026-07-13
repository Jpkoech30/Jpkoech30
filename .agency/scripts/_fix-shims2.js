#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const dir = __dirname;

let fixed = 0;
fs.readdirSync(dir).filter(f => f.endsWith('.js') && !f.startsWith('_')).forEach(f => {
    const p = path.join(dir, f);
    let c = fs.readFileSync(p, 'utf-8');
    const name = f.replace(/\.js$/, '');
    const correct = `execSync('npx tsx "' + __dirname + '/${name}.ts"', { stdio: "inherit" });`;
    // Find the execSync line and replace it
    const lines = c.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('execSync')) {
            lines[i] = '    ' + correct;
            fixed++;
            break;
        }
    }
    fs.writeFileSync(p, lines.join('\n'), 'utf-8');
});
console.log(`Fixed ${fixed} shims`);
