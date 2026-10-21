// The pack, the loot window, and every tooltip: what you carry, what lies here, and what you know about things.
import { S } from '../core/state.js';
import { log } from '../core/events.js';
import { I, inb, vis, occ, map, cheb, GRAVE, SEAL, CRADLE, FWALL, FOUND } from '../core/level.js';
import { GEAR, QCOL, QWORD, PACKN, CHESTNAME, DEF, WEAP, SP, cap1 } from '../core/content.js';
import { pack, reachDead, canWear, itemName, weaponOf, armourOfItem, slowOf, displayName, the, isMinion, living, seesE, partWord, curWeapon, effSpeed,
  corpseName, stage, chestAt, openChest, takeItem, doEquip, doUse, doDrop, doGive, doUnequip, doTakeBack } from '../core/rules.js';
import { clamp } from '../core/rng.js';
import { ico } from './icons.js';
import { manual, BELT } from './control.js';
import { RS, $ } from '../render/rstate.js';
import { screenToTile } from '../render/view.js';

export const minIcon = e => e.type === 'skel' ? 'skel' : e.type === 'risen' ? 'risen' : 'hound';
const SLOTNAME = { hand: 'Hand', body: 'Body', head: 'Head', charm1: 'Charm', charm2: 'Charm' };
const STATWORD = { cut: 'cut', pierce: 'pierce', blunt: 'blunt' };

/* ---------- what an item does ---------- */
export function itemLines(it) {
  const g = GEAR[it.b]; const L = [];
  if (g.w) { const w = weaponOf(it); L.push(`${w.dmg[0]}–${w.dmg[1]} ${w.type}${w.cost !== 100 ? ` · ${w.cost < 100 ? 'quick' : 'slow'} (${w.cost})` : ''}${w.hit ? ` · +${Math.round(w.hit * 100)}% to hit` : ''}`); }
  if (g.a) {
    const a = armourOfItem(it); const parts = { torso: 'torso', armL: 'arms', armR: null, head: 'head' }; const seen0 = new Set();
    for (const [p, v] of Object.entries(a)) { const nm = parts[p]; if (!nm || seen0.has(nm)) continue; seen0.add(nm); L.push(`${nm}: ` + Object.entries(v).map(([t, n]) => `−${n} ${STATWORD[t]}`).join(', ')); }
    if (slowOf(it)) L.push(`slows the wearer (−${slowOf(it)} speed)`);
  }
  if (g.fx) { const d = it.aff.includes('deep') ? 2 : 1; if (g.fx.grip) L.push(`+${g.fx.grip * d} grip`); if (g.fx.will) L.push(`+${g.fx.will * d} will`); if (g.fx.regen) L.push(d > 1 ? 'will returns much faster' : 'will returns faster'); if (g.fx.raise) L.push(`raised dead +${Math.round(g.fx.raise * d * 100)}% health`); }
  return L;
}
export function itemTipHTML(it, extra) {
  const g = GEAR[it.b];
  const kind = { hand: 'weapon', body: 'body armour', head: 'helm', charm: 'charm', use: 'supply' }[g.slot];
  let h = `<h3 style="color:${QCOL[it.q]}">${cap1(itemName(it))}</h3><div class="st" style="color:var(--dim)">${QWORD[it.q] ? QWORD[it.q] + ' ' : ''}${kind}</div><p>${g.v}</p>`;
  const L = itemLines(it); if (L.length) h += `<table>${L.map(l => `<tr><td style="color:var(--bone)">${l}</td></tr>`).join('')}</table>`;
  if (it.blessed) h += '<div class="known" style="color:var(--holy)">Blessed by the Mercy. Your dead will not touch it.</div>';
  else if (g.slot === 'charm') h += '<div class="known">Only you can wear a charm.</div>';
  else if (g.slot !== 'use') h += '<div class="known">You or your human dead can use it.</div>';
  if (extra) h += `<p class="hint">${extra}</p>`; return h;
}
const VIEWS = {}; function mkItemView(b) { return VIEWS[b] || (VIEWS[b] = { id: -1, b, q: 0, aff: [], blessed: false }); }

