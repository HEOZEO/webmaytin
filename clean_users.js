const fs = require('fs');
const path = 'client/src/pages/admin/AdminUsers.jsx';
let file = fs.readFileSync(path, 'utf8');

// Clean up duplicate clip-path-rog
file = file.replace(/border border-neutral-800 clip-path-rog rounded-none clip-path-rog/g, 'border border-neutral-800 rounded-none clip-path-rog');
file = file.replace(/rounded-none clip-path-rog bg-gradient-to-br/g, 'clip-path-rog bg-gradient-to-br');
file = file.replace(/rounded-none clip-path-rog/g, 'clip-path-rog');
file = file.replace(/clip-path-rog clip-path-rog/g, 'clip-path-rog');
file = file.replace(/border border-neutral-800 clip-path-rog clip-path-rog/g, 'border border-neutral-800 clip-path-rog');
file = file.replace(/bg-neutral-900 border border-neutral-800 clip-path-rog/g, 'bg-neutral-900 border border-neutral-800 clip-path-rog');

// Add glow and gradient table headers for AdminUsers
file = file.replace(
  /<div className="bg-neutral-900 border border-neutral-800 clip-path-rog p-4 overflow-x-auto">/g,
  '<div className="bg-neutral-900/80 backdrop-blur-md border border-neutral-800 hover:border-red-600/30 clip-path-rog p-4 overflow-x-auto transition-all duration-300">'
);
file = file.replace(
  /<thead className="text-xs uppercase text-neutral-400 border-b border-neutral-800">/g,
  '<thead className="text-[10px] uppercase text-neutral-400 border-b border-red-600/30 bg-gradient-to-r from-red-600/10 to-transparent">'
);

fs.writeFileSync(path, file);
console.log('Cleaned up AdminUsers.jsx');
