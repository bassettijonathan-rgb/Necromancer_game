// What the screen side keeps between frames: camera, zoom, quality and toggles. None of it is saved with a run.
export const RS = {
  DPR: 1, CW: 1, CH: 1, camX: 0, camY: 0, zoom: 1,
  qLevel: 0, qLock: -1,
  animFast: false, auto: false,
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
export const V = { moon: [.075, .09, .12], mem: [.13, .13, .15], fogA: .2, sat: .42, tint: [206, 216, 210], grain: .13, zoomMul: 1.35, lantern: [.62, .88, .7] };
export const $ = s => document.querySelector(s);
