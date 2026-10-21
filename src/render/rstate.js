// What the screen side keeps between frames: camera, zoom, quality and toggles. None of it is saved with a run.
export const RS = {
  DPR: 1, CW: 1, CH: 1, camX: 0, camY: 0, zoom: 1,
  qLevel: 0, qLock: -1,
  animFast: false, auto: false, paused: false, pauseWhy: '', speed: 2,
  hover: null, showThreat: false, showMarks: false, selMinion: null,
  modalOpen: false, view: { s: 1, ox: 0, oy: 0 },
};
// quality steps the governor moves between: render scale and effect budgets
export const QL = [
  { scale: 1, parts: 1500, lights: 30, grain: 1, fog: 1 },
  { scale: .85, parts: 1000, lights: 22, grain: 1, fog: 1 },
  { scale: .72, parts: 650, lights: 16, grain: 0, fog: 1 },
  { scale: .6, parts: 420, lights: 12, grain: 0, fog: 0 },
];
export const q = () => QL[RS.qLevel];
// the Dread grade
// moon: open-air light; inside/deep: light under a roof and far below; mem: places seen before but not in sight now
export const V = { moon: [.27, .29, .34], inside: [.1, .095, .11], deep: [.1, .11, .13], mem: [.24, .24, .27], fogA: .16, sat: .36, tint: [214, 222, 216], grain: .11, zoomMul: 1.35, lantern: [.66, .9, .74], lanternR: 10, lanternI: 2, vign: .7 };
export const $ = s => document.querySelector(s);
