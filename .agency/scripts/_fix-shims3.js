#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const dir = __dirname;

let fixed = 0;
fs.readdirSync(dir).filter(f => f.endsWith('.js') && !f.startsWith('_')).forEach(f => {
    const p = path.join(dir, f);
    let c = fs.readFileSync(p, 'utf-8');
    const name = f.replace(/\.js$/, '');

    // Rebuild the entire shim content
    c = `#!/usr/bin/env node
/**
 * TypeScript Shim — delegates to .ts implementation
 */
const { execSync } = require("child_process");
try {
    execSync('npx tsx "' + __dirname + '/' + name + '.ts"', { stdio: "inherit" });
} catch (e) {
    process.exit(1);
}
`;
    fs.writeFileSync(p, c, 'utf-8');
    fixed++;
});
console.log('Fixed ' + fixed + ' shims');
