import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
if (existsSync(join(ROOT, '.env'))) process.loadEnvFile(join(ROOT, '.env'));

const HOST = '127.0.0.1';
const PORT = Number(process.env.ETUDE_POC_PORT || 8787);
const MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
const KEY = process.env.OPENROUTER_API_KEY;
const STUDIO_ORIGINS = new Set(['http://localhost:8080', 'http://127.0.0.1:8080']);

// Fixed demo pitch sets. k = koron (-50c), s = sori (+50c).
const MODES = Object.freeze({
  shur: {
    name: 'شور', tonic: 'G4', microtone: 'Ak4',
    pitches: ['G4', 'Ak4', 'Bb4', 'C5', 'D5', 'Eb5', 'F5', 'G5']
  },
  segah: {
    name: 'سه‌گاه', tonic: 'Ek4', microtone: 'Ek4',
    pitches: ['Ek4', 'F4', 'G4', 'Ak4', 'B4', 'C5', 'D5', 'Ek5']
  },
  mahur: {
    name: 'ماهور', tonic: 'C4', microtone: null,
    pitches: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']
  },
  homayun: {
    name: 'همایون', tonic: 'G4', microtone: 'Ak4',
    pitches: ['G4', 'Ak4', 'B4', 'C5', 'D5', 'Ek5', 'F5', 'G5']
  }
});

const RHYTHM = [1, 1, 1, 1, 0.5, 0.5, 1, 2, 1, 0.5, 0.5, 2, 1, 1, 1, 1];
const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const CENTS = { '': 0, '#': 100, b: -100, k: -50, s: 50 };
const ABC = { '': '', '#': '^', b: '_', k: '_/', s: '^/' };

function parsePitch(pitch) {
  const match = /^([A-G])([#bks]?)([3-6])$/.exec(pitch);
  if (!match) throw new Error('Invalid pitch: ' + String(pitch));
  return { name: match[1], accidental: match[2], octave: Number(match[3]) };
}

function frequency(pitch) {
  const { name, accidental, octave } = parsePitch(pitch);
  const midi = 12 * (octave + 1) + SEMITONES[name];
  return Number((440 * 2 ** ((midi - 69) / 12 + CENTS[accidental] / 1200)).toFixed(4));
}

function abcPitch(pitch) {
  const { name, accidental, octave } = parsePitch(pitch);
  const head = octave >= 5 ? name.toLowerCase() : name;
  const marks = octave >= 5 ? "'".repeat(octave - 5) : ','.repeat(4 - octave);
  return ABC[accidental] + head + marks;
}

function makeAbc(title, notes) {
  const bars = [];
  for (let i = 0; i < 16; i += 4) {
    bars.push(notes.slice(i, i + 4).map((note) => {
      const length = note.duration === 1 ? '' : note.duration === 0.5 ? '/2' : String(note.duration);
      return abcPitch(note.pitch) + length;
    }).join(' '));
  }
  return [
    'X:1', 'T:' + title.replace(/[\r\n%]/g, ' ').slice(0, 80),
    'M:4/4', 'L:1/4', 'K:none', bars.join(' | ') + ' |]'
  ].join('\n');
}

function schema(mode) {
  return {
    type: 'object', additionalProperties: false,
    required: ['title', 'abcNotation', 'notes'],
    properties: {
      title: { type: 'string' },
      abcNotation: { type: 'string' },
      notes: {
        type: 'array', minItems: 16, maxItems: 16,
        items: {
          type: 'object', additionalProperties: false,
          required: ['pitch', 'duration', 'frequency'],
          properties: {
            pitch: { type: 'string', enum: mode.pitches },
            duration: { type: 'number' },
            frequency: { type: 'number' }
          }
        }
      }
    }
  };
}

function normalize(data, mode) {
  if (!data || !Array.isArray(data.notes) || data.notes.length !== 16)
    throw new Error('The model did not return exactly 16 notes.');
  const allowed = new Set(mode.pitches);
  const pitches = data.notes.map((note) => {
    if (!note || !allowed.has(note.pitch)) throw new Error('Pitch outside the selected mode.');
    return note.pitch;
  });

  // One deterministic 4-bar rhythm; rebuild ABC from these same playback notes.
  pitches[0] = mode.tonic;
  pitches[15] = mode.tonic;
  if (mode.microtone && !pitches.some((pitch) => /[ks][3-6]$/.test(pitch)))
    pitches[5] = mode.microtone;

  const notes = pitches.map((pitch, index) => ({
    pitch, duration: RHYTHM[index], frequency: frequency(pitch)
  }));
  const title = typeof data.title === 'string' && data.title.trim()
    ? data.title.trim().slice(0, 80) : 'اتود ' + mode.name;
  return { title, abcNotation: makeAbc(title, notes), notes };
}

function send(response, status, data) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  response.end(JSON.stringify(data));
}

async function serve(response, path, type) {
  const bytes = await readFile(path);
  response.writeHead(200, {
    'Content-Type': type, 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  response.end(bytes);
}

async function readBody(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk.toString('utf8');
    if (body.length > 2048)
      throw Object.assign(new Error('Request too large.'), { status: 413 });
  }
  try { return JSON.parse(body); }
  catch { throw Object.assign(new Error('Invalid JSON.'), { status: 400 }); }
}

async function generate(key) {
  const mode = MODES[key];
  if (!mode) throw Object.assign(new Error('Unknown dastgah.'), { status: 400 });
  if (!KEY) throw Object.assign(new Error('Set OPENROUTER_API_KEY in poc/.env.'), { status: 503 });

  const prompt = [
    'Compose a 4-bar monophonic beginner etude inspired by Persian dastgah ' + mode.name + '.',
    'Use exactly 16 notes, four notes per bar in 4/4, and a melodic motif with a clear cadence.',
    'Allowed pitches ONLY: ' + mode.pitches.join(', ') + '.',
    'Start and end on the tonic ' + mode.tonic + '.',
    'Durations in quarter-note beats, grouped into four bars:',
    '[1,1,1,1] [0.5,0.5,1,2] [1,0.5,0.5,2] [1,1,1,1].',
    'For pitch tokens, k = koron (-50 cents); s = sori (+50 cents); b = flat.',
    'Create valid ABC with X:, T:, M:4/4, L:1/4, K:none and barlines.',
    'ABC quarter-flat is _/ and quarter-sharp is ^/ preceding the pitch.',
    'C4 is middle C. Include title, abcNotation, and notes with pitch, duration and frequency in Hz.',
    'This is a basic etude POC; do not claim ethnomusicological authenticity.',
    'Return only the requested JSON.'
  ].join('\n');

  const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + KEY,
      'Content-Type': 'application/json',
      'X-Title': 'Goosh Persian Etude POC'
    },
    body: JSON.stringify({
      model: MODEL, temperature: 0.65, max_tokens: 1900,
      provider: { require_parameters: true },
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'persian_etude', strict: true, schema: schema(mode) }
      },
      messages: [
        { role: 'system', content: 'Compose small Persian-inspired melodic etudes in structured JSON.' },
        { role: 'user', content: prompt }
      ]
    }),
    signal: AbortSignal.timeout(45000)
  });

  if (!upstream.ok) {
    const raw = await upstream.text();
    let detail = 'OpenRouter HTTP ' + upstream.status + '.';
    try {
      const parsed = JSON.parse(raw);
      if (parsed.error?.message) detail += ' ' + String(parsed.error.message).slice(0, 200);
    } catch { /* Ignore non-JSON error bodies. */ }
    throw Object.assign(new Error(detail), { status: 502 });
  }
  const result = await upstream.json();
  const content = result?.choices?.[0]?.message?.content;
  if (typeof content !== 'string')
    throw Object.assign(new Error('No JSON response from the model.'), { status: 502 });

  let data;
  try { data = JSON.parse(content); }
  catch { throw Object.assign(new Error('Invalid model JSON.'), { status: 502 }); }
  try { return normalize(data, mode); }
  catch (error) { throw Object.assign(error, { status: 502 }); }
}

