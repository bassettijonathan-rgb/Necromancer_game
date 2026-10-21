// The frame around the map: orbs, the action bar, the roster of your dead, your body, the log and the minimap.
import { S } from '../core/state.js';
import { onEvent } from '../core/events.js';
import { W, H, N, I, inb, map, seen, vis, BLK,
  ROCK, BRICK, FLOOR, DIRT, GRASS, GRAVE, TREE, WATER, DOOR, CAVE, RUBBLE, SARC, PILLAR, OGRAVE, PATH, BRAZ, FWALL, FOUND, SEAL, CRADLE, ALTAR, ASH } from '../core/level.js';
import { GEAR, QCOL, SP, SPORDER, cap1 } from '../core/content.js';
import { clamp } from '../core/rng.js';
import { isMinion, hostile, seesE, partOf, partWord, hpFrac, displayName, applyGear, lightAtTile, pack } from '../core/rules.js';
import { doOrder } from '../core/actions.js';
import { startRest } from '../core/clock.js';
import { BODYSVG, ico } from './icons.js';
import { manual, castKey, setAuto, useBelt, BELT, travelTo } from './control.js';
import { packOpen, togglePack, openPack, renderPack, lootSrc, renderLoot, STANCES, minIcon } from './windows.js';
import { RS, $ } from '../render/rstate.js';
import { screenToTile } from '../render/view.js';

function orbSVG(id, c1, c2) {
  return `<svg viewBox="0 0 100 100"><defs>
<radialGradient id="${id}L" cx="42%" cy="30%" r="80%"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient>
<radialGradient id="${id}G" cx="36%" cy="26%" r="42%"><stop offset="0" stop-color="rgba(255,255,255,.32)"/><stop offset="1" stop-color="rgba(255,255,255,0)"/></radialGradient>
<clipPath id="${id}C"><circle cx="50" cy="50" r="41"/></clipPath></defs>
<circle cx="50" cy="50" r="48.5" fill="#0b090d" stroke="rgba(214,203,180,.42)" stroke-width="1.2"/>
<circle cx="50" cy="50" r="45" fill="none" stroke="rgba(214,203,180,.12)" stroke-width="1"/>
<g clip-path="url(#${id}C)"><rect width="100" height="100" fill="#110d13"/>
<g id="${id}Q" style="transition:transform .35s"><path class="wave" d="M-100 4q12.5-5 25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0V140H-100z" fill="url(#${id}L)"/></g></g>
<circle cx="50" cy="50" r="41" fill="url(#${id}G)"/><circle cx="50" cy="50" r="41" fill="none" stroke="rgba(0,0,0,.75)" stroke-width="2.5"/>
<text x="50" y="57" text-anchor="middle" class="orbT" id="${id}T">0</text></svg><div class="orbL">${id === 'oB' ? 'Blood' : 'Will'}</div>`;
}
function setOrb(id, f, txt) { const y = 9 + 82 * (1 - clamp(f, 0, 1)); $('#' + id + 'Q').setAttribute('transform', `translate(0 ${y.toFixed(1)})`); $('#' + id + 'T').textContent = txt; }

