
// Freeze Dashboard To-Do editing
const DASHBOARD_GOALS_EDITABLE = false;
{/* === History Screenshot Helpers (fix3) ============================ */}
const HISTORY_ASSET_BASE = (
  (typeof globalThis !== "undefined" && (globalThis.HISTORY_ASSET_BASE || "")) ||
  (typeof process !== "undefined" && process.env && (process.env.HISTORY_ASSET_BASE || process.env.VITE_HISTORY_ASSET_BASE || "")) ||
  ""
);

// Normalize relative or schemeless URLs to absolute HTTPS when possible
function __normalizeUrl(u) {
  if (!u) return "";
  try {
    if (typeof u !== "string") u = String(u);
    u = u.trim();
    if (!u) return "";
    if (u.startsWith("//")) return "https:" + u;
    if (u.startsWith("/")) return (HISTORY_ASSET_BASE || "") + u;
    return u;
  } catch { return ""; }
}

// Shallow picks + recursive deep-scan for common locations
function __firstImageUrlLike(obj, depth = 0) {
  if (!obj || depth > 4) return "";
  const urlRX = /\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i;

  // Direct string
  if (typeof obj === "string") {
    const u = __normalizeUrl(obj);
    return urlRX.test(u) ? u : "";
  }

  // Array
  if (Array.isArray(obj)) {
    for (const v of obj) {
      const hit = __firstImageUrlLike(v, depth + 1);
      if (hit) return hit;
    }
    return "";
  }

  // Object
  const cands = [
    // Common direct keys + variants

    obj.screenshot, obj.screenshot_url, obj.screenshotUrl,
    obj.image, obj.image_url, obj.imageUrl, obj.img,
    obj.media_url, obj.photo,
    (obj.photos && obj.photos[0]),
    (obj.images && (obj.images[0]?.url || obj.images[0])),
    (obj.payload && (obj.payload.screenshot || obj.payload.screenshot_url)),
    (obj.meta && (obj.meta.screenshot || obj.meta.screenshot_path)),
    (obj.debug && obj.debug.screenshot),
    (obj.attachments && (obj.attachments[0]?.url || obj.attachments.url)),

    // Twitter / X style
    (obj.media && (obj.media[0]?.media_url_https || obj.media[0]?.media_url || obj.media[0]?.url)),
    (obj.entities && obj.entities.media && (obj.entities.media[0]?.media_url_https || obj.entities.media[0]?.media_url)),
    (obj.extended_entities && obj.extended_entities.media && (obj.extended_entities.media[0]?.media_url_https || obj.extended_entities.media[0]?.media_url)),

  ];
  for (const v of cands) {
    const hit = __firstImageUrlLike(v, depth + 1);
    if (hit) return hit;
  }

  // Fallback: scan all string props
  try {
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      const hit = __firstImageUrlLike(v, depth + 1);
      if (hit) return hit;
    }
  } catch {}
  return "";
}

function __shot(h) {
  const url = __firstImageUrlLike(h);
  return __normalizeUrl(url);
}
{/* === End Helpers =================================================== */}

{/* === Audit helpers (fix3c) === */}
function __shotKey(obj, depth = 0) {
  if (!obj || depth > 4) return "";
  // Direct string with image extension
  const urlRX = /\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i;
  if (typeof obj === "string") {
    return urlRX.test(String(obj)) ? "<string>" : "";
  }
  if (Array.isArray(obj)) {
    for (const v of obj) {
      const k = __shotKey(v, depth + 1);
      if (k) return k;
    }
    return "";
  }
  // Known keys
  const pairs = [
    ["screenshot", obj.screenshot],
    ["screenshot_url", obj.screenshot_url],
    ["screenshotUrl", obj.screenshotUrl],
    ["image", obj.image],
    ["image_url", obj.image_url],
    ["imageUrl", obj.imageUrl],
    ["img", obj.img],
    ["media_url", obj.media_url],
    ["photo", obj.photo],
    ["photos[0]", obj.photos && obj.photos[0]],
    ["images[0].url", obj.images && (obj.images[0]?.url || obj.images[0])],
    ["payload.screenshot", obj.payload && obj.payload.screenshot],
    ["payload.screenshot_url", obj.payload && obj.payload.screenshot_url],
    ["meta.screenshot", obj.meta && obj.meta.screenshot],
    ["meta.screenshot_path", obj.meta && obj.meta.screenshot_path],
    ["debug.screenshot", obj.debug && obj.debug.screenshot],
    ["attachments[0].url", obj.attachments && (obj.attachments[0]?.url || obj.attachments.url)],

    // Twitter / X style
    ["media[0].media_url_https", obj.media && (obj.media[0]?.media_url_https)],
    ["media[0].media_url", obj.media && (obj.media[0]?.media_url)],
    ["media[0].url", obj.media && (obj.media[0]?.url)],
    ["entities.media[0].media_url_https", obj.entities && obj.entities.media && (obj.entities.media[0]?.media_url_https)],
    ["entities.media[0].media_url", obj.entities && obj.entities.media && (obj.entities.media[0]?.media_url)],
    ["extended_entities.media[0].media_url_https", obj.extended_entities && obj.extended_entities.media && (obj.extended_entities.media[0]?.media_url_https)],
    ["extended_entities.media[0].media_url", obj.extended_entities && obj.extended_entities.media && (obj.extended_entities.media[0]?.media_url)],
  ];
  for (const [k,v] of pairs) {
    const hit = __firstImageUrlLike(v, depth + 1);
    if (hit) return k;
  }
  try {
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      const hit = __firstImageUrlLike(v, depth + 1);
      if (hit) return k + ".*";
    }
  } catch {}
  return "";
}
{/* === End Audit helpers === */}

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { supabase } from "./lib/03_supabaseClient";

// === Favorites Category Normalization (DB canonical keys) ====================
const CATEGORY_MAP = {
  // UI labels → DB canonical
  "Food": "food",
  "Movies": "movie",
  "TV Shows": "tv_show",
  "Sports": "sport",
  "Games": "game",
  "Types of Vacations": "vacation_type",
  "Actors/Actresses": "actor",
  "Vacation Locations": "vacation_location",

  "Music — Artists": "music_artist",
  "Music - Artists": "music_artist",
  "Music — Genres": "music_genre",
  "Music - Genres": "music_genre",
  "Books — Titles": "book_title",
  "Books - Titles": "book_title",
  "Books — Authors": "book_author",
  "Books - Authors": "book_author",

  // legacy/slugs/aliases → DB canonical
  actors_actresses: "actor",
  actors: "actor",
  music_artists: "music_artist",
  music_genres: "music_genre",
  books_titles: "book_title",
  books_title: "book_title",
  books_authors: "book_author",
  books_author: "book_author",
  vacation_locations: "vacation_location",
  vacation_location: "vacation_location",
  movies: "movie",
  tvshows: "tv_show",
  tv_shows: "tv_show",
  sports: "sport",
  games: "game",
  vacations: "vacation_type",
  food: "food",
};
function canonCategory(input) {
  if (!input) return input;
  const raw = String(input).trim();
  if (CATEGORY_MAP[raw]) return CATEGORY_MAP[raw];
  const slug = raw.toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s*-\s*/g, "_")
    .replace(/\s+/g, "_")
    .replace(/[^\w]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return CATEGORY_MAP[slug] ?? slug;
}
// ============================================================================

// --- SupabaseStatusCard (Build & Diagnostics) --------------------------------
function maskMiddle(str = '', keep = 4) {
  if (!str) return '';
  if (str.length <= keep * 2) return str;
  return `${str.slice(0, keep)}…${str.slice(-keep)}`;
}
function SBsmallBadge(ok) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 12,
      fontSize: 12,
      background: ok ? '#E8FBEE' : '#FDECEC',
      color: ok ? '#137A2A' : '#9A1C1C',
      border: `1px solid ${ok ? '#9AE6B4' : '#FEB2B2'}`
    }}>
      {ok ? 'OK' : 'Issue'}
    </span>
  );
}
function SBrow(label, content, ok = undefined) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',padding:'6px 0',borderBottom:'1px solid #f2f2f2'}}>
      <div style={{opacity:.8}}>{label}</div>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        {content}
        {ok !== undefined && SBsmallBadge(ok)}
      </div>
    </div>
  );
}
export function SupabaseStatusCard() {
  const [checking, setChecking] = React.useState(false);
  const [result, setResult] = React.useState({
    hasUrl: !!(typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL),
    hasAnonKey: !!(typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY),
    url: (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_URL : '') || '',
    anonKey: (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_ANON_KEY : '') || '',
    user: null,
    pingOk: null,
    pingError: null,
    lastChecked: null,
  });
  const checkNow = React.useCallback(async () => {
    setChecking(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      let pingOk = false, pingError = null;
      const { error: qErr } = await supabase
        .from('personas')
        .select('id', { count: 'exact', head: true })
        .limit(1);
      if (!qErr) pingOk = true; else pingError = qErr;
      setResult(prev => ({
        ...prev,
        user: auth?.user || null,
        pingOk,
        pingError,
        lastChecked: new Date().toLocaleTimeString(),
      }));
    } finally {
      setChecking(false);
    }
  }, []);
  React.useEffect(() => { checkNow(); }, [checkNow]);
  const ref = React.useMemo(() => {
    const m = result.url?.match(/^https?:\/\/([^\.]+)\.supabase\.co/i);
    return m?.[1] || '';
  }, [result.url]);
  const studioHref = ref ? `https://app.supabase.com/project/${ref}` : undefined;
  return (
    <div style={{
      border: '1px solid #eee',
      borderRadius: 12,
      padding: 14,
      margin: '12px 0',
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      background: '#fff',
      maxWidth: 720
    }}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
        <h3 style={{margin:0,fontSize:16}}>Supabase Status</h3>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <button
            onClick={checkNow}
            disabled={checking}
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid #ddd',
              background: checking ? '#f8f8f8' : '#fafafa',
              cursor: checking ? 'not-allowed' : 'pointer'
            }}
          >{checking ? 'Checking…' : 'Recheck'}</button>
          {studioHref && (
            <a href={studioHref} target="_blank" rel="noreferrer"
               style={{fontSize:12,opacity:.8,textDecoration:'none'}}>
              Open Studio ↗
            </a>
          )}
        </div>
      </div>
      {SBrow('Env: URL present', <code>{maskMiddle(result.url, 8)}</code>, result.hasUrl)}
      {SBrow('Env: Anon key present', <code>{maskMiddle(result.anonKey, 6)}</code>, result.hasAnonKey)}
      {SBrow('Auth', result.user ? <span>{result.user.email || maskMiddle(result.user.id, 6)}</span> : <span>Not signed in</span>, !!result.user)}
      {SBrow('DB ping (personas)', result.pingOk ? <span>Query OK</span> : <span title={result.pingError?.message || ''}>{result.pingError?.code || result.pingError?.message || 'Error'}</span>, result.pingOk)}
      <div style={{fontSize:12,opacity:.7,marginTop:8}}>
        Last checked: {result.lastChecked || '—'}
        {(!result.pingOk && result.pingError?.code) && (
          <div style={{marginTop:4}}>
            Hint: {['PGRST301','401','403'].some(c => String(result.pingError.code).includes(c))
              ? 'Likely RLS/auth issue — sign in or adjust policies.'
              : 'See console for details.'}
          </div>
        )}
      </div>
    </div>
  );
}




// === Archetype Badge (visual-only) =======================
const __ARCHETYPE_STYLE = Object.freeze({
  "Girl Next Door": { icon: "🌼", bg: "linear-gradient(90deg,#fde68a,#fbcfe8)", fg: "#111827" },
  "Seductress": { icon: "💋", bg: "linear-gradient(90deg,#ef4444,#be123c)", fg: "#f9fafb" },
  "Adventurer": { icon: "🧭", bg: "linear-gradient(90deg,#14b8a6,#f59e0b)", fg: "#111827" },
  "Dark Goddess": { icon: "🌙", bg: "linear-gradient(90deg,#4f46e5,#6d28d9)", fg: "#f9fafb" },
  "Athlete": { icon: "🏅", bg: "linear-gradient(90deg,#2563eb,#9ca3af)", fg: "#f9fafb" },
  "Artist": { icon: "🎨", bg: "linear-gradient(90deg,#ec4899,#38bdf8)", fg: "#111827" },
  "Gamer": { icon: "🎮", bg: "linear-gradient(90deg,#8b5cf6,#22c55e)", fg: "#f9fafb" },
  "Fashionista": { icon: "👗", bg: "linear-gradient(90deg,#fbcfe8,#e9d5ff)", fg: "#111827" },
  "Bookworm": { icon: "📚", bg: "linear-gradient(90deg,#d6d3d1,#fafaf9)", fg: "#111827" },
  "Musician": { icon: "🎸", bg: "linear-gradient(90deg,#fb923c,#a78bfa)", fg: "#111827" },
  "Innovator": { icon: "🧠", bg: "linear-gradient(90deg,#22d3ee,#94a3b8)", fg: "#111827" },
  "Dreamer": { icon: "☁️", bg: "linear-gradient(90deg,#bae6fd,#ffffff)", fg: "#111827" },
  "Rebel": { icon: "⚡", bg: "linear-gradient(90deg,#111827,#f59e0b)", fg: "#f9fafb" },
  "Leader": { icon: "👑", bg: "linear-gradient(90deg,#fcd34d,#a78bfa)", fg: "#111827" },
  "Glam Icon": { icon: "✨", bg: "linear-gradient(90deg,#fde68a,#fecaca)", fg: "#111827" },
  "Mystic": { icon: "🔮", bg: "linear-gradient(90deg,#8b5cf6,#0f172a)", fg: "#f9fafb" },
  "Social Butterfly": { icon: "🦋", bg: "linear-gradient(90deg,#f9a8d4,#5eead4)", fg: "#111827" },
  "Boss Babe": { icon: "💼", bg: "linear-gradient(90deg,#c4b5fd,#e5e7eb)", fg: "#111827" },
  "Fitness Coach": { icon: "🏋️", bg: "linear-gradient(90deg,#86efac,#22d3ee)", fg: "#111827" },
  "Comedian": { icon: "😄", bg: "linear-gradient(90deg,#fde68a,#93c5fd)", fg: "#111827" },
  "Teacher": { icon: "🏫", bg: "linear-gradient(90deg,#fde68a,#fcd34d)", fg: "#111827" },
  "Nurse": { icon: "🩺", bg: "linear-gradient(90deg,#e0f2fe,#bae6fd)", fg: "#111827" },
  "Cheerleader": { icon: "🎀", bg: "linear-gradient(90deg,#fecaca,#ffe4e6)", fg: "#111827" },
  "Sorority Girl": { icon: "🎓", bg: "linear-gradient(90deg,#f5d0fe,#e9d5ff)", fg: "#111827" },
  "Yoga Girl": { icon: "🧘‍♀️", bg: "linear-gradient(90deg,#a7f3d0,#d1fae5)", fg: "#111827" },
  "Traveler": { icon: "✈️", bg: "linear-gradient(90deg,#fef3c7,#93c5fd)", fg: "#111827" },
  "Librarian": { icon: "👓", bg: "linear-gradient(90deg,#e7e5e4,#fafaf9)", fg: "#111827" },
  "Cowgirl": { icon: "🤠", bg: "linear-gradient(90deg,#f59e0b,#ef4444)", fg: "#111827" },
  "Ballerina": { icon: "🩰", bg: "linear-gradient(90deg,#fce7f3,#fff7ed)", fg: "#111827" },
  "Bartender": { icon: "🍸", bg: "linear-gradient(90deg,#f59e0b,#0f172a)", fg: "#f9fafb" },
  "Lifeguard": { icon: "🛟", bg: "linear-gradient(90deg,#ef4444,#dc2626)", fg: "#ffffff" },
  "Skater Girl": { icon: "🛹", bg: "linear-gradient(90deg,#f472b6,#111827)", fg: "#f9fafb" },
  "Rock Star": { icon: "🎤", bg: "linear-gradient(90deg,#a78bfa,#d1d5db)", fg: "#111827" },
  "Witch": { icon: "🧹", bg: "linear-gradient(90deg,#0f172a,#7c3aed)", fg: "#f9fafb" },
  "Mermaid": { icon: "🧜‍♀️", bg: "linear-gradient(90deg,#67e8f9,#fecaca)", fg: "#111827" },
  "Princess": { icon: "👑", bg: "linear-gradient(90deg,#fcd34d,#fbcfe8)", fg: "#111827" },
  "Office Assistant": { icon: "🗂️", bg: "linear-gradient(90deg,#e5e7eb,#bae6fd)", fg: "#111827" },
  "Stewardess": { icon: "✈️", bg: "linear-gradient(90deg,#1d4ed8,#ef4444)", fg: "#f9fafb" },
  "Beach Babe": { icon: "🏖️", bg: "linear-gradient(90deg,#fde68a,#67e8f9)", fg: "#111827" },
  "Snow Bunny": { icon: "❄️", bg: "linear-gradient(90deg,#ffffff,#bae6fd)", fg: "#111827" },
  "Roller Derby": { icon: "🛼", bg: "linear-gradient(90deg,#f472b6,#2dd4bf)", fg: "#111827" },
  "Pin-Up": { icon: "💃", bg: "linear-gradient(90deg,#ef4444,#f5f5f5)", fg: "#111827" },
  "Dominatrix": { icon: "🖤", bg: "linear-gradient(90deg,#111827,#7f1d1d)", fg: "#f9fafb" },
});



const __ARCHETYPE_ICON_DEFAULTS = Object.freeze({
  "Girl Next Door":"🌼","Seductress":"💋","Adventurer":"🧭","Dark Goddess":"🌙","Athlete":"🏅","Artist":"🎨","Gamer":"🎮",
  "Fashionista":"👗","Bookworm":"📚","Musician":"🎸","Innovator":"🧠","Dreamer":"☁️","Rebel":"⚡","Leader":"👑","Glam Icon":"✨",
  "Mystic":"🔮","Social Butterfly":"🦋","Boss Babe":"💼","Fitness Coach":"🏋️","Comedian":"😄","Teacher":"🏫","Nurse":"🩺",
  "Cheerleader":"🎀","Sorority Girl":"🎓","Yoga Girl":"🧘‍♀️","Traveler":"✈️","Librarian":"👓","Cowgirl":"🤠","Ballerina":"🩰",
  "Bartender":"🍸","Lifeguard":"🛟","Skater Girl":"🛹","Rock Star":"🎤","Witch":"🧹","Mermaid":"🧜‍♀️","Princess":"👑",
  "Office Assistant":"🗂️","Stewardess":"✈️","Beach Babe":"🏖️","Snow Bunny":"❄️","Roller Derby":"🛼","Pin-Up":"💃","Dominatrix":"🖤"
});
const ARCHETYPE_OPTIONS = ["Girl Next Door", "Seductress", "Adventurer", "Dark Goddess", "Athlete", "Artist", "Gamer", "Fashionista", "Bookworm", "Musician", "Innovator", "Dreamer", "Rebel", "Leader", "Glam Icon", "Mystic", "Social Butterfly", "Boss Babe", "Fitness Coach", "Comedian", "Teacher", "Nurse", "Cheerleader", "Sorority Girl", "Yoga Girl", "Traveler", "Librarian", "Cowgirl", "Ballerina", "Bartender", "Lifeguard", "Skater Girl", "Rock Star", "Witch", "Mermaid", "Princess", "Office Assistant", "Stewardess", "Beach Babe", "Snow Bunny", "Roller Derby", "Pin-Up", "Dominatrix"];
function __getArchetypeStyle(name){
  const d = { icon:"⭐", bg:"linear-gradient(90deg,#e5e7eb,#f3f4f6)", fg:"#111827" };
  const n = String(name||"").trim();
  if (!n) return d;
  // Try exact (case-insensitive) within known styles
  const k = Object.keys(__ARCHETYPE_STYLE).find(x => x.toLowerCase() === n.toLowerCase());
  const style = k ? __ARCHETYPE_STYLE[k] : null;
  if (style) return style;
  // Fallback: provide a consistent icon + a pleasant default gradient
  const icon = __ARCHETYPE_ICON_DEFAULTS[n] || "✨";
  return { icon, bg:"linear-gradient(90deg,#fde68a,#fef3c7)", fg:"#111827" };
};




function ArchetypeBadge({ name }){
  const s = __getArchetypeStyle(name);
  const label = name || "Archetype";
  return (
    <span title="Defined in Archetype Library"
      style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"2px 8px",
               borderRadius:999, fontSize:12, fontWeight:600, background:s.bg, color:s.fg,
               border:"1px solid rgba(0,0,0,0.06)" }}>
      <span aria-hidden="true">{s.icon}</span>
      <span>{label}</span>
    </span>
  );
}


// ==== Zodiac helpers (auto-calculated from birthday) ====
const ZODIAC_RANGES = [
  { name: "Capricorn", symbol: "♑", start: [12, 22], end: [1, 19] },
  { name: "Aquarius",  symbol: "♒", start: [1, 20],  end: [2, 18] },
  { name: "Pisces",    symbol: "♓", start: [2, 19],  end: [3, 20] },
  { name: "Aries",     symbol: "♈", start: [3, 21],  end: [4, 19] },
  { name: "Taurus",    symbol: "♉", start: [4, 20],  end: [5, 20] },
  { name: "Gemini",    symbol: "♊", start: [5, 21],  end: [6, 20] },
  { name: "Cancer",    symbol: "♋", start: [6, 21],  end: [7, 22] },
  { name: "Leo",       symbol: "♌", start: [7, 23],  end: [8, 22] },
  { name: "Virgo",     symbol: "♍", start: [8, 23],  end: [9, 22] },
  { name: "Libra",     symbol: "♎", start: [9, 23],  end: [10, 22] },
  { name: "Scorpio",   symbol: "♏", start: [10, 23], end: [11, 21] },
  { name: "Sagittarius", symbol: "♐", start: [11, 22], end: [12, 21] },
];

function dateInRange(month, day, start, end) {
  const [sm, sd] = start;
  const [em, ed] = end;
  if (sm === em) return month === sm && day >= sd && day <= ed;
  if (sm > em) { // wraps new year
    return (month === sm && day >= sd) ||
           (month > sm || month < em) ||
           (month === em && day <= ed);
  }
  if (month > sm && month < em) return true;
  if (month === sm && day >= sd) return true;
  if (month === em && day <= ed) return true;
  return false;
}

export function getZodiacFromBirthday(birthdayStr) {
  if (!birthdayStr) return null;
  try {
    const d = new Date(birthdayStr);
    if (isNaN(d.getTime())) return null;
    const m = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    for (const z of ZODIAC_RANGES) {
      if (dateInRange(m, day, z.start, z.end)) return { sign: z.name, symbol: z.symbol };
    }
    return null;
  } catch { return null; }
}


// Helper to safely coerce an array of personas
function safePersonasList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(coercePersona);
}

// === Personas schema helpers (single source of truth) ===
const STORAGE_KEY_PERSONAS = "personas";
const STORAGE_META_PERSONAS = "personas_meta";
const PERSONAS_SCHEMA_VERSION = 3;

function coercePersona(p) {
  const safe = { ...(p || {}) };

  if (!safe.bio || typeof safe.bio !== "object") {
    safe.bio = {
      text: (typeof safe.bio === "string" ? safe.bio : ""),
      locked: false
    };
  }

  if (!safe.affiliateMarketing || typeof safe.affiliateMarketing !== "object") {
    safe.affiliateMarketing = { text: "", locked: false, savedAt: 0 };
  }

  if (!Array.isArray(safe.tone)) safe.tone = [];

// Enforce mandatory boundaries
if (!Array.isArray(safe.boundaries)) safe.boundaries = [];
MANDATORY_BOUNDARIES.forEach(mb => {
  if (!safe.boundaries.includes(mb)) safe.boundaries.push(mb);
});

  if (!('hairColor' in safe)) safe.hairColor = "";
  if (!('hairStyle' in safe)) safe.hairStyle = "";
  if (!('eyeColor' in safe)) safe.eyeColor = "";

  if (!('hair_color' in safe)) safe.hair_color = "";
  if (!('hair_style' in safe)) safe.hair_style = "";
  if (!('eye_color' in safe)) safe.eye_color = "";

  return safe;
}

function bioTextOf(p) {
  try {
    return (typeof p?.bio === "string") ? p.bio : (p?.bio?.text || "");
  } catch {
    return "";
  }
}

function loadPersonasMigrated() {
  let personas = [];
  try {
    personas = JSON.parse(localStorage.getItem(STORAGE_KEY_PERSONAS) || "[]");
  } catch {
    personas = [];
  }
  personas = Array.isArray(personas) ? personas.map(coercePersona) : [];

  let meta = {};
  try {
    meta = JSON.parse(localStorage.getItem(STORAGE_META_PERSONAS) || "{}");
  } catch {
    meta = {};
  }
  meta.schemaVersion = Math.max(PERSONAS_SCHEMA_VERSION, meta.schemaVersion || 0);

  try { localStorage.setItem(STORAGE_KEY_PERSONAS, JSON.stringify(personas)); } catch {}
  try { localStorage.setItem(STORAGE_META_PERSONAS, JSON.stringify(meta)); } catch {}

  return personas;
}
// === End personas helpers ===

// Factory for creating a complete, safe persona at create-time
function newPersonaDraft(name = "New Persona", thumbnail = "") {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    name,
    thumbnail,
    badges: [],
    birthday: "",
    alias: "",
    bio: { text: "", locked: false },
    eyeColor: "",
    hairStyle: "",
    hairColor: "",
    affiliateMarketing: { text: "", locked: false, savedAt: 0 },
    
    boundaries: ["Meeting in person"],
tone: [],
    primaryColor: "#111111",
    secondaryColor: "#ff0055",
    links: { fanvue: "", instagram: "", tiktok: "", twitter: "" },
    favorites: { food:[], movies:[], tvShows:[], music:{ artists:[], genres:[] }, books:{ titles:[], authors:[] }, vacations:[], games:[], sports:[], actors:[], vacationLocations:[] },
    notes: [],
    archetype: "",
    ethnicity: "",
    height: "",
    voice: "",
    physicalAttributes: "",
    hair_color: "",
    hair_style: "",
    eye_color: "",
    savedAt: Date.now()
  };
}

class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state = { hasError:false, err:null, info:null, tick:0 }; }
  static getDerivedStateFromError(err){ return { hasError:true, err }; }
  componentDidCatch(err, info){ try{ console.error("[ErrorBoundary]", err, info); }catch{} this.setState({ info }); }
  reset = () => this.setState({ hasError:false, err:null, info:null, tick:this.state.tick+1 });
  render(){
    if(this.state.hasError){
      return (
        <div style={{border:"1px solid #fecaca",background:"#fff1f2",padding:16,borderRadius:12}}>
          <div style={{fontWeight:700,marginBottom:8}}>{(this.props.label||"Section")} crashed — safely contained.</div>
          <div style={{fontSize:12,color:"#6b7280",whiteSpace:"pre-wrap"}}>{String(this.state.err||"Unknown error")}</div>
          <div style={{marginTop:12,display:"flex",gap:8}}>
            <button onClick={this.reset} style={{padding:"8px 12px",borderRadius:8,border:"1px solid #111",background:"#111",color:"#fff",cursor:"pointer"}}>Reset</button>
            <button onClick={()=>{ try{ location.reload(); }catch{} }} style={{padding:"8px 12px",borderRadius:8,border:"1px solid #e5e7eb",background:"#fff",cursor:"pointer"}}>Reload</button>
          </div>
        </div>
      );
    }
    return <div key={this.state.tick}>{this.props.children}</div>;
  }
}
// ===== Personas lockdown constants =====
export const PERSONAS_UI_VERSION = 1;
export const PERSONA_FIELD_ORDER = Object.freeze([
  "bio",
  "archetype",
  "ethnicity",
  "tone",
  "affiliateMarketing"
]);

const CURRENT_PERSONAS_SCHEMA = 3;
const PERSONAS_UI_LOCKED = true; // keep true to freeze structure
// ======================================

/*
  Persona Team Dashboard — FULL APP
  - Tabs in order: dashboard, messages, personas, users, following, team, history, admin
  - Personas: complete set of fields, Bio lock/modify+modal, Voice upload, Colors (Primary/Secondary),
    && Favorites split into 8 subfields: Food, Movies, TV Shows, Music, Books, Types of Vacations, Games, Sports
  - All data persisted in localStorage. Migrations preserve older saves.
*/

