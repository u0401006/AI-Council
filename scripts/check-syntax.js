const { execFileSync } = require('node:child_process');
const { readdirSync, statSync } = require('node:fs');
const { join } = require('node:path');

const roots = ['background.js', 'sidepanel', 'canvas', 'options', 'content', 'locales'];
const files = [];
function collect(path) {
  if (statSync(path).isDirectory()) {
    for (const entry of readdirSync(path)) collect(join(path, entry));
  } else if (path.endsWith('.js')) files.push(path);
}
roots.forEach(collect);
for (const file of files) execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
console.log(`Syntax checked ${files.length} JavaScript files.`);
