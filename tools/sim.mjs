// Headless runs of the real game rules: bots play, and we check determinism and saves.
// node tools/sim.mjs [runs] [maxTurns]
import { registerSealed } from './sealed.mjs';
registerSealed();
const { S } = await import('../src/core/state.js');
const { newGame, serialize, deserialize } = await import('../src/core/game.js');
const { playerAct, learnFrom } = await import('../src/core/clock.js');
const { isMinion } = await import('../src/core/rules.js');
const { autoAct } = await import('../src/bot/autoplay.js');
import { createHash } from 'node:crypto';

const runs = +(process.argv[2] || 20), maxTurns = +(process.argv[3] || 1500);
const hashState = () => createHash('sha1').update(JSON.stringify(serialize())).digest('hex').slice(0, 12);

function step() {
  if (S.readQueued) { learnFrom(S.readQueued); S.readQueued = null; }
  S.lootQueued = null;
  return playerAct(() => autoAct() || 100);
}
function play(seed, turns, onTurn) {
  newGame(seed); let n = 0;
  while (!S.gameOver && S.turn < turns && n++ < turns * 4) { step(); if (onTurn) onTurn(); }
  return S;
}

// 1. determinism: the same seed played twice ends in the same state
{
  play(12345, 400); const a = hashState();
  play(12345, 400); const b = hashState();
  console.log(`determinism: ${a === b ? 'ok' : 'FAILED'} (${a} vs ${b})`);
  if (a !== b) process.exitCode = 1;
}
// 2. save round trip: save mid-run, load, and both continue identically
{
  play(999, 250); const snap = JSON.stringify(serialize());
  const before = hashState();
  deserialize(JSON.parse(snap)); const after = hashState();
  console.log(`save round trip (immediate): ${before === after ? 'ok' : 'FAILED'}`);
  if (before !== after) process.exitCode = 1;
  // continue the original run and a restored copy for 300 more turns each
  play(999, 250); let g = 0; while (!S.gameOver && S.turn < 550 && g++ < 3000) step(); const h1 = hashState();
  deserialize(JSON.parse(snap)); g = 0; while (!S.gameOver && S.turn < 550 && g++ < 3000) step(); const h2 = hashState();
  console.log(`save round trip (300 more turns): ${h1 === h2 ? 'ok' : 'FAILED'} (${h1} vs ${h2})`);
  if (h1 !== h2) process.exitCode = 1;
  console.log(`save size: ${(snap.length / 1024).toFixed(1)} KB as JSON`);
}
// 3. balance: many bot runs
{
  const t0 = Date.now(); const out = [];
  for (let r = 0; r < runs; r++) {
    play(1000 + r, maxTurns);
    out.push({ seed: 1000 + r, turn: S.turn, dead: S.gameOver, won: S.won, raised: S.stats.raised, killed: S.stats.killed, lost: S.stats.lost, minions: S.ents.filter(isMinion).length, wave: S.wave, cause: S.deathCause && S.deathCause.cause });
  }
  const dead = out.filter(o => o.dead), won = out.filter(o => o.won);
  const avg = k => (out.reduce((t, o) => t + o[k], 0) / out.length).toFixed(1);
  console.log(`bots: ${runs} runs up to ${maxTurns} turns in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  console.log(`  died ${dead.length}, reached the cradle ${won.length}, median death turn ${dead.length ? dead.map(o => o.turn).sort((a, b) => a - b)[dead.length >> 1] : '-'}`);
  console.log(`  avg raised ${avg('raised')}, killed ${avg('killed')}, lost ${avg('lost')}, hunter waves ${avg('wave')}`);
  const causes = {}; for (const o of dead) causes[o.cause] = (causes[o.cause] || 0) + 1; console.log('  causes of death', causes);
}