createServer(async (request, response) => {
  const path = new URL(request.url || '/', 'http://localhost').pathname;
  if (path === '/api/generate-etude' && STUDIO_ORIGINS.has(request.headers.origin)) {
    response.setHeader('Access-Control-Allow-Origin', request.headers.origin);
    response.setHeader('Vary', 'Origin');
  }
  try {
    if (request.method === 'OPTIONS' && path === '/api/generate-etude') {
      if (!STUDIO_ORIGINS.has(request.headers.origin)) {
        send(response, 403, { error: 'Origin not allowed.' });
        return;
      }
      response.writeHead(204, {
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      response.end();
      return;
    }
    if (request.method === 'GET' && path === '/') {
      response.writeHead(302, { Location: '/test-etude' });
      response.end();
    } else if (request.method === 'GET' && path === '/test-etude') {
      await serve(response, join(ROOT, 'test-etude.html'), 'text/html; charset=utf-8');
    } else if (request.method === 'GET' && path === '/vendor/abcjs-basic-min.js') {
      const dependency = join(ROOT, 'node_modules', 'abcjs', 'dist', 'abcjs-basic-min.js');
      if (!existsSync(dependency))
        throw Object.assign(new Error('Run npm install --prefix poc.'), { status: 503 });
      await serve(response, dependency, 'text/javascript; charset=utf-8');
    } else if (request.method === 'POST' && path === '/api/generate-etude') {
      if (!String(request.headers['content-type'] || '').startsWith('application/json'))
        throw Object.assign(new Error('Use application/json.'), { status: 415 });
      const body = await readBody(request);
      send(response, 200, await generate(body.dastgah));
    } else {
      send(response, 404, { error: 'Not found.' });
    }
  } catch (error) {
    if (!response.headersSent) send(response, error.status || 500, { error: error.message });
    if (!error.status) console.error('Etude POC:', error);
  }
}).listen(PORT, HOST, () => {
  console.log('Etude POC: http://' + HOST + ':' + PORT + '/test-etude');
  if (!KEY) console.warn('No OPENROUTER_API_KEY configured in poc/.env');
});