let spellKnownSig = '', beltSig = '', rosterSig = '', rosterT = 0, logDirty = true;
export function buildSpellBar(newOne) {
  const box = $('#spells'); box.innerHTML = '';
  for (const k of SPORDER) {
    if (!S.learned[k]) continue; const sp = SP[k]; const b = document.createElement('button'); b.className = 'slot' + (k === newOne ? ' new' : '') + (k === 'raise' && S.autoRaise ? ' auto' : ''); b.id = 'sp_' + k; b.dataset.tip = 'spell:' + k;
    b.innerHTML = `${ico(k)}<kbd>${sp.key}</kbd><small class="${sp.blood ? 'bl' : ''}">${sp.blood || sp.cost}</small>`; b.setAttribute('aria-label', sp.name); b.onclick = () => castKey(k); box.appendChild(b);
  }
  const misc = $('#misc'); misc.innerHTML = '';
  for (const [k, key, fn, tip] of [['wait', '.', () => manual(() => 100), 'wait'], ['rest', 'T', () => { if (RS.auto) setAuto(false); startRest(); }, 'rest'], ['pack', 'I', () => togglePack(), 'pack']]) {
    const b = document.createElement('button'); b.className = 'slot'; b.dataset.tip = 'misc:' + tip; b.innerHTML = `${ico(k)}<kbd>${key}</kbd>`; b.onclick = fn; misc.appendChild(b);
  }
  spellKnownSig = Object.keys(S.learned).join();
}
function buildBelt() {
  const cnt = {}; for (const it of pack()) if (GEAR[it.b].slot === 'use') cnt[it.b] = (cnt[it.b] || 0) + 1; const sig = BELT.map(([b]) => cnt[b] || 0).join(); if (sig === beltSig) return; beltSig = sig;
  const box = $('#belt'); box.innerHTML = '';
  for (const [b, key] of BELT) { const n = cnt[b] || 0; const el = document.createElement('button'); el.className = 'slot' + (n ? '' : ' empty'); el.dataset.tip = 'belt:' + b; el.innerHTML = `${ico(GEAR[b].icon)}<kbd>${key}</kbd><small style="color:var(--bone)">${n}</small>`; el.onclick = () => useBelt(b); box.appendChild(el); }
}
function partColor(p) { if (p.gone) return 'rgba(0,0,0,0)'; const f = p.hp / p.max; return f > .75 ? '#5a5360' : f > .4 ? '#a2643a' : '#b8434a'; }
function buildRoster() {
  const live = S.ents.filter(isMinion); const sm = RS.selMinion;
  const sig = S.stance + '|' + S.gripMax + '|' + live.map(m => `${m.id}:${Math.round(hpFrac(m) * 20)}:${m.idle ? 1 : 0}:${m.gear ? ['hand', 'body', 'head'].map(s => m.gear[s] ? m.gear[s].id : 0).join('.') : ''}`).join(',') + '|' + (sm ? sm.id : 0);
  if (sig === rosterSig) return; rosterSig = sig;
  let h = `<div class="ptitle">Your dead<small>${live.length} / ${S.stress ? '∞' : S.gripMax}</small></div><div class="stances">`;
  for (const [k, n, key] of STANCES) h += `<button class="btn" data-st="${k}" data-tip="stance:${k}" aria-pressed="${S.stance === k}">${ico(k)}<span>${n} ${key}</span></button>`;
  h += '</div>';
  if (!live.length) h += '<div class="rempty">None yet. Remains near you rise on their own while your grip has room.</div>';
  for (const m of live.slice(0, 40)) {
    const f = hpFrac(m); const g = m.gear || {};
    h += `<button class="mrow${m === sm ? ' sel' : ''}${m.idle ? ' far' : ''}" data-m="${m.id}" data-tip="minion:${m.id}">${ico(minIcon(m))}<b>${cap1(displayName(m))}</b><span class="gear">${['hand', 'body', 'head'].map(s => g[s] ? ico(GEAR[g[s].b].icon) : '').join('')}</span><span class="hp"><u class="${f < .3 ? 'cr' : f < .6 ? 'lo' : ''}" style="width:${Math.round(f * 100)}%"></u></span></button>`;
  }
  if (live.length > 40) h += `<div class="rempty">and ${live.length - 40} more</div>`;
  $('#roster').innerHTML = h;
}
export function resetHUD() { spellKnownSig = ''; beltSig = ''; rosterSig = ''; logDirty = true; buildSpellBar(); }
export function hud() {
  const pl = S.player; if (!pl) return; applyGear();
  setOrb('oB', pl.blood / pl.bmax, `${Math.max(0, Math.ceil(pl.blood))}`); setOrb('oW', S.will / S.WMAX, `${Math.floor(S.will)}`);
  const ms = S.ents.filter(isMinion).length;
  const pipN = S.stress ? 0 : Math.max(S.gripMax, ms); let ph = ''; if (!S.stress) for (let k = 0; k < pipN; k++) ph += `<i class="${k < ms ? (k >= S.gripMax ? 'o' : 'f') : ''}"></i>`;
  if ($('#pips')._h !== ph) { $('#pips').innerHTML = ph; $('#pips')._h = ph; }
  $('#gripT').textContent = S.stress ? `${ms}` : `${ms}/${S.gripMax}`;
  for (const el of $('#body').children) { const p = partOf(pl, el.dataset.k); el.setAttribute('fill', partColor(p)); el.setAttribute('stroke', p.gone ? '#6a2a2e' : 'rgba(0,0,0,.6)'); el.setAttribute('stroke-dasharray', p.gone ? '2 2' : ''); el.querySelector('title').textContent = `${p.name}: ${partWord(p, pl)}`; }
  $('#heroN').textContent = S.heroName;
  const eqh = ['hand', 'body', 'head', 'charm1', 'charm2'].map(s => pl.gear[s] ? `<span data-tip="eq:${s}" style="color:${QCOL[pl.gear[s].q]}">${ico(GEAR[pl.gear[s].b].icon)}</span>` : '').join(''); if ($('#heroEq')._h !== eqh) { $('#heroEq').innerHTML = eqh; $('#heroEq')._h = eqh; }
  const it = S.intent, st = [];
  if (pl.bleed >= .4) st.push('<b>Bleeding</b>'); if (S.hooded) st.push('Lantern shuttered'); if (S.strainT.cold > 0) st.push('Cold hands'); if (ms > S.gripMax && !S.stress) st.push('<b>Beyond your grip</b>');
  $('#bExplore').classList.toggle('on', it.explore); $('#bPack').classList.toggle('on', packOpen);
  if (it.rest) st.push('Resting'); if (it.travel) st.push('Walking'); if (it.explore) st.push('Exploring'); if (RS.auto) st.push('Autoplay');
  if (lightAtTile(pl.x, pl.y) < .2 && !S.hooded) st.push('In the dark'); else if (S.hooded && lightAtTile(pl.x, pl.y) < .2) st.push('Unseen at a distance');
  const sh = st.join(' · '); if ($('#status')._h !== sh) { $('#status').innerHTML = sh; $('#status')._h = sh; }
  if (Object.keys(S.learned).join() !== spellKnownSig) buildSpellBar();
  for (const k of SPORDER) { const b = $('#sp_' + k); if (!b) continue; const sp = SP[k]; b.classList.toggle('short', sp.blood ? pl.blood <= sp.blood + 3 : S.will < sp.cost); b.classList.toggle('auto', k === 'raise' && S.autoRaise); }
  buildBelt(); if (!S.stress || performance.now() - rosterT > 1000) { rosterT = performance.now(); buildRoster(); } if (packOpen) renderPack(); if (lootSrc) renderLoot();
  if (logDirty) { $('#log').innerHTML = S.logLines.map(l => `<div class="${l[1]}">${l[0]}${l[2] > 1 ? ` <span style="color:var(--faint)">×${l[2]}</span>` : ''}</div>`).join(''); logDirty = false; }
  const zn = S.L.zoneNames[S.L.zone[I(pl.x, pl.y)]] || '';
  $('#where').textContent = `${S.region} · ${zn}`; $('#mmZone').textContent = zn; $('#mmTurn').textContent = `turn ${S.turn}`;
}

