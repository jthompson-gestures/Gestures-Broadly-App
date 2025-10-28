// fix_useEffect_and_keys.mjs
// Usage: node fix_useEffect_and_keys.mjs .\src\App_Code_1_8.jsx
import fs from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node fix_useEffect_and_keys.mjs <path-to-jsx>');
  process.exit(2);
}
if (!fs.existsSync(file)) {
  console.error('[fix] File not found:', file);
  process.exit(2);
}

let src = fs.readFileSync(file, 'utf8');
fs.writeFileSync(file + '.bak', src, 'utf8');

let movedStray = 0, addedDeps = 0, dialogKeys = 0, personaKeys = 0;

// 1) Move any stray ", []" placed AFTER the useEffect call into the call.
src = src.replace(
  /useEffect\s*\(\s*(\(\s*[^)]*\)\s*=>\s*\{[\s\S]*?\})\s*\)\s*,\s*\[\s*\]\s*/g,
  (_, inner) => { movedStray++; return `useEffect(${inner}, [])`; }
);

// 2) Add [] to any useEffect that still has none.
src = src.replace(
  /useEffect\s*\(\s*(\(\s*[^)]*\)\s*=>\s*\{[\s\S]*?\})\s*\)(?!\s*,\s*\[)/g,
  (_, inner) => { addedDeps++; return `useEffect(${inner}, [])`; }
);

// 3) Dialog map: insert key on first div with data-peek-version="v3"
src = src.replace(
  /(<div\s+)(role="dialog"\s+aria-modal="true"\s+data-peek-version="v3")/,
  (_, a, b) => { dialogKeys++; return `${a}key={i} ${b}`; }
);

// 4) Personas map: ensure key on outer div of personas.map((p, i) => ( <div ... > ))
src = src.replace(
  /\.map\(\(\s*p\s*,\s*i\s*\)\s*=>\s*\(\s*<div(?![^>]*\bkey=)/,
  () => { personaKeys++; return `.map((p, i) => (<div key={p.id || i}`; }
);

fs.writeFileSync(file, src, 'utf8');
console.log(`[fix] Moved stray deps: ${movedStray}, added deps: ${addedDeps}, dialog keys: ${dialogKeys}, persona keys: ${personaKeys}`);
console.log('[fix] Backup:', file + '.bak');
