const fs = require('fs');
const path = require('path');

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      if (f !== 'node_modules' && f !== '.git') {
        walk(p);
      }
    } else if (p.endsWith('.ts') || p.endsWith('.tsx')) {
      const content = fs.readFileSync(p, 'utf8');
      const newContent = content.replace(/(\b(?:import|export)\s+[\s\S]*?from\s+['"].*?)\.ts(['"])/g, '$1.js$2');
      if (content !== newContent) {
        fs.writeFileSync(p, newContent);
        console.log(`Updated ${p}`);
      }
    }
  }
}

walk('.');
