// preflight_verbose_win.mjs
// Prints WHERE problems are so you can fix them fast on Windows.
// Usage: node preflight_verbose_win.mjs src\App_Code_1_8.jsx

import fs from 'node:fs';

const file = process.argv[2] || 'src/App_Code_1_8.jsx';
if (!fs.existsSync(file)) {
  console.error(`[verbose] File not found: ${file}`);
  process.exit(2);
}
const src = fs.readFileSync(file, 'utf8');
const lines = src.split(/\r?\n/);

// --- 1) Find .map(...) without key on the returned JSX (heuristic)
console.log("=== Map checks (missing key) ===");
let mapHits = 0;
for (let i=0; i<src.length; i++) {}
const mapRegex = /\.map\s*\(\s*[^)]*\)\s*=>\s*\(([\s\S]*?)\)/g;
let m;
let missingCount = 0;

// Helper to check if within first 240 chars of returned JSX we see key= on a tag or fragment
function missingKey(returnBody) {
  const head = returnBody.slice(0, 240);
  // look for key= on any of the first tags or on React.Fragment
  return !/\bkey\s*=/.test(head);
}

// Walk file linearly and test each map using a simpler window-based approach
const mapIdxs = [...src.matchAll(/\.map\s*\(/g)].map(m=>m.index);
for (const start of mapIdxs) {
  const window = src.slice(start, start + 500);
  // naive: find first '<' after arrow =>
  const arrow = window.indexOf('=>');
  if (arrow === -1) continue;
  const jsxStart = window.indexOf('<', arrow);
  if (jsxStart === -1) continue;
  const head = window.slice(jsxStart, jsxStart + 240);
  // compute line number
  const upTo = src.slice(0, start);
  const line = upTo.split(/\r?\n/).length;
  if (!/\bkey\s*=/.test(head)) {
    missingCount++;
    console.log(`[map] Possible missing key near line ${line}. Head: ${head.replace(/\s+/g,' ').slice(0,120)}...`);
  }
}
if (!missingCount) console.log("No obvious missing keys found.\n");
else console.log(`Total possible missing keys: ${missingCount}\n`);

// --- 2) Find useEffect without a dependency array (prints line numbers)
console.log("=== useEffect checks (missing deps) ===");
const effectRegex = /useEffect\s*\(\s*([\s\S]*?)\)/g;
let match;
let effects = 0, missingDeps = 0;
while ((match = effectRegex.exec(src)) !== null) {
  effects++;
  const snippet = match[0];
  const pos = match.index;
  const line = src.slice(0, pos).split(/\r?\n/).length;
  const hasDeps = /useEffect\s*\(\s*[^,]+,\s*\[[^\)]*\]\s*\)/.test(snippet);
  if (!hasDeps) {
    missingDeps++;
    console.log(`[useEffect] Missing deps near line ${line}. Snippet: ${snippet.replace(/\s+/g,' ').slice(0,120)}...`);
  }
}
if (!missingDeps) console.log("All useEffect calls appear to have dependency arrays.\n");
else console.log(`Total useEffect missing deps: ${missingDeps} of ${effects}\n`);

console.log("Done.");