/* ---------- minimap ---------- */
let mm, mmc, mmB, mmBase, mmImg;
const MMC = []; { const set = (ts, c) => ts.forEach(t => MMC[t] = c); set([ROCK, BRICK, PILLAR, FWALL], [78, 72, 84]); set([FLOOR, DIRT, GRASS, PATH, ASH, RUBBLE, CAVE, DOOR, OGRAVE, ALTAR, SARC, BRAZ], [36, 33, 40]); set([GRAVE], [62, 96, 88]); set([WATER], [30, 40, 58]); set([TREE], [34, 46, 34]); set([FOUND, CRADLE], [48, 52, 56]); set([SEAL], [120, 124, 128]); }
export function drawMinimap() {
  const d = mmImg.data, pl = S.player;
  for (let i = 0; i < N; i++) { const o = i * 4; if (!seen[i]) { d[o + 3] = 0; continue; } const c = MMC[map[i]] || [40, 40, 40], k = vis[i] ? 1.55 : 1; d[o] = c[0] * k; d[o + 1] = c[1] * k; d[o + 2] = c[2] * k; d[o + 3] = 255; }
  mmB.putImageData(mmImg, 0, 0); const sx = mm.width / W, sy = mm.height / H;
  mmc.clearRect(0, 0, mm.width, mm.height); mmc.imageSmoothingEnabled = false; mmc.drawImage(mmBase, 0, 0, mm.width, mm.height);
  const dot = (x, y, col, r) => { mmc.fillStyle = col; mmc.fillRect((x + .5) * sx - r, (y + .5) * sy - r, r * 2, r * 2); };
  for (const c of S.chests) if (!c.open && seen[I(c.x, c.y)]) dot(c.x, c.y, '#c9a77a', 1.6);
  for (const it of S.items) if (it.kind !== 'torch' && seen[I(it.x, it.y)]) dot(it.x, it.y, it.kind === 'loot' ? QCOL[it.item.q] : '#ecd6a0', it.kind === 'loot' ? 1.3 : 2);
  for (const e of S.ents) { if (e.dead || e === pl) continue; if (isMinion(e)) dot(e.x, e.y, '#8fe8ac', 1.2); else if (hostile(pl, e) && seesE(e)) dot(e.x, e.y, '#e0545c', 1.5); }
  dot(pl.x, pl.y, '#f3ead6', 2);
  const a = screenToTile(0, 0), b = screenToTile(RS.CW, RS.CH); mmc.strokeStyle = 'rgba(214,203,180,.35)'; mmc.lineWidth = 1; mmc.strokeRect(Math.round(a[0] * sx) + .5, Math.round(a[1] * sy) + .5, Math.round((b[0] - a[0]) * sx), Math.round((b[1] - a[1]) * sy));
}

