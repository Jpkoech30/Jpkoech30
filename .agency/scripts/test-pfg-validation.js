#!/usr/bin/env node
const { execSync } = require('child_process');
const ROOT = __dirname + '/../..';

const msg = 'feat(api): add user login endpoint\nHANDOFF:next\nSTATUS:IN_PROGRESS\nPROJECT:global\nPREFLIGHT:PASSED';

try {
    const out = execSync('node .agency/scripts/validate-commit.js', {
        cwd: ROOT,
        env: Object.assign({}, process.env, { COMMIT_MESSAGE: msg }),
        encoding: 'utf-8'
    });
    console.log('OUTPUT:', out);
} catch (e) {
    console.log('OUTPUT:', e.stdout);
}