/* ---------- pack window ---------- */
export let packOpen = false; let packSel = null, packSig = '';
export function openPack() { packOpen = true; $('#pack').hidden = false; packSig = ''; renderPack(); }
export function closePack() { packOpen = false; $('#pack').hidden = true; packSel = null; $('#utip').hidden = true; }
export function togglePack() { packOpen ? closePack() : openPack(); }
function slotBtn(it, attrs, extra) { return `<button class="slot${it ? ` q${it.q}${it.blessed ? ' bl' : ''}` : ' empty'}${extra || ''}" ${attrs}>${it ? `<span style="color:${QCOL[it.q]}">${ico(GEAR[it.b].icon)}</span>` : ''}</button>`; }
const gearSig = (e, slots) => slots.map(s => e.gear[s] ? e.gear[s].id : 0).join('.');
export function renderPack() {
  const pl = S.player; const reach = reachDead(); const sm = RS.selMinion; const others = sm && !sm.dead && !reach.includes(sm) ? [sm] : [];
  const sel = packSel;
  const sig = [pack().map(i => i.id).join('.'), gearSig(pl, ['hand', 'body', 'head', 'charm1', 'charm2']), reach.concat(others).map(m => m.id + ':' + gearSig(m, ['hand', 'body', 'head'])).join(','), sel ? JSON.stringify([sel.it && sel.it.id, sel.slot, sel.m && sel.m.id]) : '', sm ? sm.id : 0].join('|');
  if (sig === packSig) return; packSig = sig;
  let h = `<div class="ptitle">Pack<small>${pack().length} / ${PACKN}</small><button class="btn wclose" data-act="close" aria-label="Close">Close <kbd>I</kbd></button></div>`;
  h += '<div class="doll">' + ['hand', 'body', 'head', 'charm1', 'charm2'].map(s => `<div class="eq">${slotBtn(pl.gear[s], `data-eq="${s}" data-tip="eq:${s}"`, sel && sel.slot === s && !sel.m ? ' sel' : '')}${SLOTNAME[s]}</div>`).join('') + '</div>';
  h += '<div class="grid">'; for (let k = 0; k < PACKN; k++) { const it = pack()[k]; h += slotBtn(it, it ? `data-pi="${k}" data-tip="pi:${k}"` : 'disabled', sel && sel.it === it && it && !sel.slot ? ' sel' : ''); } h += '</div>';
  h += '<div class="det">';
  const selIt = sel ? (sel.m ? sel.m.gear[sel.slot] : sel.slot ? pl.gear[sel.slot] : sel.it) : null;
  if (selIt) {
    h += itemTipHTML(selIt); h += '<div class="acts">';
    if (sel.m) h += `<button class="btn primary" data-act="takeback">Take it back</button>`;
    else if (sel.slot) h += `<button class="btn" data-act="unequip">Take off</button>`;
    else {
      const g = GEAR[selIt.b]; if (g.slot === 'use') h += `<button class="btn primary" data-act="use">Use</button>`; else h += `<button class="btn primary" data-act="equip">${g.slot === 'hand' ? 'Wield' : 'Wear'}</button>`;
      for (const m of reach) if (canWear(m, selIt)) h += `<button class="btn" data-act="give" data-m="${m.id}">Give to ${displayName(m)}</button>`;
      h += `<button class="btn" data-act="drop">Drop</button>`;
    }
    h += '</div>';
  }
  else h += '<p class="hint">Select something to see what it does. Your human dead can carry a weapon, body armour and a helm. Giving, wearing and taking each cost half a turn.</p>';
  h += '</div>';
  h += `<div class="ptitle">Your dead within reach<small>3 paces</small></div><div class="reach">`;
  const rl = reach.concat(others);
  if (!rl.length) h += '<div class="rempty">None of your dead are close enough. Stand among them to arm them.</div>';
  for (const m of rl) {
    const human = DEF[m.type].plan === 'human'; const far = !reach.includes(m);
    h += `<div class="rrow${m === sm ? ' sel' : ''}">${ico(minIcon(m))}<b>${cap1(displayName(m))}${far ? ' <span style="color:var(--faint)">· too far</span>' : ''}</b><span class="mg">${human ? ['hand', 'body', 'head'].map(s => slotBtn(m.gear[s], `data-mg="${m.id}:${s}" data-tip="mg:${m.id}:${s}" title="${SLOTNAME[s]}"`, sel && sel.m === m && sel.slot === s ? ' sel' : '')).join('') : '<span class="rempty">cannot carry</span>'}</span></div>`;
  }
  h += '</div>';
  $('#pack').innerHTML = h;
}
function onPackClick(ev) {
  const b = ev.target.closest('button'); if (!b) return; const pl = S.player;
  if (b.dataset.act) {
    const a = b.dataset.act; const sel = packSel;
    if (a === 'close') { closePack(); return; }
    const it = sel && sel.it;
    if (a === 'equip' && it) manual(() => doEquip(it)); else if (a === 'use' && it) manual(() => doUse(it)); else if (a === 'drop' && it) manual(() => doDrop(it));
    else if (a === 'give' && it) { const m = S.ents.find(e => e.id === +b.dataset.m); manual(() => doGive(it, m)); }
    else if (a === 'unequip' && sel.slot) manual(() => doUnequip(sel.slot));
    else if (a === 'takeback' && sel.m) manual(() => doTakeBack(sel.m, sel.slot));
    packSel = null; packSig = ''; renderPack(); return;
  }
  if (b.dataset.pi !== undefined) { const it = pack()[+b.dataset.pi]; packSel = packSel && packSel.it === it ? null : { it }; }
  else if (b.dataset.eq) { const s = b.dataset.eq; packSel = pl.gear[s] ? (packSel && packSel.slot === s && !packSel.m ? null : { slot: s }) : null; }
  else if (b.dataset.mg) {
    const [id, s] = b.dataset.mg.split(':'); const m = S.ents.find(e => e.id === +id); if (!m) return;
    if (packSel && packSel.it && GEAR[packSel.it.b].slot === s) { const it = packSel.it; packSel = null; manual(() => doGive(it, m)); }
    else packSel = m.gear[s] ? { m, slot: s } : null;
  }
  packSig = ''; renderPack();
}

