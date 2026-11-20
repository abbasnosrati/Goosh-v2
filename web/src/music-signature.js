// Canonical music presets -> the existing e.key/e.offset tuning model.
// No second score, frequency engine or hardcoded musical-mode list.
const LETTERS = 'CDEFGAB';
const PC = {C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const MODIFIERS = {'':'', '#':'♯', b:'♭', k:'کرن', s:'سری'};
export const NATURAL_PCS = [0,2,4,5,7,9,11];
export const DEFAULT_MARK_CENTS = Object.freeze({'♯':100,'♭':-100,'کرن':-50,'سری':50});

export function westernPitchTokens(catalog, style, tonic) {
  const western = catalog.systems.find(s => s.id === 'western');
  const mode = western?.styles.find(s => s.id === style);
  const root = catalog.tonics.find(t => t.id === tonic);
  if (!mode || !root) throw Error('Unknown Western scale or tonic');
  const possibilities = [];
  for (const spelling of root.spellings) {
    const start = LETTERS.indexOf(spelling[0]);
    const startMidi = 60 + PC[spelling[0]] + (spelling[1] === '#' ? 1 : spelling[1] === 'b' ? -1 : 0);
    const tokens = [];
    for (let i = 0; i < mode.intervals.length; i++) {
      const letter = LETTERS[(start + i) % 7];
      const octave = 4 + Math.floor((start + i) / 7);
      const delta = startMidi + mode.intervals[i] - ((octave+1)*12 + PC[letter]);
      if (delta < -1 || delta > 1) break;
      tokens.push(letter + (delta === 1 ? '#' : delta === -1 ? 'b' : '') + octave);
    }
    if (tokens.length === 8) {
      const alterations = tokens.filter(token => /[#b]/.test(token)).length;
      possibilities.push({tokens, alterations});
    }
  }
  if (!possibilities.length) throw Error('This scale needs unsupported double accidentals');
  possibilities.sort((a,b)=>a.alterations-b.alterations);
  return possibilities[0].tokens;
}

export function signatureForMusic(catalog, context) {
  const system = catalog.systems.find(s => s.id === context.musicSystem);
  if (!system) throw Error('Unknown musical system');
  let pitches;
  if (system.id === 'iranian') {
    const style = system.styles.find(s => s.id === context.dastgah);
    if (!style) throw Error('Unknown dastgah');
    pitches = style.pitches;
  } else {
    pitches = westernPitchTokens(catalog, context.scale, context.tonic);
  }
  const key = {};
  for (const token of pitches) {
    const match = /^([A-G])([#bks]?)[3-6]$/.exec(token);
    if (!match) throw Error('Invalid mode pitch');
    const [,letter,alteration] = match;
    const pc = PC[letter];
    const mark = MODIFIERS[alteration];
    if (mark && key[pc] && key[pc] !== mark) {
      throw Error('The mode contains conflicting key-signature accidentals');
    }
    if (mark) key[pc] = mark;
  }
  return {key, pitches};
}

export function applyMusicSignature(etude, signature) {
  // Selecting another mode deliberately resets previous custom note tuning.
  // The teacher can subsequently edit key/offset using the existing editor.
  etude.key = {...signature.key};
  etude.offset = {};
  etude.marks = {...etude.marks, ...DEFAULT_MARK_CENTS};
}

export function effectiveTuningCents(etude) {
  const result = {};
  for (const pc of NATURAL_PCS) {
    const mark = etude.key?.[pc];
    result[pc] = (etude.marks?.[mark] || 0) + (etude.offset?.[pc] || 0);
  }
  return result;
}
