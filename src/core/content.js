// Basic content: bodies, weapons, creatures, gear and the first workings. Deeper pools live in the sealed files.

export const PLAN = {
  human: [['head', 'head', 6, 1], ['torso', 'torso', 14, 4], ['armL', 'left arm', 6, 1.5], ['armR', 'right arm', 6, 1.5], ['legL', 'left leg', 7, 2], ['legR', 'right leg', 7, 2]],
  beast: [['head', 'head', 5, 1], ['torso', 'body', 10, 4], ['fore', 'forelegs', 6, 2], ['hind', 'hind legs', 6, 2]],
};
export const MISSBIT = { armL: 2, armR: 4, legL: 8, legR: 16, fore: 8, hind: 16 };
export const WEAP = {
  staff: { name: 'staff', type: 'blunt', dmg: [2, 4], cost: 100 },
  club: { name: 'thighbone club', type: 'blunt', dmg: [4, 7], cost: 100 },
  hook: { name: 'hooked blade', type: 'cut', dmg: [3, 7], cost: 100 },
  knife: { name: 'knife', type: 'cut', dmg: [2, 4], cost: 80 },
  crossbow: { name: 'crossbow', type: 'pierce', dmg: [5, 9], cost: 100, range: 7, reload: 200 },
  fist: { name: 'bare hands', type: 'blunt', dmg: [2, 3], cost: 100 },
  bite: { name: 'teeth', type: 'pierce', dmg: [3, 5], cost: 80 },
  gnaw: { name: 'teeth', type: 'pierce', dmg: [3, 6], cost: 80 },
};
const QUILT = { cut: 2, pierce: 1, blunt: 1 }, LEATHER = { cut: 1, pierce: 1 }, COAT = { cut: 1 };
export const DEF = {
  player: { name: 'you', plan: 'human', hp: 1, speed: 100, living: 1, blood: 40, team: 0, weapon: 'staff', armour: { torso: COAT, armL: COAT, armR: COAT }, light: 'lantern' },
  skel: { name: 'skeleton', plan: 'human', hp: 1.5, speed: 100, mat: 'bone', team: 0, weapon: 'club',
    look: 'Old bones, held together by nothing you can see. It does what you ask and nothing else.' },
  risen: { name: 'risen dead', plan: 'human', hp: 1.7, speed: 80, mat: 'flesh', team: 0, weapon: 'fist',
    look: 'A body that has not finished being a body. Slow, heavy, and it still grips whatever it held when it died.' },
  bhound: { name: 'bone hound', plan: 'beast', hp: 1.4, speed: 130, mat: 'bone', team: 0, weapon: 'gnaw',
    look: 'A hound\'s skeleton that remembers how to run.' },
  rhound: { name: 'risen hound', plan: 'beast', hp: 1.6, speed: 110, mat: 'flesh', team: 0, weapon: 'bite',
    look: 'A hound raised before the flies found it.' },
  zealot: { name: 'lantern zealot', plan: 'human', hp: 1, speed: 100, living: 1, blood: 30, team: 1, weapon: 'hook', armour: { torso: QUILT, armL: QUILT, armR: QUILT }, light: 'torch', nerve: 70,
    look: 'A hunter of the Mercy. Quilted coat, a hooked blade, a torch held high. They need light to find you.' },
  xbow: { name: 'bolt-warden', plan: 'human', hp: .9, speed: 100, living: 1, blood: 28, team: 1, weapon: 'crossbow', side: 'knife', armour: { torso: LEATHER }, light: 'lamp', nerve: 55,
    look: 'A crossbow and a shuttered lamp at the belt. Keeps its distance and aims at whoever is doing the raising.' },
  conf: { name: 'confessor', plan: 'human', hp: .8, speed: 90, living: 1, blood: 26, team: 1, weapon: 'fist', light: 'censer', nerve: 85, prays: 1,
    look: 'Grey-robed and unarmed. It swings a censer and prays, and the dead it prays over do not get up again.' },
  hound: { name: 'grave hound', plan: 'beast', hp: 1, speed: 150, living: 1, blood: 22, team: 3, weapon: 'bite', nerve: 45,
    look: 'Long-legged, hairless in patches, red at the eyes. Grave hounds dig. They find the dead by smell and the living by noise.' },
};
export const MAT = {
  bone: { cut: .6, pierce: .35, blunt: 1.4, fire: .5, soul: .6, holy: 1.6, burst: 1 },
  flesh: { cut: 1, pierce: .8, blunt: .8, fire: 1.3, soul: 1, holy: 1.5, burst: 1.1 },
  living: { cut: 1, pierce: 1, blunt: 1, fire: 1.2, soul: 1, holy: .25, burst: 1 },
  you: { cut: 1, pierce: 1, blunt: 1, fire: 1.2, soul: 1, holy: 1, burst: 1 },
};
export const isDeadType = t => t === 'skel' || t === 'risen' || t === 'bhound' || t === 'rhound';

