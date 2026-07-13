const fs = require('fs');
const path = require('path');
const dir = __dirname;

const files = fs.readdirSync(dir).filter(f => f.endsWith('.js') && !f.startsWith('_'));
let count = 0;

for (const f of files) {
    const name = f.replace(/\.js$/, '');
    const p = path.join(dir, f);
    const content = '#!/usr/bin/env node\nconst{execSync}=require("child_process");try{execSync("npx tsx \\""+__dirname+"\\\\' + name + '.ts\\"",{stdio:"inherit"})}catch(e){process.exit(1)}\n';
    fs.writeFileSync(p, content, 'utf-8');
    count++;
}

console.log('Fixed ' + count + ' shims');
// Clean self
fs.unlinkSync(__filename);
