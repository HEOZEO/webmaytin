const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.jsx') || file.endsWith('.js')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(srcDir);
let changedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  content = content.replace(/glass-card/g, 'bg-neutral-900 border border-neutral-800 clip-path-rog');
  content = content.replace(/glow-blue/g, 'glow-rog');
  content = content.replace(/glow-purple/g, 'glow-rog');
  content = content.replace(/cyan-400/g, 'red-500');
  content = content.replace(/cyan-500/g, 'red-600');
  content = content.replace(/cyan-300/g, 'red-400');
  content = content.replace(/blue-500/g, 'red-600');
  content = content.replace(/blue-600/g, 'red-700');
  content = content.replace(/emerald-400/g, 'red-500');
  content = content.replace(/emerald-500/g, 'red-600');
  content = content.replace(/purple-400/g, 'red-500');
  content = content.replace(/purple-500/g, 'red-600');
  content = content.replace(/rounded-xl|rounded-2xl|rounded-3xl/g, 'rounded-none clip-path-rog');
  content = content.replace(/bg-slate-900/g, 'bg-black');
  content = content.replace(/bg-slate-800/g, 'bg-neutral-900');
  content = content.replace(/border-slate-800/g, 'border-neutral-800');
  content = content.replace(/text-slate-400/g, 'text-neutral-400');
  content = content.replace(/text-slate-300/g, 'text-neutral-300');
  // Avoid replacing all white text randomly, but do it for text-slate-950 inside buttons
  content = content.replace(/text-slate-950/g, 'text-white font-bold tracking-widest uppercase');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changedCount++;
  }
});

console.log(`Updated ${changedCount} files to ROG theme.`);
