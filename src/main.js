// The page: boot, the title screen, the frame loop, autosave, and the test hooks.
import { S } from './core/state.js';
import { onEvent, log } from './core/events.js';
import { I, cheb, findFree, vis } from './core/level.js';
import { isMinion, setPos, mkItem, hostile, seesE, displayName } from './core/rules.js';
import { cap1 } from './core/content.js';
import { newGame, newStressGame, serialize, deserialize, saveSummary } from './core/game.js';
import { computeFOV } from './core/level.js';
import { playerAct, isBusy, intentStep, startExplore, stopIntents, RT, rtTick, playerReady } from './core/clock.js';
import { autoAct } from './bot/autoplay.js';
import { buildNoise, buildRealMap } from './render/mapart.js';
import { rebuildLights, buildDynLights, computeHi } from './render/light.js';
import { installFX, resetFX, runFXQ, updateFX, updateParticles, dressEnt, ghosts, FX, pn } from './render/fx.js';
import { clearSprites } from './render/figures.js';
import { cv, ctx, render, resize } from './render/view.js';
import { RS, QL, q, $ } from './render/rstate.js';
import { initHUD, hud, resetHUD, drawMinimap } from './ui/hud.js';
import { initWindows, showLoot, closeLoot, closePack, updateTip, packOpen, lootSrc } from './ui/windows.js';
import { initModals, setModalActions, showModal, closeModal, showReading, showDeath, helpHTML, showTitle, confirmStress, confirmNew, notice } from './ui/modals.js';
import { initInput } from './ui/input.js';
import { walk, glide, placeWalker } from './ui/walk.js';
import { setAuto, setAnim, RTQ, SPEEDS, setMode, setSpeed, setPaused } from './ui/control.js';
import { Store, initStorage, saveLocal, loadLocal, loadAccount, saveAccount, exportFile, importFile } from './ui/storage.js';

/* ---------- a level was made or loaded: rebuild everything drawn from it ---------- */
function onLevelBound() {
  buildRealMap(); rebuildLights(); resetFX(); clearSprites();
  for (const e of S.ents) dressEnt(e);
  placeWalker();
  if (S.player) { RS.camX = S.player.x + .5; RS.camY = S.player.y + .5; }
  RS.selMinion = null; closeLoot(); closePack(); foeSeen.clear(); setPaused(false); RTQ.fn = null;
  resetHUD(); hud();
}
/* ---------- after each of your turns ---------- */
function afterTurn() {
  if (S.lootQueued) { const lq = S.lootQueued; S.lootQueued = null; if (!S.stress && !RS.auto) showLoot(lq); }
  if (S.readQueued) { const r = S.readQueued; S.readQueued = null; if (RS.auto) setAuto(false); if (r.end) r.end = true; showReading(r); }
  autosave();
}

/* ---------- autosave: this browser every turn (at most once a second), the account about once a minute ---------- */
let acctDirty = false, localTimer = 0;
const canSave = () => S.player && !S.stress;
function saveNow() { if (!canSave()) return; clearTimeout(localTimer); localTimer = 0; saveLocal(serialize()); acctDirty = true; }
function autosave() {
  if (!canSave()) return;
  if (S.gameOver) { saveNow(); flushAccount(); return; }
  if (Date.now() - Store.lastLocal > 1000) saveNow(); else if (!localTimer) localTimer = setTimeout(saveNow, 1000);
}
function flushAccount() { if (!canSave() || !Store.db || !acctDirty) return; acctDirty = false; saveAccount(serialize()); }
setInterval(() => { if (Date.now() - Store.lastAcct > 60000) flushAccount(); }, 5000);
const onHide = () => { if (!canSave()) return; saveNow(); flushAccount(); };
addEventListener('pagehide', onHide); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') onHide(); });

