// The whole run as plain data. Everything the game needs to continue lives here or in the current level,
// so a save is this object plus the level arrays, and nothing else.
export const S = {};

export const SAVE_VERSION = 1;

export function freshState(seed) {
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, {
    v: SAVE_VERSION, seed: seed >>> 0,
    nextId: 1, itemSeq: 1, turn: 0, tickN: 0,
    ents: [], corpses: [], items: [], chests: [], player: null,
    will: 30, WMAX: 30, gripMax: 6, autoRaise: true, stance: 'aggressive', hooded: false,
    notoriety: 0, wave: 0, gameOver: false, won: false, stress: false,
    know: {}, learned: {}, stats: { raised: 0, killed: 0, lost: 0, cast: 0 }, chron: [],
    strainT: { cold: 0, misfire: 0 }, target: null, markT: null,
    heroName: '', region: '', rivalName: '', deathCause: null,
    castGlow: 0, flags: {}, logLines: [], G: {}, staticLights: [], lmIx: 0,
    // what the player has set in motion; cleared on load
    intent: { rest: false, travel: null, travelChest: null, explore: false, waitN: 0 },
    lootQueued: null, readQueued: null,
    L: null,
  });
  return S;
}
