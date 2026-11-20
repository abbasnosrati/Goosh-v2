# Persian Etude AI POC

Isolated Node.js server. No existing Goosh v2 files, routes, components, audio engine, or native build are changed.

## Start (Node.js 22+)

From the repository root:

```bash
git fetch origin
git switch feat/ai-persian-etude-poc
npm install --prefix poc
cp poc/.env.example poc/.env
```

Edit `poc/.env` and set your own OpenRouter key as `OPENROUTER_API_KEY`. Never commit the key. The default model is `openai/gpt-4o-mini` and must support structured outputs.

```bash
npm run start --prefix poc
```

Open http://127.0.0.1:8787/test-etude in a desktop browser.

The existing Goosh web app continues separately using `npm run web` at http://localhost:8080.

## API

POST `http://127.0.0.1:8787/api/generate-etude`, content type `application/json`, body `{"dastgah":"shur"}`.

Supported names: `shur`, `segah`, `mahur`, `homayun`.

Response: `title`, `abcNotation`, `notes` with 16 entries of `pitch`, `duration` (beats), and `frequency` (Hz).

OpenRouter generates the melodic pitch sequence using a structured JSON schema. For reproducible testing the server uses a fixed four-bar 4/4 rhythm, computes each pitch frequency itself and rebuilds ABC from the same notes. Rendering uses abcjs and playback uses Web Audio sine oscillators (not piano samples).

**Tuning caveat:** koron (`k`) is approximated at -50 cents and sori (`s`) at +50 cents from 12-TET with A4=440 Hz; ABC uses `_/` and `^/`. This 24-EDO approximation and the demonstration note collections are not verified, performance-specific Persian dastgah tunings. Melodic correctness must be reviewed by a musician.

The server binds only to 127.0.0.1. `poc/.env` and `poc/node_modules/` are gitignored; the API key remains server-side. OpenRouter requests can incur charges.
