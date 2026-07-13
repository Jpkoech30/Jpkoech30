#!/usr/bin/env node

// Interactive project setup wizard
// Usage: node .agency/scripts/init-wizard.js
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(q) { return new Promise(r => rl.question(q, r)); }

async function main() {
    console.log('\u{1F981} Simba Code \u2014 Project Setup Wizard');
    const name = await ask('Project name: ');
    const type = await ask('Project type (web/mobile/api): ');
    const apiKey = await ask('API key (optional): ');

    // Run init-project with answers
    require('child_process').execSync(`node .agency/scripts/init-project.js --name ${name}`, { stdio: 'inherit' });

    console.log(`\u2705 Project "${name}" created`);
    rl.close();
}
main();