/* ---------- gear ---------- */
// hand, body and head fit you and the human dead; charms are yours alone; the rest is used up
export const GEAR = {
  staff: { n: 'ash staff', slot: 'hand', w: { type: 'blunt', dmg: [2, 4], cost: 100 }, icon: 'staff', v: 'A walking staff shod in iron. Better than bare hands, not by much.' },
  knife: { n: 'knife', slot: 'hand', w: { type: 'cut', dmg: [2, 4], cost: 80 }, icon: 'knife', v: 'Short and quick. It strikes faster than anything else here.' },
  hook: { n: 'hooked blade', slot: 'hand', w: { type: 'cut', dmg: [3, 7], cost: 100 }, icon: 'hook', v: 'The Mercy’s weapon: a blade bent back on itself, made for pulling the dead apart.' },
  club: { n: 'thighbone club', slot: 'hand', w: { type: 'blunt', dmg: [4, 7], cost: 100 }, icon: 'club', v: 'Someone’s thigh, and now a club. The dead do not mind.' },
  mace: { n: 'iron mace', slot: 'hand', w: { type: 'blunt', dmg: [5, 9], cost: 110 }, icon: 'mace', v: 'Flanged and heavy. Meant for bone, and good at it.' },
  spade: { n: 'grave-spade', slot: 'hand', w: { type: 'cut', dmg: [3, 6], cost: 100, hit: .04 }, icon: 'spade', v: 'A sexton’s spade with the edge ground sharp.' },
  spear: { n: 'boar spear', slot: 'hand', w: { type: 'pierce', dmg: [4, 8], cost: 100 }, icon: 'spear', v: 'Long ash shaft, a crossbar below the blade.' },
  coat: { n: 'travelling coat', slot: 'body', a: { torso: { cut: 1 }, armL: { cut: 1 }, armR: { cut: 1 } }, icon: 'coat', v: 'Heavy wool, oiled against the rain. It turns a glancing edge.' },
  quilt: { n: 'quilted coat', slot: 'body', a: { torso: { cut: 2, pierce: 1, blunt: 1 }, armL: { cut: 2, pierce: 1, blunt: 1 }, armR: { cut: 2, pierce: 1, blunt: 1 } }, icon: 'quilt', v: 'The Mercy’s coat: layers of linen sewn tight, stiff with old sweat.' },
  jerkin: { n: 'leather jerkin', slot: 'body', a: { torso: { cut: 1, pierce: 1 } }, icon: 'jerkin', v: 'Boiled leather over the chest.' },
  mail: { n: 'ring-mail shirt', slot: 'body', a: { torso: { cut: 3, pierce: 1, blunt: 1 }, armL: { cut: 2 }, armR: { cut: 2 } }, slow: 8, icon: 'mail', v: 'Iron rings on a leather back. Heavy: whoever wears it moves a little slower.' },
  cap: { n: 'iron cap', slot: 'head', a: { head: { cut: 2, pierce: 1, blunt: 1 } }, icon: 'cap', v: 'A plain iron bowl with a rim.' },
  coif: { n: 'mail coif', slot: 'head', a: { head: { cut: 3, pierce: 1 } }, icon: 'coif', v: 'A hood of rings that falls to the shoulders.' },
  ring: { n: 'finger-bone ring', slot: 'charm', fx: { grip: 1 }, icon: 'ring', v: 'Carved from a single knuckle. While you wear it, your hold on the dead is one stronger.' },
  amulet: { n: 'lead amulet', slot: 'charm', fx: { will: 8 }, icon: 'amulet', v: 'Cold lead stamped with a name somebody scratched out. Your will runs deeper while you wear it.' },
  tooth: { n: 'tooth on a cord', slot: 'charm', fx: { regen: 1 }, icon: 'tooth', v: 'A long yellow tooth, not a human one. Your will comes back faster.' },
  votive: { n: 'grey votive', slot: 'charm', fx: { raise: .25 }, icon: 'votive', v: 'A small figure of smooth grey stone, warm in the hand. The dead you raise come up stronger.' },
  bandage: { n: 'linen bandage', slot: 'use', use: 'bandage', icon: 'bandage', v: 'Stops bleeding and gives back a little blood.' },
  wine: { n: 'flask of blood-wine', slot: 'use', use: 'wine', icon: 'flask', v: 'Thick, dark and sweet. Restores blood.' },
  salt: { n: 'pouch of grave-salt', slot: 'use', use: 'salt', icon: 'salt', v: 'Salt swept from a charnel-house floor. A pinch on the tongue brings will back.' },
};
export const AFFIX = {
  hand: [['keen', 'keen', { dmg: [1, 1] }], ['heavy', 'heavy', { dmg: [0, 2], cost: 10 }], ['true', 'true-weighted', { hit: .08 }]],
  body: [['thick', 'thick', { arm: 1 }], ['supple', 'supple', { supple: 1 }]], head: [['thick', 'thick', { arm: 1 }]], charm: [['deep', 'deep', { deep: 1 }]],
};
export const RELIC = ['Patience', 'Long Night', 'the Reeve’s Debt', 'Small Mercy', 'Second Burial', 'Hush', 'the Tithe', 'Old Hew', 'Lantern-Eater', 'Kept Promise'];
export const QCOL = ['#d6cbb4', '#93b6ec', '#e2b860'], QWORD = ['', 'fine', 'relic'];
export const LOOT = {
  mercy: [['bandage', 26], ['wine', 12], ['salt', 8], ['ring', 2], ['amulet', 2], ['tooth', 2], [null, 48]],
  sarc: [['votive', 6], ['ring', 8], ['amulet', 8], ['tooth', 6], ['mace', 9], ['coif', 8], ['cap', 8], ['salt', 14], ['spear', 6], ['knife', 5], [null, 22]],
  chest: [['bandage', 18], ['wine', 14], ['salt', 12], ['mail', 8], ['cap', 8], ['coif', 6], ['mace', 8], ['spear', 8], ['knife', 6], ['spade', 6], ['ring', 4], ['amulet', 4], ['tooth', 3], ['votive', 2]],
  alms: [['bandage', 30], ['wine', 20], ['salt', 6], ['cap', 8], ['mace', 8], ['quilt', 8], ['amulet', 3]],
};
export const DEFGEAR = { player: ['staff', 'coat'], zealot: ['hook', 'quilt'], xbow: ['jerkin'], skel: ['club'] };
export const CHESTNAME = { chest: 'iron-bound chest', alms: 'alms chest of the Mercy', pack: 'dead traveller’s pack', sarc: 'sarcophagus', box: 'sexton’s box' };
export const PACKN = 16;