/* ---------- starting, continuing, leaving ---------- */
let titleSum = null;
function withLoading(fn) { $('#load').hidden = false; setTimeout(() => { fn(); $('#load').hidden = true; }, 40); }
function stressOff() { $('#bStress').classList.remove('hot'); $('#bStress').textContent = 'Stress test'; }
function startNew() {
  stressOff(); setAuto(false); titleSum = null;
  withLoading(() => {
    newGame((Math.random() * 2 ** 31) >>> 0); saveNow(); flushAccount();
    let first = true; try { first = !localStorage.getItem('necro-seen'); localStorage.setItem('necro-seen', '1'); } catch (e) { /* private mode */ }
    if (first) showModal(helpHTML(true));
  });
}
function askNew() { const live = (S.player && !S.gameOver && !S.stress) || (!S.player && titleSum && !titleSum.dead); if (live) confirmNew(startNew); else startNew(); }
function loadRun(data, where) {
  try { deserialize(data); } catch (e) { notice('That save could not be read', String(e && e.message || e)); return false; }
  stressOff(); titleSum = null; saveNow();
  if (RT.on && !S.gameOver) setPaused(true, 'your run, where you left it');
  if (S.gameOver) setTimeout(showDeath, 300); else if (S.readQueued) afterTurn();
  if (where) log(`Your run was carried over from ${where}.`, 'grey');
  return true;
}
let pendingSave = null;
function onStress() {
  if (S.stress) { const l = loadLocal(); withLoading(() => { if (l && l.data) loadRun(l.data); else startNew(); setAuto(false); }); return; }
  confirmStress();
}
async function onExport() {
  if (!S.player || S.stress) { log('There is no run to save right now.'); return; }
  saveNow(); const name = `necromancer-${(S.heroName || 'run').replace(/\W+/g, '-').toLowerCase()}-turn${S.turn}.json`;
  const r = await exportFile(serialize(), name);
  if (r === 'saved') log('Your run was written to a file.', 'grey'); else if (r === 'failed') log('The file could not be saved here.', 'grey');
}
setModalActions({
  new: askNew,
  continue: () => withLoading(() => { if (pendingSave) loadRun(pendingSave.data, pendingSave.where); pendingSave = null; }),
  stress: () => { if (canSave()) saveNow(); $('#bStress').classList.add('hot'); $('#bStress').textContent = 'Stress test on'; withLoading(() => { newStressGame(); setAuto(true); }); },
  import: async () => {
    const d = await importFile(); if (!d) { if (!S.player) bootTitle(); return; }
    withLoading(() => { if (loadRun(d)) { flushAccount(); log('Your run was loaded from a file.', 'grey'); } else if (!S.player) bootTitle(); });
  },
});

/* ---------- real time ---------- */
// the game stops by itself when an enemy comes into view that you have not seen for a while
const foeSeen = new Map();
function checkNewFoes() {
  let fresh = null;
  for (const e of S.ents) {
    if (e.dead || !hostile(S.player, e) || !vis[I(e.x, e.y)] || !seesE(e)) continue;
    const last = foeSeen.get(e.id); if ((last === undefined || S.turn - last > 12) && !fresh) fresh = e; foeSeen.set(e.id, S.turn);
  }
  if (fresh && !S.stress && !RS.auto) { stopIntents(); setPaused(true, `${cap1(displayName(fresh))} in sight`); }
}
// your act when you are ready: autoplay, then what you asked for, then whatever you set in motion (walking is in walk.js)
function rtPlayer() {
  if (RS.auto) { playerAct(() => autoAct() || 100); return; }
  if (RTQ.fn) { const f = RTQ.fn; RTQ.fn = null; if (playerAct(f)) return; }
  intentStep();
}
let simAcc = 0;
const rtRunning = () => !(RS.modalOpen || S.gameOver || RS.paused || packOpen || lootSrc);
const turnSec = () => SPEEDS[RS.speed] / (S.intent.rest ? 5 : 1);
function rtAdvance(dt) {
  if (!rtRunning()) { simAcc = 0; return; }
  walk(dt, turnSec());
  const tickSec = SPEEDS[RS.speed] / 10; simAcc += dt * (S.intent.rest ? 5 : 1);
  let n = 0;
  while (simAcc >= tickSec && n++ < 60) {
    simAcc -= tickSec; if (playerReady()) rtPlayer(); rtTick(); checkNewFoes();
    if (RS.paused || RS.modalOpen || S.gameOver) { simAcc = 0; break; }
  }
  if (n >= 60) simAcc = 0;
}

