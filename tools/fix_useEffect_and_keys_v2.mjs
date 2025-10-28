// fix_useEffect_and_keys_v2.mjs
// Usage: node fix_useEffect_and_keys_v2.mjs .\src\App_Code_1_8.jsx
// What it does:
// 1) For every useEffect( ... ), if there's no dependency array argument, it inserts ", []" before the matching ')'
//    Works across newlines and nested braces by simple paren-depth scanning.
// 2) Adds key={i} to the dialog/peek map's first <div> (data-peek-version="v3"), if missing.
// 3) Adds key={p.id || i} to the persona cards map's outer <div> for personas.map((p, i) => (...)), if missing.
// Writes a .bak backup and prints a summary.

import fs from 'node:fs';

function addDepsToUseEffects(src) {
  let out = '';
  let i = 0;
  let added = 0;
  while (i < src.length) {
    const idx = src.indexOf('useEffect', i);
    if (idx === -1) { out += src.slice(i); break; }
    out += src.slice(i, idx);
    i = idx;

    // Must be followed by '('
    if (src.slice(i, i+9) !== 'useEffect' || src[i+9] !== '(') {
      out += src[i]; i++; continue;
    }

    // Copy "useEffect(" and scan to matching ')'
    out += 'useEffect(';
    i += 10; // position after '('

    let depth = 1;
    let j = i;
    // Track whether we encounter ",[" at top-level of args (deps present)
    // We'll do a simple heuristic: after finishing scanning, check if the slice
    // contains '],', '])' with '[' at depth 1 (i.e., second argument is an array).
    let inSingle = false, inDouble = false, inTemplate = false, esc = false;
    while (j < src.length && depth > 0) {
      const ch = src[j];

      if (inSingle) {
        if (!esc && ch === "'") inSingle = false;
        esc = (ch === '\\' && !esc);
        j++; continue;
      }
      if (inDouble) {
        if (!esc && ch === '"') inDouble = false;
        esc = (ch === '\\' && !esc);
        j++; continue;
      }
      if (inTemplate) {
        if (!esc && ch === '`') inTemplate = false;
        esc = (ch === '\\' && !esc);
        j++; continue;
      }

      if (ch === "'") { inSingle = true; j++; continue; }
      if (ch === '"') { inDouble = true; j++; continue; }
      if (ch === '`') { inTemplate = true; j++; continue; }

      if (ch === '(') { depth++; j++; continue; }
      if (ch === ')') { depth--; j++; if (depth === 0) break; continue; }
      j++;
    }
    // Now i..j-1 is the argument list (without final ')')
    const args = src.slice(i, j-1+1); // inclusive slice
    const hasDeps = /,\s*\[.*\]\s*$/s.test(args.trim());
    if (hasDeps) {
      out += args + ')';
    } else {
      // Insert ", []" before ')'
      out += args + ', [])';
      added++;
    }
    i = j; // continue after ')'
  }
  return { text: out, added };
}

function addDialogKey(src) {
  const re = /(<div\s+)(role="dialog"\s+aria-modal="true"\s+data-peek-version="v3")/;
  if (re.test(src) && !/role="dialog"[^>]*\bkey=/.test(src)) {
    src = src.replace(re, '$1key={i} $2');
    return { text: src, added: 1 };
  }
  return { text: src, added: 0 };
}

function addPersonaKey(src) {
  // Look for personas.map((p, i) => (<div ...>)) and ensure key on that first div
  const re = /\.map\(\(\s*p\s*,\s*i\s*\)\s*=>\s*\(\s*<div(?![^>]*\bkey=)/;
  if (re.test(src)) {
    src = src.replace(re, '.map((p, i) => (<div key={p.id || i}');
    return { text: src, added: 1 };
  }
  return { text: src, added: 0 };
}

const file = process.argv[2];
if (!file) {
  console.error('Usage: node fix_useEffect_and_keys_v2.mjs <path-to-jsx>');
  process.exit(2);
}
if (!fs.existsSync(file)) {
  console.error('[fix v2] File not found:', file);
  process.exit(2);
}
let src = fs.readFileSync(file, 'utf8');
fs.writeFileSync(file + '.bak', src, 'utf8');

const a = addDepsToUseEffects(src);
let cur = a.text;
const b = addDialogKey(cur);  cur = b.text;
const c = addPersonaKey(cur); cur = c.text;

fs.writeFileSync(file, cur, 'utf8');
console.log(`[fix v2] Added deps: ${a.added}, dialog keys: ${b.added}, persona keys: ${c.added}`);
console.log('[fix v2] Backup:', file + '.bak');