// ---------- Styles ----------
const inputStyle = { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14, background: "#fff" };
const smallText  = { fontSize: 12, color: "#6b7280" };
const chipStyle  = { display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 8px", border: "1px solid #e5e7eb", borderRadius: 999, fontSize: 12, background: "#fff" };
const primaryBtn = { padding: "8px 12px", borderRadius: 8, border: "1px solid #111", background: "#111", color: "#fff", fontWeight: 600, cursor: "pointer" };
const subtleBtn  = { padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", color: "#111", cursor: "pointer" };
const cardStyle  = { border: "1px solid #e5e7eb", borderRadius: 12, padding: 14, background: "#fafafa" };
const emojiBtn  = { padding: "4px 6px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 18, lineHeight: "20px" };
const stickyHeader = { position: "sticky", top: 0, zIndex: 100, background: "#fff", padding: "10px 0", borderBottom: "1px solid #e5e7eb" };
const linkBtn = { background:"none", border:"none", padding:0, color:"#2563eb", textDecoration:"underline", cursor:"pointer", fontSize:13 };


// ---------- Favorites Helpers (1.8.28) ----------
function addFavoriteLocal(p, rawCategory, value) {
  if (!p || !rawCategory) return p;
  const category = canonCategory(rawCategory); // enforce canonical BEFORE switch
  const clone = { ...p, favorites: { ...(p.favorites || {}) } };
  const F = clone.favorites;

  // ensure compound buckets exist
  F.music = (F.music && typeof F.music === 'object') ? F.music : { artists: [], genres: [] };
  F.books = (F.books && typeof F.books === 'object') ? F.books : { titles: [], authors: [] };

  switch (category) {
    case 'music_artist':
      if (!F.music.artists.includes(value)) F.music.artists = [...F.music.artists, value];
      break;
    case 'music_genre':
      if (!F.music.genres.includes(value)) F.music.genres = [...F.music.genres, value];
      break;
    case 'book_title':
      if (!F.books.titles.includes(value)) F.books.titles = [...F.books.titles, value];
      break;
    case 'book_author':
      if (!F.books.authors.includes(value)) F.books.authors = [...F.books.authors, value];
      break;
    case 'actor':
      F.actors = Array.isArray(F.actors) ? F.actors : [];
      if (!F.actors.includes(value)) F.actors = [...F.actors, value];
      break;
    case 'vacation_location':
      F.vacationLocations = Array.isArray(F.vacationLocations) ? F.vacationLocations : [];
      if (!F.vacationLocations.includes(value)) F.vacationLocations = [...F.vacationLocations, value];
      break;
    case 'movie':
      F.movies = Array.isArray(F.movies) ? F.movies : [];
      if (!F.movies.includes(value)) F.movies = [...F.movies, value];
      break;
    case 'tv_show':
      F.tvShows = Array.isArray(F.tvShows) ? F.tvShows : [];
      if (!F.tvShows.includes(value)) F.tvShows = [...F.tvShows, value];
      break;
    case 'sport':
      F.sports = Array.isArray(F.sports) ? F.sports : [];
      if (!F.sports.includes(value)) F.sports = [...F.sports, value];
      break;
    case 'game':
      F.games = Array.isArray(F.games) ? F.games : [];
      if (!F.games.includes(value)) F.games = [...F.games, value];
      break;
    case 'food':
      F.food = Array.isArray(F.food) ? F.food : [];
      if (!F.food.includes(value)) F.food = [...F.food, value];
      break;
    case 'vacation_type':
      F.vacations = Array.isArray(F.vacations) ? F.vacations : [];
      if (!F.vacations.includes(value)) F.vacations = [...F.vacations, value];
      break;
    default:
      // Fallback: keep data without breaking
      F[category] = Array.isArray(F[category]) ? F[category] : [];
      if (!F[category].includes(value)) F[category] = [...F[category], value];
  }

  clone.favorites = F;
  return clone;
}


// Helpers to ensure DB persona id (UUID) exists before writing favorites
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function ensureDbPersonaId(persona){
  try {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const curId = String(persona?.id || "");
    if (UUID_RE.test(curId)) return curId;

    const name = String(persona?.name || "").trim() || "New Persona";
    const { data, error } = await supabase
      .from('personas')
      .insert({ name })
      .select('id')
      .single();
    if (error) { console.warn('[favorites] ensureDbPersonaId insert error', error); return null; }
    return String(data?.id || '');
  } catch (e) {
    console.warn('[favorites] ensureDbPersonaId exception', e);
    return null;
  }
}
// ---------- Favorites DB Sync & Hydration (1.8.31+) ----------
/**
 * Canonical rows from a persona's UI favorites.
 * Returns array of { category, value } using DB-approved category keys.
 */
function extractFavoriteRowsFromUI(persona){
  const rows = [];
  if (!persona || !persona.favorites) return rows;
  const F = persona.favorites || {};

  function pushAll(list, cat){
    if (Array.isArray(list)) {
      list.forEach(v => {
        const value = (v ?? "").toString().trim();
        if (value) rows.push({ category: cat, value });
      });
    }
  }

  // flat arrays
  pushAll(F.movies,              'movie');
  pushAll(F.tvShows,             'tv_show');
  pushAll(F.sports,              'sport');
  pushAll(F.games,               'game');
  pushAll(F.food,                'food');
  pushAll(F.vacations,           'vacation_type');
  pushAll(F.actors,              'actor');
  pushAll(F.vacationLocations,   'vacation_location');

  // nested groups
  const music = (F.music && typeof F.music === 'object') ? F.music : { artists:[], genres:[] };
  pushAll(music.artists, 'music_artist');
  pushAll(music.genres,  'music_genre');

  const books = (F.books && typeof F.books === 'object') ? F.books : { titles:[], authors:[] };
  pushAll(books.titles,  'book_title');
  pushAll(books.authors, 'book_author');

  return rows;
}

/**
 * Diff two arrays of {category,value} pairs.
 */
function diffFavoriteRows(prevRows, nextRows){
  const key = r => `${r.category}||${r.value}`;
  const prev = new Set((prevRows||[]).map(key));
  const next = new Set((nextRows||[]).map(key));
  const added = [...next].filter(k => !prev.has(k)).map(k => {
    const [category, value] = k.split("||"); return { category, value };
  });
  const removed = [...prev].filter(k => !next.has(k)).map(k => {
    const [category, value] = k.split("||"); return { category, value };
  });
  return { added, removed };
}

// Global refs so we don't thrash network
const favoritesHydratedSet = new Set(); // persona_id set
const favoritesCacheMap = new Map();    // persona_id -> Array<{category,value}>

/**
 * Hydrate a single persona's favorites from DB (persona_favorites) into UI state.
 * Non-destructive merge: only adds items that aren't already present.
 */
async function hydratePersonaFavorites(persona_id, getPersonas, setPersonas) {
  if (!persona_id || favoritesHydratedSet.has(persona_id)) return;
  try {
    const { data, error } = await supabase
      .from('persona_favorites')
      .select('category,value,wiki_url')
      .eq('persona_id', persona_id);

    if (error) {
      console.warn('[favorites] hydrate select error', error);
      return;
    }

    // Merge into UI
    const personas = getPersonas();
    const idx = personas.findIndex(p => p.id === persona_id);
    if (idx === -1) return;

    const copy = [...personas];
    let p = copy[idx];
    p = { ...p, favorites: { ...(p.favorites||{}) } };

    // Use the same mapping as DB_TO_UI behavior
    const acc = p;
    (data||[]).forEach(r => {
      const cat = canonCategory(r.category);
      // reuse addFavoriteLocal to ensure containers exist
      p = addFavoriteLocal(p, cat, r.value);
    });

    copy[idx] = p;
    setPersonas(copy);

    favoritesHydratedSet.add(persona_id);
    favoritesCacheMap.set(persona_id, (data||[]).map(r => ({ category: canonCategory(r.category), value: r.value })));
    console.log('[favorites] hydrated from DB:', persona_id, favoritesCacheMap.get(persona_id));
  } catch (e) {
    console.warn('[favorites] hydrate exception', e);
  }
}

/**
 * Sync any changes in UI favorites back to DB via upserts/deletes.
 * This effect should be called whenever personas state changes.
 */
async function syncFavoritesToDBForPersona(persona){
  // Ensure we have a DB UUID id before writing favorites (FK constraint)
  const __ensured = await ensureDbPersonaId(persona);
  const persona_id = __ensured || persona?.id;

  
  if (!persona_id) return;
  const prev = favoritesCacheMap.get(persona_id) || [];
  const next = extractFavoriteRowsFromUI(persona);
  const { added, removed } = diffFavoriteRows(prev, next);

  if (added.length === 0 && removed.length === 0) return;

  // Perform upserts for added
  if (added.length) {
    const payload = added.map(r => ({
      persona_id,
      category: canonCategory(r.category),
      value: r.value,
      wiki_url: wikiUrlFor(r.value, r.category)
    }));
    const { error } = await supabase.from('persona_favorites').upsert(payload, { onConflict: 'persona_id,category,value' });
    if (error) console.warn('[favorites] upsert error', error);
  }

  // Perform deletes for removed
  for (const r of removed) {
    const { error } = await supabase
      .from('persona_favorites')
      .delete()
      .eq('persona_id', persona_id)
      .eq('category', canonCategory(r.category))
      .eq('value', r.value);
    if (error) console.warn('[favorites] delete error', error);
  }

  // Update cache snapshot
  favoritesCacheMap.set(persona_id, next);
  console.log('[favorites] synced', { persona_id, added, removed });
}

// Debounce personas sync to avoid thrash on keystrokes
let favoritesSyncTimer = null;
function scheduleFavoritesSync(personas){
  clearTimeout(favoritesSyncTimer);
  favoritesSyncTimer = setTimeout(async () => {
    try {
      for (const persona of personas) {
        await syncFavoritesToDBForPersona(persona);
      }
    } catch(e){
      console.warn('[favorites] sync exception', e);
    }
  }, 400);
}

/**
 * Hook wiring: call in component after personas are loaded.
 * Assumes you have `personas` state and `setPersonas` setter in scope.
 */

// Non-hook utility: safe to call anywhere
let __favSyncStarted = false;
let __favPersonasRef = null;
let __favSetPersonas = null;
function useFavoritesHydrationAndSync(personas, setPersonas){
  __favPersonasRef = personas;
  __favSetPersonas = setPersonas;

  // Initial hydrate for each persona (one-time per id)
  if (Array.isArray(personas)) {
    personas.forEach(p => {
      if (p?.id) {
        hydratePersonaFavorites(p.id, () => __favPersonasRef, v => {
          if (typeof __favSetPersonas === 'function') __favSetPersonas(v);
        });
      }
    });
  }

  // Start heartbeat once
  if (!__favSyncStarted) {
    __favSyncStarted = true;
    setInterval(() => {
      const cur = __favPersonasRef;
      if (Array.isArray(cur) && cur.length) {
        scheduleFavoritesSync(cur);
      }
    }, 1200);
  }
}

// ---------- End Favorites DB Sync & Hydration ----------
// ---------- End Favorites Helpers ----------

// ---------- Helpers ----------
// Build a Wikipedia link for a given term and optional context
function wikiUrlFor(term, contextHint=''){
  try{
    const base = 'https://en.wikipedia.org/wiki/';
    const q = String(term||'').trim();
    if(!q) return base;
    const enc = encodeURIComponent(q);
    // If context hint is provided, make a search fallback link that tends to surface the right article
    if (contextHint){
      const srch = 'https://en.wikipedia.org/w/index.php?search=' + encodeURIComponent(q + ' ' + contextHint);
      return srch;
    }
    return base + enc.replace(/%20/g,'_');
  }catch(e){
    return 'https://en.wikipedia.org/wiki/';
  }
}

// ---------- Bio Metrics Helpers ----------
function formatTime(ts){
  try{
    const d = ts ? new Date(ts) : new Date();
    const opts = { year:'numeric', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' };
    return d.toLocaleString(undefined, opts);
  }catch(e){ return String(ts || '—'); }
}
function countWords(txt){
  if(!txt) return 0;
  const words = String(txt).trim().split(/\s+/).filter(Boolean);
  return words.length;
}
function BioMetrics({ text, lastSaved }){
  const words = countWords(text);
  return (
    <div style={{ display:'flex', gap:12, alignItems:'center', fontSize:12, color:'#6B7280', padding:'6px 2px 0' }}>
      <span>{words} words</span>
      <span>•</span>
      <span>Last saved: {lastSaved ? formatTime(lastSaved) : '—'}</span>
    </div>
  );
}
// ---------- End Bio Metrics Helpers ----------


// ---------- Ethnicity helpers ----------
function normalizeEthnicity(raw){
  if (raw==null) return "";
  const parts = String(raw).split(",").map(s=>s.trim()).filter(Boolean);
  const title = s => s.replace(/\s+/g," ").split(" ").map(w=> w? (w[0].toUpperCase()+w.slice(1).toLowerCase()) : "").join(" ");
  const uniq = Array.from(new Set(parts.map(title)));
  return uniq.join(", ");
}
const COMMON_ETHNICITIES = [
  "Caucasian","Hispanic","Latina","Latino","Black","African American","African","Asian","East Asian","South Asian","Southeast Asian",
  "Middle Eastern","Arab","Native American","Indigenous","Pacific Islander","European","Italian","German","Portuguese","Spanish",
  "French","Irish","British","Polish","Greek","Russian","Ukrainian","Brazilian","Mexican","Colombian","Argentinian","Persian","Turkish",
  "Jewish","Ashkenazi Jewish","Sephardic Jewish","Korean","Japanese","Chinese","Filipino","Vietnamese","Thai","Indian","Pakistani","Bangladeshi"
];

// Mandatory boundaries that must always be present for any persona
const MANDATORY_BOUNDARIES = ["Meeting in person"];



// ---------- Physical Description options (prepopulated) ----------
const HAIR_COLOR_OPTIONS = ["Blonde","Brunette","Black","Red","Auburn","Platinum","Pink","Blue","Purple","Silver","Ombre"];
const HAIR_STYLE_OPTIONS = ["Straight","Wavy","Curly","Coily","Braids","Ponytail","Bun","Pixie","Bob","Layered","Long","Short","Updo"];
const EYE_COLOR_OPTIONS  = ["Blue","Green","Brown","Hazel","Gray","Amber","Violet"];
// ---------- End Physical Description options ----------


// ---------- End Ethnicity helpers ----------

function normFavorites(fav){
  const F = fav || {};
  return {
    food: Array.isArray(F.food)?F.food:[],
    movies: Array.isArray(F.movies)?F.movies:[],
    tvShows: Array.isArray(F.tvShows)?F.tvShows:[],
    music: (F.music && typeof F.music==='object') ? { artists: Array.isArray(F.music.artists)?F.music.artists:[], genres: Array.isArray(F.music.genres)?F.music.genres:[] } : { artists: Array.isArray(F.music)?F.music:[], genres: [] },
    books: (F.books && typeof F.books==='object') ? { titles: Array.isArray(F.books.titles)?F.books.titles:[], authors: Array.isArray(F.books.authors)?F.books.authors:[] } : { titles: Array.isArray(F.books)?F.books:[], authors: [] },
    vacations: Array.isArray(F.vacations)?F.vacations:[],
    games: Array.isArray(F.games)?F.games:[],
    sports: Array.isArray(F.sports)?F.sports:[],
    actors: Array.isArray(F.actors)?F.actors:[],
    vacationLocations: Array.isArray(F.vacationLocations)?F.vacationLocations:[]
  };
}


// ---------- Tone definitions & role helpers ----------

const TONE_DEFS = {
  "Warm & Friendly":   { cat: "Conversational/Relational", desc: "Open, inviting; easy small talk and warmth." },
  "Playful":           { cat: "Conversational/Relational", desc: "Light, teasing banter; keeps things fun." },
  "Flirty":            { cat: "Conversational/Relational", desc: "Suggestive but tasteful; winks and subtle cues." },
  "Empathetic":        { cat: "Conversational/Relational", desc: "Validates feelings; mirrors language gently." },
  "Romantic":          { cat: "Conversational/Relational", desc: "Affectionate; focuses on connection and intimacy." },
  "Caring":            { cat: "Conversational/Relational", desc: "Support-first; nurturing and attentive." },
  "Supportive":        { cat: "Conversational/Relational", desc: "Cheerleader tone; positive reinforcement." },
  "Gentle":            { cat: "Conversational/Relational", desc: "Soft phrasing; avoids abruptness." },
  "Mysterious":        { cat: "Conversational/Relational", desc: "Hints rather than explains; short replies." },
  "Confident":         { cat: "Conversational/Relational", desc: "Direct statements; avoids hedging language." },
  "Reserved":          { cat: "Conversational/Relational", desc: "Measured; low disclosure; minimal adjectives." },

  "Excited":           { cat: "Expressive/Intensity", desc: "High energy; exclamation marks used sparingly." },
  "Passionate":        { cat: "Expressive/Intensity", desc: "Strong feelings; vivid phrasing." },
  "Dramatic":          { cat: "Expressive/Intensity", desc: "Heightened stakes; cinematic adjectives." },
  "Calm":              { cat: "Expressive/Intensity", desc: "Even, steady; reassuring cadence." },
  "Relaxed":           { cat: "Expressive/Intensity", desc: "Laid-back; casual punctuation and tempo." },
  "Stoic":             { cat: "Expressive/Intensity", desc: "Minimal emotion; factual delivery." },
  "Energetic":         { cat: "Expressive/Intensity", desc: "Fast tempo; action verbs; upbeat." },
  "Intense":           { cat: "Expressive/Intensity", desc: "Focused; compressed wording; low emoji use." },
  "Soothing":          { cat: "Expressive/Intensity", desc: "Comforting; gentle affirmations." },

  "Inquisitive":       { cat: "Intellectual/Analytical", desc: "Questions frequently; explores assumptions." },
  "Witty":             { cat: "Intellectual/Analytical", desc: "Clever one-liners and callbacks." },
  "Thoughtful":        { cat: "Intellectual/Analytical", desc: "Reflective; considers nuances." },
  "Persuasive":        { cat: "Intellectual/Analytical", desc: "Argument-driven; benefits-first framing." },
  "Intellectual":      { cat: "Intellectual/Analytical", desc: "Abstract concepts; references frameworks." },
  "Curious":           { cat: "Intellectual/Analytical", desc: "Probing; asks why/how; hypothesis-driven." },
  "Reflective":        { cat: "Intellectual/Analytical", desc: "Looks back; draws lessons." },
  "Analytical":        { cat: "Intellectual/Analytical", desc: "Structured logic; bulleting; tradeoffs." },
  "Insightful":        { cat: "Intellectual/Analytical", desc: "Connects dots; names patterns." },

  "Professional":      { cat: "Professional/Formal", desc: "Business tone; clear, concise, respectful." },
  "Polite":            { cat: "Professional/Formal", desc: "Courteous hedging; softeners and thanks." },
  "Authoritative":     { cat: "Professional/Formal", desc: "Decisive; confident directives." },
  "Direct":            { cat: "Professional/Formal", desc: "Unambiguous; minimal filler." },
  "Diplomatic":        { cat: "Professional/Formal", desc: "Balances viewpoints; face-saving phrasing." },
  "Structured":        { cat: "Professional/Formal", desc: "Ordered steps; headings; lists." },
  "Motivational":      { cat: "Professional/Formal", desc: "Calls-to-action; growth framing." },
  "Inspiring":         { cat: "Professional/Formal", desc: "Vision-led; aspirational imagery." },

  "Artistic":          { cat: "Creative/Artistic", desc: "Aesthetic language; sensory detail." },
  "Poetic":            { cat: "Creative/Artistic", desc: "Metaphor and rhythm; lyrical phrasing." },
  "Dreamy":            { cat: "Creative/Artistic", desc: "Soft-focus imagery; wistful mood." },
  "Imaginative":       { cat: "Creative/Artistic", desc: "Inventive scenarios; speculative ideas." },
  "Melancholic":       { cat: "Creative/Artistic", desc: "Tender sadness; reflective tone." },
  "Adventurous":       { cat: "Creative/Artistic", desc: "Risk-taking; exploratory excitement." },
  "Whimsical":         { cat: "Creative/Artistic", desc: "Quirky charm; playful absurdity." },

  "Bold":              { cat: "Mischievous/Edgy", desc: "Forward; unapologetic phrasing." },
  "Teasing":           { cat: "Mischievous/Edgy", desc: "Provokes gently; playful challenge." },
  "Sarcastic":         { cat: "Mischievous/Edgy", desc: "Irony; deadpan humor." },
  "Rebellious":        { cat: "Mischievous/Edgy", desc: "Breaks convention; disruptive tone." },
  "Edgy":              { cat: "Mischievous/Edgy", desc: "Sharper language; riskier jokes." },
  "Provocative":       { cat: "Mischievous/Edgy", desc: "Pushes boundaries; suggestive." },
  "Seductive":         { cat: "Mischievous/Edgy", desc: "Sensual; lingered phrasing; hints." },
  "Dominant":          { cat: "Mischievous/Edgy", desc: "Takes control; commanding verbs." },
  "Submissive":        { cat: "Mischievous/Edgy", desc: "Yielding; deferential phrasing." },
  "Mischievous":       { cat: "Mischievous/Edgy", desc: "Impish jokes; light rule-bending." },

  "Encouraging":       { cat: "Nurturing/Mentor", desc: "Reinforces progress; celebrates small wins." },
  "Patient":           { cat: "Nurturing/Mentor", desc: "Unhurried; tolerant of repetition." },
  "Compassionate":     { cat: "Nurturing/Mentor", desc: "Care + understanding; gentle reassurance." },
  "Reassuring":        { cat: "Nurturing/Mentor", desc: "Eases fears; stability language." },
  "Inspirational":     { cat: "Nurturing/Mentor", desc: "Elevates self-belief; role-model tone." },
  "Wise":              { cat: "Nurturing/Mentor", desc: "Seasoned perspective; aphorisms." },
  "Grounded":          { cat: "Nurturing/Mentor", desc: "Practical; reality-checked advice." },
  "Honest":            { cat: "Nurturing/Mentor", desc: "Candid but kind; no sugarcoating." }
};
function toneTooltip(label){ const m=TONE_DEFS[label]; return m ? `${label} — ${m.cat}: ${m.desc}` : label; }
const COMMON_TONES = [
  "Warm & Friendly","Playful","Flirty","Empathetic","Romantic","Caring","Supportive","Gentle","Mysterious","Confident","Reserved",
  "Excited","Passionate","Dramatic","Calm","Relaxed","Stoic","Energetic","Intense","Soothing",
  "Inquisitive","Witty","Thoughtful","Persuasive","Intellectual","Curious","Reflective","Analytical","Insightful",
  "Professional","Polite","Authoritative","Direct","Diplomatic","Structured","Motivational","Inspiring",
  "Artistic","Poetic","Dreamy","Imaginative","Melancholic","Adventurous","Whimsical",
  "Bold","Teasing","Sarcastic","Rebellious","Edgy","Provocative","Seductive","Dominant","Submissive","Mischievous",
  "Encouraging","Patient","Compassionate","Reassuring","Inspirational","Wise","Grounded","Honest"
];

function definitionForTone(t){ return TONE_DEFS[t] || ""; }

function getCurrentRole(){
  try{
    const r = (localStorage.getItem("role")||"Owner").trim();
    return r || "Owner";
  }catch{ return "Owner"; }
}
function isOwnerOrManager(){ const r=getCurrentRole(); return r==="Owner" || r==="Manager"; }
// ---------- End Tone definitions & role helpers ----------




// ---------- AutocompleteInput (lightweight) ----------

function AutocompleteInput({ value, onChange, options = [], placeholder = "", inputStyle, id, withBadges = false }){
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState(String(value ?? ""));
  const [idx, setIdx] = React.useState(-1);
  const wrapRef = React.useRef(null);

  React.useEffect(()=> setText(String(value ?? "")), [value]);

  React.useEffect(()=>{
    function handle(e){
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return ()=> document.removeEventListener("mousedown", handle);
  }, [])

  const raw = (text || "");
  const lastRaw = raw.split(",").slice(-1)[0] || "";
  const q = lastRaw.trim().toLowerCase();

  const opts = Array.isArray(options) ? options.slice() : [];
  // Filter + rank (startsWith first, then contains)
  const starts = [], contains = [];
  for (const o of opts){
    const s = String(o);
    const sl = s.toLowerCase();
    if (!q || sl.startsWith(q)) starts.push(s);
    else if (sl.includes(q)) contains.push(s);
  }
  const filtered = [...starts, ...contains];
  const exact = (Array.isArray(options)?options:[]).find(o => String(o).toLowerCase() === q);
  const mergedStyle = exact ? { ...(inputStyle||{}), paddingLeft: 110 } : (inputStyle||{});

  function applyPick(val){
    if (!val) return;
    onChange && onChange(val);
    setText(String(val));
    setOpen(false);
    setIdx(-1);
  }

  function onInputChange(e){
    setText(e.target.value);
    setOpen(true);
    setIdx(-1);
  }

  function onKeyDown(e){
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) { setOpen(true); return; }
    if (!open) return;
    if (e.key === "ArrowDown"){ e.preventDefault(); setIdx(i => Math.min((i<0? -1 : i) + 1, filtered.length-1)); }
    else if (e.key === "ArrowUp"){ e.preventDefault(); setIdx(i => Math.max((i<=0? 0 : i) - 1, 0)); }
    else if (e.key === "Enter"){ e.preventDefault(); const pick = filtered[idx] ?? filtered[0]; if (pick) applyPick(pick); }
    else if (e.key === "Escape"){ e.preventDefault(); setOpen(false); setIdx(-1); }
  }

  function onBlur(){
    const lx = (text||"").trim().toLowerCase();
    const match = (Array.isArray(options)?options:[]).find(o => String(o).toLowerCase()===lx);
    if (match){ onChange && onChange(match); setText(String(match)); }
    else { setText(String(value ?? "")); }
    setOpen(false);
  }

  return (
    <div ref={wrapRef} style={{ position:"relative" }}>
      <input
        id={id}
        value={text}
        onChange={onInputChange}
        onFocus={()=> setOpen(true)}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        placeholder={placeholder}
        style={mergedStyle}
        autoComplete="off"
      />
      {open && filtered.length>0 && !exact && (
        <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"#fff", border:"1px solid #e5e7eb", borderRadius:8, marginTop:6, boxShadow:"0 8px 20px rgba(0,0,0,0.12)", maxHeight: 300, overflowY:"auto", zIndex: 60 }}>
          {filtered.map((opt, i) => {
            const s = withBadges && __getArchetypeStyle ? __getArchetypeStyle(opt) : { icon:"", bg:"", fg:"#111827" };
            return (
              <div key={opt}
                   onMouseDown={(e)=>{ e.preventDefault(); }}
                   onClick={()=> applyPick(opt)}
                   style={{ padding:"8px 10px", cursor:"pointer", display:"flex", alignItems:"center", gap:8, background: (i===idx ? "#f3f4f6" : "transparent") }}>
                {withBadges ? (
                  <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"2px 8px", borderRadius:16, color:s.fg, background:s.bg, fontSize:12 }}>
                    <span style={{ fontSize:14 }}>{s.icon}</span>
                    <span>{opt}</span>
                  </span>
                ) : (
                  <span>{opt}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function moduloWrap(val, min, max){
  const span = (max - min + 1);
  let n = (val - min) % span;
  if(n < 0) n += span;
  return min + n;
}
function parseHeightString(h){
  if(!h) return { ft: 5, inch: 6 };
  const s = String(h).toLowerCase();
  const m = s.match(/(\d+)\s*(?:ft|\'|′|\b)\s*(\d{1,2})?\s*(?:in|"|″)?/);
  if(m){
    const ft = Math.min(6, Math.max(4, parseInt(m[1]||"5",10)));
    const inch = Math.min(11, Math.max(0, parseInt(m[2]||"0",10)));
    return { ft, inch };
  }
  const nums = (s.match(/\d+/g)||[]).map(n=>parseInt(n,10));
  const ft = Math.min(6, Math.max(4, nums[0] ?? 5));
  const inch = Math.min(11, Math.max(0, nums[1] ?? 6));
  return { ft, inch };
}
function formatHeight(ft, inch){
  const f = Math.min(6, Math.max(4, parseInt(ft||0,10)));
  const i = Math.min(11, Math.max(0, parseInt(inch||0,10)));
  return `${f}'${i}"`;
}

function WheelPicker({ label, value, min, max, onChange }){
  const boxStyle = { display:"grid", gridTemplateRows:"auto 1fr auto", width:120, height:160, alignItems:"center", justifyItems:"center", borderRadius:12, border:"1px solid #e5e7eb", background:"#fff" };
  const displayStyle = { fontSize:28, fontWeight:700, padding:"8px 0", userSelect:"none" };
  const btnStyle = { padding:"6px 8px", borderRadius:8, border:"1px solid #e5e7eb", background:"#f9fafb", cursor:"pointer" };
  const labelStyle = { fontSize:12, color:"#6b7280", marginBottom:6 };
  function step(delta){ onChange(moduloWrap(value + delta, min, max)); }
  function onWheel(e){ e.preventDefault(); e.stopPropagation(); step(e.deltaY > 0 ? 1 : -1); }
  return (
    <div style={boxStyle} onWheel={onWheel}>
      <div style={labelStyle}>{label}</div>
      <div style={{ display:"grid", alignItems:"center", justifyItems:"center", height:"100%", width:"100%" }}>
        <div style={displayStyle}>{value}</div>
      </div>
      <div style={{ display:"flex", gap:8, padding:"8px 0 10px" }}>
        <button type="button" onClick={()=>step(-1)} style={btnStyle}>−</button>
        <button type="button" onClick={()=>step(+1)} style={btnStyle}>+</button>
      </div>
    </div>
  );
}

function HeightPickerPopover({ value, onChange, onClose }){
  const { ft: initFt, inch: initIn } = parseHeightString(value);
  const [ft, setFt] = React.useState(initFt);
  const [inch, setInch] = React.useState(initIn);
  const popRef = React.useRef(null);

  React.useEffect(()=>{
    function onDoc(e){ if(popRef.current && !popRef.current.contains(e.target)){ onClose?.(); } }
    function onKey(e){ if(e.key === "Escape"){ onClose?.(); } }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return ()=>{ document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  React.useEffect(()=>{ onChange(formatHeight(ft, inch)); }, [ft, inch]);

  return (
    <div ref={popRef} style={{ position:"absolute", top:"100%", left:0, marginTop:6, zIndex:100, background:"#fff", border:"1px solid #e5e7eb", borderRadius:12, boxShadow:"0 8px 20px rgba(0,0,0,0.12)", padding:12 }}>
      <div style={{ display:"flex", gap:12 }}>
        <WheelPicker label="Feet" value={ft} min={4} max={6} onChange={setFt} />
        <WheelPicker label="Inches" value={inch} min={0} max={11} onChange={setInch} />
      </div>
      <div style={{ fontSize:12, color:"#6b7280", marginTop:8, textAlign:"center" }}>Scroll mouse wheel or use ± buttons. Values wrap around.</div>
    </div>
  );
}

function HeightPicker({ value, onChange, inputStyle }){
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState(String(value||""));
  const wrapRef = React.useRef(null);
  React.useEffect(()=>{ setText(String(value||"")); }, [value]);

  // Lock body scroll while popover is open
  React.useEffect(()=>{
    const original = document.body.style.overflow;
    if(open){ document.body.style.overflow = 'hidden'; }
    else { document.body.style.overflow = original || ''; }
    return ()=>{ document.body.style.overflow = original || ''; };
  }, [open]);

  function onFocus(){ setOpen(true); }
  function onClick(){ setOpen(true); }

  return (
    <div ref={wrapRef} style={{ position:"relative" }}>
      <input
        type="text"
        value={text}
        onChange={(e)=>{ setText(e.target.value); onChange(e.target.value); }}
        onFocus={onFocus}
        onClick={onClick}
        placeholder="e.g. 5 ft 7 in"
        style={inputStyle}
        readOnly
      />
      {open && (
        <HeightPickerPopover
          value={text}
          onChange={(v)=>{ setText(v); onChange(v); }}
          onClose={()=> setOpen(false)}
        />
      )}
    </div>
  );
}
// ---------- End Height Picker ----------


function uid(){ return String(Date.now())+"-"+String(Math.floor(Math.random()*100000)); }
function save(key, obj){ try{ localStorage.setItem(key, JSON.stringify(obj)); }catch(e){} }
function load(key, fallback){ try{ const s=localStorage.getItem(key); return s?JSON.parse(s):fallback; }catch(e){ return fallback; } }
function calcAge(iso){ if(!iso) return ""; const b=new Date(iso); if(isNaN(b)) return ""; const t=new Date(); let a=t.getFullYear()-b.getFullYear(); const m=t.getMonth()-b.getMonth(); if(m<0||(m===0&&t.getDate()<b.getDate())) a--; return String(a); }
const CHANNEL_CHOICES=["X / Twitter","Instagram","TikTok","FanVue"];

function asArray(v){
  if (Array.isArray(v)) return v.filter(Boolean).map(s => String(s).trim()).filter(Boolean);
  if (v == null) return [];
  if (typeof v === 'string'){
    return v.split(new RegExp("[,;|\]+")).map(s => s.trim()).filter(Boolean);
  }
  return [];
}

// --- Reorder helper (used by drag & drop)
function reorder(list, fromIndex, toIndex){
  const arr=list.slice();
  const [m]=arr.splice(fromIndex,1);
  arr.splice(toIndex,0,m);
  return arr;
}
const fieldStyle = (disabled=false)=> ({ ...inputStyle, ...(disabled?{ background:'#f3f4f6', color:'#6b7280', pointerEvents:'none' }:{} ) });
function dateOnly(d=new Date()){ const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const da=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${da}`; }
function threadSubject(customer, dateStr=dateOnly()){ return `${customer||'unknown'} ${dateStr}`; }

// ---- Personas schema helpers ----

// Handy backup
function exportPersonas() {
  try {
    const blob = new Blob([localStorage.getItem(STORAGE_KEY_PERSONAS) || "[]"], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `personas-backup-${new Date().__ymdLocal(new Date())}.json`;
    a.click();
  } catch {}
}
// ----------------------------------

// Error boundary for Personas tab
class TabBoundary extends React.Component {
  constructor(props){ super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err){ return { err }; }
  render(){
    if (this.state.err) {
      return React.createElement('div', {style:{padding:16,border:'1px solid #fca5a5',borderRadius:12,background:'#fff1f2'}}, 
        'Personas crashed: ', String(this.state.err));
    }
    return this.props.children;
  }
}

/** Persona Peek Modal (portal-rendered)
 * Mirrors Personas card layout; Esc closes; background scroll is locked.
 */
function PersonaPeekModal({ persona, onClose, onOpenInTab }) {
  if (!persona) return null;

  const stop = (e) => e.stopPropagation();

  // Simple initials helper
  const initials = (name = "") => name.split(" ").filter(Boolean).map(s => s[0]).join("").slice(0,2).toUpperCase();

  // Favorites grid keys
  const NF = normFavorites(p.favorites);
  const favSections = [
    { label: 'Food', items: NF.food },
    { label: 'Movies', items: NF.movies },
    { label: 'TV Shows', items: NF.tvShows },
    { label: 'Music — Artists', items: NF.music.artists },
    { label: 'Music — Genres', items: NF.music.genres },
    { label: 'Books — Titles', items: NF.books.titles },
    { label: 'Books — Authors', items: NF.books.authors },
    { label: 'Types of Vacations', items: NF.vacations },
    { label: 'Vacation Locations', items: NF.vacationLocations },
    { label: 'Games', items: NF.games },
    { label: 'Sports', items: NF.sports },
    { label: 'Actors/Actresses', items: NF.actors },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-peek-version="v3"
      onClick={onClose}
      onKeyDown={(e)=>{
        const k = e.key || e.code;
        if (k === "Escape" || k === "Esc" || e.keyCode === 27) { e.stopPropagation(); onClose(); }
      }}
      tabIndex={0}
      style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,0.5)",
        display:"flex", alignItems:"center", justifyContent:"center",
        zIndex: 9999, overscrollBehavior:"none"
      }}
    >
      <div
        onClick={stop}
        style={{ background:"#fff", borderRadius:12, width:"min(980px, 92vw)", maxHeight:"85vh",
                 overflow:"auto", boxShadow:"0 10px 30px rgba(0,0,0,0.2)" }}
      >
        {/* Header actions */}
        <div style={{display:"flex", justifyContent:"flex-end", gap:8, padding:12, borderBottom:"1px solid #e5e7eb"}}>
          <button
            onClick={onOpenInTab}
            style={{ padding:"8px 12px", borderRadius:8, border:"1px solid #e5e7eb", background:"#fff", cursor:"pointer" }}
          >Open in Personas</button>
          <button
            onClick={onClose}
            style={{ padding:"8px 12px", borderRadius:8, border:"1px solid #111", background:"#111", color:"#fff", fontWeight:600, cursor:"pointer" }}
          >Close</button>
        </div>

        {/* Persona header (mirrors Personas card top) */}
        <div style={{display:"grid", gridTemplateColumns:"88px 1fr", gap:16, padding:16, alignItems:"center"}}>
          <div style={{width:72, height:72, borderRadius:12, background:"#f3f4f6", display:"grid", placeItems:"center", overflow:"hidden"}}>
            {persona.thumbnail
              ? <img src={persona.thumbnail} alt={persona.name} style={{width:"100%", height:"100%", objectFit:"cover"}}/>
              : <div style={{fontWeight:700}}>{initials(persona.name)}</div>
            }
          </div>
          <div>
            <div style={{display:"flex", alignItems:"center", gap:12, flexWrap:"wrap"}}>
              <h2 style={{margin:0, fontSize:20, fontWeight:700}}>{persona.name || "Unknown"}</h2>
              <div style={{display:"inline-flex", alignItems:"center", gap:6}}>
                <div title="Primary Color" style={{width:16, height:16, borderRadius:4, border:"1px solid #e5e7eb", background: persona.primaryColor || "#111"}}/>
                <div title="Secondary Color" style={{width:16, height:16, borderRadius:4, border:"1px solid #e5e7eb", background: persona.secondaryColor || "#ff0055"}}/>
              </div>
            </div>
            <div style={{marginTop:6, color:"#6b7280", fontSize:13}}>
              {(persona.archetype ? `${persona.archetype} • ` : "") + (persona.ethnicity || "")}
            </div>
          </div>
        </div>

        {/* Quick facts row */}
        <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:12, padding:"0 16px 16px"}}>
          <div style={{border:"1px solid #e5e7eb", borderRadius:8, padding:10}}>
            <div style={{fontSize:12, color:"#6b7280"}}>Birthday</div>
            <div style={{fontSize:14}}>{persona.birthday || "—"}</div>
          </div>
          <div style={{border:"1px solid #e5e7eb", borderRadius:8, padding:10}}>
            <div style={{fontSize:12, color:"#6b7280"}}>Age</div>
            <div style={{fontSize:14}}>{(function(){
              if (!persona.birthday) return "—";
              const d = new Date(persona.birthday);
              if (isNaN(d)) return "—";
              const t = new Date();
              let a = t.getFullYear()-d.getFullYear();
              const m = t.getMonth()-d.getMonth();
              if (m<0 || (m===0 && t.getDate()<d.getDate())) a--;
              return String(a);
            })()}</div>
          </div>
          <div style={{border:"1px solid #e5e7eb", borderRadius:8, padding:10}}>
            <div style={{fontSize:12, color:"#6b7280"}}>Alias</div>
            <div style={{fontSize:14}}>{persona.alias || "—"}</div>
          </div>
        </div>

        {/* Bio + 
      {/* AI Behavior (Owner/Manager only) - safe secondary anchor */}
      <AiBehaviorControls persona={p} onChange={(next)=>{ const c=[...personas]; c[i].aiBehavior=next; setPersonas(c); }} />
Affiliate Marketing */}
        <div style={{display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12, padding:"0 16px 16px"}}>
          {[
            ["height","Height"],["weightRange","Weight Range"],["measurements","Measurements"],["cupSize","Cup Size"],
            ["tone","Tone"],["style","Style"],["values","Values"],["boundaries","Boundaries"]
          ].map(([key,label]) => (
            <div key={key} style={{border:"1px solid #e5e7eb", borderRadius:8, padding:10}}>
              <div style={{fontSize:12, color:"#6b7280"}}>{label}</div>
              <div style={{fontSize:14, whiteSpace:"pre-wrap"}}>
                {Array.isArray(persona[key]) ? (persona[key].length ? persona[key].join(", ") : "—") : (persona[key] || "—")}
              </div>
            </div>
          ))}
        </div>

        {/* Physical & style attributes */}
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, padding:"0 16px 16px"}}>
          <div style={{border:"1px solid #e5e7eb", borderRadius:8, padding:12}}>
            <div style={{fontSize:12, color:"#6b7280", marginBottom:6}}>Bio</div>
            <div style={{whiteSpace:"pre-wrap"}}>{(typeof persona.bio === "string" ? persona.bio : (persona.bio?.text || "")) || "—"}</div>
          </div>
          <div style={{border:"1px solid #e5e7eb", borderRadius:8, padding:12}}>
            <div style={{fontSize:12, color:"#6b7280", marginBottom:6}}>Affiliate Marketing</div>
            <div style={{whiteSpace:"pre-wrap"}}>{(persona.affiliateMarketing && typeof persona.affiliateMarketing === "object" ? persona.affiliateMarketing.text : "") || "—"}</div>
          </div>
        </div>

        {/* Favorites grid (8-way) */}
        <div style={{padding:"0 16px 16px"}}>
          <div style={{fontSize:13, color:"#6b7280", marginBottom:8}}>Favorites</div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12}}>
            {favKeys.map(([k,label]) => (
              <div key={k} style={{border:"1px solid #e5e7eb", borderRadius:8, padding:10}}>
                <div style={{fontSize:12, color:"#6b7280", marginBottom:6}}>{label}</div>
                <div style={{fontSize:14}}>
                  {persona.favorites && Array.isArray(persona.favorites[k]) && persona.favorites[k].length
                    ? persona.favorites[k].join(", ")
                    : "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// === Dashboard helpers ===
const DASH_GOALS_KEY = "dashboardGoalsV1";
const DASH_BADGES_KEY = "badgesV1";
function startOfDay(d=new Date()){ const x = new Date(d); x.setHours(0,0,0,0); return x.getTime(); }
function withinRange(ts, fromMs){ if (!ts) return false; const n = typeof ts === "number" ? ts : (new Date(ts)).getTime(); return n >= fromMs; }
function timeframeStart(tf){
  const now = new Date();
  if (tf === "today") return startOfDay(now);
  if (tf === "week")  return startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));
  if (tf === "month") return startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
  return startOfDay(now);
}
function loadGoals(){ try { return JSON.parse(localStorage.getItem(DASH_GOALS_KEY)||"{}"); } catch { return {}; } }
function saveGoals(next){ try { localStorage.setItem(DASH_GOALS_KEY, JSON.stringify(next)); } catch {} }
function loadBadges(){ try { return JSON.parse(localStorage.getItem(DASH_BADGES_KEY)||"{}"); } catch { return {}; } }
function saveBadges(next){ try { localStorage.setItem(DASH_BADGES_KEY, JSON.stringify(next)); } catch {} }

function Dashboard({ team, personas, threads, following, manualUsers, onOpenPersonaPeek }){
  const [goals, setGoals] = React.useState(()=>loadGoals());
  React.useEffect(()=>saveGoals(goals), [goals]);

  const CATEGORIES = [
    { key:"messages", label:"Messages Sent" },
    { key:"prospecting", label:"Prospecting Messages" },
    { key:"followers", label:"Followers Gained" },
    { key:"posts", label:"Posts Made" },
    { key:"users", label:"Users Added" },
    { key:"subs", label:"Subscribers Added" },
    { key:"revenue", label:"Revenue" },
    { key:"badges", label:"Badges Earned" },
  ];
  const [lbCat, setLbCat] = React.useState("messages");
  const [lbScope, setLbScope] = React.useState("today");
  const fromMs = React.useMemo(()=>timeframeStart(lbScope), [lbScope]);

  // ---- Dashboard quick metrics ----
  const allUsersList = React.useMemo(()=>{
    const map = new Map();
    const add = (username, platform)=>{
      if (!username) return;
      const plat = platform || "app";
      const id = `${plat}::${username}`;
      if (!map.has(id)) map.set(id, { id, username, platform: plat });
    };
    (threads||[]).forEach(t=> add(t.customer||"", t.channel||"app"));
    (manualUsers||[]).forEach(mu=> add(mu.username, mu.platform));
    return Array.from(map.values());
  }, [threads, manualUsers]);

  const dashCounts = React.useMemo(()=>{
    let linked = 0, dismissed = 0, notes = 0;
    try {
      const ks = Object.keys(localStorage);
      for (const k of ks) {
        if (k.startsWith("links_")) {
          try { const arr = JSON.parse(localStorage.getItem(k)||"[]"); linked += Array.isArray(arr)? arr.length : 0; } catch {}
        } else if (k.startsWith("dismissed_")) {
          try { const arr = JSON.parse(localStorage.getItem(k)||"[]"); dismissed += Array.isArray(arr)? arr.length : 0; } catch {}
        } else if (k === "userNotesV1") {
          try {
            const map = JSON.parse(localStorage.getItem(k)||"{}");
            if (map && typeof map === "object") { for (const id in map) { if (Array.isArray(map[id])) notes += map[id].length; } }
          } catch {}
        }
      }
    } catch {}
    return {
      users: (allUsersList||[]).length,
      team: Array.isArray(team) ? team.length : 0,
      personas: Array.isArray(personas) ? personas.length : 0,
      following: Array.isArray(following) ? following.length : 0,
      linked, dismissed, notes
    };
  }, [allUsersList, team, personas, following]);

  const recentActivity = React.useMemo(()=>{
    try {
      const arr = JSON.parse(localStorage.getItem("historyLogV1")||"[]");
      return Array.isArray(arr) ? arr.slice(-10).reverse() : [];
    } catch { return []; }
  }, [lbScope]); // reuse state to refresh occasionally

  const messagesSentByMember = React.useMemo(()=>{
    const map = {};
    for (const m of (threads||[])){
      const msgs = Array.isArray(m.messages) ? m.messages : [];
      for (const x of msgs){
        if (x?.direction === "out" && withinRange(x.ts || x.time || x.timestamp, fromMs)){
          const who = (x.from || "Unknown").trim() || "Unknown";
          map[who] = (map[who]||0) + 1;
        }
      }
    }
    return map;
  }, [threads, fromMs]);

  const usersAddedByMember = React.useMemo(()=>{
    const map = {};
    for (const u of (manualUsers||[])){
      const ts = u.ts || u.time || 0;
      if (!ts || withinRange(ts, fromMs)) {
        const who = "Unknown";
        map[who] = (map[who]||0) + 1;
      }
    }
    return map;
  }, [manualUsers, fromMs]);

  const followersGainedByMember = React.useMemo(()=>{
    const map = {};
    const arr = Array.isArray(following) ? following : [];
    for (const f of arr){
      const ts = f.ts || f.time || 0;
      if (!ts || withinRange(ts, fromMs)){
        const who = "Unknown";
        map[who] = (map[who]||0) + 1;
      }
    }
    return map;
  }, [following, fromMs]);

  const postsByMember   = React.useMemo(()=>({}), []);
  const subsByMember    = React.useMemo(()=>({}), []);
  const revenueByMember = React.useMemo(()=>({}), []);

  const [badgesMap, setBadgesMap] = React.useState(()=>loadBadges());
  React.useEffect(()=>saveBadges(badgesMap), [badgesMap]);

  const teamNames = React.useMemo(()=> (team||[]).map(t=>t.name), [team]);
  function rankFor(cat){
    const by =
      cat==="messages"   ? messagesSentByMember :
      cat==="prospecting"? messagesSentByMember :
      cat==="followers"  ? followersGainedByMember :
      cat==="users"      ? usersAddedByMember :
      cat==="subs"       ? subsByMember :
      cat==="revenue"    ? revenueByMember :
      cat==="badges"     ? Object.fromEntries(Object.entries(badgesMap).map(([k,v])=>[k, Array.isArray(v)?v.length:0])) :
      {};
    const rows = teamNames.map(name => ({ name, value: by[name] || 0 }));
    return rows.sort((a,b)=>b.value - a.value).slice(0, 10);
  }

  const actor = (team && team.find(t=>t.role==="owner"))?.name || (team?.[0]?.name) || "You";
  const myGoals = goals[actor] || { messages:25, prospecting:10, followers:10, posts:1, users:2, subs:1 };
  function updateGoal(key, val){
    const v = Math.max(0, Number(val||0));
    setGoals(prev => ({ ...prev, [actor]: { ...myGoals, [key]: v }}));
  }

  function progressRow(label, key, done){
    const target = Math.max(0, Number(myGoals[key]||0));
    const pct = target ? Math.min(100, Math.round((done/target)*100)) : 0;
    return (
      <div style={{marginBottom:10}} key={key}>
        <div style={{display:"flex", justifyContent:"space-between", fontSize:12, color:"#6b7280"}}>
          <span>{label}</span>
          <span>{done} / {target}</span>
        </div>
        <div style={{height:8, background:"#e5e7eb", borderRadius:999}}>
          <div style={{height:"100%", width:`${pct}%`, background:"#111", borderRadius:999}}/>
        </div>
      </div>
    );
  }

  const myMsgs = Object.values(messagesSentByMember).reduce((a,b)=>a+b,0);
  const myPros = messagesSentByMember[actor] || 0;
  const myFols = followersGainedByMember[actor] || 0;
  const myPosts= 0;
  const myUsers= usersAddedByMember[actor] || 0;
  const mySubs = 0;

  const totalMsgs = Object.values(messagesSentByMember).reduce((a,b)=>a+b,0);
  const totalFols = Object.values(followersGainedByMember).reduce((a,b)=>a+b,0);
  const totalUsers= Object.values(usersAddedByMember).reduce((a,b)=>a+b,0);
  const totalSubs = Object.values(subsByMember).reduce((a,b)=>a+b,0);

  return (
    <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:16}}>
      {/* To-Do List */}
      <div style={{...cardStyle}}>
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8}}>
          <h3 style={{margin:0}}>To-Do List</h3>
          <div style={{display:"flex", gap:8}}>
            {["messages","prospecting","followers","posts","users","subs"].map(k=>(
              <div key={k} style={{display:"flex", alignItems:"center", gap:4}}>
                <label style={{fontSize:12, color:"#6b7280"}}>{k}</label>
                <input type="number" min={0} value={myGoals[k]||0}
                  onChange={e=>{ if (DASHBOARD_GOALS_EDITABLE) updateGoal(k, e.target.value); }}
                  style={{...inputStyle, width:70, padding:"6px 8px"}} />
              </div>
            ))}
          </div>
        </div>
        {progressRow("Messages Sent",       "messages",    myMsgs)}
        {progressRow("Prospecting Messages","prospecting", myPros)}
        {progressRow("New Followers",       "followers",   myFols)}
        {progressRow("Posts Made",          "posts",       myPosts)}
        {progressRow("Users Added",         "users",       myUsers)}
        {progressRow("Subscribers Added",   "subs",        mySubs)}
      </div>

      {/* Leaderboard */}
      <div style={{...cardStyle}}>
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8}}>
          <h3 style={{margin:0}}>Leaderboard</h3>
          <div style={{display:"flex", gap:8}}>
            <select value={lbCat} onChange={e=>setLbCat(e.target.value)} style={{...inputStyle, width:170}}>
              {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <select value={lbScope} onChange={e=>setLbScope(e.target.value)} style={{...inputStyle, width:140}}>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>
        <div>
          {rankFor(lbCat).map((r,i)=>(
            <div key={r.name} style={{display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #eee"}}>
              <div style={{display:"flex", alignItems:"center", gap:8}}>
                <div style={{width:22, textAlign:"right"}}>{i+1}.</div>
                <strong>{r.name}</strong>
              </div>
              <div style={{fontWeight:600}}>{r.value}</div>
            </div>
          ))}
          {!rankFor(lbCat).length && <div style={{color:"#6b7280", fontSize:12}}>No data (yet)</div>}
        </div>
      </div>

      {/* Team Member Badges */}
      <div style={{...cardStyle}}>
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8}}>
          <h3 style={{margin:0}}>Team Member Badges</h3>
          <button style={subtleBtn} onClick={()=>{
            const b = (badgesMap[actor]||[]).slice(); b.push("Daily Goal Crusher");
            const next = { ...badgesMap, [actor]: b }; setBadgesMap(next);
          }}>+ Grant demo badge</button>
        </div>
        {(team||[]).map(m=>{
          const list = Array.isArray(badgesMap[m.name]) ? badgesMap[m.name] : [];
          return (
            <div key={m.id||m.name} style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #eee"}}>
              <div style={{display:"flex", alignItems:"center", gap:8}}>
                <div style={{width:28, height:28, borderRadius:8, background:"#fff", border:"1px solid #e5e7eb", display:"grid", placeItems:"center"}}>{(m.name||"?").slice(0,1)}</div>
                <div>
                  <div style={{fontWeight:600}}>{m.name}</div>
                  <div style={{fontSize:12, color:"#6b7280"}}>{m.role||"member"}</div>
                </div>
              </div>
              <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
                {list.length ? list.map((b,i)=>(<span key={i} style={chipStyle}>{b}</span>))
                             : <span style={{fontSize:12, color:"#6b7280"}}>No badges yet</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Metrics Snapshot */}
      <div style={{...cardStyle}}>
        <h3 style={{marginTop:0}}>Metrics Snapshot ({lbScope === "today" ? "Today" : lbScope === "week" ? "This Week" : "This Month"})</h3>
        <div style={{display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:12}}>
          <div style={{...cardStyle, background:"#fff"}}><div style={smallText}>Messages</div><div style={{fontSize:22, fontWeight:700}}>{totalMsgs}</div></div>
          <div style={{...cardStyle, background:"#fff"}}><div style={smallText}>Followers</div><div style={{fontSize:22, fontWeight:700}}>{totalFols}</div></div>
          <div style={{...cardStyle, background:"#fff"}}><div style={smallText}>Users</div><div style={{fontSize:22, fontWeight:700}}>{totalUsers}</div></div>
          <div style={{...cardStyle, background:"#fff"}}><div style={smallText}>Subscribers</div><div style={{fontSize:22, fontWeight:700}}>{totalSubs}</div></div>
        </div>
      </div>
    </div>
  );
}

{/* * AdminSafe — minimal, crash-proof Admin tab */}

function AdminSafe({
  personas, setPersonas, goTab,
  archivedPersonas, archivePersonaById, unarchivePersonaById,
  team, setTeam
}) {
  const card  = { border:"1px solid #e5e7eb", borderRadius:12, padding:14, background:"#fafafa" };
  const input = { padding:"8px 10px", border:"1px solid #e5e7eb", borderRadius:8, width:"100%" };
  
  // Archived team members (local fallback store)
  const ARCH_TEAM_KEY = "ptd_archived_team_v1";
  const [archivedTeamMembers, setArchivedTeamMembers] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem(ARCH_TEAM_KEY) || "[]") || []; } catch { return []; }
  });
  const saveArchivedTeam = (list) => { try { localStorage.setItem(ARCH_TEAM_KEY, JSON.stringify(list)); } catch {} };
  // --- Utilities: normalize & cleanup duplicates across team and archived ---
  const normKey = (m) => String(m?.id || m?.username || m?.email || m?.name || "")
    .trim()
    .toLowerCase();

  const cleanupTeamData = () => {
    // 1) Dedupe active team by key (first wins).
    setTeam(prev => {
      const list = Array.isArray(prev) ? prev.slice() : [];
      const seen = new Set();
      const next = [];
      for (const m of list) {
        const k = normKey(m);
        if (!k) continue;
        if (!seen.has(k)) { seen.add(k); next.push(m); }
      }
      return next;
    });

    // 2) Dedupe archived by key (first wins).
    setArchivedTeamMembers(prev => {
      const list = Array.isArray(prev) ? prev.slice() : [];
      const seen = new Set();
      const next = [];
      for (const m of list) {
        const k = normKey(m);
        if (!k) continue;
        if (!seen.has(k)) { seen.add(k); next.push(m); }
      }
      saveArchivedTeam(next);
      return next;
    });

    // 3) If a key exists in BOTH lists, keep it only in active team.
    setArchivedTeamMembers(prevArch => {
      const arch = Array.isArray(prevArch) ? prevArch.slice() : [];
      let changed = false;
      const activeKeys = new Set((Array.isArray(team) ? team : []).map(normKey));
      const filtered = arch.filter(m => {
        const k = normKey(m);
        if (activeKeys.has(k)) { changed = true; return false; }
        return true;
      });
      if (changed) saveArchivedTeam(filtered);
      return filtered;
    });
  };

  // Auto-run cleanup once on mount
  React.useEffect(() => { cleanupTeamData(); }, [])


  
  const archiveTeamMemberLocal = (id) => {
    const targetId = String(id || "");
    if (!targetId) return;
    setTeam(prevTeam => {
      const teamList = Array.isArray(prevTeam) ? prevTeam.slice() : [];
      const idx = teamList.findIndex(m => String(m.id||m.name) === targetId);
      if (idx < 0) return prevTeam;

      const [moved] = teamList.splice(idx, 1);
      // add to archived if not already there
      setArchivedTeamMembers(prevArch => {
        const arch = Array.isArray(prevArch) ? prevArch.slice() : [];
        if (!arch.some(x => String(x.id||x.name) === String(moved.id||moved.name))) {
          arch.push(moved);
          saveArchivedTeam(arch);
        }
        return arch;
      });
      return teamList;
    });
  };

  const unarchiveTeamMemberLocal = (id) => {
    const targetId = String(id || "");
    if (!targetId) return;
    setArchivedTeamMembers(prevArch => {
      const arch = Array.isArray(prevArch) ? prevArch.slice() : [];
      const idx = arch.findIndex(m => String(m.id||m.name) === targetId);
      if (idx < 0) return prevArch;

      const [moved] = arch.splice(idx, 1);
      saveArchivedTeam(arch);
      setTeam(prevTeam => {
        const teamList = Array.isArray(prevTeam) ? prevTeam.slice() : [];
        if (!teamList.some(x => String(x.id||x.name) === String(moved.id||moved.name))) {
          teamList.push(moved);
        }
        return teamList;
      });
      return arch;
    });
  };

  // Keep selects in sync after lists change
  React.useEffect(() => {
    const list = Array.isArray(team) ? team : [];
    setTeamArchiveId(list[0] ? (list[0].id||list[0].name||"") : "");
  }, [team]);
  React.useEffect(() => {
    const arch = Array.isArray(archivedTeamMembers) ? archivedTeamMembers : [];
    setTeamUnarchiveId(arch[0] ? (arch[0].id||arch[0].name||"") : "");
  }, [archivedTeamMembers]);


  // --- Team member creation form state ---
  const [newName, setNewName] = React.useState("");
  const [newEmail, setNewEmail] = React.useState("");
  const [newRole, setNewRole] = React.useState("Member");
  const [newPerms, setNewPerms] = React.useState([]);
  const [newAvatar, setNewAvatar] = React.useState("");

  const onAvatar = (e) => {
    const f = e?.target?.files?.[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = ev => setNewAvatar(String(ev.target.result||""));
    reader.readAsDataURL(f);
  };

  const togglePerm = (k) => {
    setNewPerms(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);
  };

  const createMember = () => {
    const nm = (newName||"").trim();
    const em = (newEmail||"").trim();
    if (!nm || !em) { alert("Name and email are required."); return; }
    const member = {
      id: "u_" + Math.random().toString(36).slice(2,9),
      name: nm,
      email: em,
      role: newRole || "Member",
      avatar: newAvatar || "",
      permissions: Array.isArray(newPerms) ? newPerms.slice(0) : []
    };
    setTeam(prev => Array.isArray(prev) ? [...prev, member] : [member]);
    setNewName(""); setNewEmail(""); setNewRole("Member"); setNewPerms([]); setNewAvatar("");
  };
;
const btn   = { padding:"8px 12px", borderRadius:8, border:"1px solid #111", background:"#111", color:"#fff", cursor:"pointer" };
  
  // Persona thumbnail creation
  const [newPersonaThumb, setNewPersonaThumb] = React.useState("");
  const onNewPersonaThumb = (e) => {
    const f = e?.target?.files?.[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = ev => setNewPersonaThumb(String(ev.target.result||""));
    reader.readAsDataURL(f);
  };
  const createPersonaWithThumb = () => {
    const nm = (name||"").trim();
    if(!nm || !newPersonaThumb){
      alert("Persona name and thumbnail are required."); return;
    }
    let item = null;
    try { if (typeof newPersonaDraft === "function") item = newPersonaDraft(nm, newPersonaThumb); } catch {}
    if(!item) item = { id: "p_"+Math.random().toString(36).slice(2,9), name: nm, thumbnail: newPersonaThumb, badges: [] };
    setPersonas(prev => Array.isArray(prev) ? [...prev, item] : [item]);
    setName(""); setNewPersonaThumb("");
  };

  // Replace thumbnail for existing persona
  const [thumbPersonaId, setThumbPersonaId] = React.useState(personas?.[0]?.id || "");
  const [replaceThumbData, setReplaceThumbData] = React.useState("");
  React.useEffect(()=>{ setThumbPersonaId(personas?.[0]?.id || ""); }, [personas]);
  const onReplaceThumb = (e) => {
    const f = e?.target?.files?.[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = ev => setReplaceThumbData(String(ev.target.result||""));
    reader.readAsDataURL(f);
  };
  const applyReplaceThumb = () => {
    const id = String(thumbPersonaId||"");
    if(!id || !replaceThumbData){ alert("Pick a persona and image first."); return; }
    setPersonas(prev => (Array.isArray(prev)?prev:[]).map(p => String(p.id)===id ? { ...p, thumbnail: replaceThumbData } : p));
    setReplaceThumbData("");
  };

  // Team archive/unarchive control ids
  
  // Migrate away from deprecated "operator" role
  React.useEffect(() => {
    // 4a) Team list roles
    try {
      setTeam(prev => {
        const list = Array.isArray(prev)? prev.slice() : [];
        let changed = false;
        const next = list.map(m => {
          const rl = String(m?.role || "").toLowerCase();
          if (rl === "operator") { changed = true; return { ...m, role: "member" }; }
          return m;
        });
        return changed ? next : prev;
      });
    } catch {}

    // 4b) Role->tab matrix in localStorage
    try {
      const KEY = "ptd_role_tabs_v1";
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const obj = JSON.parse(raw) || {};
        if (obj && Object.prototype.hasOwnProperty.call(obj, "operator")) {
          delete obj.operator;
          localStorage.setItem(KEY, JSON.stringify(obj));
        }
      }
    } catch {}
  }, []);
  const [teamArchiveId, setTeamArchiveId] = React.useState((() => { const arr = Array.isArray(team) ? team : []; return arr.find(p => p && p.id) ? arr.find(p => p && p.id).id : ""; })());
  const [teamUnarchiveId, setTeamUnarchiveId] = React.useState("");
const small = { fontSize:12, color:"#6b7280" };

  const [name, setName] = React.useState("");
  const [archiveId, setArchiveId] = React.useState(personas?.[0]?.id || "");
  const [unarchiveId, setUnarchiveId] = React.useState(archivedPersonas?.[0]?.id || "");
  React.useEffect(() => { setArchiveId(personas?.[0]?.id || ""); }, [personas]);
  React.useEffect(() => { setUnarchiveId(archivedPersonas?.[0]?.id || ""); }, [archivedPersonas]);

  const createPersona = () => {
    const id = "p_" + Math.random().toString(36).slice(2,9);
    const item = { id, name: (name || "").trim() || "New Persona" };
    try { setPersonas(prev => Array.isArray(prev) ? [...prev, item] : [item]); } catch {}
    setName("");
  };

  


return (
  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
    {/* Persona Management */}
    <div style={card}>
      <div role="heading" aria-level={2} style={{ fontSize:18, fontWeight:800, letterSpacing:0.2, marginBottom:10 }}>Persona Management</div>
      <div style={{ display:"grid", gap:12 }}>
        {/* Create persona (name + thumbnail) */}
        <div>
          <div style={small}>Create persona</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:8 }}>
            <input style={input} placeholder="Persona name" value={name} onChange={e=>setName(e.target.value)} />
            <button type="button" style={btn} onClick={createPersonaWithThumb}>Create</button>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6 }}>
            <label style={small}>Thumbnail (required)</label>
            <input type="file" accept="image/*" onChange={onNewPersonaThumb} />
            {newPersonaThumb && <span style={{...small, color:"#065f46"}}>selected</span>}
          </div>
        </div>

        {/* Manage active persona (archive / delete) */}
        <div>
          <div style={small}>Manage active persona</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 160px auto", gap:8, alignItems:"center" }}>
            <select value={archiveId} onChange={e=>setArchiveId(e.target.value)}>
              {(Array.isArray(personas)?personas:[]).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select id="personaActionSelect">
              <option value="archive">Archive</option>
              <option value="delete">Delete</option>
            </select>
            <button
              type="button"
              style={btn}
              onClick={()=>{
                const action = (document.getElementById("personaActionSelect")||{}).value || "archive";
                if(action === "archive"){
                  archivePersonaById && archivePersonaById(String(archiveId));
                }else{
                  deletePersonaById(String(archiveId));
                }
              }}
            >Apply</button>
          </div>
        </div>

        {/* Change thumbnail for a persona */}
        <div>
          <div style={small}>Change thumbnail</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr auto auto", gap:8, alignItems:"center" }}>
            <select value={thumbPersonaId} onChange={e=>setThumbPersonaId(e.target.value)}>
              {(Array.isArray(personas)?personas:[]).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="file" accept="image/*" onChange={onReplaceThumb} />
            <button type="button" style={btn} onClick={applyReplaceThumb}>Update</button>
          </div>
        </div>

        {/* Unarchive persona */}
        <div>
          <div style={small}>Unarchive a persona</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:8, alignItems:"center" }}>
            <select value={unarchiveId} onChange={e=>setUnarchiveId(e.target.value)}>
              {(Array.isArray(archivedPersonas)?archivedPersonas:[]).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button type="button" style={btn} onClick={()=> unarchivePersonaById && unarchivePersonaById(String(unarchiveId))}>Unarchive</button>
          </div>
        </div>
      </div>
    </div>

    {/* Team Management */}
    <div style={card}>
      <div role="heading" aria-level={2} style={{ fontSize:18, fontWeight:800, letterSpacing:0.2, marginBottom:10 }}>Team Management</div>
      <div style={{ display:"grid", gap:14 }}>
        {/* Archive / Unarchive block */}
        <div>
          <div style={{ fontWeight:700, marginBottom:6 }}>Archive / Unarchive</div>
          <div style={{ display:"grid", gap:12 }}>

        <div>
          <button type="button" style={{ ...btn, background:"#fff", color:"#111", borderColor:"#e5e7eb" }} onClick={cleanupTeamData}>
            Repair duplicates
          </button>
        </div>
>
            <div>
              <div style={small}>Archive an active team member</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:8 }}>
                <select value={teamArchiveId} onChange={e=>setTeamArchiveId(e.target.value)}>
                  {(Array.isArray(team)?team:[]).map(m => <option key={m.id||m.name} value={m.id||m.name}>{m.name||m.username}</option>)}
                </select>
                <button type="button" style={btn} onClick={()=>{ const id=String(teamArchiveId||""); if(!id) return; if (typeof archiveTeamMemberById==="function") archiveTeamMemberById(id); else archiveTeamMemberLocal(id); }}>Archive</button>
              </div>
            </div>
            <div>
              <div style={small}>Unarchive a team member</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:8 }}>
                <select value={teamUnarchiveId} onChange={e=>setTeamUnarchiveId(e.target.value)}>
                  {(Array.isArray(archivedTeamMembers)?archivedTeamMembers:[]).map(m => <option key={m.id||m.name} value={m.id||m.name}>{m.name||m.username}</option>)}
                </select>
                <button type="button" style={btn} onClick={()=>{ const id=String(teamUnarchiveId||""); if(!id) return; if (typeof unarchiveTeamMemberById==="function") unarchiveTeamMemberById(id); else unarchiveTeamMemberLocal(id); }}>Unarchive</button>
              </div>
            </div>
          </div>
        </div>

        {/* Create Team Member */}
        <div>
          <div style={{ fontWeight:700, marginBottom:6 }}>Create Team Member</div>
          <div style={{ display:"grid", gridTemplateColumns:"96px 1fr", gap:12, alignItems:"center" }}>
            <div style={{ width:84, height:84, borderRadius:12, border:"1px dashed #e5e7eb", display:"grid", placeItems:"center", background:"#f3f4f6" }}>
              {newAvatar ? <img src={newAvatar} alt="avatar" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:12}}/> : <div style={{ color:"#6b7280" }}>img</div>}
            </div>
            <div style={{ display:"grid", gap:8 }}>
              <div>
                <label style={small}>Display name (required)</label>
                <input style={input} value={newName} onChange={e=>setNewName(e.target.value)} placeholder="e.g., Jordan Carter"/>
              </div>
              <div>
                <label style={small}>Email (required)</label>
                <input style={input} value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="name@example.com"/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <div>
                  <label style={small}>Role</label>
                  <select style={input} value={newRole} onChange={e=>setNewRole(e.target.value)}>
                    <option>Admin</option>
                    <option>Manager</option>
                    
                    <option>Member</option><option>QA</option>
                  </select>
                </div>
                <div>
                  <label style={small}>Avatar</label>
                  <input type="file" accept="image/*" onChange={onAvatar}/>
                </div>
              </div>
              <div>
                <label style={small}>Permissions</label>
                <div style={{ display:"grid", gap:6, padding:"8px 6px" }}>
                  {["manage_personas","manage_users","view_history","send_messages"].map(k => (
                    <label key={k} style={{ display:"flex", alignItems:"center", gap:8, fontSize:14, color:"#111827" }}>
                      <input type="checkbox" checked={newPerms.includes(k)} onChange={()=>togglePerm(k)} />
                      <span style={{ textTransform:"capitalize" }}>{k.replace("_"," ")}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <button style={btn} onClick={createMember} type="button">Create</button>
              </div>
            </div>
          </div>
        </div>

        {/* Manage member (update role / remove) */}
        <div>
          <div style={small}>Manage member</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 160px 160px auto", gap:8, alignItems:"center" }}>
            <select id="memberSelect">
              {(Array.isArray(team)?team:[]).map((m,i)=> <option key={i} value={i}>{m?.name || ("member "+i)}</option>)}
            </select>
            <select id="memberRoleSelect" defaultValue={(Array.isArray(team)?team[0]?.role:"member")||"member"}>
              {Array.from(new Set((Array.isArray(team)?team:[]).map(m=>m.role||"member").concat(["owner","manager","QA","member"])))
                .map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select id="memberActionSelect" defaultValue="updateRole">
              <option value="updateRole">Update role</option>
              <option value="remove">Remove</option>
            </select>
            <button
              type="button"
              style={btn}
              onClick={()=>{
                const idx = Number((document.getElementById("memberSelect")||{}).value||0);
                const action = (document.getElementById("memberActionSelect")||{}).value || "updateRole";
                const role = (document.getElementById("memberRoleSelect")||{}).value || "member";
                setTeam(prev => {
                  const list = Array.isArray(prev)?prev.slice():[];
                  if(!(idx>=0 && idx<list.length)) return prev;
                  if(action === "remove"){
                    list.splice(idx,1);
                  }else{
                    list[idx] = { ...list[idx], role };
                  }
                  return list;
                });
              }}
            >Apply</button>
          </div>
        </div>

        {/* Role → Tab access matrix */}
        <RoleTabMatrix team={team} />
        <AdminDailyGoalsCard team={team} personas={personas} />
      </div>
    </div>
  </div>
);
;
;
;
}

function CardBoundary({ label="Card Error", children }){
  return <ErrorBoundary label={label}>{children}</ErrorBoundary>;
}


// === Bio Modal (full-screen) ===
function BioModal({ name="", text="", onClose }){
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose && onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const stop = (e) => e.stopPropagation();

  return (
    <div role="dialog" aria-modal="true" onClick={onClose}
         style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }}>
      <div onClick={stop} style={{ width:"min(900px, 92vw)", maxHeight:"80vh", background:"#fff", borderRadius:12, padding:16, display:"flex", flexDirection:"column", boxShadow:"0 10px 30px rgba(0,0,0,.25)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <div style={{ fontWeight:700, fontSize:18 }}>{name || "Full Bio"}</div>
          <button onClick={onClose} style={{ border:"1px solid #e5e7eb", borderRadius:8, background:"#fff", padding:"6px 10px", cursor:"pointer" }}>Close</button>
        </div>
        <div style={{ flex:"1 1 auto", overflow:"auto", border:"1px solid #e5e7eb", borderRadius:8, padding:12, fontSize:14, lineHeight:1.5, background:"#fafafa", whiteSpace:"pre-wrap" }}>
          {String(text||"")}
        </div>
      </div>
    </div>
  );
}

// ---------- AI Behavior Controls (Owner/Manager only) ----------
function clamp(n, min, max){ n=Number(n||0); if(n<min) return min; if(n>max) return max; return n; }
function fromTonePreset(toneArr){
  const base = { toneIntensity:50, energy:50, confidence:50, emojiDensity:1, responseLength:120 };
  const set = new Set((toneArr||[]).map(s=>String(s).trim()));
  if (set.has("Playful")) { base.emojiDensity += 1; base.responseLength = 100; }
  if (set.has("Flirty"))  { base.toneIntensity += 15; base.emojiDensity += 1; }
  if (set.has("Confident")) { base.confidence += 20; }
  if (set.has("Witty")) { base.responseLength = 110; }
  if (set.has("Empathetic")) { base.toneIntensity += 10; base.energy -= 5; }
  if (set.has("Mysterious")) { base.responseLength = 80; base.emojiDensity = Math.max(0, base.emojiDensity-1); }
  return {
    toneIntensity: clamp(base.toneIntensity,0,100),
    energy: clamp(base.energy,0,100),
    confidence: clamp(base.confidence,0,100),
    emojiDensity: clamp(base.emojiDensity,0,5),
    responseLength: clamp(base.responseLength,40,240)
  };
}

function AiBehaviorControls({ persona, onChange }){
  const readOnly = !isOwnerOrManager();
  const ab = (persona.aiBehavior || {});
  const [state, setState] = useState({
    toneIntensity: Number.isFinite(ab.toneIntensity) ? ab.toneIntensity : 50,
    energy: Number.isFinite(ab.energy) ? ab.energy : 50,
    confidence: Number.isFinite(ab.confidence) ? ab.confidence : 50,
    emojiDensity: Number.isFinite(ab.emojiDensity) ? ab.emojiDensity : 1,
    responseLength: Number.isFinite(ab.responseLength) ? ab.responseLength : 120
  });

  useEffect(()=>{ onChange && onChange(state); }, [state]);

  

  function applyFromChips(){
    const next = fromTonePreset(persona.tone || []);
    setState(next);
  }

  const row = { display:"grid", gridTemplateColumns:"1fr auto", alignItems:"center", gap:8, marginBottom:8 };
  const lbl = { ...smallText };
  const rng = { width:"100%" };

  return (
    <div style={{ border:"1px solid #e5e7eb", borderRadius:12, padding:12, marginTop:10, background:"#fff" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <label style={{ fontWeight:600 }}>AI Behavior</label>
        <button type="button" onClick={applyFromChips} style={subtleBtn} title="Load suggested defaults from Tone chips">Apply from chips</button>
      </div>
      <div style={row}><span style={lbl}>Tone intensity</span><input type="range" min="0" max="100" value={state.toneIntensity} onChange={e=>setState(s=>({...s, toneIntensity: clamp(e.target.value,0,100)}))} style={rng}/></div>
      <div style={row}><span style={lbl}>Energy</span><input type="range" min="0" max="100" value={state.energy} onChange={e=>setState(s=>({...s, energy: clamp(e.target.value,0,100)}))} style={rng}/></div>
      <div style={row}><span style={lbl}>Confidence</span><input type="range" min="0" max="100" value={state.confidence} onChange={e=>setState(s=>({...s, confidence: clamp(e.target.value,0,100)}))} style={rng}/></div>
      <div style={row}><span style={lbl}>Emoji density</span><input type="range" min="0" max="5" step="1" value={state.emojiDensity} onChange={e=>setState(s=>({...s, emojiDensity: clamp(e.target.value,0,5)}))} style={rng}/></div>
      <div style={row}><span style={lbl}>Avg response length (chars)</span><input type="range" min="40" max="240" step="10" value={state.responseLength} onChange={e=>setState(s=>({...s, responseLength: clamp(e.target.value,40,240)}))} style={rng}/></div>
      <div style={{ fontSize:12, color:"#6b7280", marginTop:6 }}>Saved per persona. Controls override tone chips at runtime.</div>
    </div>
  );
}
// ---------- End AI Behavior Controls ----------

export default function App(){
  const [tab,setTab]= useState("dashboard");
  const [bioModalIndex, setBioModalIndex] = useState(null);

  const topRef = useRef(null);
  useEffect(() => { window.scrollTo(0, 0); topRef.current?.scrollIntoView({ block: "start" }); }, [tab]);

  
  // ---- User Peek state ----
  const [showUserPeek, setShowUserPeek] = useState(false);
  const [peekUser, setPeekUser] = useState({ username: "", platform: "" });
  function openUserPeek(username, platform){
    try { /* remember focus */ } catch(_){}
    setPeekUser({ username: String(username||"").trim(), platform: String(platform||"").trim() });
    setShowUserPeek(true);
    try { logUI && logUI('user_peek','user_preview_opened', { username, platform, persona: replyPersona }); } catch(_){}
  }
// ---------- Personas ----------
  const defaultFavorites = { food:[], movies:[], tvShows:[], music:[], books:[], vacations:[], games:[], sports:[] };
  const defaultPersonas=[
    {id:uid(), name:"Nova Quinn", birthday:"", alias:"", bio:"", ethnicity:"", height:"", weightRange:"", measurements:"", cupSize:"",
      primaryColor:"#111111", secondaryColor:"#ff0055",
      affectionCues:[], signature:[], emojis:[], interests:[], favorites:{...defaultFavorites}, style:[], values:[], dosDonts:[], goals:[], fears:[], boundaries:[], tone:[],
      thumbnail:"", voice:"", handles:[], bioSaved:false, bioSavedAt:0, affiliateMarketing:{ text:"", locked:false, savedAt:0 } },
    {id:uid(), name:"Raven Rhynne", birthday:"", alias:"", bio:"", ethnicity:"", height:"", weightRange:"", measurements:"", cupSize:"",
      primaryColor:"#111111", secondaryColor:"#ff0055",
      affectionCues:[], signature:[], emojis:[], interests:[], favorites:{...defaultFavorites}, style:[], values:[], dosDonts:[], goals:[], fears:[], boundaries:[], tone:[],
      thumbnail:"", voice:"", handles:[], bioSaved:false, bioSavedAt:0, affiliateMarketing:{ text:"", locked:false, savedAt:0 } },
    {id:uid(), name:"Luna Voss", birthday:"", alias:"", bio:"", ethnicity:"", height:"", weightRange:"", measurements:"", cupSize:"",
      primaryColor:"#111111", secondaryColor:"#ff0055",
      affectionCues:[], signature:[], emojis:[], interests:[], favorites:{...defaultFavorites}, style:[], values:[], dosDonts:[], goals:[], fears:[], boundaries:[], tone:[],
      thumbnail:"", voice:"", handles:[], bioSaved:false, bioSavedAt:0, affiliateMarketing:{ text:"", locked:false, savedAt:0 } }
  ];
  function migratePersonas(list){
    return (list||[]).map(p=>{
      // favorites migration
      let fav;
      const tmpl = { ...defaultFavorites };
      if (Array.isArray(p.favorites)) {
        fav = { ...tmpl, food: p.favorites.slice() };
      } else if (p.favorites && typeof p.favorites === 'object') {
        fav = { ...tmpl };
        for (const k of Object.keys(tmpl)) fav[k] = Array.isArray(p.favorites[k]) ? p.favorites[k] : [];
      } else {
        fav = { ...tmpl };
      }
      return ({
        ...p,
        ethnicity:   p.ethnicity   ?? "",
        height:      p.height      ?? "",
        weightRange: p.weightRange ?? "",
        measurements:p.measurements?? "",
        cupSize:     p.cupSize     ?? "",
        primaryColor: p.primaryColor ?? "#111111",
        secondaryColor: p.secondaryColor ?? "#ff0055",
        
        archetype:   p.archetype   ?? "",
        affiliateMarketing: (typeof p.affiliateMarketing === 'object' && p.affiliateMarketing) ? p.affiliateMarketing : { text: '', locked: false, savedAt: 0 },
affectionCues: asArray(p.affectionCues),
        signature: asArray(p.signature),
        emojis: asArray(p.emojis),
        interests: asArray(p.interests),
        favorites: fav,
        style: asArray(p.style),
        values: asArray(p.values),
        dosDonts: asArray(p.dosDonts),
        goals: asArray(p.goals),
        fears: asArray(p.fears),
        boundaries: Array.from(new Set([...(asArray(p.boundaries)||[]), ...(MANDATORY_BOUNDARIES||[])])),
        tone: asArray(p.tone),
        handles: Array.isArray(p.handles)? p.handles : [],
        bioSaved: !!p.bioSaved,
        bioSavedAt: p.bioSavedAt || 0,
      });
    });
  }
  const [personas,setPersonas]=useState(migratePersonas(load("ptd_personas", defaultPersonas)));
  // Initialize Favorites hydration/sync engine
  useFavoritesHydrationAndSync(personas, setPersonas);
  // ---- Archive / Unarchive Personas (StrictMode-safe & normalized) ----
  function dedupeById(list){
    const seen = new Set();
    return (Array.isArray(list)?list:[]).filter(p => {
      const k = String(p?.id ?? "");
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  function archivePersonaById(id){
  try{ logDomain("persona_archive_requested",{ id:String(id) }); }catch{};
  setPersonas(prev => {
    const list = Array.isArray(prev) ? prev : [];
    const idx = list.findIndex(p => String(p?.id) === String(id));
    if (idx === -1) { try{ logDomain("persona_archive_failed",{ id:String(id) }); }catch{}; return prev; }
    const movedRaw = list[idx];
    const moved = typeof coercePersona === "function" ? coercePersona(movedRaw) : movedRaw;
    // push into archived at the same time we remove from active
    setArchivedPersonas(aprev => dedupeById([...(Array.isArray(aprev)?aprev:[]), moved]));
    try{ logDomain("persona_archive_succeeded",{ id:String(id), persona: moved?.name||"" }); }catch{};
    const next = list.slice(0, idx).concat(list.slice(idx+1));
    return next;
  });
}

  function unarchivePersonaById(id){
  try{ logDomain("persona_unarchive_requested",{ id:String(id) }); }catch{};
  setArchivedPersonas(prev => {
    const list = Array.isArray(prev) ? prev : [];
    const idx = list.findIndex(p => String(p?.id) === String(id));
    if (idx === -1) { try{ logDomain("persona_unarchive_failed",{ id:String(id) }); }catch{}; return prev; }
    const movedRaw = list[idx];
    const moved = typeof coercePersona === "function" ? coercePersona(movedRaw) : movedRaw;
    // push back into active personas
    setPersonas(pPrev => dedupeById([...(Array.isArray(pPrev)?pPrev:[]), moved]));
    try{ logDomain("persona_unarchive_succeeded",{ id:String(id), persona: moved?.name||"" }); }catch{};
    const next = list.slice(0, idx).concat(list.slice(idx+1));
    return next;
  });
}

// Archived personas state + persistence
  const [archivedPersonas, setArchivedPersonas] = useState((() => {
    try { return JSON.parse(localStorage.getItem("ptd_personas_archived") || "[]"); } catch { return []; }
  })());
  useEffect(() => {
    try { localStorage.setItem("ptd_personas_archived", JSON.stringify(archivedPersonas)); } catch {}
  }, [archivedPersonas]);


  // ---- Patch B: watch personas for adds/removes/updates ----
  const __prevPersonasRef = React.useRef([]);
  React.useEffect(() => {
    try {
      const prev = __prevPersonasRef.current || [];
      const cur = personas || [];
      const byId = Object.fromEntries(cur.map(p => [p.id, p]));
      const prevById = Object.fromEntries(prev.map(p => [p.id, p]));
      for (const p of cur) {
        if (!prevById[p.id]) {
          logDomain("persona_added", { persona: p.name || "", id: p.id });
        } else {
          const before = prevById[p.id];
          const changed = [];
          for (const k of ["name","bioSaved","bioSavedAt","primaryColor","secondaryColor","thumbnail"]) {
            if ((before?.[k] ?? null) !== (p?.[k] ?? null)) changed.push(k);
          }
          if (changed.length) {
            logDomain("persona_updated", { persona: p.name || "", id: p.id, fields: changed.join(",") });
          }
        }
      }
      for (const q of prev) {
        if (!byId[q.id]) logDomain("persona_removed", { persona: q.name || "", id: q.id });
      }
      __prevPersonasRef.current = cur;
    } catch {}
  }, [personas]);
  useEffect(()=>{ save("ptd_personas", personas); },[personas]);

  // One-time migration to fill missing keys
  useEffect(()=>{
    setPersonas(prev => prev.map(p => ({
      ...p,
      ethnicity:   p.ethnicity   ?? "",
      height:      p.height      ?? "",
      weightRange: p.weightRange ?? "",
      measurements:p.measurements?? "",
      cupSize:     p.cupSize     ?? "",
      primaryColor: p.primaryColor ?? "#111111",
      secondaryColor: p.secondaryColor ?? "#ff0055",
      
        archetype:   p.archetype   ?? "",
        affiliateMarketing: (typeof p.affiliateMarketing === 'object' && p.affiliateMarketing) ? p.affiliateMarketing : { text: '', locked: false, savedAt: 0 },
favorites: (()=>{
        const tmpl={ food:[], movies:[], tvShows:[], music:[], books:[], vacations:[], games:[], sports:[] };
        const f=p.favorites;
        if (Array.isArray(f)) return { ...tmpl, food: f.slice() };
        if (f && typeof f === 'object'){
          const out={ ...tmpl };
          for (const k of Object.keys(tmpl)) {
  const v = f[k];
  if (k === 'music') {
    // Legacy array -> treat as artists
    if (Array.isArray(f['music'])) out.music = { artists: f['music'].slice(), genres: [] };
    else if (v && typeof v === 'object') {
      out.music = {
        artists: Array.isArray(v.artists) ? v.artists : [],
        genres: Array.isArray(v.genres) ? v.genres : []
      };
    } else out.music = { artists: [], genres: [] };
  } else if (k === 'books') {
    if (Array.isArray(f['books'])) out.books = { titles: f['books'].slice(), authors: [] };
    else if (v && typeof v === 'object') {
      out.books = {
        titles: Array.isArray(v.titles) ? v.titles : [],
        authors: Array.isArray(v.authors) ? v.authors : []
      };
    } else out.books = { titles: [], authors: [] };
  } else if (k === 'actors') {
    out.actors = Array.isArray(f['actors']) ? f['actors'] : [];
  } else {
    out[k] = Array.isArray(v) ? v : [];
  }
}
          return out;
        }
        return tmpl;
      })(),
      bioSaved: !!p.bioSaved,
      bioSavedAt: p.bioSavedAt || 0,
    })));
  },[]);

  function updatePersona(id, patch, actorName) {
    setPersonas(prev => {
      const list = Array.isArray(prev) ? prev : [];
      const idx = list.findIndex(p => String(p.id) === String(id));
      if (idx === -1) return prev;
      const before = list[idx];
      const after = { ...before, ...patch };
      const next = list.slice();
      next[idx] = after;
      const changes = __diff(before, after);
      if (Object.keys(changes).length) {
        const fields = Object.keys(changes);
        logPersonaEvent("persona_updated", { id, name: after?.name || before?.name || "", fields, changes }, actorName);
      }
      return next;
    });
  }
  function lockBio(id){ setPersonas(prev => prev.map(p => p.id===id ? { ...p, bioSaved:true, bioSavedAt: Date.now() } : p)); }
  function unlockBio(id){ setPersonas(prev => prev.map(p => p.id===id ? { ...p, bioSaved:false } : p)); }
  function lockAffiliate(id){ setPersonas(prev => prev.map(p => p.id===id ? { ...p, affiliateMarketing: { ...(p.affiliateMarketing||{text:'',locked:false,savedAt:0}), locked:true, savedAt: Date.now() } } : p)); }
  function unlockAffiliate(id){ setPersonas(prev => prev.map(p => p.id===id ? { ...p, affiliateMarketing: { ...(p.affiliateMarketing||{text:'',locked:false,savedAt:0}), locked:false } } : p)); }

  
  function deletePersonaById(id, actorName){
    setPersonas(prev => {
      const list = Array.isArray(prev) ? prev : [];
      const victim = list.find(p => String(p?.id) === String(id));
      const next = list.filter(p => String(p?.id) !== String(id));
      if (victim) { try { logPersonaEvent("persona_deleted", { id:String(id), name: victim?.name||"" }, actorName); } catch {} }
      return next;
    });
  }
const personaNames=useMemo(()=>personas.map(p=>p.name),[personas]);
  const filePickers = useRef({});
  const triggerFile = (i)=>{ const el=filePickers.current[i]; if(el) el.click(); };
  const onFileChange=(i,e)=>{ const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ const c=[...personas]; c[i].thumbnail=r.result; setPersonas(c); try{ const p=c[i]; logDomain("persona_photo_upload",{ persona:p?.name||"", id:p?.id }, r.result); }catch{} }; r.readAsDataURL(f); e.target.value=""; };

  const voicePickers = useRef({});
  const triggerVoice = (i)=>{ const el=voicePickers.current[i]; if(el) el.click(); };
  const onVoiceChange=(i,e)=>{ const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ const c=[...personas]; c[i].voice=r.result; setPersonas(c); try{ const p=c[i]; logDomain("persona_voice_upload",{ persona:p?.name||"", id:p?.id }); }catch{} }; r.readAsDataURL(f); e.target.value=""; };

  const initials=(name="")=> name.split(" ").filter(Boolean).map(s=>s[0]).join("").slice(0,2).toUpperCase();
  const [handleDraft, setHandleDraft] = useState({});

  // ---------- Drag & Drop (Personas & Team) ----------
  const dragIndex = useRef(null);
  const [dragType,setDragType] = useState("");
  const [hoverIndex,setHoverIndex] = useState(-1);
  function dragStart(type, idx){ setDragType(type); dragIndex.current=idx; }
  function onDragOverCard(e){ e.preventDefault(); e.dataTransfer.dropEffect='move'; }
  function onDropCard(type, idx){
    const from=dragIndex.current; if(from===null) return;
    if(type==='persona'){ setPersonas(prev=> reorder(prev, from, idx)); }
    if(type==='team'){ setTeam(prev=> reorder(prev, from, idx)); }
    dragIndex.current=null; setHoverIndex(-1); setDragType("");
  }
  function resetDrag(){ dragIndex.current=null; setHoverIndex(-1); setDragType(""); }

  // ---------- Team ----------
  const defaultTeam=[
    {id:uid(), name:"Jarrett", role:"owner", personas:["Raven Rhynne","Nova Quinn"], lastSeen:Date.now()},
    {id:uid(), name:"Alex", role:"QA", personas:["Nova Quinn"], lastSeen:0},
    {id:uid(), name:"Ava", role:"member", personas:["Luna Voss"], lastSeen:0}
  ];
  const [team,setTeam]=useState(load("ptd_team", defaultTeam));

  // ---- Patch B: watch team for membership/persona assignment changes ----
  const __prevTeamRef = React.useRef([]);
  React.useEffect(() => {
    try {
      const prev = __prevTeamRef.current || [];
      const cur = team || [];
      const byName = Object.fromEntries(cur.map(m => [m.name, m]));
      const prevByName = Object.fromEntries(prev.map(m => [m.name, m]));
      for (const m of cur) {
        const p = prevByName[m.name];
        if (!p) {
          logDomain("team_member_added", { name: m.name, role: m.role || "" });
          continue;
        }
        if (p.role !== m.role) logDomain("team_member_role_changed", { name: m.name, from: p.role || "", to: m.role || "" });
        const prevSet = new Set(p.personas || []);
        const curSet = new Set(m.personas || []);
        for (const x of curSet) if (!prevSet.has(x)) logDomain("team_member_persona_assigned", { name: m.name, persona: x });
        for (const x of prevSet) if (!curSet.has(x)) logDomain("team_member_persona_unassigned", { name: m.name, persona: x });
      }
      for (const p of prev) {
        if (!byName[p.name]) logDomain("team_member_removed", { name: p.name, role: p.role || "" });
      }
      __prevTeamRef.current = cur;
    } catch {}
  }, [team]);
  useEffect(()=>{ save("ptd_team", team); },[team]);
  useEffect(()=>{ if(team.some(m=>m.role==='handler')){ setTeam(prev=> prev.map(m=> m.role==='handler'?{...m, role:'QA'}:m)); } },[]);
  useEffect(()=>{ setTeam(prev => prev.some(m => m.name === 'You') ? prev.map(m => m.name === 'You' ? { ...m, name: 'Jarrett' } : m) : prev); },[]);
  const ownerName = useMemo(()=> (team.find(t=>t.role==='owner')?.name) || team[0]?.name || 'Jarrett', [team]);
  const you = useMemo(()=> team.find(t=> t.name === ownerName) || team[0], [team, ownerName]);
  const allowedPersonas = useMemo(() => (you?.personas || []).slice(), [team, you]);
  const assignedGlobal = useMemo(()=> new Set(team.flatMap(m=> m.personas || [])), [team]);

  // ---------- History ----------
  const [history,setHistory]=useState(load("ptd_history", []));
  const [historySearch, setHistorySearch] = useState("");
  useEffect(()=>{ save("ptd_history", history); },[history]);
  const log=(type,extra={})=> setHistory(h=>[...h,{id:uid(), ts:Date.now(), type, ...extra}])

  // ---- Persona history/audit helpers (v1) ----
  // Only record when someone other than the owner performs an action.
  const __actorName = () => (you?.name || ownerName || "unknown");
  const __shouldRecord = (actor) => String(actor || __actorName()) !== String(ownerName || "");
  const __diff = (a = {}, b = {}) => {
    try {
      const keys = new Set([...Object.keys(a||{}), ...Object.keys(b||{})]);
      const changes = {};
      for (const k of keys) {
        const va = a[k]; const vb = b[k];
        if (JSON.stringify(va) !== JSON.stringify(vb)) changes[k] = { from: va, to: vb };
      }
      return changes;
    } catch { return {}; }
  };
  const logPersonaEvent = (action, payload = {}, actor) => {
    try {
      const who = String(actor || __actorName());
      if (!__shouldRecord(who)) return; // skip self
      log(action, { ...payload, who });
    } catch {}
  };
  // ---------- Admin tab (create persona/team, settings) ----------
  const [adminPersona, setAdminPersona] = useState({ name: "", thumbnail: "" });
  const adminFilePicker = useRef(null);
  const triggerAdminFile = () => { if (adminFilePicker.current) adminFilePicker.current.click(); };
  const onAdminFileChange = (e) => {
    const f = e?.target?.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { try { setAdminPersona(prev => ({ ...prev, thumbnail: r.result })); } catch {} };
    try { r.readAsDataURL(f); } catch {}
    try { e.target.value = ""; } catch {}
  };
  function createPersonaFromAdmin(){
    const name = (adminPersona.name || "").trim();
    const thumbnail = adminPersona.thumbnail || "";
    if(!name || !thumbnail){ alert("Please provide both a name and a thumbnail."); return; }
    const p = coercePersona({
      id: uid(),
      name,
      thumbnail,
      primaryColor: "",
      secondaryColor: "",
      bio:"",
      affiliateMarketing: { text: "", locked: false, savedAt: 0 },
      tone: []
    });
    setPersonas(prev => [...prev, p]);
    try { logPersonaEvent("persona_created", { id: p.id, name }, __actorName()); } catch {}
    logDomain("persona_added", { persona: name, id: p.id, via: "admin" });
    setAdminPersona({ name: "", thumbnail: "" });
    // Jump to Personas and scroll to new card
    setTab("personas");
    setTimeout(()=>{
      try{
        const el = document.getElementById(`persona-card-${p.id}`);
        if (el) el.scrollIntoView({ behavior:"smooth", block:"center" });
      }catch(_){}
    }, 80);
  }

  const [adminMember, setAdminMember] = useState({ name:"", email:"", role:"member" });
  function createTeamMemberFromAdmin(){
    const name = (adminMember.name||"").trim();
    if(!name){ alert("Team member name is required."); return; }
    const role = adminMember.role || "member";
    const m = { id: uid(), name, role, personas: [], lastSeen: 0, email: (adminMember.email||"") };
    setTeam(prev => [...prev, m]);
    logDomain("team_member_added", { name, role });
    setAdminMember({ name:"", email:"", role:"member" });
    setTab("team");
  }

  const [settings, setSettings] = useState(load("ptd_settings", { supabaseUrl:"", supabaseAnonKey:"" }));
  useEffect(()=>{ save("ptd_settings", settings); }, [settings]);
  const [sbStatus, setSbStatus] = useState({ state:"idle", message:"" });
  async function testSupabase(){
    const url = (settings.supabaseUrl||"").trim();
    const key = (settings.supabaseAnonKey||"").trim();
    if(!url || !key){ setSbStatus({ state:"error", message:"Please enter URL and anon key." }); return; }
    setSbStatus({ state:"testing", message:"Testing..." });
    try{
      const resp = await fetch(url.replace(/\/$/, '') + "/rest/v1/", { method:"GET", headers: { apikey: key, Authorization: "Bearer " + key }});
      if(resp.ok){ setSbStatus({ state:"ok", message:"Connection OK" }); }
      else { setSbStatus({ state:"error", message: "HTTP " + resp.status }); }
    }catch(e){
      setSbStatus({ state:"error", message: (e && e.message) ? e.message : "Network error" });
    }
  }
;
  // ---- Patch A Helpers (final v3) ----
  const __uiCooldownMs = 900;
  const __uiLastRef = React.useRef({ ts: 0, key: "" });
  
function __summary(component, action, payload) {
  const base = `${component}:${action}`;
  try {
    const flat = {};
    for (const [k, v] of Object.entries(payload || {})) {
      if (k === "filters" && v && typeof v === "object") {
        const parts = [];
        for (const [fk, fv] of Object.entries(v)) {
          if (fv) parts.push(`${fk}=${String(fv)}`);
        }
        flat[k] = parts.length ? parts.join("; ") : "—";
      } else if (v && typeof v === "object") {
        flat[k] = Array.isArray(v) ? `[${v.length}]` : "{...}";
      } else {
        flat[k] = String(v ?? "");
      }
    }
    const preview = Object.entries(flat).slice(0, 4).map(([k, val]) => `${k}=${val}`).join(", ");
    return preview ? `${base} (${preview})` : base;
  } catch {
    return base;
  }
}
function logUI(component, action, payload = {}) {
    try {
      const now = Date.now();
      const key = JSON.stringify({ component, action, payload });
      if (__uiLastRef.current.key === key && (now - __uiLastRef.current.ts) < __uiCooldownMs) return;
      __uiLastRef.current = { ts: now, key };
      const type = `${component}_${action}`;
      const text = __summary(component, action, payload);
      log(type, { ui: { component, action, ...payload }, text, who: (you?.name || ownerName || 'system'), channel: 'ui' });
    } catch {}
  }
  function goTab(next){ try { logUI('tabs','tab_change',{ from: tab, to: next }); } catch {} setTab(next); }
  // ---- Patch B Helpers (domain logging) ----
  const __domCooldownMs = 700;
  const __domLastRef = React.useRef({ ts: 0, key: "" });
  
function __domSummary(type, extra = {}) {
  try {
    const kv = (o, keys) => keys
      .filter(k => o[k] !== undefined && o[k] !== "" && o[k] !== null)
      .map(k => `${k}=${String(o[k])}`).join(", ");

    if (type === "thread_created") {
      return `thread_created (${kv(extra, ["threadId","persona","channel","user"])})`;
    }
    if (type === "thread_locked") {
      return `thread_locked (${kv(extra, ["threadId","persona","channel","user"])})`;
    }
    if (type === "message_inbound_received" || type === "message_outbound_sent") {
      const base = kv(extra, ["threadId","persona","channel","user","from"]);
      const txt = (extra.text || "").trim();
      return txt ? `${type} (${base}) — ${txt}` : `${type} (${base})`;
    }

    if (type === "persona_added" || type === "persona_removed") {
      return `${type} (${kv(extra, ["persona","id"])})`;
    }
    if (type === "persona_updated") {
      return `${type} (${kv(extra, ["persona","fields"])})`;
    }
    if (type.startsWith("team_member_")) {
      return `${type} (${kv(extra, ["name","role","persona","from","to"])})`;
    }
    return type;
  } catch { return type; }
}
function logDomain(type, extra = {}, screenshot = null) {
  try {
    const now = Date.now();
    const key = JSON.stringify({ type, extra });
    if (__domLastRef.current.key === key && (now - __domLastRef.current.ts) < __domCooldownMs) return;
    __domLastRef.current = { ts: now, key };
    const message = __domSummary(type, extra);
    log(type, { ...extra, who: you?.name || ownerName, channel: "app", message, screenshot });
  } catch {}
}// ---------- Messages / Inbox ----------
  const [threads,setThreads]=useState(load("ptd_threads", []));

  // ---- Users tab state ----
// ---- Following tab state (complete + personas) ----
const [following, setFollowing] = useState(() => {
  let x = load("followingV1", []);
  if(!Array.isArray(x) || !x.length){
    try { const legacy = JSON.parse(localStorage.getItem("following")||"[]"); if(Array.isArray(legacy)) x = legacy; } catch(e){}
  }
  return Array.isArray(x) ? x : [];
});
const [followingQ, setFollowingQ] = useState("");
const [selFollowing, setSelFollowing] = useState(null);

const [prospects, setProspects] = useState(() => {
  const x = load("prospectsV1", []);
  return Array.isArray(x) ? x : [];
});
const [prospectQ, setProspectQ] = useState("");
const [expandedProspectId, setExpandedProspectId] = useState(null);

// Inline add for Following
const [followingFormOpen, setFollowingFormOpen] = useState(false);
const [followingForm, setFollowingForm] = useState({ platform: "X / Twitter", username: "" });
function resetFollowingForm(){ setFollowingForm({ platform: "X / Twitter", username: "" }); setFollowingFormOpen(false); }
function createFollowingFromForm(){
  const username = (followingForm.username||"").trim();
  if(!username) return;
  const platform = (followingForm.platform||"X / Twitter").trim();
  const next = [...(Array.isArray(following)?following:[]), { id: uid(), username, platform, tags: [], aligned: [], notes: "", personaIds: [] }];
  setFollowing(next); save("followingV1", next);
  logDomain("following_added", { username, platform, via: "inline_form" });
  resetFollowingForm();
}

// Global Aligned Interests option pool
const [alignedOpts, setAlignedOpts] = useState(() => {
  try { const x = load("alignedInterestOptionsV1", []); return Array.isArray(x) ? x : []; } catch(e){ return []; }
});
function persistAlignedOpts(next){
  try {
    const uniq = Array.from(new Set((next||[]).map(v => (v||"").trim()).filter(Boolean)));
    save("alignedInterestOptionsV1", uniq);
    setAlignedOpts(uniq);
  } catch(e) {}
}

// Prospecting Add form
const [prospectFormOpen, setProspectFormOpen] = useState(false);
const [prospectForm, setProspectForm] = useState({ platform: "X / Twitter", username: "", tags: [], aligned: [] });
function createProspectFromForm(){
  const username = (prospectForm.username||"").trim();
  if(!username) return;
  const platform = (prospectForm.platform||"X / Twitter").trim();
  const tags = Array.isArray(prospectForm.tags) ? prospectForm.tags : [];
  const aligned = Array.isArray(prospectForm.aligned) ? prospectForm.aligned : [];
  const p = { id: uid(), username, platform, status:"queued", tags, aligned };
  const next = [ ...(Array.isArray(prospects)?prospects:[]), p ];
  setProspects(next); save("prospectsV1", next);
  if (aligned && aligned.length) persistAlignedOpts([...(alignedOpts||[]), ...aligned]);
  setProspectForm({ platform: "X / Twitter", username: "", tags: [], aligned: [] });
  setProspectFormOpen(false);
  logDomain("prospect_added", { username, platform, tags, aligned });
}

// Filters

// ---- Following list filters ----

function isNeutralFilter(f){
  if(!f) return true;
  const a = Array.isArray(f.personas)&&f.personas.length===0;
  const b = Array.isArray(f.platforms)&&f.platforms.length===0;
  const c = Array.isArray(f.tags)&&f.tags.length===0;
  const d = (f.hasAligned===null || typeof f.hasAligned==="undefined");
  const e = (f.hasNotes===null || typeof f.hasNotes==="undefined");
  return a && b && c && d && e;
}
function filterCount(f){
  let n=0;
  if(Array.isArray(f?.personas)&&f.personas.length) n++;
  if(Array.isArray(f?.platforms)&&f.platforms.length) n++;
  if(Array.isArray(f?.tags)&&f.tags.length) n++;
  if(f?.hasAligned===true) n++;
  if(f?.hasNotes===true) n++;
  return n;
}
const [filterOpen, setFilterOpen] = useState(false);
const [filter, setFilter] = useState({ personas:[], platforms:[], tags:[], hasAligned:null, hasNotes:null });
function toggleIn(list, value){
  const arr = Array.isArray(list) ? list.slice() : [];
  const i = arr.indexOf(value);
  if(i>=0) arr.splice(i,1); else arr.push(value);
  return arr;
}

const filteredFollowing = useMemo(() => {
  const q = (followingQ||"").toLowerCase();
  const arr = Array.isArray(following) ? following : [];
  const selectedPlatforms = Array.isArray(filter.platforms) ? filter.platforms : [];
  const selectedTags = Array.isArray(filter.tags) ? filter.tags : [];
  const selectedPersonas = Array.isArray(filter.personas) ? filter.personas : [];
  const hasAligned = filter.hasAligned;
  const hasNotes = filter.hasNotes;

  function passesText(a){
    const s = ((a?.username||"") + " " + (a?.platform||"") + " " + (Array.isArray(a?.tags)?a.tags.join(" "):"")).toLowerCase();
    return !q || s.includes(q);
  }
  function passesPlatforms(a){
    if(!selectedPlatforms.length) return true;
    return selectedPlatforms.includes(a?.platform||"");
  }
  function passesTags(a){
    if(!selectedTags.length) return true;
    const t = Array.isArray(a?.tags) ? a.tags : (a?.type ? [a.type] : []);
    return t.some(x => selectedTags.includes(x));
  }
  function passesPersonas(a){
    if(!selectedPersonas.length) return true;
    const ids = Array.isArray(a?.personaIds) ? a.personaIds : [];
    return ids.some(id => selectedPersonas.includes(id));
  }
  function passesAligned(a){
    if(hasAligned===null || typeof hasAligned==="undefined") return true;
    const ok = Array.isArray(a?.aligned) && a.aligned.length>0;
    return hasAligned ? ok : !ok;
  }
  function passesNotes(a){
    if(hasNotes===null || typeof hasNotes==="undefined") return true;
    const ok = !!((a?.notes||"").trim());
    return hasNotes ? ok : !ok;
  }
  if(!q && isNeutralFilter(filter)) return arr;
  return arr.filter(a => passesText(a) && passesPlatforms(a) && passesTags(a) && passesPersonas(a) && passesAligned(a) && passesNotes(a));
}, [following, followingQ, filter]);
const filteredProspects = useMemo(() => {
  const q = (prospectQ||"").toLowerCase();
  const arr = Array.isArray(prospects) ? prospects : [];
  return arr.filter(a => {
    const s = ((a?.username||"") + " " + (a?.platform||"") + " " + (Array.isArray(a?.tags)?a.tags.join(" "):"") + " " + (a?.status||"")).toLowerCase();
    return !q || s.includes(q);
  });
}, [prospects, prospectQ]);

  const SPEND_FLAGS = ["First Time","Regular Contact","Time Waster","Subscriber","Tipper","Big Spender","Whale"];
  const [userQ, setUserQ] = React.useState("");
  const manualUsersKey = "manualUsersV1";
  const [manualUsers, setManualUsers] = React.useState(()=>{
    try { return JSON.parse(localStorage.getItem(manualUsersKey)||"[]"); } catch { return []; }
  });
  const allUsers = React.useMemo(()=>{
    const map = new Map();
    const add = (username, platform, note)=>{
      if (!username) return;
      const plat = platform || "app";
      const id = `${plat}::${username}`;
      if (!map.has(id)) map.set(id, { id, username, platform: plat, note });
    };
    (threads||[]).forEach(t=> add(t.customer||"", t.channel||"app", t.note));
    for (const mu of manualUsers) add(mu.username, mu.platform);
    return Array.from(map.values());
  }, [threads, manualUsers]);
  // Users existence helper (build-agnostic)
  function userExistsByPlatform(platform, username){
    try{
      const plat = (platform||"app").trim();
      const name = (username||"").trim();
      if (!name) return false;
      // manualUsers: authoritative list for pre-registration
      if (Array.isArray(manualUsers)){
        for (const u of manualUsers){
          if ((u.platform||"app")===plat && String(u.username||"").toLowerCase()===name.toLowerCase()){
            return true;
          }
        }
      }
      // also allow any prior threads to count as "known"
      if (Array.isArray(allUsers)){
        for (const u of allUsers){
          if ((u.platform||"app")===plat && String(u.username||"").toLowerCase()===name.toLowerCase()){
            return true;
          }
        }
      }
      return false;
    }catch{ return false; }
  }

  const filteredUsers = React.useMemo(()=> allUsers.filter(u => (u.username||"").toLowerCase().includes(userQ.toLowerCase()) || (u.platform||"").toLowerCase().includes(userQ.toLowerCase())), [allUsers, userQ]);
  const [selUser, setSelUser] = React.useState(null);
  React.useEffect(()=>{ if (!selUser && filteredUsers.length) setSelUser(filteredUsers[0]); }, [filteredUsers, selUser]);
  const userFlagsKey = "userSpendFlagsV1";
  const [userFlags, setUserFlags] = React.useState(()=>{ try { return JSON.parse(localStorage.getItem(userFlagsKey)||"{}"); } catch { return {}; } });
  function persistFlags(next){ setUserFlags(next); try { localStorage.setItem(userFlagsKey, JSON.stringify(next)); } catch {} }
  function toggleFlag(user, flag){
    const arr = Array.from(new Set([...(userFlags[user.id]||[])]));
    const i = arr.indexOf(flag);
    if (i>-1) { arr.splice(i,1); logDomain("user_flag_removed", { userId:user.id, flag }); }
    else { arr.push(flag); logDomain("user_flag_added", { userId:user.id, flag }); }
    persistFlags({ ...userFlags, [user.id]: arr });
  }
  function getLinked(user){
    try { return JSON.parse(localStorage.getItem("links_"+user.id)||"[]"); } catch { return []; }
  }
  function confirmLink(user, sug){
    const key = "links_"+user.id;
    const prev = getLinked(user);
    const next = [...prev, { platform: sug.platform, username: sug.username }];
    try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
    setLinksNonce(n=>n+1);
    logDomain("user_link_confirmed", { userId:user.id, platform: sug.platform, username: sug.username, score: sug.score });
  }
  function dismissLink(user, sug){
    setLinksNonce(n=>n+1);
    logDomain("user_link_dismissed", { userId:user.id, platform: sug.platform, username: sug.username, score: sug.score });
 
function unlinkLink(user, id){
  const key = "links_"+user.id;
  const prev = getLinked(user);
  const next = (prev||[]).filter(x => !(String(x.platform).toLowerCase()===String(id.platform).toLowerCase() && String(x.username||"").toLowerCase()===String(id.username||"").toLowerCase()));
  try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
  setLinksNonce(n=>n+1);
                logDomain("user_link_removed", { userId:user.id, platform:id.platform, username:id.username });
}
 }
  function addUserLink(){ logUI("users","open_link_modal",{}); } // stub
  // addManualUser removed; replaced by form workflow
  const [userNotes, setUserNotes] = React.useState("");
  const notesKey = "userNotesV1";
  const [notesMap, setNotesMap] = React.useState(()=>{ try { return JSON.parse(localStorage.getItem(notesKey)||"{}"); } catch { return {}; } });
  const [generatedSummary, setGeneratedSummary] = React.useState("");
  function persistNotes(next){ setNotesMap(next); try { localStorage.setItem(notesKey, JSON.stringify(next)); } catch {} }
  function addNote(){
    if (!selUser) return;
    const textVal = (userNotes||"").trim();
    if (!textVal) return;
    const entry = { ts: Date.now(), text: textVal };
    const prev = (notesMap[selUser.id]||[]);
    const next = { ...notesMap, [selUser.id]: [...prev, entry] };
    persistNotes(next);
    setUserNotes("");
    logDomain("user_note_added", { userId: selUser.id, len: textVal.length });
  }
  function formatTs(ts){ try { return new Date(ts).toLocaleString(); } catch(e) { return String(ts); } }
  function summarizeNotes(arr){
    if (!arr || !arr.length) return "No notes yet.";
    const all = arr.map(n=>n.text).join(" ");
    const words = (all.toLowerCase().match(/[a-z0-9@#]+/g) || []);
    const stop = new Set("the a an and or for with about from this that to of on in is are be as at it we you your our their was were had have has not".split(" "));
    const freq = {};
    for (const w of words) { if (!stop.has(w) && w.length>2) freq[w]=(freq[w]||0)+1; }
    const top = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([w])=>w);
    const latest = arr[arr.length-1];
    return `Top topics: ${top.join(", ")}. Latest: "${(latest?.text||"").slice(0,160)}${(latest?.text||"").length>160?"…":""}"`;
  }
  function createSummary(){
    if (!selUser) return;
    const arr = (notesMap[selUser.id]||[]);
    const s = summarizeNotes(arr);
    setGeneratedSummary(s);
    logDomain("user_notes_summarized", { userId: selUser.id, count: arr.length, summaryLen: s.length });
  }
  const [linksNonce, setLinksNonce] = React.useState(0);


  const linkSuggestions = React.useMemo(()=>{
    if (!selUser) return [];
    const base = selUser.username.replace(/[^a-z0-9]/ig, "").toLowerCase();
    return allUsers
      .filter(u=>u.id!==selUser.id)
      .map(u=>({ username:u.username, platform:u.platform||"app", score: u.username.replace(/[^a-z0-9]/ig,"").toLowerCase()===base ? 0.86 : 0.55 }))
      .filter(s=>s.score>0.6)
      .filter(s => !((getLinked(selUser)||[]).some(l => (l.platform===s.platform && String(l.username||'').toLowerCase()===String(s.username||'').toLowerCase())))).slice(0,3);
  }, [selUser, allUsers, linksNonce]);

  // Add User form state (replaces prompts)
  const [addUserOpen, setAddUserOpen] = React.useState(false);
  const [newUsername, setNewUsername] = React.useState("");
  const PLATFORM_OPTIONS = React.useMemo(()=>{
    const seen = new Set((threads||[]).map(t=>t.channel).filter(Boolean));
    const base = ["X / Twitter","Instagram","Facebook","SMS","WhatsApp","Telegram","Email","Web"];
    const out = [...new Set([...(Array.from(seen)||[]), ...base])].filter(Boolean);
    return out;
  }, [threads]);
  const [newUserPlatform, setNewUserPlatform] = React.useState("X / Twitter");
  function openAddUser(){ setAddUserOpen(true); setNewUsername(""); setNewUserPlatform(PLATFORM_OPTIONS[0]||"X / Twitter"); }
  function cancelAddUser(){ setAddUserOpen(false); }
  function createManualUser(){
    const username = (newUsername||"").trim();
    if (!username) return alert("Please enter a username.");
    const platform = newUserPlatform || "app";
    const next = [...manualUsers, { username, platform }];
    setManualUsers(next);
    try { localStorage.setItem(manualUsersKey, JSON.stringify(next)); } catch {}
    logDomain("user_added_manual", { username, platform });
    setAddUserOpen(false);
    // refresh selection to new user
    setSelUser({ id: `${platform}::${username}`, username, platform });
  }

  
  
  
  
  
  // ---- Patch B2f: watch threads (inbound only) + created/locked ----
  const __prevThreadsRef = React.useRef({});
  const __threadEmitRef = React.useRef({ created: new Set(), locked: new Set() });

  React.useEffect(() => {
    try {
      const prev = __prevThreadsRef.current || {};
      const curMap = {};
      const S = __threadEmitRef.current;

      for (const t of (threads || [])) {
        const id = t.id;
        const count = Array.isArray(t.messages) ? t.messages.length : 0;

        // thread_created — once
        if (!prev[id] && !S.created.has(id)) {
          logDomain("thread_created", {
            threadId: id,
            persona: t.replyPersona || "",
            channel: t.channel || "",
            user: t.customer || ""
          });
          S.created.add(id);
        }

        // inbound only: emit for the newest message if direction === "in"
        const prevCount = (prev[id]?.len || 0);
        if (count > prevCount) {
          const m = (t.messages || [])[count - 1] || null;
          if (m && m.direction === "in") {
            logDomain("message_inbound_received", {
              threadId: id,
              persona: t.replyPersona || "",
              channel: t.channel || "",
              user: t.customer || "",
              from: m?.from || "",
              text: (m?.text || "").slice(0, 140)
            });
          }
        }

        // thread_locked — first transition only
        if (!!t.locked && !prev[id]?.locked && !S.locked.has(id)) {
          logDomain("thread_locked", {
            threadId: id,
            persona: t.replyPersona || "",
            channel: t.channel || "",
            user: t.customer || ""
          });
          S.locked.add(id);
        }

        curMap[id] = { len: count, locked: !!t.locked };
      }
      __prevThreadsRef.current = curMap;
    } catch {}
  }, [threads]);

  const [selected,setSelected]=useState(threads[0]?.id||"");
  const [checked,setChecked]=useState({});

  const [replyPersona,setReplyPersona]=useState(allowedPersonas[0]||"");
  const [channel,setChannel]=useState(CHANNEL_CHOICES[0]);
  const [customer,setCustomer]=useState("");
  // Patch B2f: emit outbound once per action (prevents duplicates)
  const __outSigRef = React.useRef({});
  const __sendGateRef = React.useRef({ ts: 0 });
  function __gateSend(){ const now=Date.now(); if ((now - (__sendGateRef.current.ts||0)) < 900) return false; __sendGateRef.current.ts = now; return true; }
  function emitOutboundOnce(threadId, persona, channel, user, from, text){
    try{
      const sig = (from||"") + "|" + (text||"");
      const last = __outSigRef.current[threadId] || { sig:"", ts:0 };
      const now = Date.now();
      if (last.sig === sig && (now - last.ts) < 2500) return; // suppress rapid duplicates
      logDomain("message_outbound_sent", { threadId, persona, channel, user, from, text: (text||"").slice(0,140) });
      __outSigRef.current[threadId] = { sig, ts: now };
    }catch{}
  }
    const [showPersonaPeek,setShowPersonaPeek]=useState(false);
  
  const [peekPersonaName,setPeekPersonaName]=useState("");
  // __PEEK_PORTAL__ — render modal as a portal with scroll lock + Esc handling
  const personaToPeek = useMemo(() => personas.find(pp => (pp.name||"") === (peekPersonaName||"")) || null, [personas, peekPersonaName]);
  const peekTriggerEl = useRef(null);
  useEffect(() => {
    // track the last focused element that opened the modal (if a link/button calls openPersonaPeek, set peekTriggerEl.current there)
    if (showPersonaPeek && !peekTriggerEl.current) {
      try { peekTriggerEl.current = document.activeElement; } catch(_) {}
    }
  }, [showPersonaPeek]);

  useEffect(() => {
    if (!showPersonaPeek) return;
    // Create root container
    const host = document.createElement("div");
    host.setAttribute("id", "persona-peek-root");
    document.body.appendChild(host);
    // Scroll lock (both html & body)
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    // Global Esc handlers (capture) && wheel/touch blockers for background
    const onKey = (e) => {
      const k = e.key || e.code;
      if (k === "Escape" || k === "Esc" || e.keyCode === 27) {
        e.preventDefault(); e.stopPropagation();
        setShowPersonaPeek(false);
      }
    };
    const blockScroll = (e) => {
      // If event target is outside our modal card, block
      const hostEl = host;
      if (!hostEl) return;
      const card = hostEl.querySelector("[role='dialog'] > div");
      if (card && ! (card.contains(e.target))) {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);
    window.addEventListener("wheel", blockScroll, { passive: false });
    window.addEventListener("touchmove", blockScroll, { passive: false });

    // Mount React root
    const root = createRoot(host);
    const handleClose = () => { logUI('persona_peek','modal_close',{ persona: personaToPeek?.name || '' }); setShowPersonaPeek(false); };
    const handleOpenInTab = () => {
      try { onCloseCleanup(); } catch(_) {}
      openPersonaInTab();
      setShowPersonaPeek(false);
    };
    root.render(
      React.createElement(PersonaPeekModal, {
        persona: personaToPeek,
        onClose: handleClose,
        onOpenInTab: handleOpenInTab
      })
    );

    function onCloseCleanup(){
      // Restore scroll + remove listeners
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKey, true);
      window.removeEventListener("wheel", blockScroll);
      window.removeEventListener("touchmove", blockScroll);
      try { root.unmount(); } catch(_) {}
      try { host.remove(); } catch(_) {}
      // Restore focus to trigger if possible
      try { peekTriggerEl.current && typeof peekTriggerEl.current.focus === "function" && peekTriggerEl.current.focus(); } catch(_) {}
      // Clear trigger ref for next time
      peekTriggerEl.current = null;
    }

    // Cleanup when showPersonaPeek flips false || component unmounts
    return () => { onCloseCleanup(); };
  }, [showPersonaPeek, personaToPeek]);

  function openPersonaPeek(name){ try{ /* remember trigger */ }catch(_){} setPeekPersonaName(name||""); setShowPersonaPeek(true); }
  function openPersonaInTab(){
    setTab("personas");
    setTimeout(()=>{
      const p = personas.find(pp=> (pp.name||"")===peekPersonaName);
      const el = p ? document.getElementById(`persona-card-${p.id}`) : null;
      if(el) el.scrollIntoView({behavior:"smooth", block:"center"});
    }, 50);
  }
const [tagSel,setTagSel]=useState("First Contact");
  const [tagDetail,setTagDetail]=useState("");
  const [outreachDraft,setOutreachDraft]=useState("");
  const [outreachPersona,setOutreachPersona]=useState(allowedPersonas[0]||"");
  const [outreachChannel,setOutreachChannel]=useState(CHANNEL_CHOICES[0]);
  const [outreachCustomer,setOutreachCustomer]=useState("");
  const [showNew,setShowNew]=useState(false);
  const [newPersona,setNewPersona]=useState(allowedPersonas[0]||"");
  const [newChannel,setNewChannel]=useState(CHANNEL_CHOICES[0]);
  const [newCustomer,setNewCustomer]=useState("");
  const [firstMsg,setFirstMsg]=useState("");
  const [replyDraft,setReplyDraft]=useState("")
  
  
  // Personas tab — search/sort controls state
  const [personaQ, setPersonaQ] = useState("");
  const [personaSort, setPersonaSort] = useState("az"); // az | za | recent | created
  const [personaActiveOnly, setPersonaActiveOnly] = useState(false);

  // Derived, memoized list for personas grid
  const filteredPersonas = useMemo(() => {
    const q = (personaQ || "").trim().toLowerCase();
    const list = Array.isArray(personas) ? personas.slice() : [];
    const byQuery = q
      ? list.filter(p => {
          const name = String(p?.name||"").toLowerCase();
          const alias = String(p?.alias||"").toLowerCase();
          return name.includes(q) || alias.includes(q);
        })
      : list;
    const byActive = personaActiveOnly ? byQuery.filter(p => !(p?.archived === true)) : byQuery;

    const cmp = (a,b) => (String(a?.name||"").localeCompare(String(b?.name||"")));
    if (personaSort === "az") byActive.sort(cmp);
    else if (personaSort === "za") byActive.sort((a,b)=> -cmp(a,b));
    else if (personaSort === "recent") byActive.sort((a,b)=> (b?.updatedAt||b?.ts||0) - (a?.updatedAt||a?.ts||0));
    else if (personaSort === "created") byActive.sort((a,b)=> (a?.createdAt||0) - (b?.createdAt||0));

    return byActive;
  }, [personas, personaQ, personaSort, personaActiveOnly]);
const [isSending, setIsSending] = useState(false);
const [composerSender,setComposerSender]=useState("persona");
  const replyRef = useRef(null);
  const [recentEmojis,setRecentEmojis]=useState(load("ptd_recent_emojis", ["😊","🥰","😘","😉","😂","✨","🔥","💖","😍","😏","🙈","💋"]));
  useEffect(()=>{ save("ptd_recent_emojis", recentEmojis); },[recentEmojis]);

// ---- Suggested Responses (state + helpers) ----
const [suggestions, setSuggestions] = useState([]);
const MAX_SUGGESTIONS = 5;

function buildSuggestions(userText, personaName) {
  const p = (personas || []).find(pp => (pp.name || "") === personaName) || {};
  const cues = Array.isArray(p.affectionCues) ? p.affectionCues : [];
  const tones = Array.isArray(p.tone) ? p.tone : [];
  const favs  = (p.favorites && Array.isArray(p.favorites.food)) ? p.favorites.food : [];

  const firstWord = (userText || "").trim().split(/\s+/)[0] || "there";
  const softCue   = cues[0] ? `(${cues[0]}) ` : "";
  const toneTag   = tones[0] ? `(${tones[0]}) ` : "";
  const favLine   = favs[0] ? ` I’m craving ${favs[0]} lately…` : "";

  const out = [
    `${softCue}Hey ${firstWord}! That made me smile. Tell me more?`,
    `${toneTag}I like that energy—how’s your day going so far?`,
    `You’ve got me curious… what did you mean by “${(userText||"").slice(0,60)}”?`,
    `Haha I feel that.${favLine} What are you in the mood for tonight?`,
    `Wanna trade a secret for a secret? I’ll go first if you promise to share one too.`
  ].filter(Boolean);

  const uniq = Array.from(new Set(out)).slice(0, MAX_SUGGESTIONS);
  return uniq.length ? uniq : [`Got it! Want to tell me a bit more?`];
}

// Keep the original call site happy; generate & set suggestions
function triggerSuggestionsAfterUserSend(thread, userText) {
  const personaName = (thread?.replyPersona || replyPersona || "");
  const next = buildSuggestions(userText || "", personaName);
  setSuggestions(next);
}

// Rehydrate suggestions when switching threads
useEffect(() => {
  const lastUser = curThread?.messages?.slice().reverse().find(m => m.direction === "in")?.text || "";
  if (lastUser) {
    try { triggerSuggestionsAfterUserSend(curThread, lastUser); } catch(_) {}
  } else {
    setSuggestions([]);
  }
}, [selected]);

  const personaByName = useMemo(()=> Object.fromEntries(personas.map(p=>[p.name,p])), [personas]);
  const chitChatPresets = useMemo(()=>{
    const cues = personaByName[replyPersona]?.affectionCues || "";
    return asArray(cues);
  }, [personaByName, replyPersona]);
  const subOptions = useMemo(()=>{
    if(tagSel==="Chit Chat") return chitChatPresets;
    return [];
  }, [tagSel, chitChatPresets]);
  useEffect(()=>{ setTagDetail(prev=> subOptions.includes(prev)? prev : ""); }, [subOptions]);

  // --- History filters ---
  const [hfType, setHfType] = useState(() => { try { return localStorage.getItem("hfType") || ""; } catch { return ""; } });
  const [hfPersona, setHfPersona] = useState(() => { try { return localStorage.getItem("hfPersona") || ""; } catch { return ""; } });
  const [hfChannel, setHfChannel] = useState(() => { try { return localStorage.getItem("hfChannel") || ""; } catch { return ""; } });
  const [hfQ, setHfQ] = useState(() => { try { return localStorage.getItem("hfQ") || ""; } catch { return ""; } });
  const [hfWho, setHfWho] = useState(() => { try { return localStorage.getItem("hfWho") || ""; } catch { return ""; } });
  const [hfAudit, setHfAudit] = React.useState(false);
    const [hfUser, setHfUser] = useState(() => { try { return localStorage.getItem("hfUser") || ""; } catch { return ""; } });

  // Persist core history filters
  useEffect(() => { try { localStorage.setItem("hfType", hfType || ""); } catch {} }, [hfType]);
  useEffect(() => { try { localStorage.setItem("hfPersona", hfPersona || ""); } catch {} }, [hfPersona]);
  useEffect(() => { try { localStorage.setItem("hfChannel", hfChannel || ""); } catch {} }, [hfChannel]);
  useEffect(() => { try { localStorage.setItem("hfWho", hfWho || ""); } catch {} }, [hfWho]);
  useEffect(() => { try { localStorage.setItem("hfUser", hfUser || ""); } catch {} }, [hfUser]);
  useEffect(() => { try { localStorage.setItem("hfQ", hfQ || ""); } catch {} }, [hfQ]);
  const histTypes = useMemo(()=> Array.from(new Set(history.map(h=>h.type))), [history]);
  const histPersonas = useMemo(()=> Array.from(new Set(history.map(h=>h.persona).filter(Boolean))), [history]);
  const histChannels = useMemo(()=> Array.from(new Set(history.map(h=>h.channel).filter(Boolean))), [history]);
  const histWhos = useMemo(() => team.map(t => t.name), [team]);
  const histUsers = useMemo(()=> Array.from(new Set(history.map(h=>h.customer).filter(Boolean))), [history]);
  // ---- Patch A: Filters watcher (after filter state + persistence) ----
  const __prevFiltersRef = React.useRef(null);
  React.useEffect(() => {
    if (tab !== "history") return;
    const payload = {
      type: hfType || "", persona: hfPersona || "", channel: hfChannel || "",
      who: hfWho || "", user: hfUser || "", q: hfQ || ""
    };
    const prev = __prevFiltersRef.current;
    const same = prev
      && prev.type===payload.type && prev.persona===payload.persona
      && prev.channel===payload.channel && prev.who===payload.who
      && prev.user===payload.user && prev.q===payload.q;
    if (!same) {
      const isCleared = !payload.type && !payload.persona && !payload.channel && !payload.who && !payload.user && !payload.q;
      if (isCleared) logUI('history','history_filter_cleared',{});
      else           logUI('history','history_filter_applied',{ filters: payload });
      __prevFiltersRef.current = payload;
    }
  }, [tab, hfType, hfPersona, hfChannel, hfWho, hfUser, hfQ]);

  // --- History filtering helpers (defen

  // Date range filters (persisted)
  const [hfFrom, setHfFrom] = React.useState(() => {
    try { return localStorage.getItem("hfFrom") || ""; } catch { return ""; }
  });
  const [hfTo, setHfTo] = React.useState(() => {
    try { return localStorage.getItem("hfTo") || ""; } catch { return ""; }
  });
  React.useEffect(() => { try { localStorage.setItem("hfFrom", hfFrom || ""); } catch {} }, [hfFrom]);
  React.useEffect(() => { try { localStorage.setItem("hfTo", hfTo || ""); } catch {} }, [hfTo]);
  
  const __prevTabRef = React.useRef(tab);
  React.useEffect(() => {
    const prev = __prevTabRef.current;
    if (tab === "history" && prev !== "history") __setTodayRange();
    __prevTabRef.current = tab;
  }, [tab]);

  React.useEffect(() => {
    try {
      const hasFrom = !!localStorage.getItem("hfFrom");
      const hasTo   = !!localStorage.getItem("hfTo");
      if (!hasFrom && !hasTo) __setTodayRange();
    } catch {}
  }, []);
// ---- Local date helpers ----
  function __ymdLocal(d = new Date()) {
    const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), da = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${da}`;
  }
  function __setTodayRange(){ const iso = __ymdLocal(new Date()); setHfFrom(iso); setHfTo(iso); }
  function __setLastNDays(n){
    const today = new Date();
    const to = __ymdLocal(today);
    const fromDate = new Date(today.getFullYear(), today.getMonth(), today.getDate()-(n-1));
    const from = __ymdLocal(fromDate);
    setHfFrom(from); setHfTo(to);
  }


  function tokenize(q) {
    return String(q || "")
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
  }
  function includesAll(hay, needles) {
    const s = String(hay || "").toLowerCase();
    return needles.every((n) => s.includes(n));
  }
  
// --- Robust field accessors (single source of truth) ---
function __norm(v){ return String(v ?? "").trim().toLowerCase(); }
function __stripParen(v){ return __norm(v).replace(/\s*\(.*\)$/, ""); }
function __firstTokenFromMessage(h){
  const m = String(h.text || h.message || "").toLowerCase().match(/^[a-z_]+/);
  return m ? m[0] : "";
}
function __getType(h){ 
  const t = __stripParen(h.type);
  return t || __firstTokenFromMessage(h);
}
function __getPersona(h){ return __stripParen(h.persona); }
function __getChannel(h){ return __stripParen(h.channel); }
function __getWho(h){ return __stripParen(h.who); }
function __getUser(h){ return __stripParen(h.user || h.customer); }
function selectFilteredHistory(historyArr, filters) {
  const parseLocalDate = (str) => {
    if (!str) return null;
    if (typeof str !== "string") {
      const d = new Date(str);
      return isNaN(d) ? null : d.getTime();
    }
    const s = str.trim();
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(+m[1], +m[2]-1, +m[3]).getTime();
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return new Date(+m[3], +m[1]-1, +m[2]).getTime();
    const d = new Date(s);
    return isNaN(d) ? null : d.getTime();
  };
  const fromMs = parseLocalDate(filters.from);
  let toMsInclusive = parseLocalDate(filters.to);
  if (toMsInclusive != null) {
    const end = new Date(toMsInclusive);
    if (end.getHours()===0 && end.getMinutes()===0 && end.getSeconds()===0 && end.getMilliseconds()===0) {
      toMsInclusive = end.getTime() + (24*60*60*1000 - 1);
    }
  }
  const tsMs = (raw) => {
    if (raw == null) return 0;
    if (typeof raw === "number") return raw < 1e12 ? raw*1000 : raw;
    const s = String(raw).trim();
    if (/^\d+$/.test(s)) { const n = parseInt(s,10); return n < 1e12 ? n*1000 : n; }
    const d = new Date(s);
    return isNaN(d) ? 0 : d.getTime();
  };
  const norm = __norm;
  const stripParen = __stripParen;
  const fType    = stripParen(filters.type);
  const fPersona = stripParen(filters.persona);
  const fChannel = stripParen(filters.channel);
  const fWho     = stripParen(filters.who);
  const fUser    = stripParen(filters.user);
  const qTokens = tokenize(filters.q || "");
  const getUser = (h) => __getUser(h);
  const arr = Array.isArray(historyArr) ? historyArr : [];
  return arr.filter((h) => {
    const t = tsMs(h.ts ?? h.time ?? h.timestamp ?? 0);
    if (fromMs != null && t < fromMs) return false;
    if (toMsInclusive != null && t > toMsInclusive) return false;
    if (fType    && __getType(h)    !== fType)    return false;
    if (fPersona && __getPersona(h) !== fPersona) return false;
    if (fChannel && __getChannel(h) !== fChannel) return false;
    if (fWho     && __getWho(h)     !== fWho)     return false;
    if (fUser    && __getUser(h)!== fUser)    return false;
    if (qTokens.length) {
      const hay = [
        h.text || h.message || "",
        h.persona || "", h.channel || "",
        getUser(h) || "", h.type || "",
        h.category || "", h.sub || ""
      ].join(" ").toLowerCase();
      if (!includesAll(hay, qTokens)) return false;
    }
    return true;
  });
}
  const filteredHistory = React.useMemo(
    () =>
      selectFilteredHistory(history, { type: hfType,
        persona: hfPersona,
        channel: hfChannel,
        who: hfWho,
        user: hfUser,
        q: hfQ,
        from: hfFrom, to: hfTo }), [history, hfType, hfPersona, hfChannel, hfWho, hfUser, hfQ, hfFrom, hfTo]
  );
  // Base for facet counts (date + search only)
  const __facetBase = React.useMemo(
    () => selectFilteredHistory(history, { from: hfFrom, to: hfTo, q: hfQ, type:"", persona:"", channel:"", who:"", user:"" }),
    [history, hfFrom, hfTo, hfQ]
  );
  function safeCountBy(arr, fn) { try { return countBy(arr || [], fn); } catch(e) { console.error(e); return new Map(); } }
  const histTypeCounts    = React.useMemo(() => safeCountBy(__facetBase, (h) => __getType(h)), [__facetBase]);
  const histPersonaCounts = React.useMemo(() => safeCountBy(__facetBase, (h) => __getPersona(h)), [__facetBase]);
  const histChannelCounts = React.useMemo(() => safeCountBy(__facetBase, (h) => __getChannel(h)), [__facetBase]);
  const histWhoCounts     = React.useMemo(() => safeCountBy(__facetBase, (h) => __getWho(h)), [__facetBase]);
  const histUserCounts    = React.useMemo(() => safeCountBy(__facetBase, (h) => __getUser(h)), [__facetBase]);
  const histTypesSorted    = React.useMemo(() => Array.from(histTypeCounts.keys()).sort(),    [histTypeCounts]);
  const histPersonasSorted = React.useMemo(() => Array.from(histPersonaCounts.keys()).sort(), [histPersonaCounts]);
  const histChannelsSorted = React.useMemo(() => Array.from(histChannelCounts.keys()).sort(), [histChannelCounts]);
  const histWhosSorted     = React.useMemo(() => Array.from(histWhoCounts.keys()).sort(),     [histWhoCounts]);
  const histUsersSorted    = React.useMemo(() => Array.from(histUserCounts.keys()).sort(),    [histUserCounts]);

  // === History Sort (restored) ===
  const [histSortKey, setHistSortKey] = React.useState("ts");
  const [histSortDir, setHistSortDir] = React.useState("desc");

  // ---- Patch A: Sort watcher (after sort state) ----
  const __prevSortRef = React.useRef({ key: null, dir: null });
  React.useEffect(() => {
    if (tab !== "history") return;
    const cur = { key: histSortKey, dir: histSortDir };
    const prev = __prevSortRef.current || {};
    if (cur.key !== prev.key || cur.dir !== prev.dir) {
      if (cur.key && cur.dir) logUI('history','history_sort_set', cur);
      __prevSortRef.current = cur;
    }
  }, [tab, histSortKey, histSortDir]);

  function __histField(h, k) {
    switch (k) {
      case "ts": return new Date(h.ts || h.time || 0).getTime() || 0;
      case "type": return (h.type || "").toString().toLowerCase();
      case "persona": return (h.persona || "").toString().toLowerCase();
      case "channel": return (h.channel || "").toString().toLowerCase();
      case "who": return (h.who || "").toString().toLowerCase();
      case "user": return (h.user || h.customer || "").toString().toLowerCase();
      case "message": return (h.text || h.message || "").toString().toLowerCase();
      default: return "";
    }
  }

  const sortedHistory = React.useMemo(() => {
    const arr = ((filteredHistory) ?? []).slice();
    const dir = histSortDir === "asc" ? 1 : -1;
    arr.sort((a,b)=> {
      const av = __histField(a, histSortKey);
      const bv = __histField(b, histSortKey);
      if (av < bv) return -1 * dir;
      if (av > bv) return  1 * dir;
      // tie-breaker 1: timestamp desc by default so newest stays on top when equal
      const at = new Date(a.ts || a.time || 0).getTime() || 0;
      const bt = new Date(b.ts || b.time || 0).getTime() || 0;
      if (at !== bt) return (at < bt ? -1 : 1) * (histSortKey === "ts" ? dir : -1);
      // tie-breaker 2: id/name stable
      const aid = (a.id || a.user || a.persona || "").toString();
      const bid = (b.id || b.user || b.persona || "").toString();
      if (aid < bid) return -1;
      if (aid > bid) return  1;
      return 0;
    });
    return arr;
  }, [filteredHistory, histSortKey, histSortDir]);

  const SortHeader = ({label, k}) => {
    const active = histSortKey === k;
    const arrow = !active ? "↕" : (histSortDir === "asc" ? "↑" : "↓");
    return (
      <button
        type="button"
        onClick={()=>{
          if (active) setHistSortDir(d => (d === "asc" ? "desc" : "asc"));
          else { setHistSortKey(k); setHistSortDir("asc"); }
        }}
        style={{ background:"transparent", border:"none", padding:0, margin:0, cursor:"pointer", fontWeight:600 }}
        title={active ? `Sorted ${histSortDir}` : "Click to sort"}
      >
        <span>{label}</span>
        <span style={{ marginLeft:6, opacity:0.75 }}>{arrow}</span>
      </button>
    );
  };

  // Facets + counts (from full history; sorted A→Z)
  function countBy(arr, get) {
    const m = new Map();
    for (const it of arr || []) {
      const v = get(it);
      if (!v) continue;
      m.set(v, (m.get(v) || 0) + 1);
    }
    return m;
  }
  useEffect(()=>{ if(!allowedPersonas.includes(replyPersona)) setReplyPersona(allowedPersonas[0]||""); },[allowedPersonas]);
  useEffect(()=>{ if(!allowedPersonas.includes(outreachPersona)) setOutreachPersona(allowedPersonas[0]||""); },[allowedPersonas]);
  useEffect(()=>{ if(!allowedPersonas.includes(newPersona)) setNewPersona(allowedPersonas[0]||""); },[allowedPersonas]);
  useEffect(()=>{ save("ptd_threads", threads); },[threads]);
  const [showThreadId, setShowThreadId] = useState("");
  const tview = useMemo(()=> threads.find(t=> t.id===showThreadId) || null, [threads, showThreadId]);
  const curThread=useMemo(()=> threads.find(t=>t.id===selected)||null,[threads,selected]);

  function insertEmoji(emo){
    const ta = replyRef.current;
    if(ta){
      const start = ta.selectionStart || 0; const end = ta.selectionEnd || 0;
      const next = replyDraft.slice(0,start) + emo + replyDraft.slice(end);
      setReplyDraft(next);
      setTimeout(()=>{ try{ ta.focus(); const caret = start + emo.length; ta.setSelectionRange(caret, caret); }catch(_){} }, 0);
    } else {
      setReplyDraft((v)=> v + emo);
    }
    setRecentEmojis(prev=> [emo, ...prev.filter(e=>e!==emo)].slice(0,12));
  }

  function ensureThread(){
    let t=threads.find(th=>th.id===selected)||null;
    if(!t || t.customer!==customer || t.channel!==channel){
      const id=uid();
      t={ id, subject:threadSubject(customer, dateOnly()), replyPersona, channel, customer, assignee: ownerName, archived:false, messages:[], locked:false };
      setThreads(prev=>[t,...prev]);
      setSelected(id);
      // Auto-register user in Users tab if missing (stub record)
      try {
        const plat = channel || "app";
        const name = (customer||"").trim();
        if (name && !userExistsByPlatform(plat, name)) {
          const next = [...manualUsers, { username: name, platform: plat }];
          setManualUsers(next);
          try { localStorage.setItem(manualUsersKey, JSON.stringify(next)); } catch {}
          logDomain("user_added_from_thread", { username: name, platform: plat, source: "thread_create" });
        }
      } catch {}

      {/* B2: thread_created logged by watcher */}
    }
    return t;
  }
  function addNewThread(){
    setNewPersona(allowedPersonas.includes(outreachPersona)?outreachPersona:(allowedPersonas[0]||""));
    setNewChannel(outreachChannel);
    setNewCustomer(outreachCustomer||"");
    setShowNew(true);
  }
  function createNewThread(){
    if(!newCustomer.trim()) return;
    const id=uid();
    const t={ id, subject:threadSubject(newCustomer.trim(), dateOnly()), replyPersona:newPersona, channel:newChannel, customer:newCustomer.trim(), assignee: ownerName, archived:false, messages:[], locked:false };
    setThreads(prev=>[t,...prev]);
    setSelected(id);
    setReplyPersona(newPersona);
    setChannel(newChannel);
    setCustomer(newCustomer.trim());
    log("thread_manual",{id, who: you?.name || ownerName, workflow:"Conversation", persona:newPersona, channel:newChannel, customer:newCustomer.trim()});
    setShowNew(false);
  }
  function archiveSelected(){
    const ids=Object.keys(checked).filter(k=>checked[k]);
    if(!ids.length) return;
    setThreads(prev=> prev.map(t=> ids.includes(t.id)?{...t, archived:true}:t));
    setChecked({});
    if(ids.includes(selected)) setSelected("");
    log("threads_archived",{count:ids.length, who: you?.name || ownerName, workflow:"Inbox", selection:Object.keys(checked).filter(k=>checked[k])});
  }
  function startOutreach(){
    if(!__gateSend()) return;
    if(!outreachDraft.trim()){ alert("Enter a prospecting message first."); return; }
    const id=uid();
    const t={ id,
      subject:threadSubject(outreachCustomer, dateOnly()),
      replyPersona: outreachPersona,
      channel: outreachChannel,
      customer: outreachCustomer,
      assignee: ownerName,
      archived:true,
      messages:[{ id:uid(), ts:Date.now(), from:outreachPersona, direction:"out", text:outreachDraft.trim() }],
      locked:true };
    setThreads(prev=>[t,...prev]);
    setOutreachDraft("");
    log("prospect_started",{id, who: you?.name || ownerName, workflow:"Prospecting Outreach", persona: outreachPersona, channel: outreachChannel, customer: outreachCustomer, text: outreachDraft.trim()});
  }
  function addFirst(){
    if(!firstMsg.trim()) return; const t=curThread || ensureThread();
    t.messages.push({ id:uid(), ts:Date.now(), from:customer, direction:"in", text:firstMsg.trim() });
    t.locked = true;
    setThreads(prev=> prev.map(tt=> tt.id===t.id?{...t}:tt)); setFirstMsg("")
}
  function sendReply(){

    if(!__gateSend()) return;

    // Guard: require user to exist before sending as 'user'
    if (composerSender === "user") {
      const plat = channel || "app";
      const name = (customer||"").trim();
      if (!userExistsByPlatform(plat, name)) {
        alert("Add this user in the Users tab before sending as the user.");
        try { logDomain("user_view_intent", { platform: plat, user: name }); } catch {}
        setTab("users");
        setTimeout(() => { try {
          setUserQ(name);
          setAddUserOpen(true);
          setNewUsername(name);
          setNewUserPlatform(plat);
        } catch {} }, 60);
        return;
      }
    }

if(composerSender==="user"){
      const t = curThread || ensureThread();
      t.messages.push({ id:uid(), ts:Date.now(), from:customer, direction:"in", text:replyDraft.trim() });
      t.locked = true;
      setThreads(prev=> prev.map(x=> x.id===t.id ? {...t} : x));
      setReplyDraft("");
      setTimeout(()=>{ replyRef.current?.focus(); }, 0);
      try { triggerSuggestionsAfterUserSend(t, replyDraft.trim()); } catch(e){}
      return;
    }
if(!replyDraft.trim()) return;
    const t = curThread || ensureThread();
    const personaToUse = t.locked ? t.replyPersona : replyPersona;
    if(!allowedPersonas.includes(personaToUse)){ alert("You are ! assigned this persona on the Team tab."); return; }
    if(!t.locked){ t.replyPersona = replyPersona; t.channel = channel; t.customer = customer; }
    setIsSending(true);
    t.messages.push({ id:uid(), ts:Date.now(), from:personaToUse, direction:"out", text:replyDraft.trim() });
    setThreads(prev=> prev.map(tt=> tt.id===t.id?{...t}:tt));
    emitOutboundOnce(t.id, t.replyPersona || personaToUse, t.channel || channel, t.customer || customer, personaToUse, replyDraft.trim());
setReplyDraft("");
    setTimeout(()=> setIsSending(false), Math.max(300, (typeof CooldownMs!=='undefined' ? CooldownMs : 500)));

}

  // ---- NEW: Add button to create a fresh conversation & unlock inputs ----
  function addConversationAndUnlock(){
    // Create a new, unlocked thread && select it.
    const id = uid();
    const rp = allowedPersonas.includes(replyPersona) ? replyPersona : (allowedPersonas[0] || "");
    const t = {
      id,
      subject: threadSubject(customer || "", dateOnly()),
      replyPersona: rp,
      channel,
      customer: customer || "",
      assignee: ownerName,
      archived: false,
      messages: [],
      locked: false
    };
    setThreads(prev => [t, ...prev]);
    setSelected(id);
    // clear the draft so it feels "new"
    setReplyDraft("");
      // Auto-register user in Users tab if missing (stub record)
      try {
        const plat = channel || "app";
        const name = (customer||"").trim();
        if (name && !userExistsByPlatform(plat, name)) {
          const next = [...manualUsers, { username: name, platform: plat }];
          setManualUsers(next);
          try { localStorage.setItem(manualUsersKey, JSON.stringify(next)); } catch {}
          logDomain("user_added_from_thread", { username: name, platform: plat, source: "conversation_add" });
        }
      } catch {}

    {/* B2: thread_created logged by watcher */}
  }

  

function ChipField({label, items=[], onChange, placeholder, readOnly=false, definitions, options=[], wiki=false}){
  const [draft,setDraft]=useState("");
  const [open,setOpen]=useState(false);
  const [hoverIdx,setHoverIdx]=useState(0);
  const defs = definitions || ((label==="Tone") ? TONE_DEFS : null);

  const add=(val)=>{ const v=(val??draft).trim(); if(!v) return;
    const next=Array.from(new Set([...(items||[]), v])); onChange && onChange(next);
    setDraft(""); setHoverIdx(0);
  };
  const removeAt=(ti)=>{ const val=(items||[])[ti]; if(label==="Boundaries" && Array.isArray(MANDATORY_BOUNDARIES) && MANDATORY_BOUNDARIES.includes(val)) return; const next=[...(items||[])]; next.splice(ti,1); onChange && onChange(next); };
  const onKey=(e)=>{
    if (open && (e.key==='ArrowDown' || e.key==='ArrowUp')){
      e.preventDefault();
      const list = filtered(); if (!list.length) return;
      setHoverIdx((hoverIdx + (e.key==='ArrowDown'?1:-1) + list.length) % list.length);
      return;
    }
    if(e.key==='Enter' || e.key===',' || e.key===';'){
      e.preventDefault();
      if (open && filtered().length){ add(filtered()[hoverIdx]); } else { add(); }
    }
  };
  function filtered(){
    const base = (options||[]).filter(o => !(items||[]).includes(o));
    const q = draft.trim().toLowerCase();
    if (!q) return base.slice(0,12);
    return base.filter(o => o.toLowerCase().includes(q)).slice(0,12);
  }

  if (readOnly) {
    return (
      <div>
        {label ? <label style={smallText}>{label}</label> : null}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {(items||[]).map((t,ti)=>(
            <span key={t+ti} style={chipStyle} title={defs ? toneTooltip(t) : t} aria-label={defs ? toneTooltip(t) : t}>
              {t}
              {wiki ? (<a href={wikiUrlFor(t, label)} target="_blank" rel="noopener noreferrer" title={`Open "${t}" on Wikipedia`} style={{ textDecoration:'none', fontSize:11, padding:'0 6px', marginLeft:6, border:'1px solid #e5e7eb', borderRadius:999, background:'#f9fafb' }}>wiki</a>) : null}
            </span>
          ))}
          {(!items || !items.length) ? <span style={{...smallText}}>—</span> : null}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position:'relative' }}>
      {label ? <label style={smallText}>{label}</label> : null}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:6 }}>
        {(items||[]).map((t,ti)=>(
          <span key={t+ti} style={chipStyle} title={defs ? toneTooltip(t) : t} aria-label={defs ? toneTooltip(t) : t}>{t}
{wiki ? (<a href={wikiUrlFor(t, label)} target="_blank" rel="noopener noreferrer" title={`Open "${t}" on Wikipedia`} style={{ textDecoration:'none', fontSize:12, padding:'0 6px', marginLeft:6, border:'1px solid #e5e7eb', borderRadius:999, background:'#f9fafb' }}>wiki</a>) : null}
{!(label==="Boundaries" && Array.isArray(MANDATORY_BOUNDARIES) && MANDATORY_BOUNDARIES.includes(t)) && (
  <button onClick={()=>removeAt(ti)} style={{ background:'none', border:'none', color:'#ef4444', marginLeft:6, cursor:'pointer' }}>x</button>
)}</span>
        ))}
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <input
          style={inputStyle}
          value={draft}
          onChange={e=>{ setDraft(e.target.value); setOpen(true); setHoverIdx(0); }}
          onFocus={()=>setOpen(true)}
          onBlur={()=> setTimeout(()=>setOpen(false), 120) }
          onKeyDown={onKey}
          placeholder={placeholder||'Add value…'}
        />
        <button style={subtleBtn} onClick={()=>add()}>Add</button>
      </div>
      {open && filtered().length>0 && (
        <div style={{ position:'absolute', zIndex:20, top:'100%', left:0, marginTop:6, width:'100%',
                      background:'#fff', border:'1px solid #e5e7eb', borderRadius:10, boxShadow:'0 6px 18px rgba(0,0,0,0.08)' }}>
          {filtered().map((opt,idx)=>(
            <div key={opt}
              onMouseDown={(e)=>{ e.preventDefault(); add(opt); }}
              onMouseEnter={()=>setHoverIdx(idx)}
              style={{ padding:'8px 10px', cursor:'pointer', background: idx===hoverIdx ? '#f3f4f6' : '#fff' }}
              title={defs ? toneTooltip(opt) : opt}
              aria-label={defs ? toneTooltip(opt) : opt}
            >{opt}</div>
          ))}
        </div>
      )}
    </div>
  );
}
  return (
    <div ref={topRef} style={{ padding:20, maxWidth:1220, margin:"0 auto" }}>
      <div style={stickyHeader}>
        <h2 style={{ margin: 0 }}>AI Persona Team Dashboard</h2>
        <nav style={{ display:"flex", gap:8, marginTop:8 }}>
          {["dashboard","messages","personas","users","following","team","history","admin"].map(tn => (
            <button key={tn} onClick={() => goTab(tn)} style={tab === tn ? primaryBtn : subtleBtn}>{tn}</button>
          ))}
        </nav>
      </div>

      {/* ------------ DASHBOARD ------------- */}
      {tab==="dashboard" && (
  <Dashboard
    team={team}
    personas={personas}
    threads={threads}
    following={following}
    manualUsers={manualUsers}
    onOpenPersonaPeek={(name)=>openPersonaPeek(name)}
  />
)}

      {/* ------------ MESSAGES ------------- */}
      {tab==="messages" && (
        <div style={{ display:"grid", gridTemplateColumns:"280px 1fr", gap:16, height:"calc(100vh - 140px)" }}>
          {/* Inbox */}
          <div style={{ display:"flex", flexDirection:"column", minHeight:0, height:"100%" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
              <h3>Inbox</h3>
              
            </div>
            <div style={{ flex:1, overflowY:"auto" }}>
            {threads.filter(t=>!t.archived).map(th=>(
              <div key={th.id} onClick={()=>{ setSelected(th.id); setReplyPersona(th.replyPersona); setChannel(th.channel); setCustomer(th.customer); }} style={{ cursor:"pointer", padding:8, border:"1px solid #e5e7eb", borderRadius:8, marginBottom:8, background: th.id===selected?"#eef2ff":"#fff", display:"flex", alignItems:"center", gap:8 }}>
                <input type="checkbox" checked={!!checked[th.id]} onChange={e=> setChecked({ ...checked, [th.id]: e.target.checked })} />
                <div>
                  <div style={{ fontWeight:600 }}>{th.subject}</div>
                  <div style={smallText}>{th.channel} • {th.replyPersona}</div>
                </div>
              </div>
            ))}
            </div>
          </div>

          {/* Composer + Thread */}
          <div style={{ display:"flex", flexDirection:"column", minHeight:0, height:"100%" }}>
            {/* Prospecting */}
            <h3>Prospecting Outreach</h3>
            <div style={{ display:"flex", gap:8, marginBottom:8 }}>
              <select value={outreachPersona} onChange={e=>setOutreachPersona(e.target.value)} style={{ ...inputStyle, maxWidth:220 }}>
                {allowedPersonas.map(n=> <option key={n} value={n}>{n}</option>)}
              </select>
              <select value={outreachChannel} onChange={e=>setOutreachChannel(e.target.value)} style={{ ...inputStyle, maxWidth:180 }}>
                {CHANNEL_CHOICES.map(c=> <option key={c}>{c}</option>)}
              </select>
              <input value={outreachCustomer} onChange={e=>setOutreachCustomer(e.target.value)} style={{ ...inputStyle, maxWidth:220 }} placeholder="Enter username here" />
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:12 }}>
              <textarea style={{ ...inputStyle }} rows={2} value={outreachDraft} onChange={e=>setOutreachDraft(e.target.value)} placeholder="Prospect message (auto-archived)" />
              <button style={primaryBtn} onClick={startOutreach}>Send</button>
            </div>

            {/* Conversation */}
            <h3 style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span>Conversation</span>
              {/* Align with Send buttons on the right */}
              <button style={primaryBtn} onClick={addNewThread}>Add</button>
            </h3>
            {showNew && (
              <div style={{ margin:"8px 0 12px", padding:10, border:"1px solid #e5e7eb", borderRadius:6, background:"#fff" }}>
                <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
                  <select value={newPersona} onChange={e=>setNewPersona(e.target.value)} style={{ ...inputStyle, minWidth:160 }}>
                    {allowedPersonas.map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                  <select value={newChannel} onChange={e=>setNewChannel(e.target.value)} style={{ ...inputStyle, minWidth:140 }}>
                    {CHANNEL_CHOICES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                  <input value={newCustomer} onChange={e=>setNewCustomer(e.target.value)} placeholder="Enter username here" style={{ ...inputStyle, minWidth:220 }} />
                  <button style={primaryBtn} onClick={createNewThread}>Create</button>
                  <button style={subtleBtn} onClick={()=>setShowNew(false)}>Cancel</button>
                </div>
              </div>
            )}

            {curThread?.locked && (
  <div style={{...smallText, marginBottom:8}}>
    <button onClick={()=>openPersonaPeek(replyPersona)} style={{ background:"none", border:"none", padding:0, margin:0, color:"#1d4ed8", cursor:"pointer", textDecoration:"underline" }}>{replyPersona}</button>
    {" "}• {" "}<button onClick={()=>openUserPeek(curThread.customer, curThread.channel)} style={{ background:"none", border:"none", padding:0, margin:0, color:"#1d4ed8", cursor:"pointer", textDecoration:"underline" }}>{curThread.customer}</button> {" "}• {" "}{curThread.channel}
  </div>
)}
            <div style={{ display:"flex", gap:8, marginBottom:8 }}>
              <select value={replyPersona} onChange={e=>!curThread?.locked && setReplyPersona(e.target.value)} disabled={!!curThread?.locked} style={{ ...fieldStyle(!!curThread?.locked), maxWidth:220 }}>
                {allowedPersonas.map(n=> <option key={n} value={n}>{n}</option>)}
              </select>
              <select value={channel} onChange={e=>!curThread?.locked && setChannel(e.target.value)} disabled={!!curThread?.locked} style={{ ...fieldStyle(!!curThread?.locked), maxWidth:180 }}>
                {CHANNEL_CHOICES.map(c=> <option key={c}>{c}</option>)}
              </select>
              <input value={customer} onChange={e=>!curThread?.locked && setCustomer(e.target.value)} disabled={!!curThread?.locked} style={{ ...fieldStyle(!!curThread?.locked), maxWidth:220 }} placeholder="Enter username here" />
            </div>
            <div style={{ display:"flex", gap:8, marginBottom:8 }}>
              <select value={tagSel} onChange={e=> setTagSel(e.target.value)} style={{ ...inputStyle, maxWidth:220 }}>
                {["First Contact","Chit Chat","Sexy Time","Requests","Ending the Conversation"].map(o=> <option key={o} value={o}>{o}</option>)}
              </select>
              <select value={tagDetail} onChange={e=> setTagDetail(e.target.value)} style={{ ...inputStyle, maxWidth:260 }} disabled={!(tagSel==='Chit Chat' || tagSel==='Sexy Time' || tagSel==='Requests') || subOptions.length===0}>
                <option value="">{subOptions.length? "Select preset…" : "No presets (persona tab)"}</option>
                {subOptions.map(s=> <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Thread messages */}
            <div style={{ border:"1px solid #e5e7eb", borderRadius:8, padding:10, background:"#fff", minHeight:180, flex:1, overflowY:"auto", marginBottom:8 }}>
              {curThread?.messages && curThread.messages.length>0 ? (
                curThread.messages
                  .slice()
                  .sort((a,b)=>a.ts-b.ts)
                  .map(m => (
                    <div key={m.id} style={{ marginBottom:8 }}>
                      <div><strong>{m.from}:</strong> {m.text}</div>
                      <div style={{ ...smallText }}>{new Date(m.ts).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                    </div>
                  ))
              ) : (
                <div style={{ color:"#9ca3af" }}>No messages yet.</div>
              )}
            </div>

            {/* Composer */}
            <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:6, marginBottom:4 }}>
              <span style={{ fontSize:12, color:"#6b7280" }}>Sender:</span>
              <label style={{ display:"flex", alignItems:"center", gap:6 }}>
                <input type="radio" checked={composerSender==="persona"} onChange={()=>setComposerSender("persona")} />
                <span>Persona</span>
              </label>
              <label style={{ display:"flex", alignItems:"center", gap:6 }}>
                <input type="radio" checked={composerSender==="user"} onChange={()=>setComposerSender("user")} />
                <span>User</span>
              </label>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"stretch" }}>
              <textarea
                ref={replyRef}
                style={{ ...inputStyle }}
                rows={2}
                value={replyDraft}
                onChange={e=>setReplyDraft(e.target.value)}
                onKeyDown={e=>{ if(isSending) return; if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); sendReply(); } }}
                placeholder="Persona reply... (Enter to send, Shift+Enter for newline)"
              />
              <button style={{ ...primaryBtn, alignSelf:"stretch", opacity: isSending ? 0.6 : 1, pointerEvents: isSending ? "none" : "auto" }} onClick={sendReply} disabled={isSending || !replyDraft.trim()} aria-busy={isSending} aria-disabled={isSending}>{isSending ? "Sending…" : "Send"}</button>
            </div>
            <div style={{ marginTop:6 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                {recentEmojis.map(e=>(
                  <button key={"r"+e} style={emojiBtn} onClick={()=>insertEmoji(e)} title="Recent">{e}</button>
                ))}
                <span style={smallText}>•</span>
                {["😊","🥰","😘","😉","😂","✨"].filter(e=>!recentEmojis.includes(e)).map(e=>(
                  <button key={"q"+e} style={emojiBtn} onClick={()=>insertEmoji(e)}>{e}</button>
                ))}
              </div>
            </div>

{/* Suggested Responses */}
<div style={{ ...cardStyle, marginTop: 10 }}>
  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
    <strong>Suggested Responses</strong>
    <div style={smallText}>
      {suggestions.length ? `Auto-generated from last user message` : `Waiting for a user message…`}
    </div>
  </div>
  <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:8 }}>
    {(suggestions.length ? suggestions : [
      "— Suggestions will appear here after the next user message —",
      "Tip: Ask an open-ended question to get better prompts."
    ]).map((s, i) => (
      <button
        key={i}
        style={{ ...subtleBtn, textAlign:'left', whiteSpace:'normal', lineHeight:'1.3', padding:'10px 12px' }}
        onClick={() => setReplyDraft(prev => (prev ? (prev.endsWith(' ') ? prev + s : prev + ' ' + s) : s))}
        disabled={!linkSuggestions.length}
        title={suggestions.length ? "Insert into message" : "No suggestions yet"}
      >
        {s}
      </button>
    ))}
  </div>
  {suggestions.length > 0 && (
    <div style={{ marginTop:10, display:'flex', gap:8, justifyContent:'flex-end' }}>
      <button style={subtleBtn} onClick={() => setSuggestions([])}>Clear</button>
      <button
        style={primaryBtn}
        onClick={() => {
          const t = curThread || null;
          const lastUser = t?.messages?.slice().reverse().find(m => m.direction === "in")?.text || "";
          triggerSuggestionsAfterUserSend(t, lastUser);
        }}
      >
        Regenerate
      </button>
    </div>
  )}
</div>

          </div>
        </div>
      )}

      
      
      
      
      {/* Persona Modal (full widget, read-only, mirrors Personas tab) */}
      {showPersonaPeek && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:2000 }} onClick={()=>setShowPersonaPeek(false)}>
          <div style={{ background:"#fff", borderRadius:14, padding:16, width:980, maxHeight:"86vh", overflow:"auto", boxShadow:"0 10px 30px rgba(0,0,0,0.25)" }} onClick={e=>e.stopPropagation()}>
            {(() => { const p = personas.find(pp => (pp.name||"")===peekPersonaName) || null; if(!p) return (<div style={{color:"#6b7280"}}>Persona ! found.</div>);
              const ReadOnly = ({label, value}) => (
                <div>
                  <label style={smallText}>{label}</label>
                  <input style={{ ...inputStyle, background:"#f9fafb", color:"#6b7280" }} readOnly value={value||""} />
                </div>
              );
              return (
              <div>
                {/* Header (same layout) */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    {p.thumbnail ? (
                      <img src={p.thumbnail} alt={p.name} style={{ width:72, height:72, borderRadius:12, objectFit:"cover", border:"1px solid #e5e7eb" }} />
                    ) : (
                      <div style={{ width:72, height:72, borderRadius:12, background:"#e5e7eb", display:"flex", alignItems:"center", justifyContent:"center", color:"#374151", fontWeight:700 }}>{(p.name||"").split(" ").map(s=>s[0]).join("").slice(0,2).toUpperCase()}</div>
                    )}
                    <div>
                      <div style={{ fontSize:18, fontWeight:700 }}>{p.name}</div> <span style={{ marginLeft:8 }}><ArchetypeBadge name={p.archetype} /></span><div style={{ marginTop:4 }}></div>
                      <div style={{ fontSize:12, color:"#6b7280" }}></div>
                    </div>
                  </div>
                  <button onClick={()=>setShowPersonaPeek(false)} style={{ border:"none", background:"#000", color:"#fff", borderRadius:10, padding:"6px 10px", cursor:"pointer" }}>Close</button>
                </div>

                {/* Birth/Age */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:8 }}>
                  <ReadOnly label="Birthday" value={p.birthday} />
                  <ReadOnly label="Age" value={calcAge(p.birthday)||""} />
<ReadOnly label="Zodiac" value={( () => { const z=getZodiacFromBirthday(p.birthday); return z ? `${z.sign} ${z.symbol}` : "" })()} />

                </div>

                {/* Username handles (chips) */}
                {Array.isArray(p.handles) && p.handles.length>0 && (
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:12, color:"#6b7280", marginBottom:6 }}>Usernames</div>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {p.handles.map((h,hi)=> (
                        <span key={h.platform+hi} style={{ display:"inline-flex", gap:6, alignItems:"center", background:"#f3f4f6", border:"1px solid #e5e7eb", borderRadius:999, padding:"4px 10px", fontSize:12 }}>
                          {h.platform}: <strong style={{ marginLeft:4 }}>{h.username}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bio */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:8 }}>
                  <ReadOnly label="Ethnicity" value={p.ethnicity} />
                  <ReadOnly label="Height" value={p.height} />
                  <ReadOnly label="Weight Range" value={p.weightRange} />
                  <ReadOnly label="Measurements" value={p.measurements} />
                  <ReadOnly label="Cup Size" value={p.cupSize} />
                </div>

                {/* Physicals */}
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontSize:12, color:"#6b7280", marginBottom:4 }}>Bio</div>
                  <div style={{ background:"#f9fafb", border:"1px solid #e5e7eb", borderRadius:10, padding:10, minHeight:40, whiteSpace:"pre-wrap" }}>{(p.bio && p.bio.text) || p.bio || ""}</div>
                </div>

                {/* Affection / Signature / Emojis / Interests */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:12 }}>
                  <ChipField readOnly label="Affection Cues" items={p.affectionCues||[]} />
                  <ChipField readOnly label="Signature Phrases" items={p.signature||[]} />
                  <ChipField readOnly label="Emojis" items={p.emojis||[]} />
                  <ChipField readOnly label="Interests" items={p.interests||[]} />
                </div>

                {/* Favorites */}
                <div style={{ border:"1px dashed #e5e7eb", borderRadius:10, padding:10, background:"#fff", marginTop:12 }}>
                  <strong>Favorites</strong>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:8 }}>
                    <ChipField readOnly wiki label="Food" items={p.favorites?.food||[]} />
                    <ChipField readOnly wiki label="Movies" items={p.favorites?.movies||[]} />
                    <ChipField readOnly wiki label="TV Shows" items={p.favorites?.tvShows||[]} />
                    <ChipField readOnly wiki label="Actors/Actresses" items={p.favorites?.actors||[]} />
                    <ChipField readOnly wiki label="Actors/Actresses" items={p.favorites?.actors||[]} />
                    <ChipField readOnly wiki label="Music — Artists" items={p.favorites?.music?.artists||[]} />
                    <ChipField readOnly wiki label="Music — Genres" items={p.favorites?.music?.genres||[]} />
                    <ChipField readOnly wiki label="Books — Titles" items={p.favorites?.books?.titles||[]} />
                    <ChipField readOnly wiki label="Books — Authors" items={p.favorites?.books?.authors||[]} />
                    <ChipField readOnly wiki label="Types of Vacations" items={p.favorites?.vacations||[]} />
                    <ChipField readOnly wiki label="Vacation Locations" items={p.favorites?.vacationLocations||[]} />
                    <ChipField readOnly wiki label="Games" items={p.favorites?.games||[]} />
                    <ChipField readOnly wiki label="Sports" items={p.favorites?.sports||[]} />
                                      </div>
                </div>

                {/* Colors */}
                <div style={{ border:"1px dashed #e5e7eb", borderRadius:10, padding:10, background:"#fff", marginTop:12 }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <strong>Colors</strong>
                    <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                      <span style={{ width:16, height:16, borderRadius:4, border:"1px solid #e5e7eb", backgroundColor:p.primaryColor||"#fff" }} />
                      <span style={{ width:16, height:16, borderRadius:4, border:"1px solid #e5e7eb", backgroundColor:p.secondaryColor||"#fff" }} />
                    </div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:8 }}>
                    <ReadOnly label="Primary" value={p.primaryColor} />
                    <ReadOnly label="Secondary" value={p.secondaryColor} />
                  </div>
                </div>

                {/* Values, Guidelines, Goals, Fears, Boundaries, Tone */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:12 }}>
                  <ChipField readOnly label="Style" items={p.style||[]} />
                  <ChipField readOnly label="Values" items={p.values||[]} />
                  <ChipField readOnly label="Do's & Don'ts" items={p.dosDonts||[]} />
                  <ChipField readOnly label="Goals" items={p.goals||[]} />
                  <ChipField readOnly label="Fears" items={p.fears||[]} />
                  <ChipField readOnly label="Boundaries" items={p.boundaries||[]} />
                  <ChipField readOnly label="Tone" items={p.tone||[]} />
      {/* AI Behavior (Owner/Manager only) */}
      <AiBehaviorControls persona={p} onChange={(next)=>{ const c=[...personas]; c[i].aiBehavior=next; setPersonas(c); }} />

                {isOwnerOrManager() && (
                  <AiBehaviorControls persona={p} onChange={(ab)=> updatePersona(p.id, { aiBehavior: ab })} />
                )}

                </div>

              </div>
            ); })()}
          </div>
        </div>
      )}

{/* ------------ PERSONAS ------------- */}
      {tab==='personas' && ((() => {
  // Step C: IIFE wrapper ensures local consts are legal inside JSX
  return (
<TabBoundary>
        
        {/* Personas Search & Sort Controls */}
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, marginBottom:8}}>
          <input
            value={personaQ}
            onChange={e=>setPersonaQ(e.target.value)}
            placeholder="Search personas by name or alias…"
            style={{flex:1, padding:'8px 10px', border:'1px solid #e5e7eb', borderRadius:8}}
          />
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <select value={personaSort} onChange={e=>setPersonaSort(e.target.value)} style={{padding:'8px 10px', border:'1px solid #e5e7eb', borderRadius:8}}>
              <option value="az">A–Z</option>
              <option value="za">Z–A</option>
              <option value="recent">Recently Active</option>
              <option value="created">Creation Date</option>
            </select>
            <label style={{display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#374151'}}>
              <input type="checkbox" checked={personaActiveOnly} onChange={e=>setPersonaActiveOnly(e.target.checked)} />
              Active only
            </label>
          </div>
        </div>
<div style={{ display:"grid", gap:16, gridTemplateColumns:"repeat(auto-fill, minmax(380px, 1fr))" }}>
          {filteredPersonas.map((p,i) => <CardBoundary key={p.id || i} label={`Persona ${p?.name||(''+i)}`}>
            <div key={p.id} id={`persona-card-${p.id}`} style={{ ...cardStyle, outline: (hoverIndex===i && dragType==='persona') ? "2px dashed #3b82f6" : "none" }} draggable onDragStart={()=>dragStart('persona', i)} onDragOver={onDragOverCard} onDrop={()=>onDropCard('persona', i)} onDragEnter={()=>setHoverIndex(i)} onDragLeave={()=>setHoverIndex(-1)}>
              {/* Header */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  {p.thumbnail ? (
                    <img src={p.thumbnail} alt={p.name} style={{ width:72, height:72, borderRadius:999, objectFit:"cover", border:"1px solid #e5e7eb" }} />
                  ) : (
                    <div style={{ width:72, height:72, borderRadius:999, display:"flex", alignItems:"center", justifyContent:"center", background:"#e5e7eb", color:'#374151', fontWeight:700 }}>{initials(p.name)}</div>
                  )}
                  <div style={{ fontWeight:700, display:"inline-flex", alignItems:"center", gap:8 }}>{p.name}<span><ArchetypeBadge name={p.archetype} /></span></div>
                </div>
                <div />
              </div>

              {/* Core fields */}
              <div style={{ display:"grid", gap:8 }}>
                <div>
<label style={smallText}>Birthday</label>
  <input
    type="date"
    style={inputStyle}
    value={p.birthday || ""}
    onChange={(e)=>{ const c=[...personas]; c[i].birthday=e.target.value; setPersonas(c); }}
  />
  <div style={{ display:"flex", gap:8, alignItems:"center", marginTop:6 }}>
    <div style={{ fontSize: 12, color: "#6b7280", width: 100 }}>Zodiac</div>
    <div style={{ fontWeight: 600 }}>
      {(() => { const z = getZodiacFromBirthday(p.birthday); return z ? `${z.sign} ${z.symbol}` : "—"; })()}
    </div>
  </div>
</div>
<div>
  <label style={smallText}>Age</label>
                  <input style={inputStyle} value={calcAge(p.birthday)||""} readOnly placeholder="Auto" />
                </div>

                {/* Handles */}
                <div>
                  <label style={smallText}>User Name</label>
                  <div style={{ display:"flex", gap:8 }}>
                    {(() => { const draft = handleDraft[p.id] || { username:"", platform: CHANNEL_CHOICES[0] }; return (
                      <>
                        <input style={{ ...inputStyle }} value={draft.username} onChange={e=> setHandleDraft({ ...handleDraft, [p.id]: { ...draft, username: e.target.value } })} placeholder="Enter user name" />
                        <select value={draft.platform} onChange={e=> setHandleDraft({ ...handleDraft, [p.id]: { ...draft, platform: e.target.value } })} style={{ ...inputStyle, maxWidth:180 }}>
                          {CHANNEL_CHOICES.map(c=> <option key={c} value={c}>{c}</option>)}
                        </select>
                        <button style={subtleBtn} onClick={()=>{ const d = handleDraft[p.id] || { username:"", platform: CHANNEL_CHOICES[0] }; if(!d.username.trim()) return; const c=[...personas]; const arr = Array.isArray(c[i].handles)? c[i].handles.slice(): []; arr.push({ platform: d.platform, username: d.username.trim() }); c[i].handles = arr; setPersonas(c); setHandleDraft({ ...handleDraft, [p.id]: { ...d, username: "" } }); }}>Add</button>
                      </>
                    ); })()}
                  </div>
                  {Array.isArray(p.handles) && p.handles.length>0 && (
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:6 }}>
                      {p.handles.map((h,hi)=>(
                        <span key={h.platform+hi} style={chipStyle}>
                          {h.platform}: <strong style={{ marginLeft:4 }}>{h.username}</strong>
                          <button onClick={()=>{ const c=[...personas]; const arr=(c[i].handles||[]).slice(); arr.splice(hi,1); c[i].handles=arr; setPersonas(c); try{ log("persona_handle_remove",{ persona: c[i]?.name || "", platform: _removed?.platform, username: _removed?.username, who: you?.name || ownerName }); }catch(_){ } }} style={{ background:"none", border:"none", color:"#ef4444", marginLeft:6 }}>x</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bio with lock/unlock */}
                <div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <label style={smallText}>Bio</label>
                    <button
                      type="button"
                      style={{ ...linkBtn, opacity: p.bioSaved ? 1 : 0.5, cursor: (p.bioSaved && bioTextOf(p).trim()) ? "pointer" : "default" }}
                      title={p.bioSaved ? "Open full bio" : "Lock the bio first"}
                      disabled={!p.bioSaved || !bioTextOf(p).trim()}
                      onClick={()=>{ try{ if (p.bioSaved && bioTextOf(p).trim()) { setBioModalIndex(i); } }catch{} }}
                    >
                      View full
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    disabled={!!p.bioSaved}
                    style={{ ...inputStyle, maxHeight:160, ...(p.bioSaved ? { background:"#f3f4f6", color:"#6b7280" } : {}) }}
                    value={bioTextOf(p)}
                    onChange={e=>{ const c=[...personas]; c[i].bio=e.target.value; setPersonas(c); }}
                    placeholder="Background"
                   onBlur={(e)=> updatePersona(p.id, { last_bio_save: new Date().toISOString(), bio_word_count: countWords(e.target.value) })}></textarea>
                  <BioMetrics text={bioTextOf(p)} lastSaved={p.last_bio_save} />
                  <div style={{ display:"flex", gap:8, alignItems:"center", marginTop:8 }}>
                    <button
                      type="button"
                      style={primaryBtn}
                      onClick={() => (p.bioSaved ? unlockBio(p.id) : lockBio(p.id))}
                      disabled={!bioTextOf(p).trim() && !p.bioSaved}
                      title={!bioTextOf(p).trim() && !p.bioSaved ? "Enter some text first" : ""}
                    >
                      {p.bioSaved ? "Modify" : "Add"}
                    </button>
                    {p.bioSavedAt ? <span style={smallText}>{new Date(p.bioSavedAt).toLocaleString()}</span> : (p.bioSaved ? <span style={smallText}>Locked</span> : null)}
                  </div>
                </div>

                {/* Physical fields */}
                <div>
                  <div>
                    <label>Archetype</label>
<div style={{ position:"relative" }}>
  <AutocompleteInput
    id="archetype"
    value={p.archetype || ""}
    onChange={(v)=> updatePersona(p.id, { archetype: String(v||"").split(",")[0].trim() })}
    options={ARCHETYPE_OPTIONS}
    withBadges={true} placeholder="e.g., Girl Next Door"
    inputStyle={{ ...(inputStyle||{}), paddingLeft: p.archetype ? 110 : (inputStyle?.paddingLeft||12), ...(p.archetype ? { color:"transparent", caretColor:"transparent" } : {}) }}
  />
  {p.archetype && (
    <div style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", zIndex:3 }}>
      <ArchetypeBadge name={p.archetype} />
    </div>
  )}
</div>
</div>

                  <label>Ethnicity</label>
                  <AutocompleteInput
  id={"eth_"+(p?.id||"tmp")}
  value={p.ethnicity || ""}
  onChange={(v)=> updatePersona(p.id, { ethnicity: normalizeEthnicity(v) })}
  options={COMMON_ETHNICITIES}
  placeholder="e.g. German, Portuguese"
  inputStyle={inputStyle}
/>
                </div>
                <div>
                  <label>Height</label>
                  <HeightPicker value={p.height || ""} onChange={(v)=> updatePersona(p.id, { height: v })} inputStyle={inputStyle} />
                </div>
                <div>
                  <label>Weight Range</label>
                  <input type="text" placeholder="e.g. 120–135 lbs" value={p.weightRange || ""} onChange={e => updatePersona(p.id, { weightRange: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: 4 }}>Measurements<span title="Bust–Waist–Hip (inches). Example: 34–26–36." tabIndex={0} aria-label="Measurements help" style={{ cursor: "help", color: "#555", fontWeight: "bold", pointerEvents: "auto" }}>ⓘ</span></label>
                  <input type="text" placeholder="e.g. 34–26–36" value={p.measurements || ""} onChange={e => updatePersona(p.id, { measurements: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label>Cup Size</label>
                  <input type="text" placeholder="e.g. C" value={p.cupSize || ""} onChange={e => updatePersona(p.id, { cupSize: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  
                  <label>Hair Color</label>
<AutocompleteInput
  id="hairColor"
  value={p.hairColor || ""}
  onChange={(v)=> updatePersona(p.id, { hairColor: String(v||"").split(",")[0].trim() })}
  options={HAIR_COLOR_OPTIONS}
  withBadges={false}
  placeholder="e.g. Blonde"
  inputStyle={inputStyle}
/>
                </div>
                <div>
                  <label>Hair Style</label>
<AutocompleteInput
  id="hairStyle"
  value={p.hairStyle || ""}
  onChange={(v)=> updatePersona(p.id, { hairStyle: String(v||"").split(",")[0].trim() })}
  options={HAIR_STYLE_OPTIONS}
  withBadges={false}
  placeholder="e.g. Wavy"
  inputStyle={inputStyle}
/>
                </div>
                <div>
                  <label>Eye Color</label>
<AutocompleteInput
  id="eyeColor"
  value={p.eyeColor || ""}
  onChange={(v)=> updatePersona(p.id, { eyeColor: String(v||"").split(",")[0].trim() })}
  options={EYE_COLOR_OPTIONS}
  withBadges={false}
  placeholder="e.g. Blue"
  inputStyle={inputStyle}
/>
                </div>

                {/* Voice upload */}
                <div>
                  <label style={smallText}>Voice</label>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    <input type="file" accept="audio/*" ref={el=> voicePickers.current[i]=el} onChange={e=>onVoiceChange(i,e)} style={{ display:'none' }} />
                    {p.voice ? (
                      <>
                        <audio controls src={p.voice} style={{ flex:1, minWidth:220 }} />
                        <button style={subtleBtn} onClick={()=>triggerVoice(i)}>Upload</button>
                        <button style={subtleBtn} onClick={()=>{ const c=[...personas]; c[i].voice=""; setPersonas(c); }}>Remove</button>
                      </>
                    ) : (
                      <>
                        <button style={subtleBtn} onClick={()=>triggerVoice(i)}>Upload</button>
                        <span style={smallText}>Add a short sample (mp3 / wav / m4a)</span>
                      </>
                    )}
                {/* Love Languages */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:12, alignItems:"start" }}>
                  <div>
                    <div><label style={smallText}>Love Language (Giving)</label></div>
                    <select
                      value={p.love_giving || ""}
                      onChange={(e)=> updatePersona(p.id, { love_giving: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="">Select...</option>
                      <option value="Words of Affirmation">Words of Affirmation</option>
                      <option value="Acts of Service">Acts of Service</option>
                      <option value="Receiving Gifts">Receiving Gifts</option>
                      <option value="Quality Time">Quality Time</option>
                      <option value="Physical Touch">Physical Touch</option>
                    </select>
                  </div>
                  <div>
                    <div><label style={smallText}>Love Language (Receiving)</label></div>
                    <select
                      value={p.love_receiving || ""}
                      onChange={(e)=> updatePersona(p.id, { love_receiving: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="">Select...</option>
                      <option value="Words of Affirmation">Words of Affirmation</option>
                      <option value="Acts of Service">Acts of Service</option>
                      <option value="Receiving Gifts">Receiving Gifts</option>
                      <option value="Quality Time">Quality Time</option>
                      <option value="Physical Touch">Physical Touch</option>
                    </select>
                  </div>
                </div>
                {/* End Love Languages */}



                  </div>
                </div>

                {/* Chips upstream of Colors */}
                <ChipField label="Affection Cues" items={p.affectionCues||[]} placeholder="e.g., nicknames, playful teasing" onChange={(arr)=>{ const c=[...personas]; c[i].affectionCues=arr; setPersonas(c); }} />
                <ChipField label="Signature Phrases" items={p.signature||[]} placeholder="Catchphrases, sign-offs" onChange={(arr)=>{ const c=[...personas]; c[i].signature=arr; setPersonas(c); }} />
                <ChipField label="Emojis" items={p.emojis||[]} placeholder="e.g., 😊, 🔥, ✨" onChange={(arr)=>{ const c=[...personas]; c[i].emojis=arr; setPersonas(c); }} />
                <ChipField label="Interests" items={p.interests||[]} placeholder="Hobbies / topics" onChange={(arr)=>{ const c=[...personas]; c[i].interests=arr; setPersonas(c); }} />

                {/* Colors between Interests && Favorites */}
                <div style={{ border:"1px dashed #e5e7eb", borderRadius:10, padding:10, background:"#fff" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <strong>Colors</strong>
                    <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                      <span style={{ width:16, height:16, borderRadius:99, border:"1px solid #e5e7eb", backgroundColor:p.primaryColor||"#fff" }} />
                      <span style={{ width:16, height:16, borderRadius:99, border:"1px solid #e5e7eb", backgroundColor:p.secondaryColor||"#fff" }} />
                    </div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:8 }}>
                    <div>
                      <label style={smallText}>Primary</label>
                      <div style={{ display:"grid", gridTemplateColumns:"44px 1fr", gap:8, alignItems:"center" }}>
                        <input type="color" className="colorBox" value={p.primaryColor || "#111111"} onChange={e=> updatePersona(p.id, { primaryColor: e.target.value })} style={{ width:44, height:44, border:"1px solid #e5e7eb", borderRadius:8, padding:0, background:"#fff" }} />
                        <input value={p.primaryColor || ""} onChange={e=>{ const v=e.target.value.trim(); const ok = v==="" || /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v); if(ok) updatePersona(p.id, { primaryColor: v }); }} placeholder="#111111" style={inputStyle} />
                      </div>
                    </div>
                    <div>
                      <label style={smallText}>Secondary</label>
                      <div style={{ display:"grid", gridTemplateColumns:"44px 1fr", gap:8, alignItems:"center" }}>
                        <input type="color" className="colorBox" value={p.secondaryColor || "#ff0055"} onChange={e=> updatePersona(p.id, { secondaryColor: e.target.value })} style={{ width:44, height:44, border:"1px solid #e5e7eb", borderRadius:8, padding:0, background:"#fff" }} />
                        <input value={p.secondaryColor || ""} onChange={e=>{ const v=e.target.value.trim(); const ok = v==="" || /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v); if(ok) updatePersona(p.id, { secondaryColor: v }); }} placeholder="#ff0055" style={inputStyle} />
                      </div>
                    </div>
                  </div>
                </div>

                

{/* Favorites (finalized alignment) */}
<div style={{ border:"1px solid #e5e7eb", borderRadius:10, padding:10, background:"#fff" }}>
  <strong>Favorites</strong>
  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:8 }}>
    {/* Row 1 */}
    <ChipField wiki label="Food" items={p.favorites?.food||[]} placeholder="e.g., sushi, tacos" onChange={arr=>{ const c=[...personas]; c[i].favorites = { ...(c[i].favorites||{}), food: arr }; setPersonas(c); }} />
    <ChipField wiki label="Movies" items={p.favorites?.movies||[]} placeholder="e.g., sci-fi, romance" onChange={arr=>{ const c=[...personas]; c[i].favorites = { ...(c[i].favorites||{}), movies: arr }; setPersonas(c); }} />

    {/* Row 2 */}
    <ChipField wiki label="TV Shows" items={p.favorites?.tvShows||[]} placeholder="e.g., sitcoms" onChange={arr=>{ const c=[...personas]; c[i].favorites = { ...(c[i].favorites||{}), tvShows: arr }; setPersonas(c); }} />
    <ChipField wiki label="Actors/Actresses" items={p.favorites?.actors||[]} placeholder="e.g., Ana de Armas" onChange={arr=>{ const c=[...personas]; c[i].favorites = { ...(c[i].favorites||{}), actors: arr }; setPersonas(c); }} />

    {/* Row 3 */}
    <ChipField wiki label="Music — Artists" items={p.favorites?.music?.artists||[]} placeholder="e.g., Daft Punk" onChange={arr=>{ const c=[...personas]; const F = { ...(c[i].favorites||{}) }; F.music = F.music && typeof F.music==='object' ? F.music : { artists:[], genres:[] }; F.music.artists = arr; c[i].favorites = F; setPersonas(c); }} />
    <ChipField wiki label="Music — Genres" items={p.favorites?.music?.genres||[]} placeholder="e.g., House" onChange={arr=>{ const c=[...personas]; const F = { ...(c[i].favorites||{}) }; F.music = F.music && typeof F.music==='object' ? F.music : { artists:[], genres:[] }; F.music.genres = arr; c[i].favorites = F; setPersonas(c); }} />

    {/* Row 4 */}
    <ChipField wiki label="Books — Titles" items={p.favorites?.books?.titles||[]} placeholder="e.g., Dune" onChange={arr=>{ const c=[...personas]; const F={ ...(c[i].favorites||{}) }; F.books = F.books && typeof F.books==='object' ? F.books : { titles:[], authors:[] }; F.books.titles = arr; c[i].favorites = F; setPersonas(c); }} />
    <ChipField wiki label="Books — Authors" items={p.favorites?.books?.authors||[]} placeholder="e.g., Frank Herbert" onChange={arr=>{ const c=[...personas]; const F={ ...(c[i].favorites||{}) }; F.books = F.books && typeof F.books==='object' ? F.books : { titles:[], authors:[] }; F.books.authors = arr; c[i].favorites = F; setPersonas(c); }} />

    {/* Row 5 */}
    <ChipField wiki label="Sports" items={p.favorites?.sports||[]} placeholder="e.g., soccer" onChange={arr=>{ const c=[...personas]; c[i].favorites = { ...(c[i].favorites||{}), sports: arr }; setPersonas(c); }} />
    <ChipField wiki label="Games" items={p.favorites?.games||[]} placeholder="e.g., RPGs" onChange={arr=>{ const c=[...personas]; c[i].favorites = { ...(c[i].favorites||{}), games: arr }; setPersonas(c); }} />

    {/* Row 6 */}
    <ChipField wiki label="Types of Vacations" items={p.favorites?.vacations||[]} placeholder="e.g., beach, mountains" onChange={arr=>{ const c=[...personas]; c[i].favorites = { ...(c[i].favorites||{}), vacations: arr }; setPersonas(c); }} />
    <ChipField wiki label="Vacation Locations" items={p.favorites?.vacationLocations||[]} placeholder="e.g., Paris, Bali" onChange={arr=>{ const c=[...personas]; c[i].favorites = { ...(c[i].favorites||{}), vacationLocations: arr }; setPersonas(c); }} />
  </div>
</div>

{/* Rest of chip sections */}


                <ChipField label="Style" items={p.style||[]} placeholder="Wardrobe / vibe" onChange={(arr)=>{ const c=[...personas]; c[i].style=arr; setPersonas(c); }} />
                <ChipField label="Values" items={p.values||[]} placeholder="Core principles" onChange={(arr)=>{ const c=[...personas]; c[i].values=arr; setPersonas(c); }} />
                <ChipField label="Do's & Don'ts" items={p.dosDonts||[]} placeholder="Guidelines / avoidances" onChange={(arr)=>{ const c=[...personas]; c[i].dosDonts=arr; setPersonas(c); }} />
                <ChipField label="Goals" items={p.goals||[]} placeholder="Short/long-term" onChange={(arr)=>{ const c=[...personas]; c[i].goals=arr; setPersonas(c); }} />
                <ChipField label="Fears" items={p.fears||[]} placeholder="What they avoid" onChange={(arr)=>{ const c=[...personas]; c[i].fears=arr; setPersonas(c); }} />
                <ChipField label="Boundaries" items={p.boundaries||[]} placeholder="Hard no's" onChange={(arr)=>{ const c=[...personas]; c[i].boundaries=arr; setPersonas(c); }} />
                <ChipField label="Tone" items={p.tone||[]} definitions={TONE_DEFS} options={COMMON_TONES} placeholder="e.g., warm & friendly" onChange={(arr)=>{ const c=[...personas]; c[i].tone=arr; setPersonas(c); }} />
{/* AI Behavior (Owner/Manager only) - in-card anchor */}
      <AiBehaviorControls persona={p} onChange={(next)=>{ const c=[...personas]; c[i].aiBehavior=next; setPersonas(c); }} />

                {/* Affiliate Marketing (Bio-like) BELOW Tone */}
                <div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <label style={smallText}>Affiliate Marketing</label>
                    {p.affiliateMarketing?.savedAt ? (
                      <span style={smallText}>
                        {p.affiliateMarketing?.locked ? "Locked" : "Unlocked"} • {new Date(p.affiliateMarketing.savedAt).toLocaleString()}
                      </span>
                    ) : null}
                  </div>
                  <textarea
                    rows={4}
                    disabled={!!p.affiliateMarketing?.locked}
                    style={{ ...inputStyle, maxHeight:140, overflowY:"auto", resize:"vertical", ...(p.affiliateMarketing?.locked ? { background:"#f3f4f6", color:"#6b7280" } : {}) }}
                    value={(p.affiliateMarketing?.text)||""}
                    onChange={e=>{ const c=[...personas]; c[i].affiliateMarketing = { ...(c[i].affiliateMarketing||{text:"",locked:false,savedAt:0}), text: e.target.value }; setPersonas(c); }}
                    placeholder="Program links, offers, talking points"
                  />
                  <div style={{ marginTop:6, display:"flex", alignItems:"center", gap:10 }}>
                    <button
                      type="button"
                      style={primaryBtn}
                      onClick={() => (p.affiliateMarketing?.locked ? unlockAffiliate(p.id) : lockAffiliate(p.id))}
                      disabled={!((p.affiliateMarketing?.text||"").trim()) && !(p.affiliateMarketing?.locked)}
                      title={!((p.affiliateMarketing?.text||"").trim()) && !(p.affiliateMarketing?.locked) ? "Enter some text first" : ""}
                    >
                      {p.affiliateMarketing?.locked ? "Modify" : "Add"}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </CardBoundary>)}
        </div>
        {bioModalIndex!==null && (
          <BioModal name={personas[bioModalIndex]?.name}
                     text={bioTextOf(personas[bioModalIndex])}
                     onClose={()=>setBioModalIndex(null)} />
        )}
      </TabBoundary>
  );
})())}

      {/* ------------ HISTORY (placeholder copy retained) ------------- */}
      
{tab==="history" && (
  <ErrorBoundary>
    <div style={{ padding: 16 }}>

      

{/* Filters toolbar */}
<div style={{ display:"grid", rowGap:8, marginBottom:12 }}>

  {/* Row 0: Master search + clear + results */}
  <div style={{ display:"grid", gridTemplateColumns:"1fr auto auto", gap:8, alignItems:"center" }}>
    <input
      type="text"
      placeholder="Search history…"
      value={hfQ}
      onChange={(e)=>setHfQ(e.target.value)}
      style={{ padding: 10, width: "100%", border: "1px solid #e5e7eb", borderRadius: 10, fontSize: 14 }}
    />
    <button onClick={()=>{ setHfType(""); setHfPersona(""); setHfChannel(""); setHfWho(""); setHfUser(""); setHfQ(""); setHfFrom(""); setHfTo(""); }} style={subtleBtn}>Clear</button>
    <div style={{ alignSelf:"center", color:"#6b7280", fontSize:12 }}>Audit: { (Array.isArray(filteredHistory)? filteredHistory : []).length }</div>
  </div>

  {/* Row 1: Date range + presets + export */}
  <div style={{ display:"grid", gridTemplateColumns:"auto auto auto auto auto 1fr", gap:8, alignItems:"center" }}>
    <label style={{display:"flex",alignItems:"center",gap:6}}>From:
      <input type="date" value={hfFrom} onChange={(e)=>setHfFrom(e.target.value)} style={{ padding: 8, border: "1px solid #e5e7eb", borderRadius: 8 }} />
    </label>
    <label style={{display:"flex",alignItems:"center",gap:6}}>To:
      <input type="date" value={hfTo} onChange={(e)=>setHfTo(e.target.value)} style={{ padding: 8, border: "1px solid #e5e7eb", borderRadius: 8 }} />
    </label>
    <button onClick={()=>{ __setTodayRange(); }} style={subtleBtn}>Today</button>
    <button onClick={()=>{ __setLastNDays(7); }} style={subtleBtn}>Last 7d</button>
    <button onClick={()=>{ __setLastNDays(30); }} style={subtleBtn}>Last 30d</button>
    <div style={{ display:"flex", justifyContent:"flex-end" }}>
      <button
        onClick={() => {
          try {
            const rows = Array.isArray(filteredHistory) ? filteredHistory : [];
            const headers = ["ts","type","persona","channel","who","user","text","screenshot"];
            const screenshotOf = (h) =>
              h.screenshot || h.screenshot_url || h.screenshotUrl ||
              h.image || h.image_url || h.img ||
              (h.attachments && (h.attachments[0]?.url || h.attachments.url)) || "";
            const lines = rows.map(h =>
              headers.map(k => {
                let v =
                  k==="ts" ? (h.ts || h.time || "") :
                  k==="text" ? (h.text || h.message || "") :
                  k==="user" ? (h.user || h.customer || "") :
                  k==="screenshot" ? screenshotOf(h) :
                  (h[k] || "");
                v = String(v).replaceAll('"','""').replaceAll("\r"," ").replaceAll(""," ");
                return '"' + v + '"';
              }).join(",")
            );
            const csv = [headers.join(",")].concat(lines).join("\r");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = "history_export.csv"; a.click();
            URL.revokeObjectURL(url);
          } catch (e) { console.error("Export CSV failed", e); }
        }}
        style={subtleBtn}
      >Export CSV</button>
    </div>
  </div>

  {/* Row 2: Column-aligned dropdowns */}
  <div style={{ display:"grid", gridTemplateColumns:"repeat(5, minmax(140px, 1fr))", gap:8, alignItems:"center" }}>
    <select value={hfType} onChange={(e)=>setHfType(e.target.value)} style={fieldStyle()}>
      <option value="">Type (all)</option>
      {histTypesSorted.map(v => <option key={v} value={v}>{v} ({histTypeCounts.get(v)||0})</option>)}
    </select>
    <select value={hfPersona} onChange={(e)=>setHfPersona(e.target.value)} style={fieldStyle()}>
      <option value="">Persona (all)</option>
      {histPersonasSorted.map(v => <option key={v} value={v}>{v} ({histPersonaCounts.get(v)||0})</option>)}
    </select>
    <select value={hfChannel} onChange={(e)=>setHfChannel(e.target.value)} style={fieldStyle()}>
      <option value="">Channel (all)</option>
      {histChannelsSorted.map(v => <option key={v} value={v}>{v} ({histChannelCounts.get(v)||0})</option>)}
    </select>
    <select value={hfWho} onChange={(e)=>setHfWho(e.target.value)} style={fieldStyle()}>
      <option value="">Who (all)</option>
      {histWhosSorted.map(v => <option key={v} value={v}>{v} ({histWhoCounts.get(v)||0})</option>)}
    </select>
    <select value={hfUser} onChange={(e)=>setHfUser(e.target.value)} style={fieldStyle()}>
      <option value="">User (all)</option>
      {histUsersSorted.map(v => <option key={v} value={v}>{v} ({histUserCounts.get(v)||0})</option>)}
    </select>
  </div>
</div>

      {/* Results table */}
      {filteredHistory.length === 0 ? (
        <div style={{ color:"#6b7280" }}>No matches. Adjust filters or clear to see all.</div>
      ) : (
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:14 }}>
          <thead>
            <tr style={{ background:"#f3f4f6" }}>
              <th style={{ textAlign:"left", padding:8, borderBottom:"1px solid #e5e7eb" }}><SortHeader label="Timestamp" k="ts" /></th>
              <th style={{ textAlign:"left", padding:8, borderBottom:"1px solid #e5e7eb" }}><SortHeader label="Type" k="type" /></th>
              <th style={{ textAlign:"left", padding:8, borderBottom:"1px solid #e5e7eb" }}><SortHeader label="Persona" k="persona" /></th>
              <th style={{ textAlign:"left", padding:8, borderBottom:"1px solid #e5e7eb" }}><SortHeader label="Channel" k="channel" /></th>
              <th style={{ textAlign:"left", padding:8, borderBottom:"1px solid #e5e7eb" }}><SortHeader label="Who" k="who" /></th>
              <th style={{ textAlign:"left", padding:8, borderBottom:"1px solid #e5e7eb" }}><SortHeader label="User" k="user" /></th>
              <th style={{ textAlign:"left", padding:8, borderBottom:"1px solid #e5e7eb" }}><SortHeader label="Message" k="message" /></th>
              <th style={{ textAlign:"left", padding:8, borderBottom:"1px solid #e5e7eb" }}>Screenshot</th>{hfAudit ? <th style={{padding:8}}>Shot debug</th> : null}
            </tr>
          </thead>
          <tbody>
            {((sortedHistory) ?? []).map((h, idx) => (
              <tr key={h.id || idx} style={{ background: idx%2? "#fff":"#f9fafb" }}>
                <td style={{ padding:8, borderBottom:"1px solid #f1f5f9" }}>{new Date(h.ts || h.time || Date.now()).toLocaleString()}</td>
                <td style={{ padding:8, borderBottom:"1px solid #f1f5f9" }}>{h.type || "—"}</td>
                <td style={{ padding:8, borderBottom:"1px solid #f1f5f9" }}>{h.persona || "—"}</td>
                <td style={{ padding:8, borderBottom:"1px solid #f1f5f9" }}>{h.channel || "—"}</td>
                <td style={{ padding:8, borderBottom:"1px solid #f1f5f9" }}>{h.who || "—"}</td>
                <td style={{ padding:8, borderBottom:"1px solid #f1f5f9" }}>{h.user || h.customer || "—"}</td>
                <td style={{ padding:8, borderBottom:"1px solid #f1f5f9", whiteSpace:"pre-wrap" }}>{h.text || h.message || "—"}</td>
                <td style={{ padding:8, borderBottom:"1px solid #f1f5f9" }}>
                  {(__shot(h)) ? (<a href={__shot(h)} target="_blank" rel="noopener noreferrer"><img src={__shot(h)} alt="screenshot" style={{height:36, maxWidth:64, objectFit:"cover", borderRadius:4, border:"1px solid #e5e7eb"}} /></a>) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </ErrorBoundary>
)}

      {/* ------------ TEAM (simplified, keeps assignment) ------------- */}
      {tab==="team" && (
        <div style={{ display:"grid", gap:12 }}>
          {team.map((m,mi)=>(
            <div key={m.id} style={cardStyle}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                <span style={{ width:12, height:12, borderRadius:99, background:(m.name===ownerName || (m.lastSeen && (Date.now()-m.lastSeen)<60000))?"#10b981":"#9ca3af" }} />
                <strong>{m.name}</strong> — role: {m.role==='handler' ? 'QA' : m.role} — {(m.name===ownerName|| (m.lastSeen && (Date.now()-m.lastSeen)<60000))?"online":"away"}
              </div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:8 }}>
                {(m.personas||[]).map((pn,pi)=>(
                  <span key={pn+pi} style={chipStyle}>{pn}
                    <button onClick={()=>{ const c=[...team]; const list=(c[mi].personas||[]).slice(); list.splice(pi,1); c[mi] = { ...c[mi], personas:list }; setTeam(c); }} style={{ background:"none", border:"none", color:"#ef4444" }}>x</button>
                  </span>
                ))}
              </div>
              <select value="" onChange={e=>{ const val=e.target.value; if(!val) return; const c=[...team]; const setP=new Set((c[mi].personas||[])); setP.add(val); c[mi] = { ...c[mi], personas:[...setP] }; setTeam(c); }} style={{ ...inputStyle, width:260 }}>
                <option value="">Assign persona…</option>
                {personaNames.filter(n=> !assignedGlobal.has(n)).map(n=> <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}

      <>
        {/* ------------ USERS & FOLLOWING (placeholders) ------------- */}
        {tab==="users" && (
        <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 16, minHeight: 560 }}>
          {/* Left pane */}
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: 12, borderBottom: "1px solid #f0f2f5" }}>
              <input value={userQ} onChange={e=>setUserQ(e.target.value)} placeholder="Search users…" style={{ width:"100%", padding:"10px 12px", border:"1px solid #e5e7eb", borderRadius: 8, background:"#fafafa" }} />
            </div>
            <div style={{ padding: 8, overflowY: "auto", maxHeight: "calc(100vh - 220px)", paddingRight: 4 }}>
              {filteredUsers.map(u => (
                <div key={u.id} onClick={()=>setSelUser(u)} style={{ display:"grid", gridTemplateColumns:"36px 1fr 120px", alignItems:"center", gap:10, padding:"10px 8px", borderRadius:8, cursor:"pointer", background: selUser && selUser.id===u.id ? "#f3f4f6":"transparent" }}>
                  <div style={{ width:32, height:32, borderRadius:16, background:"#eef2f7", border:"1px solid #e5e7eb" }} />
                  <div>
                    <div style={{ fontWeight:600 }}>{u.username}</div>
                    {!!u.note && (<div style={{ fontSize:12, color:"#6b7280" }}>{u.note}</div>)}
                  </div>
                  <div style={{ justifySelf:"end" }}>
                    <span style={{ padding:"4px 8px", border:"1px solid #e5e7eb", borderRadius:10, background:"#fafafa", fontSize:12 }}>{u.platform}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right pane */}
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, background:"#fff", padding: 12 }}>
            {!selUser && <div style={{ padding: 20, color:"#6b7280" }}>Select a user from the left.</div>}
            {!!selUser && (
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingBottom:8 }}>
                  <div style={{ fontSize:24, fontWeight:700 }}>{selUser.username}</div>
                  <div>
                    <button onClick={addUserLink} style={{ padding:"8px 12px", borderRadius:8, border:"1px solid #e5e7eb", background:"#fff", cursor:"pointer" }}>Link / Merge</button>
                  </div>
                </div>

                {/* Platform chips */}
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
                  {[selUser.platform].filter(Boolean).map(p => (
                    <span key={p} style={{ padding:"4px 10px", border:"1px solid #e5e7eb", borderRadius:10, background:"#fafafa", fontSize:12 }}>{p}</span>
                  ))}
                </div>

                {/* Spend/Engagement chips */}
                <div style={{ border:"1px solid #e5e7eb", borderRadius:12, padding:12, marginBottom:12 }}>
                  <div style={{ fontWeight:700, marginBottom:4 }}>Engagement &amp; Spend (multi-select)</div>
                  <div style={{ color:"#6b7280", fontSize:13, marginBottom:8 }}>Classify how often or how much this user spends</div>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {SPEND_FLAGS.map(flag => {
                      const selected = (userFlags[selUser.id]||[]).includes(flag);
                      return (
                        <button key={flag}
                          onClick={()=>toggleFlag(selUser, flag)}
                          style={{ padding:"6px 12px", borderRadius:10, border:"1px solid " + (selected?"#2563eb":"#e5e7eb"), background: selected?"#2563eb":"#f8fafc", color: selected?"#fff":"#111", fontWeight:selected?700:500, cursor:"pointer" }}>
                          {flag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Linked accounts */}
                <div style={{ border:"1px solid #e5e7eb", borderRadius:12, padding:12, marginBottom:12 }}>
                  <div style={{ fontWeight:700, marginBottom:6 }}>Accounts &amp; Linked Identities</div>
                  <div style={{ fontFamily:"monospace", fontSize:14 }}>
                    {(getLinked(selUser)||[]).map((lnk, i)=>(
  <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 0" }}>
    <div>• {lnk.platform}: {lnk.username}</div>
    <button onClick={()=>unlinkLink(selUser, lnk)} style={{ padding:"6px 10px", border:"1px solid #e5e7eb", borderRadius:8, background:"#fff", cursor:"pointer" }}>Unlink</button>
  </div>
))}
                    {!getLinked(selUser)?.length && <div style={{ color:"#6b7280" }}>No linked accounts yet.</div>}
                  </div>
                </div>

                {/* Suggestions */}
                <div style={{ border:"1px solid #e5e7eb", borderRadius:12, padding:12, marginBottom:12 }}>
                  <div style={{ fontWeight:700, marginBottom:6 }}>Potential matches (confirm to link)</div>
                  {linkSuggestions.map((sug, i)=>(
                    <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 0" }}>
                      <div style={{ fontSize:14 }}>{i+1}) @{sug.username} • {sug.platform} • score {sug.score.toFixed(2)}</div>
                      <div style={{ display:"flex", gap:8 }}>
                        <button onClick={()=>confirmLink(selUser, sug)} style={{ padding:"6px 10px", borderRadius:8, border:"1px solid #e5e7eb", background:"#fff", cursor:"pointer" }}>Confirm</button>
                        <button onClick={()=>dismissLink(selUser, sug)} style={{ padding:"6px 10px", borderRadius:8, border:"1px solid #e5e7eb", background:"#fff", cursor:"pointer" }}>Dismiss</button>
                      </div>
                    </div>
                  ))}
                  {!linkSuggestions.length && (<div style={{ color:"#6b7280" }}>No suggested matches right now.</div>)}
                </div>

                {/* Add User form (inline card) */}
                {addUserOpen && (
                  <div style={{ border:"1px solid #e5e7eb", borderRadius:12, padding:12, marginBottom:12 }}>
                    <div style={{ fontWeight:700, marginBottom:8 }}>Add user</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                      <div>
                        <div style={{ fontSize:12, color:"#6b7280", marginBottom:6 }}>Platform</div>
                        <select value={newUserPlatform} onChange={e=>setNewUserPlatform(e.target.value)}
                                style={{ width:"100%", padding:"10px 12px", border:"1px solid #e5e7eb", borderRadius:8 }}>
                          {PLATFORM_OPTIONS.map(p => (<option key={p} value={p}>{p}</option>))}
                        </select>
                      </div>
                      <div>
                        <div style={{ fontSize:12, color:"#6b7280", marginBottom:6 }}>Username</div>
                        <input value={newUsername} onChange={e=>setNewUsername(e.target.value)} placeholder="Enter username here"
                               style={{ width:"100%", padding:"10px 12px", border:"1px solid #e5e7eb", borderRadius:8 }} />
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:10 }}>
                      <button onClick={createManualUser} style={{ padding:"8px 12px", borderRadius:8, background:"#111827", color:"#fff", border:"1px solid #111827" }}>Create</button>
                      <button onClick={cancelAddUser} style={{ padding:"8px 12px", borderRadius:8, border:"1px solid #e5e7eb", background:"#fff" }}>Cancel</button>
                    </div>
                  </div>
                )}

                {/* Notes & Actions */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div style={{ border:"1px solid #e5e7eb", borderRadius:12, padding:12 }}>
                    <div style={{ fontWeight:700, marginBottom:6 }}>Notes</div>
                    <textarea value={userNotes} onChange={e=>setUserNotes(e.target.value)} placeholder="Add notes for this user…" style={{ width:"100%", height:140, border:"1px solid #e5e7eb", borderRadius:8, padding:8 }} />
                    <div style={{ display:"flex", gap:8, marginTop:8 }}>
                      <button onClick={addNote} style={{ padding:"8px 12px", borderRadius:8, background:"#111827", color:"#fff", border:"1px solid #111827" }}>Add</button>
                      <button onClick={createSummary} style={{ padding:"8px 12px", borderRadius:8, border:"1px solid #e5e7eb", background:"#fff" }}>Create Summary</button>
                    </div>
                    {generatedSummary && (
                      <div style={{ marginTop:10, padding:10, border:"1px dashed #d1d5db", borderRadius:8, background:"#f9fafb" }}>
                        <div style={{ fontWeight:600, marginBottom:4 }}>Summary</div>
                        <div style={{ whiteSpace:"pre-wrap" }}>{generatedSummary}</div>
                      </div>
                    )}
                    <div style={{ marginTop:12 }}>
                      <div style={{ fontWeight:600, marginBottom:6 }}>Saved notes</div>
                      {((notesMap[selUser ? selUser.id : ""] || []).length===0) && <div style={{ color:"#6b7280" }}>No notes yet.</div>}
                      {(notesMap[selUser ? selUser.id : ""] || []).slice().reverse().map((n, idx)=>(
                        <div key={idx} style={{ padding:"8px 10px", border:"1px solid #e5e7eb", borderRadius:8, background:"#fff", marginBottom:8 }}>
                          <div style={{ fontSize:12, color:"#6b7280", marginBottom:4 }}>{formatTs(n.ts || n.createdAt)}</div>
                          <div style={{ whiteSpace:"pre-wrap" }}>{n.text}</div>
                        </div>
                      ))}
                    </div>

                  </div>
                  <div style={{ border:"1px solid #e5e7eb", borderRadius:12, padding:12 }}>
                    <div style={{ fontWeight:700, marginBottom:6 }}>Actions</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                      <button onClick={openAddUser} style={{ padding:"8px 12px", borderRadius:8, border:"1px solid #e5e7eb", background:"#fff" }}>Add user</button>
                      <button onClick={()=>logUI('users','export_csv',{})} style={{ padding:"8px 12px", borderRadius:8, border:"1px solid #e5e7eb", background:"#fff" }}>Export data</button>
                      <button onClick={()=>logUI('users','download_profile_pdf',{})} style={{ padding:"8px 12px", borderRadius:8, border:"1px solid #e5e7eb", background:"#fff" }}>Download profile PDF</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
        {tab==="following" && (
  <div style={{ display:"grid", gridTemplateColumns:"420px 1fr", gap:16, minHeight:560 }}>
    {/* Left pane: Following list */}
    <div style={{ border:"1px solid #e5e7eb", borderRadius:12, background:"#fff", display:"flex", flexDirection:"column", maxHeight:"80vh", overflow:"hidden" }}>
      <div style={{ padding:12, borderBottom:"1px solid #f0f2f5" }}>
        <input value={followingQ} onChange={e=>setFollowingQ(e.target.value)} placeholder="Search accounts..." style={inputStyle} />
        <div style={{ marginTop:10, display:"flex", gap:8 }}>
          <button style={subtleBtn} onClick={()=> setFollowingFormOpen(true)}>Add</button>
          <button style={subtleBtn} onClick={()=>{
            if(!selFollowing) return;
            const id = selFollowing.id;
            const next = (Array.isArray(following)?following:[]).filter(f=>f.id!==id);
            setFollowing(next); save("followingV1", next); setSelFollowing(null); logDomain("following_removed",{id});
          }}>Remove</button>
          <button style={subtleBtn} onClick={()=> setFilterOpen(v=>!v)}>{`Filter${filterCount(filter)?` (${filterCount(filter)})`:``}`}</button>
        </div>
        {filterOpen && (
          <div style={{ marginTop:12, border:"1px solid #e5e7eb", borderRadius:10, padding:12, background:"#fafafa" }}>
            {/* Personas */}
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:12, color:"#6b7280", marginBottom:6 }}>Filter by Persona(s)</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {(Array.isArray(personas)?personas:[]).map(p => {
                  const active = (Array.isArray(filter.personas)?filter.personas:[]).includes(p.id);
                  const style = active ? { ...chipStyle, background:"#111", color:"#fff" } : { ...chipStyle };
                  return <button key={p.id} style={style} onClick={()=> setFilter(f=>({...f, personas: toggleIn(f.personas, p.id)}))}>{p.name||"Unnamed"}</button>;
                })}
                {!((Array.isArray(personas)?personas:[]).length) && (<span style={smallText}>No personas defined.</span>)}
              </div>
            </div>
            {/* Platforms */}
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:12, color:"#6b7280", marginBottom:6 }}>Platforms</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {["X / Twitter","Instagram","TikTok","YouTube","Twitch","Reddit","Other"].map(pl => {
                  const active = (Array.isArray(filter.platforms)?filter.platforms:[]).includes(pl);
                  const style = active ? { ...chipStyle, background:"#111", color:"#fff" } : { ...chipStyle };
                  return <button key={pl} style={style} onClick={()=> setFilter(f=>({...f, platforms: toggleIn(f.platforms, pl)}))}>{pl}</button>;
                })}
              </div>
            </div>
            {/* Account Details */}
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:12, color:"#6b7280", marginBottom:6 }}>Account Details</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {["Aligned Interest","AI Model / Competitor","Follow-back User","Target Prospect"].map(t => {
                  const active = (Array.isArray(filter.tags)?filter.tags:[]).includes(t);
                  const style = active ? { ...chipStyle, background:"#111", color:"#fff" } : { ...chipStyle };
                  return <button key={t} style={style} onClick={()=> setFilter(f=>({...f, tags: toggleIn(f.tags, t)}))}>{t}</button>;
                })}
              </div>
            </div>
            {/* Toggles */}
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <label style={{ display:"flex", alignItems:"center", gap:6 }}>
                <input type="checkbox" checked={filter.hasAligned===true} onChange={e=> setFilter(f=>({...f, hasAligned: e.target.checked ? true : null}))} />
                <span>Aligned interests only</span>
              </label>
              <label style={{ display:"flex", alignItems:"center", gap:6 }}>
                <input type="checkbox" checked={filter.hasNotes===true} onChange={e=> setFilter(f=>({...f, hasNotes: e.target.checked ? true : null}))} />
                <span>With notes</span>
              </label>
              <button style={subtleBtn} onClick={()=> setFilter({ personas:[], platforms:[], tags:[], hasAligned:null, hasNotes:null })}>Clear</button>
            </div>
          </div>
        )}
        {followingFormOpen && (
          <div style={{ marginTop:12, border:"1px solid #e5e7eb", borderRadius:10, padding:12, background:"#fafafa" }}>
            <div style={{ display:"grid", gridTemplateColumns:"180px 1fr", gap:12, alignItems:"center" }}>
              <div>
                <div style={{ fontSize:12, color:"#6b7280", marginBottom:6 }}>Platform</div>
                <select value={followingForm.platform} onChange={e=>setFollowingForm(v=>({...v, platform:e.target.value}))} style={{ ...inputStyle, height:38 }}>
                  {["X / Twitter","Instagram","TikTok","YouTube","Twitch","Reddit","Other"].map(p=> <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:12, color:"#6b7280", marginBottom:6 }}>Username</div>
                <input value={followingForm.username} onChange={e=>setFollowingForm(v=>({...v, username:e.target.value}))} placeholder="Enter username here" style={inputStyle} />
              </div>
            </div>
            <div style={{ marginTop:12, display:"flex", gap:8 }}>
              <button style={primaryBtn} onClick={createFollowingFromForm}>Create</button>
              <button style={subtleBtn} onClick={resetFollowingForm}>Cancel</button>
            </div>
          </div>
        )}
      </div>
      <div style={{ padding:8, overflowY:"auto", flex:1 }}>
        {(filteredFollowing||[]).map(acc => (
          <div key={acc?.id||uid()} onClick={()=>setSelFollowing(acc)} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:8, cursor:"pointer", background: (selFollowing && acc && selFollowing.id===acc.id) ? "#f3f4f6" : "transparent" }}>
            <div style={{ width:32, height:32, borderRadius:16, background:"#eef2f7", border:"1px solid #e5e7eb" }} />
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600 }}>{acc?.username||"—"}</div>
              <div style={smallText}>{acc?.platform||"—"}</div>
            </div>
            <span style={{ ...chipStyle }}>{Array.isArray(acc?.tags)&&acc.tags.length?acc.tags[0]:""}</span>
          </div>
        ))}
        {(!filteredFollowing || filteredFollowing.length===0) && (<div style={{ padding:10, color:"#6b7280" }}>No accounts found.</div>)}
      </div>
    </div>

    {/* Right pane: Account details + Prospecting */}
    <div style={{ display:"grid", gridTemplateRows:"minmax(260px,auto) 1fr", gap:16 }}>
      {/* Account Details */}
      <div style={cardStyle}>
        {selFollowing ? (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:22, fontWeight:700 }}>{selFollowing?.username||"—"}</div>
                <div style={smallText}>{selFollowing?.platform||"—"}</div>
              </div>
              <button style={subtleBtn} onClick={()=>{
                const plat = (selFollowing?.platform||"").toLowerCase();
                const handle = selFollowing?.username||"";
                let url = selFollowing?.url || "";
                if(!url){
                  if(plat.includes("twitter")) url = "https://twitter.com/" + handle;
                  else url = handle ? ("https://www.google.com/search?q=" + encodeURIComponent(handle)) : "https://google.com";
                }
                try{ window.open(url, "_blank"); }catch(e){}
                logUI("following","open_profile",{username:selFollowing?.username||"", platform:selFollowing?.platform||""});
              }}>Open profile</button>
            </div>

            {/* Multi-select account details */}
            <div style={{ marginTop:12 }}>
              <div style={{ fontWeight:700, marginBottom:8 }}>Account Details</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {["Aligned Interest","AI Model / Competitor","Follow-back User","Target Prospect"].map(t => {
                  const tags = Array.isArray(selFollowing?.tags) ? selFollowing.tags : (selFollowing?.type ? [selFollowing.type] : []);
                  const checked = tags.includes(t);
                  return (
                    <label key={t} style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <input type="checkbox" checked={checked} onChange={()=>{
                        const cur = Array.isArray(selFollowing?.tags) ? selFollowing.tags.slice() : (selFollowing?.type ? [selFollowing.type] : []);
                        const nextTags = checked ? cur.filter(x=>x!==t) : [...cur, t];
                        setSelFollowing(prev => prev ? ({...prev, tags: nextTags}) : prev);
                        const updated = (Array.isArray(following)?following:[]).map(f => f.id===selFollowing.id ? ({...f, tags: nextTags}) : f);
                        setFollowing(updated); save("followingV1", updated);
                        logDomain("following_tags_updated", { id: selFollowing.id, tags: nextTags });
                      }} />
                      <span>{t}</span>
                    </label>
                  );
                })}
              </div>

              {/* Aligned interests chip editor */}
              {(() => {
                const tags = Array.isArray(selFollowing?.tags) ? selFollowing.tags : (selFollowing?.type ? [selFollowing.type] : []);
                const showAligned = tags.includes("Aligned Interest");
                if (!showAligned) return null;
                const aligned = Array.isArray(selFollowing?.aligned) ? selFollowing.aligned : [];
                let inputRef;
                return (
                  <div style={{ marginTop:12 }}>
                    <div style={{ fontWeight:700, marginBottom:8 }}>Aligned interests</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:8 }}>
                      {aligned.map((w, i) => (
                        <span key={w+i} style={{ ...chipStyle }}>
                          {w}
                          <button onClick={()=>{
                            const nextAligned = aligned.filter((x,ix)=> ix!==i);
                            setSelFollowing(prev => prev ? ({...prev, aligned: nextAligned}) : prev);
                            const updated = (Array.isArray(following)?following:[]).map(f => f.id===selFollowing.id ? ({...f, aligned: nextAligned}) : f);
                            setFollowing(updated); save("followingV1", updated);
                            logDomain("aligned_interest_removed",{ id: selFollowing.id, word: w });
                          }} style={{ marginLeft:6, background:"none", border:"none", color:"#ef4444", cursor:"pointer" }}>×</button>
                        </span>
                      ))}
                      {!aligned.length && (<span style={smallText}>No aligned interests yet.</span>)}
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:8 }}>
                      <input list="alignedOptsList" placeholder="Add an aligned interest…" style={inputStyle}
                             ref={el => (inputRef = el)} />
                      <button style={primaryBtn} onClick={()=>{
                        const v = (inputRef && inputRef.value || "").trim();
                        if(!v) return;
                        const nextAligned = Array.from(new Set([...(aligned||[]), v]));
                        const updated = (Array.isArray(following)?following:[]).map(f => f.id===selFollowing.id ? ({...f, aligned: nextAligned}) : f);
                        setSelFollowing(prev => prev ? ({...prev, aligned: nextAligned}) : prev);
                        setFollowing(updated); save("followingV1", updated);
                        persistAlignedOpts([...(alignedOpts||[]), v]);
                        if (inputRef) inputRef.value="";
                        logDomain("aligned_interest_added",{ id: selFollowing.id, word: v });
                      }}>Add</button>
                    </div>
                    <datalist id="alignedOptsList">
                      {(alignedOpts||[]).map(opt => (<option key={opt} value={opt} />))}
                    </datalist>
                  </div>
                );
              })()}

              {/* Personas following (multi-select toggle chips) */}
              <div style={{ marginTop:12 }}>
                <div style={{ fontWeight:700, marginBottom:8 }}>Personas following</div>
                {(Array.isArray(personas) && personas.length) ? (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                    {(personas||[]).map(p => {
                      const arr = Array.isArray(selFollowing?.personaIds) ? selFollowing.personaIds : [];
                      const active = arr.includes(p.id);
                      const style = active ? { ...chipStyle, background:"#111", color:"#fff" } : { ...chipStyle };
                      return (
                        <button key={p.id} style={style} onClick={()=>{
                          const cur = Array.isArray(selFollowing?.personaIds) ? [...selFollowing.personaIds] : [];
                          const next = active ? cur.filter(id=>id!==p.id) : [...cur, p.id];
                          setSelFollowing(prev => prev ? ({...prev, personaIds: next}) : prev);
                          const updated = (Array.isArray(following)?following:[]).map(f => f.id===selFollowing.id ? ({...f, personaIds: next}) : f);
                          setFollowing(updated); save("followingV1", updated);
                          logDomain("following_personas_updated",{ id: selFollowing.id, personas: next });
                        }}>{p.name || "Unnamed"}</button>
                      );
                    })}
                  </div>
                ) : (
                  <div style={smallText}>No personas yet — add some in the Personas tab.</div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginTop:12 }}>
              <div style={{ fontWeight:700, marginBottom:8 }}>Notes</div>
              <textarea
                value={selFollowing?.notes||""}
                onChange={e=> setSelFollowing(prev=> prev ? ({...prev, notes:e.target.value}) : prev)}
                onBlur={()=>{
                  if(!selFollowing) return;
                  const next = (Array.isArray(following)?following:[]).map(f=> f.id===selFollowing.id ? ({ ...f, notes: (selFollowing.notes||"") }) : f);
                  setFollowing(next); save("followingV1", next);
                  logDomain("following_note_saved",{id: selFollowing.id, len: (selFollowing.notes||"").length});
                }}
                placeholder="Add notes about this account..."
                style={{ ...inputStyle, minHeight:120, resize:"vertical" }}
              />
            </div>
          </div>
        ) : (
          <div>Select an account on the left.</div>
        )}
      </div>

      {/* Prospecting */}
      <div style={cardStyle}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontWeight:700 }}>Prospecting</div>
          <div><button style={subtleBtn} onClick={()=> setProspectFormOpen(true)}>Add</button></div>
        </div>

        {prospectFormOpen && (
          <div style={{ marginTop:12, border:"1px solid #e5e7eb", borderRadius:10, padding:12, background:"#fafafa" }}>
            <div style={{ display:"grid", gridTemplateColumns:"180px 1fr", gap:12, alignItems:"center" }}>
              <div>
                <div style={{ fontSize:12, color:"#6b7280", marginBottom:6 }}>Platform</div>
                <select value={prospectForm.platform} onChange={e=>setProspectForm(v=>({...v, platform:e.target.value}))} style={{ ...inputStyle, height:38 }}>
                  {["X / Twitter","Instagram","TikTok","YouTube","Twitch","Reddit","Other"].map(p=> <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:12, color:"#6b7280", marginBottom:6 }}>Username</div>
                <input value={prospectForm.username} onChange={e=>setProspectForm(v=>({...v, username:e.target.value}))} placeholder="Enter username here" style={inputStyle} />
              </div>
            </div>

            {/* Prospect tags */}
            <div style={{ marginTop:12 }}>
              <div style={{ fontSize:12, color:"#6b7280", marginBottom:6 }}>Account Details</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {["Aligned Interest","AI Model / Competitor","Follow-back User","Target Prospect"].map(t => {
                  const tags = Array.isArray(prospectForm.tags) ? prospectForm.tags : [];
                  const checked = tags.includes(t);
                  return (
                    <label key={t} style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <input type="checkbox" checked={checked} onChange={()=>{
                        const cur = Array.isArray(prospectForm.tags) ? [...prospectForm.tags] : [];
                        const next = checked ? cur.filter(x=>x!==t) : [...cur, t];
                        setProspectForm(v=>({...v, tags: next}));
                      }} />
                      <span>{t}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Prospect aligned interests */}
            {Array.isArray(prospectForm.tags) && prospectForm.tags.includes("Aligned Interest") && (
              <div style={{ marginTop:12 }}>
                <div style={{ fontSize:12, color:"#6b7280", marginBottom:6 }}>Aligned interests</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:8 }}>
                  {(prospectForm.aligned||[]).map((w,i)=>(
                    <span key={w+i} style={{ ...chipStyle }}>
                      {w}
                      <button onClick={()=>{
                        const next = (prospectForm.aligned||[]).filter((_,ix)=>ix!==i);
                        setProspectForm(v=>({...v, aligned: next}));
                      }} style={{ marginLeft:6, background:"none", border:"none", color:"#ef4444", cursor:"pointer" }}>×</button>
                    </span>
                  ))}
                  {!((prospectForm.aligned||[]).length) && (<span style={smallText}>No aligned interests yet.</span>)}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:8 }}>
                  <input list="alignedOptsList" placeholder="Add an aligned interest…" style={inputStyle} id="prospectAlignedInput" />
                  <button style={primaryBtn} onClick={()=>{
                    const el = document.getElementById("prospectAlignedInput");
                    const v = (el && el.value || "").trim();
                    if(!v) return;
                    const next = Array.from(new Set([...(prospectForm.aligned||[]), v]));
                    setProspectForm(p=>({...p, aligned: next}));
                    persistAlignedOpts([...(alignedOpts||[]), v]);
                    if(el) el.value="";
                  }}>Add</button>
                </div>
              </div>
            )}

            <div style={{ marginTop:12, display:"flex", gap:8 }}>
              <button style={primaryBtn} onClick={createProspectFromForm}>Create</button>
              <button style={subtleBtn} onClick={()=>{ setProspectFormOpen(false); setProspectForm({ platform: "X / Twitter", username:"", tags: [], aligned: [] }); }}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ marginTop:10 }}>
          <input value={prospectQ} onChange={e=>setProspectQ(e.target.value)} placeholder="Search by name or handle…" style={inputStyle} />
        </div>
        <div style={{ marginTop:10, borderTop:"1px solid #eee" }} />
        <div style={{ marginTop:10, display:"grid", gap:8, maxHeight:240, overflowY:"auto" }}>
          {(filteredProspects||[]).map(p => (
            <div key={p?.id||uid()} style={{ background:"transparent" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr auto auto", gap:8, alignItems:"center", padding:"8px 10px", background:"#fff", border:"1px solid #e5e7eb", borderRadius:8 }}>
                <div>
                  <div style={{ fontWeight:600 }}>{p?.username||"—"}</div>
                  <div style={smallText}>{p?.platform||"—"} · {p?.status||"queued"}</div>
                </div>
                <button style={subtleBtn} onClick={()=> setExpandedProspectId(expandedProspectId===p?.id ? null : (p?.id||"")) }>{expandedProspectId===p?.id ? "Hide" : "Details"}</button>
                <button style={subtleBtn} onClick={()=>{
                  const f = { id: uid(), username: p?.username||"", platform: p?.platform||"X / Twitter", tags: Array.isArray(p?.tags)?p.tags:[], aligned: Array.isArray(p?.aligned)?p.aligned:[], notes:"", personaIds: [] };
                  const nextF = [ ...(Array.isArray(following)?following:[]), f ];
                  setFollowing(nextF); save("followingV1", nextF);
                  const nextP = (Array.isArray(prospects)?prospects:[]).filter(pp=>pp.id!==(p?.id));
                  setProspects(nextP); save("prospectsV1", nextP);
                  setSelFollowing(f);
                  logDomain("prospect_promoted",{username:p?.username||"", platform:p?.platform||""});
                }}>Add to Following</button>
              </div>
              {expandedProspectId===p?.id && (
                <div style={{ padding:"10px 12px 2px 12px" }}>
                  {/* Tags editor */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                    {["Aligned Interest","AI Model / Competitor","Follow-back User","Target Prospect"].map(t => {
                      const tags = Array.isArray(p?.tags)?p.tags:[];
                      const checked = tags.includes(t);
                      return (
                        <label key={t} style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <input type="checkbox" checked={checked} onChange={()=>{
                            const cur = Array.isArray(p?.tags) ? [...p.tags] : [];
                            const next = checked ? cur.filter(x=>x!==t) : [...cur, t];
                            const updated = (Array.isArray(prospects)?prospects:[]).map(pp => pp.id===p.id ? ({...pp, tags: next}) : pp);
                            setProspects(updated); save("prospectsV1", updated);
                            logDomain("prospect_tags_updated",{ id: p.id, tags: next });
                          }} />
                          <span>{t}</span>
                        </label>
                      );
                    })}
                  </div>
                  {/* Aligned interests if selected */}
                  {Array.isArray(p?.tags) && p.tags.includes("Aligned Interest") && (
                    <div style={{ marginTop:8 }}>
                      <div style={{ fontSize:12, color:"#6b7280", marginBottom:6 }}>Aligned interests</div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:8 }}>
                        {(Array.isArray(p?.aligned)?p.aligned:[]).map((w,i)=>(
                          <span key={w+i} style={{ ...chipStyle }}>
                            {w}
                            <button onClick={()=>{
                              const next = (Array.isArray(p?.aligned)?p.aligned:[]).filter((_,ix)=>ix!==i);
                              const updated = (Array.isArray(prospects)?prospects:[]).map(pp => pp.id===p.id ? ({...pp, aligned: next}) : pp);
                              setProspects(updated); save("prospectsV1", updated);
                              logDomain("prospect_aligned_removed",{ id: p.id, word: w });
                            }} style={{ marginLeft:6, background:"none", border:"none", color:"#ef4444", cursor:"pointer" }}>×</button>
                          </span>
                        ))}
                        {!(Array.isArray(p?.aligned)?p.aligned:[]).length && (<span style={smallText}>No aligned interests yet.</span>)}
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:8 }}>
                        <input list="alignedOptsList" placeholder="Add an aligned interest…" style={inputStyle} id={"pAligned_"+(p?.id||"tmp")} />
                        <button style={primaryBtn} onClick={()=>{
                          const el = document.getElementById("pAligned_"+(p?.id||"tmp"));
                          const v = (el && el.value || "").trim();
                          if(!v) return;
                          const base = Array.isArray(p?.aligned)?p.aligned:[];
                          const next = Array.from(new Set([...base, v]));
                          const updated = (Array.isArray(prospects)?prospects:[]).map(pp => pp.id===p.id ? ({...pp, aligned: next}) : pp);
                          setProspects(updated); save("prospectsV1", updated);
                          persistAlignedOpts([...(alignedOpts||[]), v]);
                          if(el) el.value="";
                          logDomain("prospect_aligned_added",{ id: p.id, word: v });
                        }}>Add</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {(!filteredProspects || filteredProspects.length===0) && (<div style={{ color:"#6b7280" }}>No prospects yet.</div>)}
        </div>
      </div>
    </div>
  </div>
)}
      </>
      
{tab === 'admin' && (
  <>
    <ErrorBoundary label="Persona Management">
      <AdminSafe personas={personas} setPersonas={setPersonas} archivedPersonas={archivedPersonas} archivePersonaById={archivePersonaById} unarchivePersonaById={unarchivePersonaById} goTab={goTab} team={team} setTeam={setTeam} />
    </ErrorBoundary>
    <ErrorBoundary label="Admin Widgets">
      <AdminWidgets />
    </ErrorBoundary>
  </>
)}

      {/* Full-bleed color input swatch styling */}
      <style>{`
        .colorBox{
          -webkit-appearance: none;
          appearance: none;
          border: none;
          padding: 0;
          width: 44px;
          height: 44px;
          border-radius: 10px;
          cursor: pointer;
          background: transparent;
        }
        .colorBox::-webkit-color-swatch-wrapper { padding:0; border-radius:10px; }
        .colorBox::-webkit-color-swatch { border:none; border-radius:10px; }
        .colorBox::-moz-color-swatch { border:none; border-radius:10px; }
      `}</style>
      {/* Inline User Peek */}
      {showUserPeek ? (
        <UserPeekModal
          user={{ username: peekUser.username, platform: peekUser.platform }}
          onClose={()=>setShowUserPeek(false)}
          onOpenInUsers={()=>{ setTab("users"); try{ setUserQ(peekUser.username||""); setTimeout(()=>{ try{ const list=(filteredUsers||[]); const match=list.find(u => (u.username||"").toLowerCase()===(peekUser.username||"").toLowerCase()); if(match) setSelUser(match); }catch(_){ } },60); }catch(_){ } setShowUserPeek(false); }}
          engagement={(userFlags && userFlags[(peekUser.platform||"app")+"::"+(peekUser.username||"")]) || []}
          accounts={(typeof getLinked!=="undefined" && getLinked) ? getLinked({ id: (peekUser.platform||"app")+"::"+(peekUser.username||"") }) : []}
          matches={(()=>{ try{ const id=(peekUser.platform||"app")+"::"+(peekUser.username||""); const base=String(peekUser.username||"").replace(/[^a-z0-9]/ig,"").toLowerCase(); const list=(typeof allUsers!=="undefined" && allUsers) ? (allUsers||[]) : []; return list.filter(u=>u.id!==id).map(u=>({ platform:u.platform||"app", handle:u.username, score:(String(u.username||"").replace(/[^a-z0-9]/ig,"").toLowerCase()===base)?0.86:0.55 })).filter(s=>s.score>0.6).slice(0,3);}catch(_){ return []; }})()}
          latestNote={(()=>{ try{ const id=(peekUser.platform||"app")+"::"+(peekUser.username||""); const arr=(typeof notesMap!=="undefined" && notesMap && notesMap[id])||[]; return arr.length ? (arr[arr.length-1].text||"") : ""; }catch(_){ return ""; }})()}
          notesMap={notesMap} persistNotes={persistNotes} />
      ) : null}
    </div>

  );
}

function UserPeekModal({ user, onClose, onOpenInUsers, engagement = [], accounts = [], matches = [], latestNote = "", notesMap = {}, persistNotes }) {
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteText, setNoteText] = useState("");

  if (!user) return null;
  const handle = user.username || "";
  const platform = user.platform || "";
  const chips = Array.isArray(engagement) && engagement.length ? engagement : ["Unclassified"];
  const noteSnippet = (latestNote || "").replace(/\s+/g, " ").trim();

  function handleSaveNote() {
    const t = (noteText || "").trim();
    if (!t) return;
    const id = (platform || "app") + "::" + (handle || "");
    try {
      const entry = { ts: Date.now(), text: t };
      const prev = (notesMap && notesMap[id]) ? notesMap[id] : [];
      const next = { ...(notesMap||{}), [id]: [...prev, entry] };
      if (typeof persistNotes === "function") { persistNotes(next); }
      try { logUI && logUI("user_peek", "user_note_saved", { platform, handle, length: t.length }); } catch (_){}
    } catch(_){ }
    setShowAddNote(false);
    setNoteText("");
  }

  return (
    <div role="dialog" onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.12)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div onClick={(e)=>e.stopPropagation()} style={{ width:560, maxWidth:"92vw", border:"1px solid #e5e7eb", borderRadius:12, background:"#fff", boxShadow:"0 10px 30px rgba(0,0,0,0.15)", overflow:"hidden" }}>
        <div style={{ padding:"12px 16px", borderBottom:"1px solid #eee", fontWeight:700 }}>User Peek</div>

        <div style={{ padding:16 }}>
          <div style={{ display:"flex", gap:12, alignItems:"center" }}>
            <div style={{ width:64, height:64, borderRadius:12, background:"#f7f7f8", border:"1px solid #eee", display:"grid", placeItems:"center", color:"#9aa0a6" }}>IMG</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:20, fontWeight:700 }}>@{handle}</div>
              <div style={{ display:"inline-flex", gap:8, marginTop:6 }}>
                <span style={{ padding:"6px 10px", borderRadius:999, border:"1px solid #e5e7eb", background:"#f9fafb" }}>{platform || "app"}</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop:12 }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:6 }}>Engagement &amp; Spend</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {chips.map((tag,i)=>(
                <span key={i} style={{ fontSize:12, padding:"6px 10px", borderRadius:999, background:"#eef2ff", border:"1px solid #e5e7eb" }}>{tag}</span>
              ))}
            </div>
          </div>

          <div style={{ marginTop:12 }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:6 }}>Accounts &amp; Linked Identities</div>
            <div style={{ color:"#6b7280", fontSize:13 }}>
              {accounts && accounts.length ? (
                <span>
                  {accounts.slice(0,3).map((a,i)=> ((a.platform||"app")+": @"+(a.username||a.handle||"") + " ")).join("")}
                  {accounts.length>3 ? ("+"+(accounts.length-3)+" more") : ""}
                </span>
              ) : "No linked accounts yet."}
            </div>
          </div>

          <div style={{ marginTop:12 }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:6 }}>Potential matches (confirm to link)</div>
            <div style={{ color:"#6b7280", fontSize:13 }}>
              {matches && matches.length ? (
                <span>
                  {matches.slice(0,3).map((m,i)=> ((m.platform||"app")+": @"+(m.username||m.handle||"") + " ")).join("")}
                  {matches.length>3 ? ("+"+(matches.length-3)+" more") : ""}
                </span>
              ) : "No suggested matches right now."}
            </div>
          </div>

          <div style={{ marginTop:12 }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:6 }}>Latest note</div>
            <div style={{ padding:10, borderRadius:8, border:"1px solid #eef2f7", background:"#fbfdff", minHeight:40 }}>
              {noteSnippet || <span style={{ color:"#6b7280", fontSize:13 }}>No notes yet.</span>}
            </div>
          </div>
        </div>

        <div style={{ display:"flex", gap:12, justifyContent:"flex-end", padding:16, borderTop:"1px solid #eee" }}>
          <button onClick={()=>setShowAddNote(true)} style={{ padding:"10px 14px", borderRadius:10, border:"1px solid #e5e7eb", background:"#fff", cursor:"pointer" }}>Add Note</button>
          <button onClick={onOpenInUsers} style={{ padding:"10px 14px", borderRadius:10, border:"1px solid #e5e7eb", background:"#fff", cursor:"pointer" }}>Open in Users</button>
          <button onClick={onClose} style={{ padding:"10px 14px", borderRadius:10, border:"1px solid #111", background:"#111", color:"#fff", fontWeight:600, cursor:"pointer" }}>Close</button>
        </div>

        {showAddNote ? (
          <div role="dialog" onClick={()=>setShowAddNote(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.25)", zIndex:1100, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
            <div onClick={(e)=>e.stopPropagation()} style={{ width:480, maxWidth:"92vw", border:"1px solid #e5e7eb", borderRadius:12, background:"#fff", boxShadow:"0 10px 30px rgba(0,0,0,0.2)", overflow:"hidden" }}>
              <div style={{ padding:"12px 16px", borderBottom:"1px solid #eee", fontWeight:700 }}>Add Note</div>
              <div style={{ padding:16 }}>
                <textarea value={noteText} onChange={(e)=>setNoteText(e.target.value)} style={{ width:"100%", minHeight:120, border:"1px solid #d1d5db", borderRadius:8, padding:8 }} placeholder="Write a note about this user…"/>
              </div>
              <div style={{ display:"flex", gap:12, justifyContent:"flex-end", padding:16, borderTop:"1px solid #eee" }}>
                <button onClick={()=>setNoteText("")} style={{ padding:"8px 14px", borderRadius:8, border:"1px solid #e5e7eb" }}>Clear</button>
                <button onClick={handleSaveNote} style={{ padding:"8px 14px", borderRadius:8, border:"1px solid #111", background:"#111", color:"#fff" }}>Save</button>
                <button onClick={()=>setShowAddNote(false)} style={{ padding:"8px 14px", borderRadius:8, border:"1px solid #e5e7eb" }}>Cancel</button>
              </div>
            </div>
          </div>
        ) : null}

      </div>
    </div>
  );
}