/* ---------- the frame loop ---------- */
let last = performance.now(), stepT = 0, fpsAcc = 0, fpsN = 0, fpsShow = 0, hudT = 0, qT = 0, qAcc = 0, qN = 0, qGood = 0;
const prof = { sim: 0, light: 0, render: 0 };
const stepInterval = () => S.stress ? .11 : RS.animFast ? .07 : .2;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(.05, (now - last) / 1000); last = now; const t = now / 1000;
  if (!S.player) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height); return; }
  runFXQ(); if (FX.hitStop > 0) { FX.hitStop -= dt; dt *= .12; }
  // moves resolved this turn play out over a few frames
  const k = 1 - Math.exp(-dt * (RT.on ? 20 : RS.animFast ? 40 : 14)), ka = Math.exp(-dt * 12);
  const pl = S.player, ts = turnSec();
  for (const e of S.ents) {
    if (!RT.on) { e.rx += (e.x - e.rx) * k; e.ry += (e.y - e.ry) * k; } else if (e !== pl) glide(e, dt, ts);
    e.ax *= ka; e.ay *= ka; if (e.flash > 0) e.flash -= dt;
  }
  if (RT.on && !rtRunning()) walk(dt, ts, true); // stopped: a step under way still finishes
  for (const e of ghosts) { e.rx += (e.x - e.rx) * k; e.ry += (e.y - e.ry) * k; e.ax *= ka; e.ay *= ka; if (e.flash > 0) e.flash -= dt; }
  { const ck = 1 - Math.exp(-dt * 5); RS.camX += (pl.rx + .5 - RS.camX) * ck; RS.camY += (pl.ry + .5 - RS.camY) * ck; }
  updateParticles(dt); updateFX(dt);
  // stepping: autoplay, walking, exploring, resting
  const T0 = performance.now();
  if (RT.on) rtAdvance(dt);
  else {
    stepT += dt;
    if (stepT >= stepInterval() && !RS.modalOpen && !S.gameOver && !isBusy()) { stepT = 0; if (RS.auto) playerAct(() => autoAct() || 100); else intentStep(); }
  }
  const T1 = performance.now(); buildDynLights(t); computeHi(t); const T2 = performance.now(); render(t); const T3 = performance.now();
  prof.sim = prof.sim * .95 + (T1 - T0) * .05; prof.light = prof.light * .95 + (T2 - T1) * .05; prof.render = prof.render * .95 + (T3 - T2) * .05;
  fpsAcc += dt; fpsN++; if (fpsAcc > .5) { fpsShow = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; $('#fps').textContent = `${fpsShow} fps · ${Math.round(q().scale * 100)}%`; }
  // quality governor: drop render scale and effect budgets only when frames run long, recover when there is headroom
  qAcc += dt; qN++; qT += dt;
  if (qT >= 1.2) {
    const avg = qAcc / qN * 1000; qAcc = 0; qN = 0; qT = 0;
    if (RS.qLock < 0) { if (avg > 19.5 && RS.qLevel < QL.length - 1) { RS.qLevel++; resize(); qGood = 0; } else if (avg < 15.5) { if (++qGood >= 4 && RS.qLevel > 0) { RS.qLevel--; resize(); qGood = 0; } } else qGood = 0; }
  }
  hudT += dt; if (hudT > .1) { hudT = 0; hud(); updateTip(); drawMinimap(); }
}