/* ---------- loot window ---------- */
export let lootSrc = null; let lootSig = '';
function lootEntries(src) {
  const out = [];
  if (src.kind === 'chest') { for (const it of src.c.loot) out.push({ it, take: () => { src.c.loot.splice(src.c.loot.indexOf(it), 1); } }); }
  else if (src.kind === 'corpse') { const g = src.k.gear || {}; for (const s of ['hand', 'body', 'head']) if (g[s]) { const it = g[s]; out.push({ it, take: () => { g[s] = null; } }); } }
  else if (src.kind === 'ground') { for (const gi of S.items) if (gi.kind === 'loot' && gi.x === S.player.x && gi.y === S.player.y) out.push({ it: gi.item, take: () => { S.items.splice(S.items.indexOf(gi), 1); } }); }
  return out;
}
function lootTitle(src) { return src.kind === 'chest' ? cap1(CHESTNAME[src.c.kind]) : src.kind === 'corpse' ? cap1(corpseName(src.k)) : 'On the ground'; }
export function showLoot(src) { lootSrc = src; lootSig = ''; $('#loot').hidden = false; renderLoot(); }
export function closeLoot() { lootSrc = null; $('#loot').hidden = true; $('#utip').hidden = true; }
function lootStill() { const s = lootSrc; if (!s) return false; if (s.kind === 'chest') return cheb(S.player, s.c) <= 1; if (s.kind === 'corpse') return S.corpses.includes(s.k) && cheb(S.player, s.k) <= 1; return true; }
export function renderLoot() {
  if (!lootStill()) { closeLoot(); return; } const E = lootEntries(lootSrc); const sig = E.map(e => e.it.id).join('.'); if (sig === lootSig) return; lootSig = sig;
  if (!E.length && lootSrc.kind === 'ground') { closeLoot(); return; }
  let h = `<div class="ptitle">${lootTitle(lootSrc)}<button class="btn wclose" data-act="close">Close <kbd>Esc</kbd></button></div>`;
  if (!E.length) h += '<div class="rempty">Nothing left.</div>';
  E.forEach((e, i) => { h += `<div class="lrow">${slotBtn(e.it, `data-li="${i}" data-tip="li:${i}"`)}<div><b style="color:${QCOL[e.it.q]}">${cap1(itemName(e.it))}</b><span>${itemLines(e.it)[0] || GEAR[e.it.b].v}</span></div><button class="btn" data-li="${i}">Take</button></div>`; });
  if (E.length > 1) h += `<div class="acts" style="justify-content:flex-end"><button class="btn primary" data-act="all">Take all <kbd>Space</kbd></button></div>`;
  if (lootSrc.kind === 'corpse') h += '<p class="hint" style="color:var(--faint);font-size:11px;margin:8px 0 0">What you take, the body will not have if you raise it.</p>';
  $('#loot').innerHTML = h;
}
function lootTake(i) { const E = lootEntries(lootSrc); const e = E[i]; if (!e) return; if (pack().length >= PACKN) { log('Your pack is full.'); return; } e.take(); takeItem(e.it); lootSig = ''; renderLoot(); }
export function lootAll() { const E = lootEntries(lootSrc); for (const e of E) { if (pack().length >= PACKN) { log('Your pack is full.'); break; } e.take(); takeItem(e.it); } lootSig = ''; renderLoot(); if (lootSrc && !lootEntries(lootSrc).length) closeLoot(); }
function onLootClick(ev) { const b = ev.target.closest('button'); if (!b) return; if (b.dataset.act === 'close') { closeLoot(); return; } if (b.dataset.act === 'all') { lootAll(); return; } if (b.dataset.li !== undefined) lootTake(+b.dataset.li); }
const hasGear = c => c.gear && (c.gear.hand || c.gear.body || c.gear.head);
export function lootHere() {
  const pl = S.player;
  const k = S.corpses.find(c => cheb(c, pl) <= 1 && hasGear(c) && c.x === pl.x && c.y === pl.y) || S.corpses.find(c => cheb(c, pl) <= 1 && hasGear(c));
  if (S.items.some(gi => gi.kind === 'loot' && gi.x === pl.x && gi.y === pl.y)) { showLoot({ kind: 'ground' }); return; }
  const ch = S.chests.find(c => cheb(c, pl) <= 1); if (ch && !ch.open) { manual(() => openChest(ch)); return; } if (ch && ch.loot && ch.loot.length) { showLoot({ kind: 'chest', c: ch }); return; }
  if (k) { showLoot({ kind: 'corpse', k }); return; }
  log('There is nothing here to take.');
}