export function initHUD() {
  const svg = $('#body'); svg.innerHTML = BODYSVG.map(([k, tag, a]) => `<${tag} data-k="${k}" ${Object.entries(a).map(([n, v]) => `${n}="${v}"`).join(' ')}><title></title></${tag}>`).join('');
  $('#orbB').innerHTML = orbSVG('oB', '#d0525a', '#4a0d14'); $('#orbW').innerHTML = orbSVG('oW', '#9af0bc', '#0f4a33');
  mm = $('#mm'); mmc = mm.getContext('2d'); mmBase = document.createElement('canvas'); mmBase.width = W; mmBase.height = H; mmB = mmBase.getContext('2d'); mmImg = mmB.createImageData(W, H);
  onEvent(t => { if (t === 'log') logDirty = true; });
  $('#roster').addEventListener('click', ev => {
    const st = ev.target.closest('[data-st]'); if (st) { manual(() => doOrder(st.dataset.st)); rosterSig = ''; return; }
    const r = ev.target.closest('[data-m]'); if (!r) return; const m = S.ents.find(e => e.id === +r.dataset.m); if (!m) return; RS.selMinion = RS.selMinion === m ? null : m; rosterSig = ''; if (RS.selMinion) openPack();
  });
  mm.addEventListener('click', ev => {
    if (RS.modalOpen || S.gameOver) return; const r = mm.getBoundingClientRect(); const x = Math.floor((ev.clientX - r.left) / r.width * W), y = Math.floor((ev.clientY - r.top) / r.height * H);
    let best = null, bd = 99; for (let yy = y - 3; yy <= y + 3; yy++) for (let xx = x - 3; xx <= x + 3; xx++) { if (!inb(xx, yy) || !seen[I(xx, yy)] || BLK[map[I(xx, yy)]]) continue; const d = Math.hypot(xx - x, yy - y); if (d < bd) { bd = d; best = [xx, yy]; } }
    if (best) travelTo(best[0], best[1]);
  });
}
