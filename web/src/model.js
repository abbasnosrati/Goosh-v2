import { validatePracticeSequence } from './practice-model.js'
export const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
export const label = m => names[m % 12] + (Math.floor(m / 12) - 1)
export const fresh = () => ({
  version: 1,
  title: '',
  bpm: 90,
  notes: [],
  practiceSequence: [],
  marks: {
    '♭': -100,
    '♯': 100,
    'کرن': -50,
    'سری': 50
  },
  key: {},
  offset: {},
  rule: {
    mode: 'piano',
    order: 'listen',
    staff: false,
    tuner: false,
    listen: 2,
    answer: 5,
    count: 3,
    ref: 'off',
    refMidi: 69,
    repeat: 1,
    refTime: 1
  }
})
export function freq(e, m) {
  const pc = m % 12;
  return 440 * 2 ** ((m - 69 + ((e.offset[pc] || 0) + (e.marks[e.key[pc]] || 0)) / 100) / 12)
}
export function valid(e) {
  const finite = (n, min, max) => Number.isFinite(n) && n >= min && n <= max;
  return e?.version === 1 && typeof e.title === 'string' && finite(e.bpm, 20, 300) && Array.isArray(e.notes) && e.notes.every(n => Number.isInteger(n.m) && finite(n.m, 0, 127) && finite(n.at, 0, 1e7) && finite(n.d, .001, 1e5)) && [e.marks, e.key, e.offset].every(x => x && typeof x === 'object' && !Array.isArray(x)) && Object.values(e.marks).every(x => finite(x, -1200, 1200)) && Object.values(e.offset).every(x => finite(x, -1200, 1200)) && Object.values(e.key).every(x => Object.hasOwn(e.marks, x)) && validatePracticeSequence(e.practiceSequence) && e.rule && ['mic', 'text', 'piano'].includes(e.rule.mode) && ['listen', 'answer'].includes(e.rule.order) && ['off', 'first', 'each'].includes(e.rule.ref) && ['listen', 'answer', 'refTime'].every(k => finite(e.rule[k], .1, 120)) && finite(e.rule.count, 0, 30) && Number.isInteger(e.rule.repeat) && finite(e.rule.repeat, 1, 12) && Number.isInteger(e.rule.refMidi) && finite(e.rule.refMidi, 0, 127)
}