/* ---------- tooltips for the interface ---------- */
export const STANCES = [['defensive', 'Defensive', '1'], ['aggressive', 'Aggressive', '2'], ['hold', 'Hold', '3']];
const STANCETXT = { defensive: 'Your dead keep a ring around you and move with you. They leave it only for enemies that attack you or them.', aggressive: 'Your dead keep a ring around you and move with you. They also go for any enemy that comes within nine paces of you.', hold: 'Your dead stay where they stand until you give another order.' };
function uiTip(key) {
  const [a, b, c] = key.split(':'); const pl = S.player;
  if (a === 'spell') { const sp = SP[b]; return `<h3>${sp.name}</h3><div class="st">${sp.blood ? `costs ${sp.blood} blood` : `costs ${sp.cost} will${b === 'raise' ? ' for each body' : ''}`} · key ${sp.key}</div><p>${sp.text}</p>${b === 'raise' ? `<p class="hint">Automatic raising is ${S.autoRaise ? 'on' : 'off'} (G). Right-click a body or grave to raise that one.</p>` : ''}`; }
  if (a === 'misc') return { wait: '<h3>Wait</h3><p>Let a moment pass.</p><p class="hint">Period, or Space in turns</p>', rest: '<h3>Rest</h3><p>Sit among your dead until you are healed or something comes.</p><p class="hint">T</p>', pack: '<h3>Pack</h3><p>What you carry, what you wear, and the gear of your dead.</p><p class="hint">I</p>' }[b];
  if (a === 'belt') { const n = pack().filter(i => i.b === b).length; return itemTipHTML(mkItemView(b), `${n} carried · key ${BELT.find(x => x[0] === b)[1]}`); }
  if (a === 'stance') return `<h3>${cap1(b)}</h3><p>${STANCETXT[b]}</p><p class="hint">Key ${STANCES.find(x => x[0] === b)[2]} · a quarter of a turn</p>`;
  if (a === 'minion') { const m = S.ents.find(e => e.id === +b); return m ? creatureTip(m) + '<p class="hint">Click to select it and see its gear.</p>' : null; }
  if (a === 'eq') { const it = pl.gear[b]; return it ? itemTipHTML(it) : `<h3>${SLOTNAME[b]}</h3><p class="hint">Nothing here.</p>`; }
  if (a === 'pi') { const it = pack()[+b]; return it ? itemTipHTML(it, 'Click to select.') : null; }
  if (a === 'mg') { const m = S.ents.find(e => e.id === +b); const it = m && m.gear[c]; return it ? itemTipHTML(it, `Worn by ${the(m)}.`) : `<h3>${SLOTNAME[c]}</h3><p class="hint">Empty. Select something in your pack, then click here to give it.</p>`; }
  if (a === 'li') { const E = lootSrc ? lootEntries(lootSrc) : []; const e = E[+b]; return e ? itemTipHTML(e.it) : null; }
  if (a === 'sys') return { save: '<h3>Saved</h3><p>Your run is saved in this browser after every turn, and to your account about once a minute.</p>' }[b] || null;
  return null;
}
let utipEl = null;
function onUiOver(ev) {
  const el = ev.target.closest && ev.target.closest('[data-tip]'); const t = $('#utip'); if (!el) { if (utipEl) { utipEl = null; t.hidden = true; } return; }
  if (el === utipEl) return; utipEl = el; const h = uiTip(el.dataset.tip); if (!h) { t.hidden = true; return; } t.innerHTML = h; t.hidden = false;
  const r = el.getBoundingClientRect(), w = t.offsetWidth, hh = t.offsetHeight; let x = r.left + r.width / 2 - w / 2, y = r.top - hh - 8; if (y < 8) y = r.bottom + 8; x = clamp(x, 8, innerWidth - w - 8); if (y + hh > innerHeight - 8) y = innerHeight - hh - 8;
  t.style.left = x + 'px'; t.style.top = y + 'px';
}