/* ---------- workings ---------- */
export const SP = {
  raise: { key: 'R', name: 'Quickening', cost: 4, text: 'Raise the remains near you. Up to three at once.' },
  bolt: { key: 'F', name: 'Soul Bolt', cost: 4, text: 'Tear at whatever animates a body.' },
  burst: { key: 'X', name: 'Corpse Burst', cost: 6, text: 'A body near your target bursts apart.' },
  breath: { key: 'B', name: 'Price of Breath', cost: 0, blood: 6, text: 'Pay in blood for will.' },
  mark: { key: 'M', name: 'Mark of the Pit', cost: 6, text: 'Your dead go for the marked one first, and hit it harder.' },
  lantern: { key: 'L', name: 'Lantern Death', cost: 6, text: 'Every light of the living near your target goes out.' },
};
export const SPORDER = ['raise', 'bolt', 'burst', 'mark', 'lantern', 'breath'];

/* ---------- words ---------- */
export const VERB = {
  cut: ['graze', 'cut', 'open', 'hack into'], pierce: ['nick', 'pierce', 'punch through', 'skewer'], blunt: ['knock', 'strike', 'crack', 'smash'],
  soul: ['fray', 'tear at', 'unpick', 'rip through'], holy: ['scorch', 'sear', 'burn through', 'unmake'], burst: ['pepper', 'tear into', 'shred', 'rip apart'], fire: ['singe', 'burn', 'char', 'consume'],
};
export const conj = v => v.replace(/^(\w+)/, m => /(sh|ch|s|x)$/.test(m) ? m + 'es' : m + 's');
export const LOSSWORD = { cut: 'severed', pierce: 'ruined', blunt: 'shattered', soul: 'withered', holy: 'unmade', burst: 'torn off', fire: 'burned away' };
export const cap1 = s => s.replace(/^./, m => m.toUpperCase());
export const HEROES = ['Ansel Marrow', 'Ide Cotter', 'Mabyn Stroud', 'Corvin Ash', 'Esk Haldane', 'Tamsin Vell', 'Orrin Pale', 'Wenna Rooke'];
export const RIVALS = ['Abelard Vey', 'Hester Quill', 'Simeon Rake', 'Maud Ellery', 'Jory Lanyon'];
