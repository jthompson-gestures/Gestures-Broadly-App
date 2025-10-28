// === Sanity Gate ==========================================================
// Run this script before returning any code. If any check fails, fix code
// and re-run until all checks pass. Only ship code that passes this gate.
// Usage: node preflight_sanity_fixed_win.mjs <relative-path-to-entry-file>
// =========================================================================

// preflight_sanity_fixed_win.mjs
// Lightweight, project-aware checks to prevent white screens and patch regressions.
// Run with: `node preflight_sanity_fixed_win.mjs src/App_Code_1_8.jsx`

import fs from 'node:fs';
import path from 'node:path';

let ok = true;
let passes = 0;
let failures = 0;
function pass(msg) { passes++; console.log(`✅ ${msg}`); }
function fail(msg, extra='') { failures++; ok = false; console.error(`❌ ${msg}${extra ? `\n   → ${extra}` : ''}`); }

const file = process.argv[2] || 'src/App_Code_1_8.jsx';
if (!fs.existsSync(file)) {
  console.error(`[preflight] File not found: ${file}`);
  process.exit(2);
}

const src = fs.readFileSync(file, 'utf8');

// 1) Basic bracket balance ((), {}, [])
(function checkBrackets() {
  const pairs = { '(': ')', '{': '}', '[': ']' };
  const openers = Object.keys(pairs);
  const closers = Object.values(pairs);
  const stack = [];
  for (let i=0;i<src.length;i++) {
    const ch = src[i];
    if (openers.includes(ch)) stack.push(ch);
    else if (closers.includes(ch)) {
      const last = stack.pop();
      if (!last || pairs[last] !== ch) {
        return fail(`Unbalanced brackets near index ${i}`, `Expected ${pairs[last]||'?'} but found ${ch}`);
      }
    }
  }
  if (stack.length) return fail(`Unbalanced brackets: missing ${stack.map(s=>pairs[s]).join(' ')}`);
  pass('Brackets balanced');
})();

// 2) No Pythonic boolean operators
if (/\bor\b|\band\b|\bnot\b/.test(src)) {
  fail("Found Python-style boolean operators (or/and/not). Use ||, &&, !");
} else {
  pass("No Python-style boolean operators");
}

// 3) Ensure peekPersonaName is declared before first use
(function checkPeekOrder(){
  const decl = src.indexOf('const [peekPersonaName');
  const use  = src.indexOf('peekPersonaName');
  if (use !== -1 && decl !== -1 && decl > use) {
    fail("peekPersonaName is used before its declaration");
  } else {
    pass("peekPersonaName declared before use");
  }
})();

// 4) History helpers must exist if History tab uses them
(function checkHistoryHelpers(){
  const uses = [
    'filteredHistory', 'selectFilteredHistory',
    'histTypesSorted','histPersonasSorted','histChannelsSorted','histWhosSorted','histUsersSorted',
    'histTypeCounts','histPersonaCounts','histChannelCounts','histWhoCounts','histUserCounts'
  ];
  const historyActive = src.includes('{tab==="history"');
  if (!historyActive) return pass("History tab not detected (skipping helpers check)");
  let missing = [];
  for (const u of uses) {
    const ref = src.indexOf(u);
    if (ref !== -1) {
      const decl = new RegExp(`(function\\s+${u}\\b|const\\s+${u}\\s*=|let\\s+${u}\\s*=)`).test(src);
      if (!decl) missing.push(u);
    }
  }
  if (missing.length) {
    fail("Missing History helpers/vars", `Define: ${missing.join(', ')}`);
  } else {
    pass("History helpers present (or not referenced)");
  }
})();

// 5) ErrorBoundary optional: if used, ensure closing tags exist
(function checkErrorBoundary(){
  const openIdx = src.indexOf('<ErrorBoundary>');
  const closeIdx = src.indexOf('</ErrorBoundary>');
  if (openIdx === -1 && closeIdx === -1) return pass("No ErrorBoundary wrapper (ok)");
  if (openIdx !== -1 && closeIdx === -1) return fail("ErrorBoundary opening tag found without closing tag");
  if (openIdx === -1 && closeIdx !== -1) return fail("ErrorBoundary closing tag found without opening tag");
  if (openIdx !== -1 && closeIdx !== -1 && closeIdx < openIdx) return fail("ErrorBoundary closing appears before opening");
  pass("ErrorBoundary tag pairing ok");
})();

// 6) Suspicious undefined identifiers often seen
(function checkCommonUndef(){
  const suspects = ['openPersonaInTab','openPersonaPeek','PersonaPeekModal'];
  const missing = [];
  for (const name of suspects) {
    if (src.includes(name)) {
      const declared = new RegExp(`(function\\s+${name}\\b|const\\s+${name}\\s*=|let\\s+${name}\\s*=|export\\s+function\\s+${name}\\b)`).test(src);
      if (!declared) missing.push(name);
    }
  }
  if (missing.length) {
    fail("Potential undefined identifiers", missing.join(', '));
  } else {
    pass("No obvious undefined identifiers");
  }
})();

// 7) JSX: prevent using `class=` instead of `className=`
(function checkClassAttr(){
  const bad = src.match(/\bclass=(["'`])/);
  if (bad) fail("Found `class=` in JSX; use `className=`");
  else pass("No `class=` misuse in JSX");
})();

// 8) .map(...) elements should have a `key=` prop nearby (heuristic)
(function checkMapKeys(){
  const mapIdxs = [...src.matchAll(/\.map\s*\(/g)].map(m=>m.index);
  let missing = 0;
  for (const i of mapIdxs) {
    const window = src.slice(i, i + 300);
    if (window.includes('<') && !/\bkey\s*=/.test(window)) missing++;
  }
  if (missing) fail(`Possible missing React keys in ${missing} mapped lists`);
  else pass("Mapped lists appear to include keys (heuristic)");
})();

// 9) useEffect calls without a dependency array (common infinite render cause)
(function checkUseEffectDeps(){
  const effects = [...src.matchAll(/useEffect\s*\(\s*[\s\S]*?\)/g)];
  let bad = 0;
  for (const e of effects) {
    const snippet = e[0];
    if (!/useEffect\s*\(\s*[^,]+,\s*\[[^\)]*\]\s*\)/.test(snippet)) bad++;
  }
  if (bad) fail(`Found ${bad} useEffect call(s) without a dependency array (heuristic)`);
  else pass("useEffect dependency arrays look OK (heuristic)");
})();

// Summary
console.log(`\nSummary: ${passes} pass(es), ${failures} fail(s)`);
process.exitCode = failures ? 1 : 0;