/* ---------- tooltip on the map: what you know about a thing ---------- */
function tipFor(x, y) {
  if (!inb(x, y) || !vis[I(x, y)]) return null; const e = occ[I(x, y)];
  if (e && !e.dead && seesE(e)) return creatureTip(e);
  const c = S.corpses.find(k => k.x === x && k.y === y);
  if (c) { const g = c.gear || {}; const gl = ['hand', 'body', 'head'].filter(s => g[s]).map(s => itemName(g[s])); return `<h3>${cap1(corpseName(c))}</h3><p>${corpseText(c)}</p>${gl.length ? `<div class="known" style="color:var(--bone)">Wearing: ${gl.join(', ')}</div>` : ''}${c.holy ? '' : `<p class="hint">Right-click to raise it.${gl.length ? ' Click it when next to it to take its gear.' : ''}</p>`}`; }
  const lt = S.items.find(k => k.x === x && k.y === y && k.kind === 'loot'); if (lt) return itemTipHTML(lt.item, lt.item.dropped !== undefined ? 'You set this down. Stand on it and press , to take it back.' : 'Walk over it to pick it up.');
  { const ch = chestAt(x, y); if (ch) return `<h3>${cap1(CHESTNAME[ch.kind])}</h3><p>${ch.open ? (ch.loot && ch.loot.length ? 'Open. Something is still inside.' : 'Open, and empty.') : ch.kind === 'sarc' ? 'A stone coffin with a heavy lid. Someone was buried here with what they owned.' : ch.kind === 'alms' ? 'Locked. Breaking it open will be loud.' : 'Closed.'}</p><p class="hint">${ch.open ? 'Click it when next to it to look inside.' : 'Click it or walk into it to open it.'}</p>`; }
  const it = S.items.find(k => k.x === x && k.y === y); if (it) return `<h3>${it.kind === 'tome' ? 'A book, wrapped in oilcloth' : it.kind === 'tablet' ? 'A rolled lead tablet' : 'A dropped torch'}</h3><p>${it.kind === 'torch' ? 'Still burning, for now.' : 'Step on it to read it.'}</p>`;
  const t = map[I(x, y)];
  if (t === GRAVE) return '<h3>A grave</h3><p>Old, and not deep. Whoever is down there could still be called up.</p><p class="hint">Right-click to raise it.</p>';
  if (t === SEAL) return S.G.sealOpen ? null : '<h3>A door without a seam</h3><p>Smooth grey stone, warm to the touch. It does not open for you.</p>';
  if (t === CRADLE) return '<h3>The cradle</h3><p>Empty.</p>';
  if (t === FWALL || t === FOUND) return '<h3>The Foundations</h3><p>Stone with no joins and no tool marks, older than anything built on top of it.</p>';
  return null;
}
function corpseText(c) {
  const st = stage(c); if (c.holy) return 'Burned clean by prayer. Nothing in it will answer you.';
  if (c.name) return `What is left of ${c.name}. The bones are stained grey to the wrist.`;
  return st === 'fresh' ? 'Still warm. A body this fresh rises strong.' : st === 'bloated' ? 'Swollen with the gases of the rot. It would burst violently.' : st === 'rotten' ? 'Soft and falling apart. It would rise weak.' : 'Bare bone. It would rise as a skeleton.';
}
export function creatureTip(e) {
  const pl = S.player, d = DEF[e.type]; const k = e === pl ? 2 : isMinion(e) || e.unbound ? 2 : (S.know[e.type] || 0);
  let h = `<h3>${e === pl ? S.heroName : cap1(displayName(e))}</h3>`;
  if (e === pl) h += `<p>A necromancer of ${S.region}. You.</p>`; else if (d.look) h += `<p>${e.unbound ? 'It is no longer yours. It remembers who held it.' : d.look}</p>`;
  const st = [];
  if (e.team === 1 || e.type === 'hound') { st.push(e.nerve < 15 && e.aware ? 'breaking' : e.nerve < 40 ? 'shaken' : 'steady'); st.push(e.aware ? 'hunting' : 'unaware'); if (e.light === false && e.type !== 'hound') st.push('without light'); if (e.type === 'xbow') st.push(e.loaded ? 'loaded' : 'reloading'); }
  if (isMinion(e) && e.idle) st.push('out of your reach'); if (e.mark > 0) st.push('marked'); if (living(e) && e.bleed >= .4) st.push('bleeding');
  if (st.length) h += `<div class="st">${st.join(' · ')}</div>`;
  h += '<table>' + e.parts.map(p => { const w = partWord(p, e); const cls = p.gone ? 'gone' : p.hp < p.max * .5 ? 'bad' : ''; return `<tr><td>${p.name}</td><td class="${cls}">${k >= 2 && !p.gone ? `${w} · ${p.hp}/${p.max}` : w}</td></tr>`; }).join('') + '</table>';
  if (e.gear && (isMinion(e) || e === pl)) { const gl = ['hand', 'body', 'head'].filter(s => e.gear[s]).map(s => itemName(e.gear[s])); if (gl.length) h += `<div class="known" style="color:var(--bone)">${gl.join(' · ')}</div>`; }
  const w = curWeapon(e) || WEAP.fist; const spd = effSpeed(e);
  if (k >= 2) h += `<div class="known">Speed ${Math.round(spd)} · ${w.name} ${w.dmg[0]}–${w.dmg[1]} ${w.type}${living(e) && e.bmax ? ` · blood ${Math.ceil(e.blood)}/${e.bmax}` : ''}</div>`;
  else if (k === 1) h += `<div class="known">${spd > 120 ? 'Fast' : spd < 95 ? 'Slow' : 'Your pace'} · ${w.name}, ${w.type} · Raise one of its dead to learn more</div>`;
  else h += `<div class="known">${spd > 120 ? 'Looks fast' : 'Moves at a walk'} · carries a ${w.name} · You know little about it yet</div>`;
  return h;
}
export let mouseXY = null;
export function setMouse(p) { mouseXY = p; if (!p) { RS.hover = null; $('#tip').hidden = true; } }
export function updateTip() {
  const tip = $('#tip');
  if (!mouseXY || RS.modalOpen || !S.player) { tip.hidden = true; RS.hover = null; return; }
  RS.hover = screenToTile(mouseXY[0], mouseXY[1]); const h = tipFor(RS.hover[0], RS.hover[1]);
  if (!h) { tip.hidden = true; return; } if (tip._h !== h) { tip.innerHTML = h; tip._h = h; } tip.hidden = false;
  const w = tip.offsetWidth, hh = tip.offsetHeight; let x = mouseXY[0] + 18, y = mouseXY[1] + 14; if (x + w > RS.CW - 8) x = mouseXY[0] - w - 14; if (y + hh > RS.CH - 8) y = Math.max(8, RS.CH - hh - 8); tip.style.left = x + 'px'; tip.style.top = y + 'px';
}
export function initWindows() {
  $('#pack').addEventListener('click', onPackClick);
  $('#loot').addEventListener('click', onLootClick);
  document.addEventListener('mouseover', onUiOver);
}