// === Admin Team Management Widget (mirrors Persona Management) =====================
function AdminTeamSafe({ team, setTeam }){
  const { useState, useEffect } = React;

  // --- styles (clone of AdminSafe small/input/btn/subtle/card) ---
  const small = { fontSize:12, color:"#4b5563" };
  const input = { border:"1px solid #e5e7eb", borderRadius:10, padding:"10px 12px", outline:"none", width:"100%" };
  const btn = { border:"1px solid #0d9488", background:"#0d9488", color:"#fff", borderRadius:10, padding:"10px 12px", fontWeight:700, cursor:"pointer" };
  const subtle = { border:"1px solid #cbd5e1", background:"#f1f5f9", color:"#111827", borderRadius:10, padding:"10px 12px", fontWeight:600, cursor:"pointer" };
  const card = { border:"1px solid #e5e7eb", borderRadius:12, padding:14, background:"#fafafa" };

  // --- state & persistence ---
  const teamMembers = Array.isArray(team) ? team : [];
  const [archivedTeamMembers, setArchivedTeamMembers] = useState(()=>{
    try { return JSON.parse(localStorage.getItem("ptd_team_members_archived") || "[]"); } catch { return []; }
  });
  
  useEffect(()=>{ try{ localStorage.setItem("ptd_team_members_archived", JSON.stringify(archivedTeamMembers)); }catch{} }, [archivedTeamMembers]);

  // --- controlled selects ---
  const [archiveId, setArchiveId] = useState(teamMembers?.[0]?.id || "");
  const [unarchiveId, setUnarchiveId] = useState(archivedTeamMembers?.[0]?.id || "");
  useEffect(() => { setArchiveId(teamMembers?.[0]?.id || ""); }, [teamMembers]);
  useEffect(() => { setUnarchiveId(archivedTeamMembers?.[0]?.id || ""); }, [archivedTeamMembers]);

  // --- helpers ---
  function dedupeById(list){
    const seen = new Set();
    return (Array.isArray(list)?list:[]).filter(p => {
      const k = String(p?.id ?? "");
      if (seen.has(k)) return false;
      seen.add(k); return true;
    });
  }
  const uid = () => String(Date.now()) + "_" + Math.random().toString(36).slice(2,8);

  // --- archive / unarchive (race-free) ---
  function archiveTeamMemberById(id){
    try{ logDomain && logDomain("team_member_archive_requested",{ id:String(id) }); }catch{};
    setTeam(prev => {
      const list = Array.isArray(prev) ? prev : [];
      const idx = list.findIndex(p => String(p?.id) === String(id));
      if (idx === -1) { try{ logDomain && logDomain("team_member_archive_failed",{ id:String(id) }); }catch{}; return prev; }
      const moved = list[idx];
      setArchivedTeamMembers(aprev => dedupeById([...(Array.isArray(aprev)?aprev:[]), moved]));
      try{ logDomain && logDomain("team_member_archive_succeeded",{ id:String(id), member: moved?.name||"" }); }catch{};
      const next = list.slice(0, idx).concat(list.slice(idx+1));
      return next;
    });
  }
  function unarchiveTeamMemberById(id){
    try{ logDomain && logDomain("team_member_unarchive_requested",{ id:String(id) }); }catch{};
    setArchivedTeamMembers(prev => {
      const list = Array.isArray(prev) ? prev : [];
      const idx = list.findIndex(p => String(p?.id) === String(id));
      if (idx === -1) { try{ logDomain && logDomain("team_member_unarchive_failed",{ id:String(id) }); }catch{}; return prev; }
      const moved = list[idx];
      setTeam(pPrev => dedupeById([...(Array.isArray(pPrev)?pPrev:[]), moved]));
      try{ logDomain && logDomain("team_member_unarchive_succeeded",{ id:String(id), member: moved?.name||"" }); }catch{};
      const next = list.slice(0, idx).concat(list.slice(idx+1));
      return next;
    });
  }

  // --- create team member ---
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("Operator");
  const [newPerms, setNewPerms] = useState([]);
  const [newAvatar, setNewAvatar] = useState("");
  function togglePerm(k){
    setNewPerms(prev => prev.includes(k) ? prev.filter(x=>x!==k) : [...prev, k]);
  }
  async function onAvatar(e){
    const f = e?.target?.files?.[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = ev => { setNewAvatar(String(ev.target.result||"")); };
    reader.readAsDataURL(f);
  }
  function createMember(){
    if(!newName.trim() || !/^[^@]+@[^@]+$/.test(newEmail.trim())){
      alert("Name and a valid email are required."); return;
    }
    try{ logDomain && logDomain("team_member_create_requested",{}); }catch{};
    const member = {
      id: uid(),
      name: newName.trim(),
      email: newEmail.trim(),
      role: newRole,
      permissions: newPerms.slice(0),
      avatarUrl: newAvatar || "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setTeam(prev => dedupeById([...(Array.isArray(prev)?prev:[]), member]));
    try{ logDomain && logDomain("team_member_create_succeeded",{ member: member.name }); }catch{};
    // reset inputs (keep avatar in case user wants to reuse)
    setNewName(""); setNewEmail(""); setNewRole("Operator"); setNewPerms([]);
  }

  return (
    <div style={card}>
      <div role="heading" aria-level={2} style={{ fontSize:18, fontWeight:800, letterSpacing:0.2, marginBottom:10 }}>Team Management</div>

      <div style={{ fontWeight:700, marginBottom:6 }}>Archive / Unarchive</div>
      <div style={{ display:"grid", gap:12 }}>
        <div>
          <div style={small}>Archive an active team member</div>
          <div style={{ display:"flex", gap:8 }}>
            <select id="team-archive-select" aria-label="Select active team member to archive" style={{ ...input, flex:1 }}
                    value={archiveId} onChange={e=>setArchiveId(e.target.value)}>
              {(Array.isArray(teamMembers)?teamMembers:[]).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button style={btn} title="Archive selected team member" onClick={()=>{ const id = String(archiveId||""); if(id) archiveTeamMemberById(id); }} type="button">Archive</button>
          </div>
        </div>

        <div>
          <div style={small}>Unarchive a team member</div>
          <div style={{ display:"flex", gap:8 }}>
            <select id="team-unarchive-select" aria-label="Select archived team member to restore" style={{ ...input, flex:1 }}
                    value={unarchiveId} onChange={e=>setUnarchiveId(e.target.value)}>
              {(Array.isArray(archivedTeamMembers)?archivedTeamMembers:[]).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button style={subtle} title="Unarchive selected team member" onClick={()=>{ const id = String(unarchiveId||""); if(id) unarchiveTeamMemberById(id); }} type="button">Unarchive</button>
          </div>
          <div style={{ ...small, marginTop:6 }}>Archived count: {(archivedTeamMembers||[]).length}</div>
        </div>
      </div>

      <div style={{ fontWeight:700, margin:"14px 0 6px" }}>Create Team Member</div>
      <div style={{ display:"grid", gridTemplateColumns:"96px 1fr", gap:12, alignItems:"center" }}>
        <div style={{ width:84, height:84, borderRadius:12, border:"1px solid #e5e7eb", overflow:"hidden", display:"grid", placeItems:"center", background:"#f3f4f6" }}>
          {newAvatar ? <img src={newAvatar} alt="avatar" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : <div style={{ color:"#6b7280" }}>img</div>}
        </div>
        <div style={{ display:"grid", gap:8 }}>
          <div style={{ display:"grid", gap:6 }}>
            <label style={small}>Display name (required)</label>
            <input style={input} value={newName} onChange={e=>setNewName(e.target.value)} placeholder="e.g., Jordan Carter"/>
          </div>
          <div style={{ display:"grid", gap:6 }}>
            <label style={small}>Email (required)</label>
            <input style={input} value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="name@example.com"/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <div>
              <label style={small}>Role</label>
              <select style={input} value={newRole} onChange={e=>setNewRole(e.target.value)}>
                <option>Admin</option>
                <option>Manager</option>
                
                <option>Member</option><option>QA</option>
              </select>
            </div>
            <div>
              <label style={small}>Permissions</label>
              <div style={{ display:"grid", gap:6, padding:"8px 6px" }}>
                {["manage_personas","manage_users","view_history","send_messages"].map(k => (
                  <label key={k} style={{ display:"flex", alignItems:"center", gap:8, fontSize:14, color:"#111827" }}>
                    <input type="checkbox" checked={newPerms.includes(k)} onChange={()=>togglePerm(k)}/>
                    <span style={{ textTransform:"capitalize" }}>{k.replace("_"," ")}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <label style={subtle} htmlFor="team-avatar-input">Upload avatar</label>
            <input id="team-avatar-input" type="file" accept="image/*" style={{ display:"none" }} onChange={onAvatar}/>
            <button style={btn} onClick={createMember} type="button">Create</button>
          </div>
        </div>
      </div>
    </div>
  );
}






/* =========================================================
   OPUS INLINE HELPERS — Users Linking + Notes Timeline v1.1
   (Adds: dismissCandidate, ready-made UI blocks)
   ========================================================= */

function addHistoryEvent(evt){
  try{
    const key = "historyLogV1";
    const arr = JSON.parse(localStorage.getItem(key) || "[]");
    arr.push({ ts: Date.now(), type: evt?.type || "user_event", who: evt?.who || "system", payload: { ...(evt?.payload||{}) } });
    localStorage.setItem(key, JSON.stringify(arr));
  }catch{}
}

function __persistUsers(arr){ try{ localStorage.setItem("manualUsersV1", JSON.stringify(arr||[])); }catch{} }
function __loadUsers(){ try{ return JSON.parse(localStorage.getItem("manualUsersV1")||"[]"); }catch{ return []; } }

function __dedupIdentities(list){
  const seen = new Set(); const out = [];
  for (const it of (Array.isArray(list)?list:[])){
    const k = (it.platform||"").toLowerCase()+":"+String(it.handle||it.username||"").toLowerCase();
    if (!seen.has(k)){ seen.add(k); out.push({ platform: it.platform, handle: it.handle || it.username }); }
  }
  return out;
}

function __defaultCandidates(user){
  const h = (user?.handle||user?.username||"").trim();
  if (!h) return [];
  const platforms = ["X / Twitter","Instagram","TikTok","FanVue"];
  const current = new Set((user?.accounts||[]).map(a => (a.platform||"")+":"+(a.handle||a.username||"")));
  return platforms.filter(p => !current.has(p+":"+h)).map(p => ({ platform:p, handle:h, score:0.86 }));
}

function useUserLinking(selectedUser, currentActor="You"){
  const [users, setUsers] = React.useState(()=>__loadUsers());
  const [linked, setLinked] = React.useState(()=>__dedupIdentities(selectedUser?.accounts||[]));
  const [potential, setPotential] = React.useState(()=>__defaultCandidates(selectedUser||{}));
  const [dialog, setDialog] = React.useState({ open:false, candidate:null, name:selectedUser?.name||selectedUser?.handle||"User" });

  React.useEffect(()=>{
    setLinked(__dedupIdentities(selectedUser?.accounts||[]));
    setPotential(__defaultCandidates(selectedUser||{}));
    setDialog({ open:false, candidate:null, name:selectedUser?.name||selectedUser?.handle||"User" });
  }, [selectedUser?.id]);

  function __write(next){
    try{
      const arr = __loadUsers();
      const idx = arr.findIndex(u => u.id === selectedUser?.id);
      if (idx >= 0){
        arr[idx] = { ...(arr[idx]||{}), accounts: next };
        setUsers(arr);
        __persistUsers(arr);
      }
    }catch{}
  }

  function openConfirm(candidate){ setDialog({ open:true, candidate, name:selectedUser?.name||selectedUser?.handle||"User" }); }
  function closeConfirm(){ setDialog({ open:false, candidate:null, name:selectedUser?.name||selectedUser?.handle||"User" }); }

  function confirmCandidate(){
    if (!dialog?.candidate) return;
    const cand = dialog.candidate;
    const next = __dedupIdentities([...(linked||[]), { platform:cand.platform, handle:cand.handle }]);
    setLinked(next);
    setPotential((potential||[]).filter(p => !(p.platform===cand.platform && p.handle===cand.handle)));
    __write(next);
    addHistoryEvent({ type:"user_link_confirmed", who: currentActor, payload:{ userId:selectedUser?.id, platform:cand.platform, handle:cand.handle }});
    closeConfirm();
  }

  function addLinkedIdentity(id){
    const next = __dedupIdentities([...(linked||[]), id]);
    setLinked(next); __write(next);
    addHistoryEvent({ type:"user_link_added", who: currentActor, payload:{ userId:selectedUser?.id, ...id }});
  }

  function removeLinkedIdentity(id){
    const next = __dedupIdentities((linked||[]).filter(x => !(String(x.platform).toLowerCase()===String(id.platform).toLowerCase() && String(x.handle||x.username).toLowerCase()===String(id.handle||id.username).toLowerCase())));
    setLinked(next); __write(next);
    addHistoryEvent({ type:"user_link_removed", who: currentActor, payload:{ userId:selectedUser?.id, ...id }});
  }

  function dismissCandidate(id){
    setPotential((potential||[]).filter(x => !(String(x.platform).toLowerCase()===String(id.platform).toLowerCase() && String(x.handle||x.username).toLowerCase()===String(id.handle||id.username).toLowerCase())));
    addHistoryEvent({ type:"user_link_dismissed", who: currentActor, payload:{ userId:selectedUser?.id, ...id }});
  }

  return { linked, setLinked, potential, setPotential, dialog, openConfirm, closeConfirm, confirmCandidate, addLinkedIdentity, removeLinkedIdentity, dismissCandidate };
}

function ConfirmLinkDialog({ open=false, candidate=null, name="this user", onConfirm, onClose }){
  if (!open) return null;
  const c = candidate || {};
  return (
    React.createElement("div", { style:{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"grid", placeItems:"center", zIndex:99999 }},
      React.createElement("div", { style:{ width:"min(440px, 92vw)", background:"#fff", borderRadius:12, padding:16, boxShadow:"0 10px 30px rgba(0,0,0,0.25)" }},
        React.createElement("div", { style:{ fontWeight:800, marginBottom:8 }}, "Confirm link"),
        React.createElement("div", { style:{ color:"#374151", marginBottom:12 }}, `Link ${name} with ${c.platform}: @${c.handle}?`),
        React.createElement("div", { style:{ display:"flex", gap:8, justifyContent:"flex-end" }},
          React.createElement("button", { onClick:onClose, style:{ padding:"8px 12px", borderRadius:8, border:"1px solid #e5e7eb", background:"#fff", cursor:"pointer" }}, "Cancel"),
          React.createElement("button", { onClick:onConfirm, style:{ padding:"8px 12px", borderRadius:8, border:"1px solid #111", background:"#111", color:"#fff", cursor:"pointer", fontWeight:700 }}, "Confirm")
        )
      )
    )
  );
}

// Ready-made blocks you can drop in where those sections render
function AccountsLinkedBlock({ linked=[], onUnlink }){
  return (
    <div style={{ display:"grid", gap:6 }}>
      {(linked||[]).length ? (linked||[]).map(id => (
        <div key={id.platform+':'+id.handle} style={{ display:"flex", gap:8, alignItems:"center" }}>
          <span>{id.platform}: @{id.handle}</span>
          <button onClick={()=>onUnlink && onUnlink(id)} style={{ border:"1px solid #e5e7eb", borderRadius:8, padding:"4px 8px", background:"#fff", cursor:"pointer" }}>Unlink</button>
        </div>
      )) : <div style={{ fontSize:12, color:"#6b7280" }}>No linked accounts yet.</div>}
    </div>
  );
}

function PotentialMatchesBlock({ items=[], onConfirm, onDismiss }){
  return (
    <div style={{ display:"grid", gap:6 }}>
      {(items||[]).length ? (items||[]).map((m, i) => (
        <div key={(m.platform||'')+':'+(m.handle||'')+':'+i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", border:"1px solid #e5e7eb", borderRadius:8, padding:"8px 10px", background:"#fff" }}>
          <div>{i+1}) @{m.handle} • {m.platform} • score {Number(m.score||0).toFixed(2)}</div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>onConfirm && onConfirm(m)} style={{ border:"1px solid #111", background:"#111", color:"#fff", padding:"6px 10px", borderRadius:8, cursor:"pointer" }}>Confirm</button>
            <button onClick={()=>onDismiss && onDismiss(m)} style={{ border:"1px solid #e5e7eb", background:"#fff", padding:"6px 10px", borderRadius:8, cursor:"pointer" }}>Dismiss</button>
          </div>
        </div>
      )) : <div style={{ fontSize:12, color:"#6b7280" }}>No suggested matches right now.</div>}
    </div>
  );
}

// Notes timeline (grouped by day + "Since last summary")
function NotesTimeline({ notes=[], lastSummaryAt=0 }){
  const items = Array.isArray(notes) ? notes.slice().sort((a,b)=> (b.ts||b.time||0)-(a.ts||a.time||0)) : [];
  const byDay = new Map();
  for (const n of items){
    const t = new Date(n.ts||n.time||0); if (isNaN(t)) continue;
    const k = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k).push(n);
  }
  const groups = Array.from(byDay.entries()).map(([day,list])=>({day,list})).sort((a,b)=> (new Date(b.day)) - (new Date(a.day)));

  return (
    React.createElement("div", { style:{ display:"grid", gap:12 }},
      lastSummaryAt ? React.createElement("div", { style:{ fontSize:12, color:"#6b7280" }}, "Since last summary: ", new Date(lastSummaryAt).toLocaleString()) : null,
      groups.length ? groups.map(g =>
        React.createElement("div", { key:g.day, style:{ border:"1px solid #e5e7eb", borderRadius:8, padding:12, background:"#fff" } },
          React.createElement("div", { style:{ fontWeight:700, marginBottom:6 }}, g.day),
          React.createElement("div", { style:{ display:"grid", gap:6 }},
            g.list.map((n, idx) => React.createElement("div", { key:g.day+"-"+idx, style:{ fontSize:14 }},
              React.createElement("div", { style:{ fontSize:12, color:"#6b7280" }}, new Date(n.ts||n.time||0).toLocaleTimeString()),
              React.createElement("div", null, n.text || n.note || "")
            ))
          )
        )
      ) : React.createElement("div", { style:{ fontSize:12, color:"#6b7280" }}, "No notes yet.")
    )
  );
}

/* ===== End OPUS helpers & blocks v1.1 ===== */



// ===== Admin Widgets: Build + Flags + Reset + Storage Inspector =====

function AdminDailyGoalsCard({ team = [], personas = [] }) {
  const cardStyle = { border:"1px dashed #e5e7eb", borderRadius:12, padding:14, background:"#fafafa", marginTop:12 };
  const input = { padding:"8px 10px", border:"1px solid #e5e7eb", borderRadius:8, width:"100%" };
  const btn   = { padding:"8px 12px", borderRadius:8, border:"1px solid #111", background:"#111", color:"#fff", cursor:"pointer" };
  const small = { fontSize:12, color:"#6b7280" };

  const TEAM_GOAL_DEFAULTS_KEY = "teamGoalDefaultsV1";
  const PERSONA_GOAL_DEFAULTS_KEY = "personaGoalDefaultsV1";
  const readJson = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(d)); } catch { return d; } };
  const writeJson = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  const [teamGoalDefaults, setTeamGoalDefaults] = React.useState(()=>readJson(TEAM_GOAL_DEFAULTS_KEY, {}));
  const [personaGoalDefaults, setPersonaGoalDefaults] = React.useState(()=>readJson(PERSONA_GOAL_DEFAULTS_KEY, {}));
  React.useEffect(()=>writeJson(TEAM_GOAL_DEFAULTS_KEY, teamGoalDefaults), [teamGoalDefaults]);
  React.useEffect(()=>writeJson(PERSONA_GOAL_DEFAULTS_KEY, personaGoalDefaults), [personaGoalDefaults]);

  const zero = { messages:0, prospecting:0, followers:0, posts:0, users:0, subs:0 };

  const [selMember, setSelMember] = React.useState("");
  const [selTarget, setSelTarget] = React.useState("__member__");
  const [goals, setGoals] = React.useState(zero);

  const memberLabel = (idOrName) => {
    try {
      const m = (Array.isArray(team)?team:[]).find(mm => String(mm.id||mm.name) === String(idOrName||""));
      return (m && (m.name || m.username || m.email || m.id)) ? String(m.name || m.username || m.email || m.id) : String(idOrName||"");
    } catch { return String(idOrName||""); }
  };

  const getMemberDefault = (memberId) => teamGoalDefaults[memberId] || zero;
  const getPersonaDefault = (personaId) => personaGoalDefaults[personaId] || zero;

  React.useEffect(() => {
    if (!selMember) return;
    if (selTarget === "__member__") setGoals(getMemberDefault(selMember));
    else setGoals(getPersonaDefault(selTarget));
  }, [selMember, selTarget, teamGoalDefaults, personaGoalDefaults]);

  const saveGoals = () => {
    const clean = Object.fromEntries(Object.entries({ ...zero, ...goals }).map(([k,v]) => [k, Math.max(0, parseInt(v||0,10)||0)]));
    if (selTarget === "__member__") setTeamGoalDefaults(prev => ({ ...prev, [selMember]: clean }));
    else setPersonaGoalDefaults(prev => ({ ...prev, [selTarget]: clean }));
  };

  const resetGoals = () => setGoals(zero);

  return (
    <div style={cardStyle}>
      <div role="heading" aria-level={2} style={{ fontSize:16, fontWeight:700, letterSpacing:0.2, marginBottom:10 }}>Daily Goals (Team + Persona)</div>
      <div style={{ display:"grid", gap:12 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          <div>
            <div style={small}>Team Member</div>
            <select value={selMember} onChange={e=>{ setSelMember(e.target.value); setSelTarget("__member__"); }} style={input}>
              <option value="">Select team member…</option>
              {(Array.isArray(team)?team:[]).map(m => <option key={(m.id||m.name)} value={(m.id||m.name)}>{m.name||m.username||m.email||m.id}</option>)}
            </select>
          </div>
          <div>
            <div style={small}>Target</div>
            <select value={selTarget} onChange={e=>setSelTarget(e.target.value)} style={input} disabled={!selMember}>
              <option value="__member__" disabled={!selMember}>{selMember ? (memberLabel(selMember) + " — Team Goals") : "Team Goals…"}</option>
              {(() => {
                try {
                  const member = (Array.isArray(team)?team:[]).find(mm => (mm.id||mm.name)===(selMember||""));
                  const names = new Set((member && Array.isArray(member.personas) ? member.personas : []));
                  return (Array.isArray(personas)?personas:[])
                    .filter(p => names.has(p.name))
                    .map(p => <option key={p.id||p.name} value={String(p.id||p.name)}>Persona: {p.name}</option>);
                } catch { return null; }
              })()}
            </select>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(6, 1fr)", gap:8 }}>
          {["messages","prospecting","followers","posts","users","subs"].map(k => (
            <div key={k} style={{ display:"grid", gap:6 }}>
              <div style={small}>{k}</div>
              <input type="number" min="0" style={input} value={goals[k]||0} onChange={e=>setGoals(g => ({...g, [k]: Math.max(0, parseInt(e.target.value||"0",10) || 0)}))}/>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button type="button" style={btn} onClick={saveGoals} disabled={!selMember || !selTarget}>Save</button>
          <button type="button" style={{ ...btn, background:"#fff", color:"#111", borderColor:"#e5e7eb" }} onClick={resetGoals} disabled={!selMember || !selTarget}>Reset</button>
        </div>
      </div>
    </div>
  );
}


/** AdminFavoriteLinks — review & fix wiki_url for persona_favorites */

function AdminFavoriteLinks(){
  const [personas, setPersonas] = React.useState([]);  // only personas that have favorites
  const [sel, setSel] = React.useState("");
  const [rows, setRows] = React.useState([]);          // all favorites for selected persona
  const [filter, setFilter] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [status, setStatus] = React.useState("");

  // Load active personas (those with favorites)
  React.useEffect(() => {
    (async () => {
      const { data: pf, error: e1 } = await supabase.from('persona_favorites').select('persona_id').limit(2000);
      if (e1) { console.warn('favorites list error', e1); setPersonas([]); return; }
      const ids = Array.from(new Set((pf||[]).map(r => r.persona_id))).filter(Boolean);
      if (!ids.length){ setPersonas([]); setSel(""); return; }
      const { data: ps, error: e2 } = await supabase.from('personas').select('id,name').in('id', ids).order('name',{ascending:true});
      if (e2) { console.warn('personas select error', e2); setPersonas([]); return; }
      setPersonas(ps||[]);
      if (sel && !ids.includes(sel)) setSel(ps?.[0]?.id || "");
      if (!sel) setSel(ps?.[0]?.id || "");
    })();
  }, []);

  // Load all favorites for selected persona
  React.useEffect(() => {
    (async () => {
      if (!sel) { setRows([]); return; }
      const { data, error } = await supabase
        .from('persona_favorites')
        .select('persona_id,category,value,wiki_url,created_at')
        .eq('persona_id', sel)
        .order('category', { ascending: true })
        .order('value', { ascending: true });
      if (error) { console.warn('favorites select error', error); setRows([]); return; }
      setRows(Array.isArray(data)? data: []);
    })();
  }, [sel]);

  // Build grouped view: { category: [{value, wiki_url}] }
  const grouped = React.useMemo(() => {
    const f = (filter||'').toLowerCase().trim();
    const g = {};
    for (const r of rows){
      if (f && !(r.value.toLowerCase().includes(f) || r.category.toLowerCase().includes(f) || String(r.wiki_url||'').toLowerCase().includes(f))) continue;
      (g[r.category] ||= []).push({ value: r.value, wiki_url: r.wiki_url });
    }
    for (const k of Object.keys(g)) g[k].sort((a,b)=> a.value.localeCompare(b.value));
    return g;
  }, [rows, filter]);

  // track selected value per category
  const [picked, setPicked] = React.useState({}); // {category: value}
  React.useEffect(()=>{
    const init = {};
    Object.keys(grouped).forEach(cat => { init[cat] = grouped[cat]?.[0]?.value || ""; });
    setPicked(init);
  }, [sel, Object.keys(grouped).join('|')]);

  function currentRow(cat){
    const list = grouped[cat] || [];
    const v = picked[cat];
    return list.find(x => x.value === v) || null;
  }

  function setWiki(cat, v){
    setRows(prev => prev.map(r => (r.category===cat && r.value===picked[cat]) ? { ...r, wiki_url: v } : r));
  }

  function suggest(cat){
    const row = currentRow(cat);
    if (!row) return;
    setWiki(cat, wikiUrlFor(row.value, cat));
  }

  async function save(cat){
    const row = currentRow(cat);
    if (!row) return;
    setSaving(true); setStatus('');
    try{
      const { error } = await supabase
        .from('persona_favorites')
        .update({ wiki_url: String(row.wiki_url||'') })
        .eq('persona_id', sel)
        .eq('category', cat)
        .eq('value', row.value);
      if (error) throw error;
      setStatus('Saved ✔︎');
    }catch(e){
      console.warn('update error', e);
      setStatus('Save failed — see console');
    }finally{ setSaving(false); }
  }

  return (
    <div style={{ border:'1px solid #e5e7eb', borderRadius:12, padding:12, background:'#fff', marginTop:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
        <div style={{ fontWeight:700 }}>Admin</div>
        <div style={{ fontWeight:700, lineHeight:1 }}>&nbsp;—&nbsp;</div>
        <div style={{ fontWeight:700, lineHeight:1 }}>Favorite Link Fixer</div>
        <label>Persona:&nbsp;
          <select value={sel} onChange={e=>setSel(e.target.value)} style={{ padding:'6px 10px' }}>
            <option value=''>— choose —</option>
            {personas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label>Filter:&nbsp;
          <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder='search value/url…' style={{ padding:'6px 10px', width:240 }}/>
        </label>
        <span style={{ fontSize:12, color:'#6b7280' }}>{status}</span>
      </div>

      {sel && (
        <div style={{ display:'grid', gridTemplateColumns:'140px 260px 1fr 110px', gap:8, alignItems:'center', maxHeight:420, overflow:'auto' }}>
          <div style={{ fontWeight:600, opacity:.6 }}>Category</div>
          <div style={{ fontWeight:600, opacity:.6 }}>Value</div>
          <div style={{ fontWeight:600, opacity:.6 }}>wiki_url</div>
          <div style={{ fontWeight:600, opacity:.6 }}></div>

          {Object.keys(grouped).map(cat => {
            const list = grouped[cat];
            const selVal = picked[cat] || (list?.[0]?.value || '');
            const row = list?.find(x => x.value === selVal) || null;
            const url = row?.wiki_url || '';
            return (
              <React.Fragment key={cat}>
                <div>{cat}</div>
                <div>
                  <select value={selVal} onChange={e => setPicked(s => ({ ...s, [cat]: e.target.value }))} style={{ width:'100%' }}>
                    {list.map(x => <option key={x.value} value={x.value}>{x.value}</option>)}
                  </select>
                </div>
                <div>
                  <input value={url} onChange={e => setWiki(cat, e.target.value)} placeholder='https://…' style={{ width:'100%' }}/>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <a href={url||'#'} target='_blank' rel='noreferrer' style={{ fontSize:12, textDecoration:'none' }}>Open ↗</a>
                  <button onClick={()=>suggest(cat)} disabled={saving} style={{ padding:'4px 8px' }}>Suggest</button>
                  <button onClick={()=>save(cat)} disabled={saving} style={{ padding:'4px 8px' }}>Save</button>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}
      {!sel && <div style={{ fontSize:12, color:'#6b7280' }}>Choose a persona that currently has favorites.</div>}
    </div>
  );
}


function AdminWidgets() {
  const card = { border:"1px solid #e5e7eb", borderRadius:12, padding:14, background:"#fafafa" };
  const subtle= { padding:"8px 12px", borderRadius:8, border:"1px solid #e5e7eb", background:"#fff", cursor:"pointer" };
  const btn   = { padding:"8px 12px", borderRadius:8, border:"1px solid #111", background:"#111", color:"#fff", cursor:"pointer" };
  const small = { fontSize:12, color:"#6b7280" };

  const BUILD_INFO = (typeof window!=="undefined" && window.BUILD_INFO) || {
    version: "1.8.19",
    builtAt: new Date().toLocaleString(),
    commit: ""
  };

  const readFlags = () => { try { return JSON.parse(localStorage.getItem("feature_flags")||"{}"); } catch { return {}; } };
  const [flags, setFlags] = React.useState(readFlags());
  const writeFlags = (f) => { try { localStorage.setItem("feature_flags", JSON.stringify(f)); } catch {} };
  const toggle = (k) => setFlags(prev => { const next = { ...prev, [k]: !prev[k] }; writeFlags(next); return next; });

  const resetDemoData = () => {
    try {
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (k.startsWith("links_") || k.startsWith("dismissed_") || k.startsWith("notes_")) localStorage.removeItem(k);
      }
      localStorage.removeItem("historyLogV1");
    } catch {}
    try { location.reload(); } catch {}
  };

  const [lsKeys, setLsKeys] = React.useState([]);
  const refreshLS = () => {
    try {
      const ks = Object.keys(localStorage).filter(k =>
        k.startsWith("links_") || k.startsWith("dismissed_") || k.startsWith("notes_") || k==="historyLogV1"
      ).sort();
      setLsKeys(ks);
    } catch { setLsKeys([]); }
  };
  React.useEffect(() => { refreshLS(); }, [])

  const clearKey = (k) => { try { localStorage.removeItem(k); } catch {} ; refreshLS(); };
  const viewKey  = (k) => { try { alert(`${k}: ${localStorage.getItem(k)}`); } catch { alert(`Failed to read ${k}`); } };
  const copyDiagnostics = () => {
    const diag = {
      version: BUILD_INFO.version,
      builtAt: BUILD_INFO.builtAt,
      commit: BUILD_INFO.commit,
      userAgent: (typeof navigator!=="undefined" && navigator.userAgent) || "",
      flags,
      lsSummary: (lsKeys||[]).reduce((acc,k)=>{ acc[k]=(localStorage.getItem(k)||"").length; return acc; }, {}),
      now: new Date().toISOString()
    };
    try { navigator.clipboard.writeText(JSON.stringify(diag, null, 2)); alert("Diagnostics copied"); } catch { alert("Copy failed"); }
  };

  return (
    
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginTop:12 }}>
      <AdminFavoriteLinks />
      <div style={card}>
        <div role="heading" aria-level={2} style={{ fontSize:18, fontWeight:700, marginBottom:10 }}>Build & Diagnostics</div>
        <div style={{ display:"grid", gap:8 }}>
          <div><span style={small}>Version</span><div>{BUILD_INFO.version}</div></div>
          <div><span style={small}>Built at</span><div>{BUILD_INFO.builtAt}</div></div>
          {BUILD_INFO.commit ? <div><span style={small}>Commit</span><div>{BUILD_INFO.commit}</div></div> : null}
          <div><button type="button" style={subtle} onClick={copyDiagnostics}>Copy diagnostics</button>
        {/* Inline Supabase status (merged into Build & Diagnostics) */}
        <div style={{ marginTop: 16 }}>
          <SupabaseStatusCard />
        </div>
</div>
        </div>
      </div>

      <div style={card}>
        <div role="heading" aria-level={2} style={{ fontSize:18, fontWeight:700, marginBottom:10 }}>Feature Flags</div>
        <div style={{ display:"grid", gap:10 }}>
          <label style={{ display:"flex", alignItems:"center", gap:8 }}>
            <input type="checkbox" checked={!!flags.useSafeLinkEngine} onChange={()=>toggle("useSafeLinkEngine")} />
            <span>Use safe linking engine</span>
          </label>
          <label style={{ display:"flex", alignItems:"center", gap:8 }}>
            <input type="checkbox" checked={!!flags.showMatchScores} onChange={()=>toggle("showMatchScores")} />
            <span>Show match scores</span>
          </label>
          <label style={{ display:"flex", alignItems:"center", gap:8 }}>
            <input type="checkbox" checked={!!flags.enableUnlinkDebug} onChange={()=>toggle("enableUnlinkDebug")} />
            <span>Enable Unlink debug logs</span>
          </label>
          <div><button type="button" style={btn} onClick={resetDemoData}>Reset demo data</button></div>
        </div>
      </div>

      <div style={card}>
        <div role="heading" aria-level={2} style={{ fontSize:18, fontWeight:700, marginBottom:10 }}>Local‑storage inspector</div>
        <div style={{ display:"grid", gap:6 }}>
          {(lsKeys.length===0) && <div style={{ color:"#6b7280" }}>No tracked keys found.</div>}
          {lsKeys.map(k => (
            <div key={k} style={{ display:"grid", gridTemplateColumns:"1fr auto auto", alignItems:"center", gap:8 }}>
              <div style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{k}</div>
              <button type="button" style={subtle} onClick={()=>viewKey(k)}>View</button>
              <button type="button" style={subtle} onClick={()=>clearKey(k)}>Clear</button>
            </div>
          ))}
          <div><button type="button" style={subtle} onClick={refreshLS}>Refresh</button></div>
        </div>
      </div>
    </div>
  );
}


// Small helper: add team member
function TeamAddForm({ team, setTeam }) {
  const [name, setName] = React.useState("");
  const add = () => {
    const n = (name || "").trim();
    if (!n) return;
    try { setTeam(prev => Array.isArray(prev) ? [...prev, { name:n }] : [{ name:n }]); } catch {}
    setName("");
  };
  return (
    <div>
      <div style={{ fontSize:12, color:"#6b7280" }}>Add member</div>
      <div style={{ display:"flex", gap:8 }}>
        <input style={{ padding:"8px 10px", border:"1px solid #e5e7eb", borderRadius:8, width:"100%" }} placeholder="Member name" value={name} onChange={e=>setName(e.target.value)} />
        <button type="button" style={{ padding:"8px 12px", borderRadius:8, border:"1px solid #111", background:"#111", color:"#fff", cursor:"pointer" }} onClick={add}>Add</button>
      </div>
    </div>
  );
}


function RoleTabMatrix({ team }) {
  const card  = { border:"1px solid #e5e7eb", borderRadius:12, padding:14, background:"#fafafa" };
  const subtle= { padding:"6px 10px", borderRadius:8, border:"1px solid #e5e7eb", background:"#fff", cursor:"pointer" };
  const small = { fontSize:12, color:"#6b7280" };

  const ALL_TABS = ["dashboard","messages","personas","users","following","team","history","admin"];
  const KEY = "ptd_role_tabs_v1";

  const knownRoles = React.useMemo(() => {
  const roles = new Set((Array.isArray(team)?team:[]).map(m => (m.role||"member").toLowerCase()));
  ["owner","manager","qa","member"].forEach(r=>roles.add(r));
  roles.delete("operator");
  return Array.from(roles);
}, [team]);
const [matrix, setMatrix] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch { return {}; }
  });
  const save = (next) => { try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {} };

  const toggle = (role, tab) => {
    role = String(role||"").toLowerCase();
    setMatrix(prev => {
      const set = new Set(prev[role] || []);
      if (set.has(tab)) set.delete(tab); else set.add(tab);
      const next = { ...prev, [role]: Array.from(set) };
      save(next);
      return next;
    });
  };

  const selectAll = (role) => {
    role = String(role||"").toLowerCase();
    const next = { ...matrix, [role]: ALL_TABS.slice(0) };
    setMatrix(next); save(next);
  };
  const clearAll = (role) => {
    role = String(role||"").toLowerCase();
    const next = { ...matrix, [role]: [] };
    setMatrix(next); save(next);
  };

  return (
    <div style={card}>
      <div role="heading" aria-level={2} style={{ fontSize:16, fontWeight:700, marginBottom:10 }}>Role → Tab access</div>
      <div style={{ overflowX:"auto" }}>
        <table style={{ borderCollapse:"collapse", width:"100%" }}>
          <thead>
            <tr>
              <th style={{ textAlign:"left", padding:"6px 8px", borderBottom:"1px solid #e5e7eb" }}>Role</th>
              {ALL_TABS.map(t => (
                <th key={t} style={{ textAlign:"center", padding:"6px 8px", borderBottom:"1px solid #e5e7eb", fontWeight:500 }}>{t}</th>
              ))}
              <th style={{ padding:"6px 8px", borderBottom:"1px solid #e5e7eb" }}></th>
            </tr>
          </thead>
          <tbody>
            {knownRoles.map(role => {
              const allowed = new Set((matrix[String(role).toLowerCase()] || []));
              return (
                <tr key={role}>
                  <td style={{ padding:"6px 8px", borderBottom:"1px solid #f3f4f6", fontWeight:600, textTransform:"capitalize" }}>{role}</td>
                  {ALL_TABS.map(tab => (
                    <td key={tab} style={{ textAlign:"center", padding:"6px 8px", borderBottom:"1px solid #f3f4f6" }}>
                      <input type="checkbox" checked={allowed.has(tab)} onChange={()=>toggle(role, tab)} />
                    </td>
                  ))}
                  <td style={{ padding:"6px 8px", borderBottom:"1px solid #f3f4f6" }}>
                    <button style={subtle} onClick={()=>selectAll(role)}>All</button>
                    <button style={{...subtle, marginLeft:6}} onClick={()=>clearAll(role)}>None</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop:8, color:"#6b7280", fontSize:12 }}>
        Saved to <code>{KEY}</code>. (Hooking this into nav enforcement is a small follow‑up.)
      </div>
    </div>
  );
}