// The folio: readings, help, death, and the title screen.
import { S } from '../core/state.js';
import { log } from '../core/events.js';
import { SP } from '../core/content.js';
import { learnFrom } from '../core/clock.js';
import { RS, $ } from '../render/rstate.js';
import { buildSpellBar } from './hud.js';

let modalAfter = null; const ACTS = {};
// main hands in what the buttons do: new, continue, stress, import, export
export function setModalActions(o) { Object.assign(ACTS, o); }
export function showModal(html, after) {
  $('#folio').innerHTML = html; $('#modal').hidden = false; RS.modalOpen = true; modalAfter = after || null;
  const b = $('#folio').querySelector('.primary') || $('#folio').querySelector('button'); if (b) b.focus();
}
export function closeModal() { $('#modal').hidden = true; RS.modalOpen = false; const f = modalAfter; modalAfter = null; if (f) f(); }
function onModalClick(ev) {
  const b = ev.target.closest('button[data-act]'); if (!b) return; const a = b.dataset.act;
  if (a === 'close' || a === 'keep') { closeModal(); return; }
  if (ACTS[a]) { if (a !== 'export') closeModal(); ACTS[a](b); }
}
export function initModals() { $('#modal').addEventListener('click', onModalClick); }

export function showReading(r) {
  showModal(`<div class="eyebrow">${r.eyebrow}</div><h2>${r.title}</h2><div class="read">${r.html}</div><div class="row">${r.end ? '<button class="btn" data-act="new">New region</button>' : ''}<button class="btn primary" data-act="close">${r.end ? 'Keep exploring' : 'Close'}</button></div>`,
    () => { if (learnFrom(r)) { buildSpellBar(r.learn); log(`You know ${SP[r.learn].name} now (${SP[r.learn].key}).`, 'soul'); } });
}
export function helpHTML(first) {
  return `<div class="eyebrow">${first ? `${S.region} · night` : 'Controls'}</div><h2>${first ? 'The first night' : 'How to play'}</h2>
<div class="help">${first ? `<p>One generated region: a graveyard, a chapel of the Mercy, a crypt, the caves under it, and something older below. Fights are lethal, for you too. Light decides who sees whom. Numbers you haven't learned stay hidden. There is something at the bottom of the region; you don't have to find it.</p><p>Death is final. The game saves itself after every turn; there is no going back to an earlier save.</p>` : ''}
<h4>Real time</h4><ul><li>The world runs on its own. Space pauses it, and it pauses by itself when an enemy you haven't seen for a while comes into view. While paused you can still cast, give orders and use your pack; the act happens at once if you are ready, or as soon as you are.</li><li>Hold a direction to keep walking. Each act takes its time: a working leaves you a moment before you can act again. [ and ] change how fast the world runs. The world stops while the pack or a loot window is open.</li><li>K switches to turns, where nothing moves until you act; there Space waits a turn.</li></ul>
<h4>Move and fight</h4><ul><li>WASD, arrows or numpad. Diagonals Q E Z C. Walk into a foe to strike with your staff.</li><li>Click a tile to walk there. Click a foe to cast Soul Bolt at it. Hover anything to see what you know.</li><li>Period waits a moment (Space in turns). T rests until healed or disturbed, and the night passes faster while you do. N picks the next target.</li><li>O explores: you walk toward the nearest unexplored place and stop when something comes into sight. The map, top right, shows what you have seen; click it to walk there.</li><li>Tab highlights remains, graves, chests and loot, with names.</li></ul>
<h4>Loot</h4><ul><li>Walk over loot to pick it up. Walk into a chest or sarcophagus to open it, or click it. Click a body next to you to take what it wears; the body keeps nothing you take if you raise it later.</li><li>I opens your pack: wield and wear things, and give weapons, armour and helms to your human dead within three paces. Charms are yours alone.</li><li>5 bandage, 6 blood-wine, 7 grave-salt. Comma takes what is here.</li></ul>
<h4>Workings</h4><ul><li>R Quickening, F Soul Bolt, X Corpse Burst, B Price of Breath. Others can be learned in the region.</li><li>Remains near you rise on their own while your grip has room, paid from Will. G turns that off. R raises the nearest ones yourself, even past your grip; right-click a body or grave to raise that one.</li><li>When Will runs out, workings take blood instead, and that has other costs.</li></ul>
<h4>Your dead</h4><ul><li>Your dead always keep a ring around you and move with you. 1 Defensive: they leave it only for enemies that attack you or them. 2 Aggressive: they also go for anything that comes within nine paces of you. 3 Hold: they stay where they stand. Orders cost a quarter of a turn. The roster on the left shows each of them.</li><li>Grip shows how many dead you can hold: few, but they are hard to put down. Going past it is possible.</li></ul>
<h4>Seeing and being seen</h4><ul><li>H shutters your lantern: you see less, and the living have to come close to see you. Most of the dead see in the dark.</li><li>V shows where visible enemies can strike.</li></ul>
<h4>Your run</h4><ul><li>The run saves itself in this browser after every turn, and to your Claude account about once a minute, so it follows you to another device. Save, top right, writes a file you can keep; Load reads one back on the title screen.</li></ul>
<h4>Testing</h4><ul><li>P hands the game to a bot so you can watch. Y switches army turns between animated and fast.</li><li>The frame rate is top right. Stress test runs about a hundred dead against waves of the living, with explosions nearly every turn; it never touches your saved run. The percentage is the render scale; it drops only if the frame rate does.</li><li>Wheel or + and − to zoom. The Fullscreen button, top right, fills the screen; Esc leaves it.</li></ul></div>
<div class="row"><button class="btn primary" data-act="close">${first ? 'Begin' : 'Close'}</button></div>`;
}
const HOW = { cut: 'cut down', pierce: 'shot through', blunt: 'beaten to death', holy: 'burned by a prayer', burst: 'torn apart by your own working', soul: 'unmade', bleeding: 'bled out', fire: 'burned' };
export function showDeath() {
  const dc = S.deathCause || {}; const how = HOW[dc.cause] || 'killed';
  const by = dc.src && dc.cause !== 'bleeding' ? ` by a ${dc.src}` : ''; const part = dc.part && !['bleeding', 'burst'].includes(dc.cause) ? `, a blow to the ${dc.part}` : '';
  const lines = S.chron.slice(-4).map(c => `<p style="color:var(--dim);font-size:14px">${c}</p>`).join('');
  showModal(`<div class="eyebrow">Recorded</div><h2>${S.heroName} is dead</h2><div class="read"><p>${how[0].toUpperCase() + how.slice(1)}${by}${part}, in ${dc.where || 'the dark'}, on turn ${S.turn}.</p>${lines}</div>
<div class="stats"><div><b>${S.turn}</b><span>Turns</span></div><div><b>${S.stats.raised}</b><span>Dead raised</span></div><div><b>${S.stats.killed}</b><span>Living slain</span></div><div><b>${S.stats.lost}</b><span>Dead lost</span></div></div>
<div class="help"><p>Your body stays where it fell. In a later build, the next necromancer will find it.</p></div><div class="row"><button class="btn primary" data-act="new">New region</button></div>`);
}
export function confirmStress() {
  showModal(`<div class="eyebrow">Frame rate</div><h2>Run the stress test?</h2><div class="help"><p>A test field: about a hundred of your dead against endless waves, with Corpse Burst nearly every turn. Watch the FPS counter, top right. Your saved run is left alone; press the button again to go back to it.</p></div><div class="row"><button class="btn" data-act="keep">Cancel</button><button class="btn primary" data-act="stress">Start stress test</button></div>`);
}
// the first thing you see: carry on, or begin again
export function showTitle(sum, where) {
  const live = sum && !sum.dead && !sum.stress;
  const cont = live ? `<div class="help"><p><b>${sum.hero}</b>, in ${sum.region}. Turn ${sum.turn}, ${sum.minions} of the dead in hand, blood ${sum.blood}.${where ? ` <span style="color:var(--faint)">Saved ${where}.</span>` : ''}</p></div>` : '';
  const dead = sum && sum.dead ? `<div class="help"><p>${sum.hero} died in ${sum.region} on turn ${sum.turn}. That run is over.</p></div>` : '';
  showModal(`<div class="eyebrow">Necromancer</div><h2>${live ? 'The night goes on' : 'A new night'}</h2>${cont}${dead}${!sum ? '<div class="help"><p>A barrow-field, a chapel of the Mercy, and the dead under both. You have one life, and the game keeps it: there is no loading an earlier turn.</p></div>' : ''}
<div class="row">${live ? '<button class="btn" data-act="new">New region</button><button class="btn primary" data-act="continue">Continue</button>' : '<button class="btn" data-act="import">Load a save file</button><button class="btn primary" data-act="new">Begin</button>'}</div>
${live ? '<div class="row" style="margin-top:6px"><button class="btn" data-act="import">Load a save file</button></div>' : ''}
${live ? '<p class="hint" style="color:var(--faint);font-size:12px;margin-top:10px">A new region ends this run for good.</p>' : ''}`);
}
export function confirmNew(go) {
  showModal(`<div class="eyebrow">Your run</div><h2>Abandon this night?</h2><div class="help"><p>A new region ends the run you have now. It cannot be brought back.</p></div><div class="row"><button class="btn" data-act="keep">Keep playing</button><button class="btn primary" data-act="newConfirmed">Begin again</button></div>`);
  ACTS.newConfirmed = go;
}
export function notice(title, text) { showModal(`<div class="eyebrow">Your run</div><h2>${title}</h2><div class="help"><p>${text}</p></div><div class="row"><button class="btn primary" data-act="close">Close</button></div>`); }
