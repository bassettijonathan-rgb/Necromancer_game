// Stand-ins for the sealed texts, so the code builds without them. The real ones are kept out of this repository.
export const WHISPERS = ['Something under the soil turns over in its sleep.'];
export const SEAL_TOUCH = 'The stone is warm, and does not open.';
export const SEAL_OPENS = 'Somewhere below, stone moves against stone.';
export const TABLET_NAMES = ['someone'];
const page = (eyebrow, title, learn, end) => ({ eyebrow, title, learn, end, html: '<p>(The sealed text is not in this build.)</p>' });
export const readTome = (rival) => page('Found beside the bones in the crypt', `The notes of ${rival}`, 'lantern');
export const readTablet = () => page('A rolled lead tablet', 'A curse', 'mark');
export const readCradle = () => page('Below everything', 'The cradle', null, true);
