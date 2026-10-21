// Starting, saving and restoring a run.
import { S, freshState, SAVE_VERSION } from './state.js';
import { R, srand } from './rng.js';
import { emit, log } from './events.js';
import { N, W, I, LEVEL_ARRAYS, newLevel, bindLevel, computeFOV, occ, bfs, findFree } from './level.js';
import { genBarrowfield, populateBarrowfield } from './gen/barrowfield.js';
import { resetRuleCaches, resetFormation, spawn, isMinion } from './rules.js';

export function newGame(seed) {
  freshState(seed); srand(seed);
  genBarrowfield(); populateBarrowfield();
  resetRuleCaches(); resetFormation(); computeFOV();
  emit('newGame');
  return S;
}

// a test field: a hundred of your dead against endless waves, a corpse burst nearly every turn
export function newStressGame() {
  newGame(777); S.stress = true; S.learned.mark = S.learned.lantern = 1; const pl = S.player;
  pl.blood = pl.bmax = 400; pl.parts.forEach(p => { p.max *= 20; p.hp = p.max; });
  for (const e of S.ents.slice()) if (e !== pl && e.team !== 0) { e.dead = true; occ[I(e.x, e.y)] = null; } S.ents = S.ents.filter(e => !e.dead);
  const f = new Int16Array(N); bfs(f, [I(pl.x, pl.y)]); let n = 0;
  // deterministic placement: the stress field is the same every time
  let k = 1; const r = () => { k = (k * 1103515245 + 12345) >>> 0; return k / 4294967296; };
  for (let d = 1; d < 30 && n < 100; d++) for (let i = 0; i < N && n < 100; i++) if (f[i] === d && !occ[i] && S.L.outdoor[i] && r() < .7) { spawn(r() < .8 ? 'skel' : 'bhound', i % W, (i / W) | 0); n++; }
  S.gripMax = 999;
  log('Stress test: a hundred of the dead against an endless Mercy, with a corpse burst nearly every turn.', 'ember');
  emit('newGame');
}

/* ---------- saves ---------- */
// fields the renderer hangs on creatures and remains; never saved
const RENDER_KEYS = new Set(['rx', 'ry', 'ax', 'ay', 'flash', 'ghostAt', 'showAt', 'ox0', 'oy0', 'wamp', 'wph', 'atkAt', 'px', 'py', 'settle']);
const TRANSIENT = new Set(['L', 'player', 'target', 'markT', 'ents', 'lootQueued', 'intent']);
function b64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
function unb64(s) { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
const clean = o => { const r = {}; for (const k in o) if (!RENDER_KEYS.has(k)) r[k] = o[k]; return r; };

export function serialize() {
  const st = {};
  for (const k in S) if (!TRANSIENT.has(k)) st[k] = S[k];
  const list = S.ents.filter(e => !e.dead); if (!list.includes(S.player)) list.push(S.player);
  st.ents = list.map(e => { const o = clean(e); if (o.tgt) o.tgt = o.tgt.id; return o; });
  st.corpses = S.corpses.map(clean);
  st.player = S.player.id; st.target = S.target && !S.target.dead ? S.target.id : null; st.markT = S.markT && !S.markT.dead ? S.markT.id : null;
  const L = S.L, lv = {};
  for (const k in L) if (!LEVEL_ARRAYS.includes(k)) lv[k] = L[k];
  for (const k of LEVEL_ARRAYS) lv[k] = b64(L[k]);
  return { v: SAVE_VERSION, rng: R.s, state: st, level: lv };
}

export function deserialize(data) {
  if (!data || data.v > SAVE_VERSION) throw new Error('This save comes from a newer version of the game.');
  const st = migrate(data).state;
  freshState(st.seed);
  for (const k in st) if (!['ents', 'player', 'target', 'markT'].includes(k)) S[k] = st[k];
  S.ents = st.ents.map(o => Object.assign({}, o));
  const byId = new Map(S.ents.map(e => [e.id, e]));
  for (const e of S.ents) e.tgt = e.tgt != null ? byId.get(e.tgt) || null : null;
  S.player = byId.get(st.player); S.target = st.target != null ? byId.get(st.target) || null : null; S.markT = st.markT != null ? byId.get(st.markT) || null : null;
  if (!S.player) throw new Error('This save has no necromancer in it.');
  S.ents = S.ents.filter(e => !e.dead);
  S.intent = { rest: false, travel: null, travelChest: null, explore: false, waitN: 0 }; S.lootQueued = null;
  const L = newLevel(data.level.kind);
  for (const k in data.level) if (!LEVEL_ARRAYS.includes(k)) L[k] = data.level[k];
  for (const k of LEVEL_ARRAYS) L[k].set(unb64(data.level[k]));
  bindLevel(L);
  R.s = data.rng >>> 0;
  resetRuleCaches(); resetFormation(); if (!S.gameOver) computeFOV();
  emit('loaded');
  return S;
}
// older saves are brought up to date here, one version at a time
function migrate(data) { return data; }

// a short description of a save, for the title screen
export function saveSummary(data) {
  const st = data.state; const pl = st.ents.find(e => e.id === st.player);
  return { hero: st.heroName, region: st.region, turn: st.turn, dead: !!st.gameOver, won: !!st.won, minions: st.ents.filter(e => e.team === 0 && e.id !== st.player && !e.unbound).length, stress: !!st.stress, blood: pl ? Math.ceil(pl.blood) : 0 };
}
