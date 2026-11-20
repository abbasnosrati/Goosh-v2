// Adapts the isolated OpenRouter POC response to Goosh's existing studio model.
// The staff and playback remain owned by score.js and audio.js.
import { freq, valid } from './model.js'

const API = '/api/generate-etude'
const ALLOWED_MODES = new Set(['shur', 'segah', 'mahur', 'homayun'])
const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const ACCIDENTALS = {
  '': { mark: '', cents: 0 },
  '#': { mark: '♯', cents: 100 },
  b: { mark: '♭', cents: -100 },
  k: { mark: 'کرن', cents: -50 },
  s: { mark: 'سری', cents: 50 }
}

function convertEtude(data, current) {
  if (typeof data?.title !== 'string' || !Array.isArray(data.notes) ||
      data.notes.length !== 16) {
    throw new Error('Invalid etude response from OpenRouter.')
  }

  const key = {}
  const encountered = new Map()
  const notes = []
  const secondsPerBeat = 60 / current.bpm
  let elapsedBeats = 0

  for (const note of data.notes) {
    const match = /^([A-G])([#bks]?)([3-6])$/.exec(note?.pitch ?? '')
    if (!match || !Number.isFinite(note.duration) || note.duration <= 0 ||
        !Number.isFinite(note.frequency) || note.frequency <= 0) {
      throw new Error('The AI returned an invalid note.')
    }

    const [, letter, accidental, octaveText] = match
    const midi = (Number(octaveText) + 1) * 12 + SEMITONES[letter]
    const pc = midi % 12
    const mark = ACCIDENTALS[accidental].mark

    // Goosh stores one key-signature alteration per pitch class. Reject any
    // conflicting spelling rather than silently change the tuning of a note.
    if (encountered.has(pc) && encountered.get(pc) !== mark) {
      throw new Error('Generated notes require incompatible key alterations.')
    }
    encountered.set(pc, mark)
    if (mark) key[pc] = mark

    notes.push({
      m: midi,
      at: elapsedBeats * secondsPerBeat,
      d: note.duration * secondsPerBeat
    })
    elapsedBeats += note.duration
  }

  if (Math.abs(elapsedBeats - 16) > 0.001) {
    throw new Error('Expected exactly four bars of 4/4.')
  }

  const result = {
    ...current,
    title: data.title.trim().slice(0, 80) || current.title,
    notes,
    // Use exact demo cent offsets, regardless of previous custom tunings.
    marks: { ...current.marks, '♭': -100, '♯': 100, 'کرن': -50, 'سری': 50 },
    key,
    offset: {}
  }

  for (let i = 0; i < notes.length; i++) {
    const actual = freq(result, notes[i].m)
    const expected = data.notes[i].frequency
    if (Math.abs(1200 * Math.log2(actual / expected)) > 0.5) {
      throw new Error('AI pitch and Goosh playback frequency disagree.')
    }
  }

  if (!valid(result)) throw new Error('The generated etude does not match the Goosh format.')
  return result
}

export async function generateStudioEtude(dastgah, current, signal) {
  if (!ALLOWED_MODES.has(dastgah)) throw new Error('Invalid dastgah.')
  let response
  try {
    response = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dastgah }),
      signal
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('Cannot reach the Python API. Start Goosh with: npm run web')
  }

  let payload
  try {
    payload = await response.json()
  } catch {
    throw new Error('Invalid API response.')
  }
  if (!response.ok) throw new Error(payload.error || 'AI generation failed.')
  return convertEtude(payload, current)
}
