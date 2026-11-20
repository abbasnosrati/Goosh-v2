// Adapts the isolated OpenRouter POC response to Goosh's existing studio model.
// The staff and playback remain owned by score.js and audio.js.
import { freq, valid, meterInfo, meterTimeline } from './model.js'
import { effectiveTuningCents } from './music-signature.js'

const API = '/api/generate-etude'
const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
function convertEtude(data, current, context) {
  const metered = Boolean(meterInfo(current))
  const isShur = context.musicSystem === 'iranian' && context.dastgah === 'shur'
  const isShurFreeMeter = isShur && !metered
  if (typeof data?.title !== 'string' || !Array.isArray(data.notes) ||
      (metered ? (data.notes.length < 1 || data.notes.length > 128) :
      isShurFreeMeter
        ? (!Number.isInteger(data.bars) || data.bars < 1 ||
           data.bars > 256 || data.notes.length < 1 ||
           data.notes.length > 256 ||
           !Number.isFinite(data.totalBeats) || data.totalBeats <= 0 ||
           data.totalBeats > 256)
        : data.notes.length !== 16)) {
    throw new Error('Invalid etude response from OpenRouter.')
  }

  // AI notation and actual pitch both use the selected canonical e.key and
  // e.offset. Do not create a second signature from AI tokens.
  const notes = []
  const secondsPerBeat = 60 / current.bpm
  let elapsedBeats = 0

  for (const note of data.notes) {
    const match = /^([A-G])([#bks]?)([3-6])$/.exec(note?.pitch ?? '')
    if (!match || !Number.isFinite(note.duration) || note.duration <= 0 ||
        !Number.isFinite(note.frequency) || note.frequency <= 0 ||
        (metered && (!Number.isFinite(note.restBefore) || note.restBefore < 0))) {
      throw new Error('The AI returned an invalid note.')
    }

    const [, letter, accidental, octaveText] = match
    // Store the NATURAL written note. freq(e,m) applies the key signature
    // exactly once. Encoding F# as MIDI F# PLUS e.key[F]=sharp would be
    // a double-sharp; the older adapter did exactly that.
    let midi = (Number(octaveText) + 1) * 12 + SEMITONES[letter]
    let staffM, staffAccidental, displayPitch

    // This legacy Goosh model supports one tuning per MIDI pitch class.
    // Encode Ek4 as D#4 + 50 cents (enharmonic in sound) so Eb4 and Ek4
    // can coexist; preserve its correct E-Koron staff spelling separately.
    if (isShur && note.pitch === 'Ek4') {
      midi = 63
      // Apply the +50c as a pitch-class offset instead of a fake D sori
      // key-signature mark. The visible key remains _B _E _/A.
      staffM = 64
      staffAccidental = 'کرن'
      displayPitch = 'Ek4'
    }
    const onset = isShurFreeMeter ? note.atBeats
      : elapsedBeats + (metered ? note.restBefore : 0)
    if (!Number.isFinite(onset) || onset < elapsedBeats - 1e-6)
      throw new Error('AI notes contain overlapping or invalid timing.')
    const item = {
      m: midi,
      at: onset * secondsPerBeat,
      d: note.duration * secondsPerBeat
    }
    if (staffM !== undefined) {
      item.staffM = staffM
      item.staffAccidental = staffAccidental
      item.displayPitch = displayPitch
    }
    notes.push(item)
    elapsedBeats = onset + note.duration
  }

  if (isShurFreeMeter) {
    if (elapsedBeats > data.totalBeats + 0.001)
      throw new Error('The generated notes exceed the free-meter timeline.')
  } else if (metered) {
    const meter=meterInfo(current)
    if (Math.abs(elapsedBeats - 4*meter.barQuarterBeats)>0.001)
      throw new Error('AI notes and rests do not fill four exact measures.')
  } else if (Math.abs(elapsedBeats - 16) > 0.001) {
    throw new Error('Invalid free-meter etude duration.')
  }

  const offset = {...current.offset};
  // This existing Shur exception allows E-flat and E-koron to coexist on
  // the same monophonic staff even though key signatures are per letter.
  if (isShur && data.notes.some(note => note.pitch === 'Ek4'))
    offset[3] = 50;

  const result = {
    ...current,
    title: data.title.trim().slice(0, 80) || current.title,
    notes,
    key: {...current.key},
    offset
  }

  for (let i = 0; i < notes.length; i++) {
    const actual = freq(result, notes[i].m)
    const expected = data.notes[i].frequency
    if (Math.abs(1200 * Math.log2(actual / expected)) > 0.5) {
      throw new Error('AI pitch and Goosh playback frequency disagree.')
    }
  }

  if (!valid(result)) throw new Error('The generated etude does not match the Goosh format.')
  if (metered && meterTimeline(result).issues.length)
    throw new Error('AI returned note or rest durations that cannot be engraved accurately.')
  return result
}

export async function generateStudioEtude(context, current, signal, practiceGoals = []) {
  if (!context || !['iranian','western'].includes(context.musicSystem)) {
    throw new Error('Invalid musical system.');
  }
  const {musicSystem, dastgah, scale, tonic} = context;
  const selectedMeter = context.meter || 'none';
  let response
  try {
    response = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({musicSystem, dastgah, scale, tonic, practiceGoals,
        meter:selectedMeter,
        tuningCents: effectiveTuningCents(current)}),
      signal
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('Cannot reach the Python API. Start Goosh with: python3 scripts/goosh_server.py 8081 --bind 0.0.0.0')
  }

  let payload
  try {
    payload = await response.json()
  } catch {
    throw new Error('Invalid API response.')
  }
  if (!response.ok) throw new Error(payload.error || 'AI generation failed.')
  // The shared Etude may have been edited while awaiting the remote model.
  // Never apply a valid response to a different meter than was requested.
  if ((current.meter||'none')!==selectedMeter)
    throw new Error('Time signature changed during generation. Please generate again.');
  return convertEtude(payload, current, context)
}