/* ---------- boot ---------- */
onEvent((type) => {
  if (type === 'newGame' || type === 'loaded') onLevelBound();
  else if (type === 'turn') afterTurn();
  else if (type === 'playerDied') { setAuto(false); setTimeout(showDeath, 900); }
});
async function bootTitle() {
  $('#load').textContent = 'Looking for your run…'; $('#load').hidden = false;
  await Promise.race([initStorage(), new Promise(r => setTimeout(r, 4000))]);
  const loc = loadLocal(), acc = await Promise.race([loadAccount(), new Promise(r => setTimeout(() => r(null), 4000))]);
  const pickA = acc && (!loc || acc.savedAt > loc.savedAt + 2000);
  const best = pickA ? acc : loc;
  pendingSave = best ? { data: best.data, where: pickA && loc ? 'your account' : '' } : null;
  let sum = null; try { sum = best ? saveSummary(best.data) : null; } catch (e) { sum = null; }
  titleSum = sum; $('#load').hidden = true; $('#load').textContent = 'The dead are being counted…';
  showTitle(sum, pickA ? 'to your account' : best ? 'in this browser' : '');
}
resize(); buildNoise(ctx); initHUD(); initWindows(); initModals(); installFX(); initInput(resize, onStress, onExport);
try { setAnim(localStorage.getItem('necro-anim') === '1'); } catch (e) { setAnim(false); }
{ let m = 'rt', sp = 2; try { m = localStorage.getItem('necro-mode') || 'rt'; sp = +(localStorage.getItem('necro-speed') ?? 2); } catch (e) { /* private mode */ } setMode(m !== 'turns'); setSpeed(isNaN(sp) ? 2 : sp); }
requestAnimationFrame(frame);
bootTitle();

// hooks for automated checks in a headless browser
window.__necro = {
  get state() { const pl = S.player; return pl ? { turn: S.turn, blood: pl.blood, will: S.will, ents: S.ents.length, minions: S.ents.filter(isMinion).length, corpses: S.corpses.length, gameOver: S.gameOver, won: S.won, zone: S.L.zoneNames[S.L.zone[I(pl.x, pl.y)]], learned: Object.keys(S.learned), q: RS.qLevel, fps: fpsShow, prof: Object.fromEntries(Object.entries(prof).map(([k, v]) => [k, +v.toFixed(2)])), pn, modal: RS.modalOpen, stress: !!S.stress, log: S.logLines.map(l => l[0]) } : null; },
  run(n) { for (let i = 0; i < n && !S.gameOver; i++) { if (RS.modalOpen) closeModal(); if (RT.on) { let g = 0; while (!playerReady() && !S.gameOver && g++ < 400) rtTick(); } playerAct(() => autoAct() || 100); } return this.state; },
  newRegion(sd) { newGame(sd); }, startStress() { newStressGame(); setAuto(true); }, setAuto, closeModal, setMode, setPaused, get paused() { return RS.paused; }, get rt() { return RT.on; },
  get modal() { return RS.modalOpen; }, folio: () => $('#folio').innerText,
  click(act) { const b = $(`#folio [data-act="${act}"]`); if (b) b.click(); return !!b; },
  tp(x, y, army) { const p = S.player, qq = findFree(x, y, 3); setPos(p, qq[0], qq[1]); placeWalker(); RS.camX = qq[0] + .5; RS.camY = qq[1] + .5; if (army) for (const m of S.ents) if (isMinion(m)) { const r = findFree(qq[0], qq[1], 4); setPos(m, r[0], r[1]); m.rx = r[0]; m.ry = r[1]; } computeFOV(); },
  get pos() { const p = S.player; return p && { x: p.x, y: p.y, px: +(p.px ?? 0).toFixed(3), py: +(p.py ?? 0).toFixed(3), energy: p.energy }; },
  foes: () => S.ents.filter(e => hostile(S.player, e)).map(e => ({ x: e.x, y: e.y, type: e.type, aware: !!e.aware })),
  explore() { return startExplore(); }, G: () => S.G,
  formation() { const ms = S.ents.filter(isMinion); return { n: ms.length, max: Math.max(0, ...ms.map(m => cheb(m, S.player))) }; },
  addItem(b, qq) { S.player.pack.push(mkItem(b, qq || 0)); },
  lockQ(l) { RS.qLock = l; if (l >= 0) { RS.qLevel = l; resize(); } },
  god() { const p = S.player; p.blood = p.bmax = 999; p.parts.forEach(pp => { pp.max = pp.hp = 999; }); },
  save: () => serialize(), load: d => loadRun(d), local: () => loadLocal(), saveNow,
};
