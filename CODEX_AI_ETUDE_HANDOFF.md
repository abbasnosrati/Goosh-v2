# Codex Handoff — OpenRouter Persian Etude Generator in Goosh v2

## 2026-11-20 — Studio tempo control and note-duration propagation

**User-reported bug and requirements:** The user changed the duration of an AI-generated note from 1 second to 4 seconds. The audible note tail extended but the next note still began at its old timestamp. They also requested a prominently visible overall piece-speed control that genuinely slows the composition. **Important musical direction:** preserve the natural acoustic envelope and decay of piano samples; do NOT invent artificial sustain, a held pedal, or change piano timbre to force long notes to remain audible.

### Root cause verified in source

- Original `noteSettings()` edited only `note.d` (release duration), not the subsequent notes' `n.at` values. Playback schedules notes by absolute onset, so later notes were not delayed when a prior note was lengthened.
- Existing BPM control was hidden under `Edit notes & timing`. It did scale notes in seconds, but was not a visible, clearly labeled score-level speed control.
- The old save guard used `!silence.value`; the legitimate zero-second rest value was falsy, potentially preventing users from saving note duration changes when there was no rest before the note.
- The existing AI ABC `Q:` header is not currently imported as Studio BPM. The new control displays **e.bpm**, which is the BPM that actually determines note onset/duration in Goosh (rather than claiming to display the source ABC tempo).
- `audio.js` has a natural fade, short tail and approximately six-second sample/voice maximum. The user's instruction is to preserve natural piano behavior, not prolong sample playback artificially.

### Changes implemented

1. **`web/src/app.js` – `retimeNote(note, newDuration, newRest, restChanged)`:** Computes the selected note's original onset, earlier sounding end, and duration delta. A new duration shifts every **later onset** (strictly greater than the selected note's onset) by the duration difference, preserving the existing inter-note gaps/rests. Simultaneously played notes at exactly the selected onset are not split apart. For example, with notes at seconds 0, 1, 2, changing the first note from 1 second to 4 seconds shifts the latter onsets to 4 and 5 seconds while leaving their durations unchanged. Shortening works in the other direction. The selected note's own onset is unchanged unless the user explicitly changes its rest-before setting.
2. **Rest-before editing:** If requested, shifts the selected onset and all notes starting there or after it by the requested rest change. If both rest-before and duration change together, the two shifts are combined precisely once. A zero-second rest is explicitly valid. The helper rejects changes that would yield negative or out-of-range onset timestamps instead of corrupting the saved model, and reports a field-level validity message, not a browser alert.
3. **Transport synchronization:** Editing note timing stops and clears the current score transport before writing new note times. This prevents already-scheduled audio from continuing with old timestamps while the score shows newly edited timings. Notes, freqs and samples are otherwise unchanged; next Play uses the updated onsets and durations. The playback-note marker continues to follow the new timing.
4. **`setEtudeTempo(nextBpm)`:** Applies one global factor `oldBpm / newBpm` to every `n.at` and `n.d` and saves the new `e.bpm`. This proportionally scales **note lengths and silent gaps together**, preserving phrase structure and musical pitch. E.g. 90→60 BPM multiplies all times by 1.5; reducing tempo is audible as a slower sequence. Stops prior scheduled playback before rescaling. The existing valid BPM range (20–300) is respected.
5. **Visible UI:** Added a `Tempo / سرعت` control to the Studio score toolbar, immediately beside transport buttons, with an interactive range slider, precisely editable BPM number and BPM unit. Both controls stay synchronized. Removed the duplicate hidden BPM control from `Edit notes & timing` to avoid inconsistent editing paths.
6. **`web/style.css`:** Uses existing Goosh colors and tokens; tempo slider and number remain accessible on desktop and move to a full-width line below score transport on small screens, without horizontal overflow. `web/index.html` updates only the cache-busting app import.
7. **Audio intentionally unchanged:** No changes to `web/src/audio.js`, piano envelope, six-second cap, audio playback rate or sample data. A long note may naturally fade before its written/scheduled duration ends; the next note still starts at the proper updated time. Paused/Stop transport implementation was not refactored.

### Validation and edge cases to verify

- Note 1s→4s: shift all later onsets +3s; note 1s→0.5s: shift later onsets -0.5s; keep existing silence gaps intact. Simultaneous note starts remain simultaneous.
- Change rest-before with and without duration; entering zero rest must save. Invalid negative timeline after shortening overlapping notes must not corrupt data.
- Tempo change 90→60: all onsets/durations and gaps ×1.5; 60→90 returns to original values within normal floating-point accuracy. Staff notation is derived from duration/BPM and thus retains rhythmic values at different speeds.
- Play, pause, stop, playback markers and the active tone use updated audio onsets. New edits stop stale scheduled playback.
- Desktop/mobile layout; empty etudes; imported and AI-generated etudes. No live audio listening test or on-device UI verification is claimed.

### Explicit non-goals

Do **not** synthesize extra sustain for a piano, force notes to play until their notated ending, reorder the user's existing notes, modify ABC generation or core music theory, or add a second backend. Time edits here affect the Studio etude as a whole without changing the audio instrument's natural decay.

---

## 2026-11-20 — Studio playback active-note marker

**Request:** while playing an etude in Studio, visually indicate exactly which notation note is sounding. Do **not** alter the Play button, add Pause/Stop controls, or refactor transport/audio.

- `web/src/score.js` adds a non-interactive, accent-colored circle overlay to every note, tagged with its original `e.notes` index. The ring is independent of note selection, pen insertion, register, duration, score wrapping and Korean/E-koron notation.
- `web/src/app.js` tracks the ongoing Studio playback against `AudioContext.currentTime` (the same clock used by `voice()`), using original note onset (`at`) and duration (`d`). The active ring moves with note timing; during rests it disappears; overlapping notes are marked simultaneously. The last ring clears when the track duration ends.
- Re-rendering the score for zoom/wrap or other UI updates immediately repaints the current marker. Route/language cancellation removes the marker and cancels its animation loop. No changes were made to `audio.js` or the underlying stored notes.
- The existing Play button remains unchanged: no Pause or Stop UI was added. Existing playback scheduling was preserved. Repeated Play clicks may still overlap audio streams because that is pre-existing behavior; only the newest Play instance drives the marker.
- No live browser/device visual QA was run. Check with free-meter rests, short notes, long notes, same-time notes, wrapped staff, and rapid repeated Play presses.

---
## 2026-11-20 — Musical note lengths/rest notation and Shur phrasing review

**Scope:** shared SVG staff renderer and Shur AI prompt only; no piano/audio/model or unrelated UI changes.

- `web/src/score.js` renders whole, half, quarter, eighth, sixteenth, thirty-second notes (open/closed heads, stems, flags), dots and visual rest symbols for gaps between sounding notes. Durations come from stored seconds divided by current BPM. This is independent of the selected AI dastgah or fixed measures, so M:none is supported.
- Horizontal spacing responds to values. Original note indices/timing are preserved for selection and pen insertion. Non-quantized performance durations show a small beat annotation instead of changing sound data.
- The Shur `SHUR_PROMPT` now asks for an expressive G4 shahed, A-koron secondary ist, contrasting light ornaments/long held notes, breathing rests and a sustained final G4. It keeps the original sample motif, ABC key, C4–C5 range, and the 4–20 *creative* phrase request (not parser validation).
- This is a simple SVG engraver, not a full musical typesetter: no beam grouping, ties/slurs or display of a final rest after the last sounding note. Current Q header is not automatically applied to Studio BPM.
- No live OpenRouter request or full UI browser acceptance test was run. Review actual generated ABC and listening quality before claiming musical authenticity.

---
## 2026-11-20 — Follow-up: accept valid AI music beyond the requested phrase count

**Observed user error:** `Invalid AI etude response: Expected 4–20 free-meter phrases, received 22.`

The root cause was a **hard backend parser check** against the creative 4–20 phrase-count *request*. Even though the AI returned structured ABC with 22 phrase divisions, that check rejected the entire generated piece. A parallel hard bound of 20 existed in the frontend converter.

**Narrow correction:** The Shur prompt **still asks for 4–20 original free-meter phrases** and keeps all the user's musical constraints. But neither the Shur ABC parser nor the frontend converter treats that requested creative range as a minimum/maximum number of valid phrase divisions. The parser accepts any number of free-meter divisions, including **one continuous phrase without any barline**; the frontend accepts the corresponding `bars` metadata. The notes, rests, durations, pitch rules, tuning and rendering are unchanged. Existing resource/safety limits (up to 256 notes and 256 quarter-note beats) remain.

This means an AI answer with 22 phrase divisions can proceed **if its notes, register, key signature and timeline are otherwise valid**. The count of phrases reported by the API remains the truthful count, not a clamped value. There is **no automatic phrase merging, cropping, or added OpenRouter retry**. A prompt-only numeric request is not a guarantee that every generated piece will obey it.

**Remaining restriction:** For a Shur response explicitly declaring a fixed meter (rather than M:none), the legacy parser still requires exactly eight bars. The other three modes still use the old 16-note JSON POC. This change intentionally does *not* alter score.js, model.js or the musical input requirements of the core Goosh engine.

**Testing status:** This is a focused source-level bug fix; no live billable OpenRouter request or end-to-end browser test was performed. If a different error appears after the 22-phrase check is removed, diagnose that error independently. Do not claim every model output is supported by the limited parser.

---

## CURRENT AUDIT — 2026-11-20: User prompt, flexible phrase-count fix

**Branch:** redesign. **User-authored commit inspected:** 5bb5a1b827f8d5b701f37e42bbe643ec709c6cc2 (`update etude prompt`).
**Scope:** This is a focused AI Shur-generation change. The score, sound, and native etude data model are unchanged.

### Verified source and runtime failure

- The user's push changed only `scripts/abc_etude.py` relative to parent `5c768433`. It updated the Shur prompt to `M:none`, `L:1/16`, tempo `Q:1/4=60`, intermediate difficulty and pitch range C4–C5, but demanded exactly 6 phrases.
- The backend parser also demanded exactly 6 barline-delimited phrases. Actual OpenRouter response reportedly contained 10, so the server returned `Invalid AI etude response: Expected exactly 6 free-meter phrases, received 10.` This error establishes a **phrase-count validation failure**, not a failure of staff or audio rendering.
- The existing frontend allowed 4–24 phrases before this fix, inconsistent with the Python six-phrase requirement. The new supported AI **requested range is 4–20**, checked consistently by Python and frontend.
- The current prompt specifies an optional **range** via `etudeSettings.phraseCountRange` with `min=4`, `max=20`, rather than the former exact `phraseCount=6`. This supports later UI changes such as requesting **exactly four** phrases by setting min=max=4, without depending on a fixed number in the parser's creative instructions. **No UI control has been implemented** for this yet.
- `M:none` still means phrases may have unequal lengths. Duration, silence, key spelling and frequency are preserved through the existing ABC-to-JSON adapter. There is no fixed 4/4 meter imposed on this Shur request.
- The user's broader design requirement is **format-agnostic Goosh notation**: the score/data model must eventually accept metered, unmetered, sung/avaz, and even barline-free material independently of any AI mode. These experimental AI phrase-count checks must **never** be added to `score.js` or `model.js`.

### Remaining warnings and limits (not silently fixed)

- `scripts/abc_etude.py` still requires a specific Shur key signature, exactly **8 measures for fixed-meter ABC**, and at least four barline-delimited phrases for `M:none`. That is a limitation of the current **Shur POC parser**, not of Goosh's native score engine. Completely barline-free ABC still fails this parser; handling that generically is a separately scoped task.
- The non-Shur generation path in `scripts/goosh_server.py` still requests **16 JSON notes in four fixed 4/4 bars**. Do not generalize this feature to every dastgah without a separate scoped change.
- The prompt requests `Q:1/4=60`, but playback currently uses `current.bpm` from the opened etude; the ABC parser does not pass Q to Goosh's tempo field.
- The updated prompt and parser accept pitches up to C5. However `web/src/ai-etude.js` retains the legacy pitch-class/key-signature limitations and optional E-koron display metadata. Real music correctness and browser-level accuracy need verification.
- No live paid OpenRouter request or full local browser test was performed in this review; verified: static code contract, reported error source, and consistency of the 4–20 bound.
- **Git history warning:** Current branch includes `5c768433` as parent of the user's push, despite an earlier request to restore the branch to before it. Never force-reset the user's new work as an incidental fix.

### Implementation restraint

This adjustment changes only creative prompt count, the specific Shur Python parser count check, matching AI frontend validation, and documentation. **Do not touch the staff renderer, piano, audio engine, or other code.**

---
> **LATEST UPDATE — 2026-11-20, free-meter Shur sample replacement:**
> The user replaced the Shur Daramad-e Khara reference motif with their
> multi-phrase ABC example titled **"Goosheh - Shoor Sol"**, with `M:none`,
> `L:1/16`, expressive rests, uneven phrase lengths and `Q:1/4=80`.
> The **entire exact ABC example is now embedded as sampleMotif** in
> `scripts/abc_etude.py`. This is INSPIRATION for OpenRouter to create
> a new original improvisation, NOT audio to reproduce and NOT notation
> that the Python code copies into the etude.
>
> Shur generation prompt now requests **original free-meter ABC** with
> variable-length phrase groups (~8–12), `M:none`, `L:1/16`,
> `K:C _B _E _/A`. The user's sample uses `K:Gm ^/A` with a different
> A alteration; this is kept verbatim as a sample but the **target key is
> still B-flat / E-flat / A-koron**. The prompt explicitly instructs
> the AI to follow target key, not the sample's key spelling.
>
> `parse_abc_etude()` now accepts `M:none` and validates **4–24
> variable-length phrases** without forcing fixed durations per phrase.
> It preserves rests and note lengths, returns the actual phrase count
> in `bars`, and still validates note range, spelling, key signature
> and bounded total duration. `web/src/ai-etude.js` accepts this
> free-meter output while continuing to return Goosh native note data.
> The remaining three modes' fixed 4-bar JSON generation is unchanged.
>
> **Important:** references to "8 bars" below describe the previous
> Shur implementation or fixed-meter fallback, NOT the current free-
> meter Shur generation. Run Python parser/browser tests and a real
> OpenRouter call before asserting end-to-end success. No standalone
> Express/backend was added.
>
> ---

> **2026-11-20 UPDATE — READ THIS FIRST:** The following integration has
> been extended for Shur after the original 4-bar POC was documented.
> The historical sections below describe the original design, and any
> 4-bar / JSON-generation claim in those sections now applies to the
> **other three modes** (Segah, Mahur, Homayun), not to Shur.
>
> For **Shur only**, Python now sends the user's specified **verbatim**
> 8-bar *Daramad-e Khara* ABC-only prompt (constant SHUR_PROMPT in
> scripts/abc_etude.py) to OpenRouter as the user message, with no JSON
> response_format override. The model should output ABC inside a code fence.
> scripts/abc_etude.py parses the ABC and produces the **same structured
> API contract** required by Studio: title, abcNotation, notes with pitch,
> duration and frequency. Shur additionally includes bars=8, totalBeats
> and atBeats per note to preserve rest gaps.
>
> The parser checks exactly 8 measures, valid measure durations, the
> C4–Bb4 register and K:C _B _E _/A. It maps plain A to A-koron,
> plain B to B-flat, plain E to E-flat, and explicit _/E to E-koron.
> It is a deliberately limited monophonic subset of ABC, not a general
> ABC notation/engraving library; invalid responses are rejected (HTTP
> 502), not silently converted into the older four-bar rhythm.
>
> web/src/ai-etude.js supports the new variable note count and atBeats.
> Goosh's old pitch-class tuning cannot encode both E-flat and E-koron
> on MIDI pitch class E independently. Shur encodes E-koron at the
> enharmonic acoustic pitch D-sharp +50 cents via offset[3]=50, with
> optional note.staffM=64 and note.staffAccidental='کرن' so the
> **existing score.js** can draw an E-position koron accidental.
> The normal score renderer and audio engine remain in use; score.js
> only gained optional display pitch/accidental metadata support.
> The Note settings heading uses note.displayPitch when present.
> This is a compatibility workaround, not a full per-note tuning model.
>
> The same-origin one-process Python startup is unchanged:
> python3 scripts/goosh_server.py 8081 --bind 0.0.0.0
> (trusted LAN only; 127.0.0.1 remains safer by default).
>
> **Current feature status:** code integrated on redesign, but still
> requires a real OpenRouter response and browser-level testing.
> Do not claim 8-bar AI integration is already verified end-to-end.
> Do not add an Express server, second backend, ABC.js renderer, or
> unrelated refactors as part of this change.

---

**Repository:** abbasnosrati/Goosh-v2  
**Target branch:** redesign  
**Document date:** 2026-11-20  
**Implementation commits on redesign:** ee1a13ed562339376f3bbdd84be7eca39f7d9069 and bd6db51986d42f6738dc1086176333105db86103  
**Original isolated proof-of-concept branch:** feat/ai-persian-etude-poc  
**Status:** Implemented and committed on GitHub; end-to-end generation using the user's actual OpenRouter key has **not** been verified.

> **Read this before modifying the feature.** This document describes what was actually implemented, why the integration works the way it does, what remains unverified, and the strict scope of the user's request. It is a technical handoff, not permission to refactor unrelated code.

## 1. User requirement and non-negotiable scope

The user wanted an AI-assisted generator for simple Persian-dastgah-inspired etudes, specifically:

1. A **Generate** button in the **existing Etude Studio editor**, not a separate test screen.
2. Generate a short example of 4 bars (16 notes in this POC), with a choice of Shur, Segah, Mahur, or Homayun.
3. Send a request to **OpenRouter** using a secret API key stored server-side in a local environment file.
4. Convert the returned notes into the **existing Goosh etude model**; display them using the **existing staff** and play them using the **existing piano/audio engine**.
5. Keep the existing Studio editor, staff, sound code, data model, and unrelated UX unchanged.
6. Move the feature from the experimental POC branch to the existing **redesign** branch without merging all POC files or overwriting the redesign layout.
7. Use **Python**, not Express or another Node.js service. **One running Python HTTP process** must serve both the web files and the AI endpoint.
8. Retain the user's prior ability to run on **port 8081** with **--bind 0.0.0.0** when explicitly needed.

**Do not** introduce Express, FastAPI, Flask, a second API service, an additional port, a new music rendering system, or an unrelated design overhaul without a new explicit user instruction. A server-side request handler is still necessary to protect the OpenRouter key; it is incorporated into the same Python process that serves Goosh.

## 2. Short architecture overview

~~~text
Browser (Goosh, same origin: http://localhost:8081)
  |
  | User opens Etude Studio -> creates/opens an etude -> Generate
  v
web/src/app.js
  - Render desktop-only Generate button in studio()
  - Modal selects dastgah
  - Confirm before replacing existing notes
  - Loading / failure / cancellation UI
  |
  v
web/src/ai-etude.js
  - POST /api/generate-etude (same origin)
  - Validate and convert response to Goosh model
  - Check expected frequencies against model.js
  |
  v
scripts/goosh_server.py (same Python HTTP process and port)
  - Serve unchanged files from web/
  - Handle POST /api/generate-etude
  - Read OPENROUTER_API_KEY from .env
  - Call OpenRouter securely using urllib.request
  - Normalize pitch/rhythm and return structured JSON
  |
  v
Back in app.js
  - Assign validated result to the active etude
  - Save with existing localStorage persistence
  - Render with the existing score.js + audio.js
~~~

There is **no independent Express backend**, no extra Node-based server, and no cross-origin request for normal use. The endpoint path is relative; it uses the port on which the Goosh page was opened.

## 3. Exact files added or modified on redesign

| Path | Action | Responsibility |
| --- | --- | --- |
| scripts/goosh_server.py | Added | Python static server + local OpenRouter API; env loader; mode presets; output validation/normalization; CLI port/bind. |
| web/src/ai-etude.js | Added | Frontend request helper and strict conversion of AI notes to the existing Goosh etude format. |
| web/src/app.js | Modified, focused addition | Imports the adapter; adds Generate button and dialog inside the existing studio() function; saves/re-renders successful results. |
| web/index.html | Modified, single import version update | Changes the app.js import query from redesign-3 to redesign-ai-generate-1 to avoid using a cached old module. |
| package.json | Modified, web script only | Replaces the original static-only Python command with python3 scripts/goosh_server.py. |
| .env.example | Added | Documents the OpenRouter API key, selected model, and default port. |
| .gitignore | Added | Excludes real .env files and Python cache files from Git. |
| scripts/AI_ETUDE_README.md | Added | Short operational README, including port 8081 and LAN binding instructions. |

**Not modified by this work on redesign:** web/src/score.js, web/src/audio.js, web/src/model.js, web/src/home.js, web/style.css, web/home.css, web/etudes.css, native/mobile code, and the main branch.

The experimental branch had a standalone Node-based server and a separate ABC.js test page. **Those POC files were intentionally not migrated** into redesign. Instead, the API functionality was reimplemented in scripts/goosh_server.py and the new frontend adapter was adapted for a relative, same-origin URL.

## 4. Starting the application

### Recommended local-only start

From the repository root:

~~~bash
git switch redesign
git pull --ff-only origin redesign
cp .env.example .env
# Edit .env and put the real OpenRouter key there.
npm run web
~~~

The package.json web script is now:

~~~text
python3 scripts/goosh_server.py
~~~

By default, this starts **127.0.0.1:8080**. Open http://localhost:8080.

### Original user's port/bind preference

Previously the user started the static server with:

~~~bash
python3 -m http.server 8081 --bind 0.0.0.0 -d web
~~~

That old command can serve HTML/JS/CSS but **cannot handle POST /api/generate-etude**. The compatible new one-process command is:

~~~bash
python3 scripts/goosh_server.py 8081 --bind 0.0.0.0
~~~

Open http://localhost:8081 on the same machine, or the machine's LAN IP from another device if the network permits it.

For local-only use on port 8081, prefer:

~~~bash
python3 scripts/goosh_server.py 8081
~~~

The script uses Python's standard library (http.server, urllib.request, json, pathlib, etc.). No pip install, Express server, or second command is required. Python 3.9+ is the documented target.

### Environment configuration

The committed .env.example contains:

~~~dotenv
OPENROUTER_API_KEY=replace_with_your_key
OPENROUTER_MODEL=openai/gpt-4o-mini
GOOSH_PORT=8080
~~~

The real .env should be kept in the repository root; never commit or display the secret. scripts/goosh_server.py calls load_environment() at startup. It checks root .env first, then an optional old poc/.env if root .env does not exist; it uses os.environ.setdefault so existing exported variables win.

The optional positional CLI port overrides GOOSH_PORT. The optional --bind value defaults to 127.0.0.1. If 0.0.0.0 is selected, the server logs a security warning.

**Important:** A conventional static-only web server, a file:// URL, or a deployed static host with no API route will not make the Generate feature work. The Python handler must be running on that same origin.

## 5. Existing Studio UI integration: web/src/app.js

The Generate control was added **only inside studio()**, after the existing PDF action and before the existing editor panel. It uses Goosh's existing btn(), el(), row(), t(), render(), save(), and local state helpers. Existing Studio controls were not reimplemented.

- A desktop-only condition, window.matchMedia('(min-width: 768px)').matches, decides whether the button is created. It is **not** shown in narrow mobile layouts.
- The toolbar action displays the literal English label **Generate**.
- If recording (rec) is active, generation is blocked with a stop-recording message.
- The modal has a dastgah selector with four values: shur, segah, mahur, homayun.
- The dialog displays loading information and error text in the currently selected UI language.
- If the active etude already has notes, the user must confirm replacement **before** making the request. Cancelling that confirmation preserves the existing notes.
- During the request the generate button and selector are disabled.
- Each modal creates an AbortController. Closing the modal or changing the URL hash closes the dialog and aborts the request.
- The selected active etude object and its ID are captured before awaiting the request. After the response, the code checks the abort signal and verifies that the current page, active ID, and object still match, so a late response cannot write into a different etude.
- On success, Object.assign(target, result) updates the active etude, selection is cleared, save() persists it, the dialog closes, and render() redraws the existing editor.
- On failure, an error is shown in the modal and the previous etude remains unchanged.
- The generated title is also applied to the etude; the existing page redraw then updates its visible title.

The button is in the **edit view of an opened/created etude**, not the Studio's list screen. If it appears missing, first open an etude, ensure the viewport is at least 768px wide, and confirm the correct branch/JS bundle is loaded.

This integration does not add a new notation viewer, new playback engine, or a separate page for AI output.

## 6. API contract: scripts/goosh_server.py

**Endpoint:** POST /api/generate-etude  
**Transport:** Same-origin HTTP; request and response in JSON  
**Request content type:** application/json  
**Maximum request body:** 2048 bytes (Content-Length required by current implementation)  
**Allowed dastgah IDs:** shur, segah, mahur, homayun

Example manual request (will consume OpenRouter usage if configured):

~~~bash
curl --fail-with-body -X POST http://127.0.0.1:8081/api/generate-etude \
  -H 'Content-Type: application/json' \
  -d '{"dastgah":"shur"}'
~~~

Success response shape:

~~~json
{
  "title": "Generated etude title",
  "abcNotation": "X:1\nT:Generated etude title\nM:4/4\nL:1/4\nK:none\n...",
  "notes": [
    { "pitch": "G4", "duration": 1, "frequency": 392.0 },
    { "pitch": "Ak4", "duration": 1, "frequency": 427.4741 }
  ]
}
~~~

**This is an intentionally abbreviated shape example**: actual success output contains exactly **16** notes; the example only shows the first two entries. Duration is in quarter-note **beats**, not seconds. The returned frequency is in Hz. The abcNotation string is generated by the Python normalizer, but **is not currently rendered using ABC.js in Studio**.

The server answers other POST paths with a JSON 404. Unsupported Content-Type returns 415; invalid/missing body length returns 413 or 400 according to the condition; malformed request JSON returns 400; unsupported dastgah returns 400; missing API key returns 503; upstream/invalid AI response returns 502. Error payloads use an "error" string. The handler inherits SimpleHTTPRequestHandler, which serves the existing files from web/.

### OpenRouter request

Python makes an outbound HTTPS POST to:

https://openrouter.ai/api/v1/chat/completions

It uses:
- Authorization: Bearer + OPENROUTER_API_KEY (server-side only).
- Content-Type: application/json.
- X-Title: Goosh Persian Etude.
- Model: OPENROUTER_MODEL, default openai/gpt-4o-mini.
- temperature: 0.65; max_tokens: 1900.
- provider.require_parameters: true.
- response_format.type: json_schema with strict schema "persian_etude".
- Messages containing the dastgah-specific pitch whitelist, tonic, fixed rhythm, microtone spelling, and request for 16 monophonic notes.
- urllib.request.urlopen with a 45-second timeout.

The current response schema demands title, abcNotation, and an array of 16 objects with pitch/duration/frequency. Despite requesting these values from the LLM, the Python normalizer **recomputes the rhythm, frequencies, and ABC** from its trusted pitch tokens. This is intentional: the frontend should not trust LLM-generated frequencies, note lengths, or ABC syntax directly.

## 7. Dastgah presets and normalization

Current POC pitch collections are fixed in the Python MODELS dictionary:

| Dastgah ID | Display name | Tonic | Allowed pitch tokens |
| --- | --- | --- | --- |
| shur | شور / Shur | G4 | G4, Ak4, Bb4, C5, D5, Eb5, F5, G5 |
| segah | سه‌گاه / Segah | Ek4 | Ek4, F4, G4, Ak4, B4, C5, D5, Ek5 |
| mahur | ماهور / Mahur | C4 | C4, D4, E4, F4, G4, A4, B4, C5 |
| homayun | همایون / Homayun | G4 | G4, Ak4, B4, C5, D5, Ek5, F5, G5 |

Pitch-token conventions:
- C4 is middle C.
- Plain note (e.g., G4): unaltered equal-tempered pitch.
- b: flat, -100 cents; #: sharp, +100 cents.
- k: koron, **-50 cents** in this demo; s: sori, **+50 cents** in this demo.
- The tuning is an approximation for a proof of concept; these are not canonical, exact tuning prescriptions for each Persian dastgah.

The normalizer ensures:
1. Exactly 16 allowed pitch tokens are present in the AI response.
2. The first and final notes are forcibly set to the mode's tonic.
3. If the mode has a mandatory microtonal pitch and no k/s note is present, an appropriate microtonal note is inserted at position 6 (zero-based index 5).
4. The rhythm becomes the fixed 16-beat pattern below regardless of the model's proposed durations.
5. Frequencies are recalculated from the note name, octave, and fixed cent offsets; values are rounded to 4 decimal places.
6. ABC notation is regenerated from the normalized notes; the model's original abcNotation is not trusted.
7. A nonempty title is taken from the model and truncated to 80 characters, or a fallback Persian title is used.

Fixed durations by bar (quarter-note beats):

~~~text
Bar 1: 1,   1,   1, 1     = 4 beats
Bar 2: 0.5, 0.5, 1, 2     = 4 beats
Bar 3: 1,   0.5, 0.5, 2   = 4 beats
Bar 4: 1,   1,   1, 1     = 4 beats

Total: 16 notes, 16 quarter-note beats, four bars of 4/4.
~~~

The generated ABC uses X:, T:, M:4/4, L:1/4, K:none, with _/ and ^/ for quarter-flat/quarter-sharp. Again: **Studio uses score.js, not an ABC parser**.

## 8. Conversion to Goosh's native etude model: web/src/ai-etude.js

The frontend adapter imports **freq** and **valid** from the existing web/src/model.js and exposes:

~~~js
generateStudioEtude(dastgah, currentEtude, abortSignal)
~~~

It POSTs the chosen mode to the relative URL **/api/generate-etude**. It validates the returned title/16-note collection, pitch syntax, positive numeric durations, positive numeric frequencies, total rhythmic length, and eventual Goosh model validity.

### Native note format

The existing Goosh editor does **not** store ABC notes. It stores items of this shape:

~~~js
{ m: 67, at: 0.0, d: 0.6666666666666666 }
~~~

- m: integer MIDI note (G4 = 67).
- at: note onset measured in **seconds** from the beginning of the etude.
- d: note duration in **seconds**.
- e.bpm: current Studio tempo; current generated notes preserve that tempo.

For a duration in beats:

~~~text
secondsPerBeat = 60 / currentEtude.bpm
note.at = cumulativeBeatPosition * secondsPerBeat
note.d  = note.durationInBeats * secondsPerBeat
~~~

The mode-specific pitches are converted from C4/D4/etc. to MIDI numbers using semitone offsets and their octaves. Microtonal information is **not** encoded as a fractional MIDI number; it is expressed through the existing Goosh tuning fields.

### Microtones and key-signature model

web/src/model.js computes pitch frequency with:

~~~js
freq(e, m) =
  440 * 2 ** (
    (m - 69 + ((e.offset[m % 12] || 0)
       + (e.marks[e.key[m % 12]] || 0)) / 100) / 12
  )
~~~

The adapter writes a new e.key mapping from pitch class to the existing mark name:
- # -> ♯, b -> ♭, k -> کرن, s -> سری.
- Standard cent values are applied for these marks: ±100 for sharp/flat, ±50 for sori/koron.
- e.offset is reset to an empty object for the generated etude.
- Other current etude properties (including e.bpm and practice rule settings) are preserved.
- The current e.notes array and generated title are replaced only after successful validation.
- It rejects conflicting alterations of the same base pitch class (for example both unaltered A and Ak in the same generated etude), because the existing Goosh key signature operates at **pitch-class scope**, not as an independent accidental attached to each individual note.

For every generated note, the adapter compares the frequency from Goosh's **existing** freq() with the server's returned frequency; a mismatch greater than **0.5 cents** rejects the response.

The full result is validated with model.js's existing valid() before the Studio state changes. The score redraw runs through the existing sheet()/score() flow, and playback continues through voice(freq(e, n.m), n.at)(n.d).

**Important functional side effect:** generating into an existing etude resets its previous custom per-pitch offsets and standardizes the relevant accidental cent values. The UI asks before replacement if there are existing notes. Codex should **not silently change this tuning behavior** without reviewing the current model's limitations and getting the user's approval.

## 9. Existing rendering, sound, storage, and UX

These integrations intentionally reuse existing code instead of making parallel versions:

- **Notation/staff:** web/src/score.js draws the existing SVG treble staff from e.notes, e.key, etc. This is an onset-position-based drawing system, not full conventional rhythmic engraving with guaranteed barlines/beams/ties.
- **Sound:** web/src/audio.js, invoked by the preexisting Studio Play handler with web/src/model.js's freq().
- **Editing:** the same note-selection, timing edit, piano/record, signature, and practice controls already provided by Studio.
- **Persistence:** app.js holds an active etude in collection and writes via the existing save() routine under localStorage keys prefixed "goosh.etude.".
- **Language:** new UI labels use the existing t(English, Persian) helper.
- **Layout:** no redesign CSS or extra Studio layout framework was introduced for AI.
- **Mobile:** no mobile UI or native backend service was added. On narrow viewports the Generate control is deliberately omitted.

The generated notes are **not** inserted into a second score viewer. All rendering happens through the same staff element used for manually recorded/written notes.

## 10. Local security and operational constraints

- The OpenRouter key stays in the Python process. **Never place it in web/src JavaScript, HTML, shipped assets, or Git commits.**
- Real .env files are ignored by .gitignore; .env.example intentionally contains a placeholder only.
- The default bind address is 127.0.0.1; this limits inbound access to the local machine.
- **--bind 0.0.0.0 makes the HTTP server and /api/generate-etude endpoint reachable over the network** (subject to firewall/routing). The present API has **no user authentication, rate limiting, or billing quotas**. Anyone who can reach it may initiate billable OpenRouter requests, even if they cannot read the API key. This is **local development / trusted-LAN use only**, not production-ready public hosting.
- OpenRouter calls can fail for invalid credentials, credit limits, chosen-model/schema incompatibility, connectivity issues, or timeouts. The UI reports these errors instead of changing the etude.
- This integration should not be confused with building an Android APK: the Python process is not bundled with the Android WebView. A future mobile/server deployment requires a separately approved deployment design.

## 11. Manual verification checklist for Codex

**Do not mark these as passed without actually running them.** Previous work checked GitHub source and commit differences, but no real end-to-end OpenRouter request with the user's private key was executed.

1. Check out redesign and use Python 3.9+.
2. Set OPENROUTER_API_KEY in the ignored root .env file.
3. Run: python3 scripts/goosh_server.py 8081.
4. Open http://localhost:8081, navigate to **Etude Studio**, and open/create an etude.
5. On desktop width >= 768px, verify Generate is next to the existing Studio actions.
6. Open the dialog, select each supported dastgah, and generate an etude.
7. Verify 16 notes appear **on the existing staff**, and the existing Play button produces the correct notes using the normal Goosh engine.
8. Verify the resulting etude title, 4-bar/16-beat timeline, and stored notes/keys/frequencies.
9. Verify existing selected/edited etudes still work and the etude persists on reload.
10. Test replacing notes: cancel confirmation -> original notes unchanged; accept -> generated notes replace them.
11. Test closing the dialog and navigating away while a request is pending; neither should mutate another etude.
12. Test missing/invalid API key, unsupported dastgah, network errors, provider/schema errors, and malformed response handling.
13. Test 8081 binding with --bind 0.0.0.0 only on a trusted network; verify no unintended public exposure.
14. Check UI at narrow screen widths: Generate should not appear in the currently implemented mobile flow.
15. Ensure preexisting redesign pages, piano behavior, and score controls have not changed.

For non-billable checks, import scripts/goosh_server.py into a local Python test context and exercise normalise_etude(), get_frequency(), and the request validation without calling OpenRouter. If you add tests, keep them focused and do not change unrelated app logic.

## 12. Known POC limitations / possible next steps (not authorized work)

These are **known constraints**, not tasks the user has approved to implement:

1. **Musical authenticity:** The preset modal collections and ±50-cent koron/sori are simplified. A qualified musician should verify intervals, characteristic movements, cadences, and modal naming before production use.
2. **Rhythm and length:** 4 bars, 16 notes, and durations are hardcoded in Python. The model currently chooses primarily the pitch sequence; it does not control the final rhythmic structure.
3. **Per-note accidentals:** The Goosh data model only allows one alteration per pitch class through key signatures. Mixed plain/microtonal spellings of the same base note cannot be represented in this adapter and are rejected.
4. **Engraving:** The staff displays the notes, but it is not full ABC or music-engraving output. Do not assume ABC barlines will appear in the current SVG score.
5. **Model/provider behavior:** Strict JSON schema support for the configured OpenRouter model/provider must be validated in the user's environment.
6. **Security:** The Python handler is suitable for local proof-of-concept use only, especially if bound to 0.0.0.0.
7. **Error handling:** Live integration and browser compatibility still need verification; do not claim production readiness without tests.
8. **Mobile/offline:** The narrow-screen UI hides generation; an offline APK cannot access the Python endpoint unless a suitable remote service is explicitly designed later.

Do not fix or extend these issues speculatively. Ask for or follow a **specific user instruction**, keep changes tightly scoped, and preserve the redesign branch's existing user interface and music engine.

## 13. Commit and branch history

- **feat/ai-persian-etude-poc:** initial experiment containing a separate Node-based API at 127.0.0.1:8787, standalone ABC.js test page, and first Studio connector; last POC commit: 5d8778060d885c1f44f0db6b51c4be70843b419c.
- **redesign commit ee1a13ed562339376f3bbdd84be7eca39f7d9069:** ported only the Studio Generate integration and adapter; implemented OpenRouter request handling in a single Python HTTP process; updated npm run web, environment example, ignored secrets, import cache version, and operational docs.
- **redesign commit bd6db51986d42f6738dc1086176333105db86103:** added configurable port and --bind options so the user's previous localhost:8081 / 0.0.0.0 workflow remains possible.
- **This handoff document:** documentation only; no runtime files should be modified as part of creating it.

**Summary for the next Codex session:** Continue on redesign, keep the single Python server and existing Studio architecture, treat the OpenRouter response as untrusted input, preserve the Goosh {m,at,d} + key-signature representation, never expose API credentials, and do not modify unrelated functionality/design. Only make further code changes when the user explicitly directs them.

## 14. UI/UX update — Delete etudes from the library (2026-11-20)

- Target branch: **redesign**. This change does not belong on `main`.
- Each etude card in the Studio and Practice library lists now has a separate trash icon button at its bottom-right corner.
- The existing etude-opening button remains independent; selecting the trash icon does not open the etude.
- Clicking delete displays a localized English/Persian confirmation that explicitly warns the operation cannot be undone.
- Confirming deletes the matching `goosh.etude.<id>` entry from localStorage and removes the entry from the in-memory collection, then refreshes the list. Cancel leaves it intact.
- The icon has an accessible name, and the card/list styling remains responsive to both themes and screen sizes.
- Updated `web/src/app.js` for the UI control and minimal delete handler; updated `web/etudes.css` for card positioning and to preserve the existing filter selectors with the new wrapper.
- No changes to piano/audio, recording, practice evaluation, AI generation, or underlying etude data format.
- Follow-up changes must stay narrowly scoped to the user's explicit request. Do not modify unrelated behavior or styling.

**Verification:** Source-level integration complete. Manual browser/device confirmation has not been performed, so do not report end-to-end UI verification as passed.

### Delete UI correction (same date)

- Fixed the trash buttons appearing as empty controls **below** the cards. The card wrapper is positioned and the delete button is absolutely positioned at the physical bottom-right, inside the original card boundaries; extra right-side padding prevents overlap with the card text.
- Replaced the browser-native `confirm()` with an accessible, centered `<dialog>` styled for both Goosh themes. It shows the etude title, a permanent-deletion warning, and localized Cancel / Delete etude actions. Escape and Cancel close the dialog without deleting anything.
- The trash SVG now explicitly specifies its stroke attributes to ensure its icon is visible.
- Incremented the `web/etudes.css` and `web/src/app.js` cache-busting import versions in `web/index.html`; a stale CSS response previously left the new controls unstyled.
- Files touched for this correction: `web/src/app.js`, `web/etudes.css`, and `web/index.html`. The deletion storage behavior remains unchanged.
- Confirm the finished appearance in a browser on desktop/mobile, in light/dark, and in both left-to-right and right-to-left language modes. No browser/device visual verification is claimed here.

### Equal-height Studio etude cards (2026-11-20)

- Scope: `redesign` branch, Studio etude gallery only. The user reported that cards with shorter titles were visibly shorter than cards with wrapping titles.
- Updated `web/etudes.css`: the Studio CSS grid now stretches its card items, keeps its header track at natural height, and makes implicit card rows share an equal `1fr` height based on the tallest card. Each `.etude-card` is a column flex container and its existing `.etude-item` expands to fill it.
- This is a CSS-only layout adjustment. No card creation, delete logic, modal actions, audio, practice behavior, or etude data was changed. The existing trash icon stays pinned to the bottom-right of each card.
- Updated `web/index.html` to use `etudes.css?v=design-8` so clients do not retain the stale card layout.
- Manual browser/device visual testing is still required; do not claim it was performed.

### Studio score toolbar placement (2026-11-20)

- Branch: `redesign`.
- User requested moving the five Studio tools **Pen, Play, Zoom out (−), Zoom in (+), and Wrap staff** away from the top recording row.
- **Final requested position:** immediately beneath the **Score** heading and directly **above** the staff/score element; not beneath the staff.
- The **Record** button remains in the original top row above the piano.
- Only the location of the existing controls within `studio()` in `web/src/app.js` was changed; the original event handlers, active state, and functional behavior are preserved.
- Bumped the JavaScript import query in `web/index.html` to invalidate cached scripts. No CSS/audio/practice/AI logic changes.
- Source layout inspected; live browser/device visual verification not performed.

### Score transport and Record alignment (2026-11-20)

- Branch: `redesign`. Implemented only the user-requested Studio transport controls and Record placement.
- Replaced the Score Play text button with an icon-only Play control. During playback, that same control shows a Stop-square icon; clicking Stop immediately fades the Studio Score audio and resets playback to the beginning.
- Added a separate icon-only Pause control immediately next to Play. It is disabled until playback starts; when paused it becomes a Resume/Play icon, and resumes from the saved elapsed position. The Stop control remains available while paused.
- Play cannot start overlapping playbacks: one `scoreTransport` object owns the scheduled voices and output gain node. Clicking the changed Play/Stop control again stops the current instance rather than launching another.
- The Score playback gain node is isolated from live piano sound, so stopping/pausing the score does not silence the entire audio engine. The existing note-highlight marker functions in `app.js` remain unchanged; transport updates their state on start, pause, resume, and stop.
- Moved the existing Record button into the same Score toolbar, anchored to the **physical far right**, with an SVG record/stop icon plus localized label. Its existing Record/Stop handler and keyboard shortcut remain unchanged. The Score toolbar remains directly below the Score heading and above the staff.
- Changed files: `web/src/audio.js` (isolated score output), `web/src/app.js` (transport logic and controls), `web/style.css` (scoped toolbar icons and Record alignment), `web/index.html` (cache-busting versions).
- No changes were made to the score engraving/marker implementation, AI generation, etude list, audio samples, or practice evaluation. No browser/device playback testing has been claimed.

Manual checks: Play→Stop→Play returns to note 1; Play→Pause→Resume continues from its position; Play→Stop while paused resets; rapid repeated Play/Stop clicks do not layer the score audio; live piano keys remain independent; Record appears at the far right in both RTL/LTR.

## Studio Score editing tools and playback indicator (2026-11-20)

**Scope and branch:** `redesign` only. This section documents the user's four requests in detail. Do not apply these changes to `main`. The existing Score transport (Play/Stop/Pause/Resume), Record control, note-highlight timing logic, and all unrelated Studio features were intentionally preserved.

### A. Playback indication: small arrow instead of a ring

**File:** `web/src/score.js`; `score()` → local `note()` renderer.

- Removed the old transparent playback-indicator circle with radius `12.5` surrounding each notehead.
- Draw a **small downward-pointing arrow** using an SVG `path`, `fill:none`, `stroke:var(--accent)`, stroke width `2`, round joins/caps, and default `opacity:0`.
- Position the arrow slightly offset from the notehead: `indicatorX = x + (y >= 86 ? -12 : 12)`. For notes with upward stems the arrow sits left of the stem; for notes with downward stems it sits right. Its stem runs from `y - 25` to `y - 14`; the tip stops above the notehead with a small gap, rather than circling/obscuring it.
- Keep `data-playback-note:index` on the SVG path. The existing playback-marker functions in `web/src/app.js` still query this attribute and toggle `opacity` to `1`/ `0` by current note index, including simultaneous notes, sorting, wrapped rows, pauses, resumes and stops.
- Set `pointer-events:none` so the arrow cannot intercept note clicks. The separate transparent note hit area remains available for editing.
- No changes to the score timing, note values, stems, accidentals, engraving geometry or the audio transport.

### B. Select / Pen / Eraser toolbar

**File:** `web/src/app.js`.

- Replaced the former standalone text Pen toggle with three adjacent **SVG icon-only buttons**, rendered at the beginning of the existing Score toolbar (under the Score heading, above the staff): **Select** (mouse-pointer icon), **Pen** (pencil icon), and **Eraser** (eraser icon).
- Each button provides a localized English/Persian `title` and `aria-label`, plus `aria-pressed` reflecting the active tool. The active button gets the existing `active` class.
- Tool state is a single mutually exclusive `scoreTool` value, initialized to `'select'`. Allowed modes: `'select'`, `'pen'`, `'eraser'`. This replaces the prior boolean `pen` flag. `loadRoute()` resets to Select when opening another etude/route.
- Clicking a tool sets `scoreTool` and calls the existing `render()`; clicking the already active tool does nothing. No second editor or toolbar was introduced.
- Existing Play/Stop/Pause/Resume, zoom controls, Wrap staff, and right-aligned Record remain in the same toolbar with their prior handlers and state.

**Select (normal mouse cursor):**

- This is the default mode and the explicit way to leave Pen or Eraser.
- Mouse uses its normal cursor (the custom cursor property is removed).
- Clicking an existing note uses the previous selection flow and opens `noteSettings()`; Shift/Ctrl/Meta multi-selection is retained.
- Clicking blank staff does not insert/delete anything.

**Pen (pencil cursor):**

- Adds a new note **only when clicking blank space on the staff** via the existing `score(..., {insert})` callback.
- Keeps the prior insertion behavior: MIDI pitch and timing are computed by the score renderer and default new duration remains `60 / e.bpm`. Save using `save()`, then redraw using `sheet()`.
- Clicking an existing note does not open Note settings or erase it while Pen is active.
- Staff cursor becomes a small custom pencil SVG, with its drawing tip as the click hotspot; fallback is `crosshair`. Cursor applies to the staff SVG and its child note/overlay elements.

**Eraser (eraser cursor):**

- Clicking an existing note's transparent notehead hit target invokes `pick(index, ...)` and removes exactly that note from `e.notes` using `splice(index, 1)`. This index is the original array index even if notes are sorted for display or wrapped.
- Stops any active Score transport first, preventing stale playback markers or scheduled audio from referring to deleted notes.
- Clears selected indices (`sel.clear()`), persists the mutated etude with `save()`, and immediately redraws the score with `sheet()`.
- Clicking empty staff does nothing; no note is created, and the existing note settings modal is not opened.
- No browser `alert()` or `confirm()` is used for per-note erasing. This is direct editor behavior, not whole-etude deletion.
- Staff cursor becomes a custom eraser SVG with a hotspot near its contact edge and a `crosshair` fallback.
- Existing recording guard (`if (rec) return`) still prevents note selection/erasure while actively recording.

### C. Mouse cursors and responsive UI styling

**Files:** `web/src/app.js`, `web/style.css`.

- `scoreToolIcon(mode)` generates the Select/Pen/Eraser toolbar SVG icons using `document.createElementNS()`; no new icon library or external image dependency was added.
- `scoreEditingCursor(mode)` builds a small inline 32×32 SVG and encodes it with `encodeURIComponent` as a CSS `data:image/svg+xml` cursor. The Pen hotspot is `3 29`, the Eraser hotspot is `7 23`.
- `sheet()` updates `.score[data-tool]` and sets/removes the CSS `--score-tool-cursor` custom property for the active mode.
- New narrowly scoped CSS rules style 44×44 minimum tool buttons, SVG strokes, active border, and apply the custom cursor consistently on `.score`, nested `svg` and child SVG shapes. This prevents the default cursor of note hit targets from overriding the chosen tool.
- These rules are confined to `#app[data-page="studio"]`. Practice, Home, etude-library cards and theme tokens were not edited.
- Native SVG cursor support may vary by browser; `crosshair` is the explicit fallback. Touch interaction still uses the selected toolbar tool; there is no hover cursor on touchscreens.

### D. Files updated and cache versions

1. `web/src/score.js`: replace the playback ring with the offset arrow only.
2. `web/src/app.js`: mutually exclusive tool state; toolbar SVG controls; note deletion via existing Score pick callback; encoded cursor helpers; import score renderer using `./score.js?v=playback-arrow-tools-1`.
3. `web/style.css`: scoped Score editing-button styles and pen/eraser cursors.
4. `web/index.html`: set stylesheet/script cache query values to `score-edit-tools-1` so the updated toolbar, mouse cursors and arrow load without stale browser assets.
5. `CODEX_AI_ETUDE_HANDOFF.md`: this precise implementation record.

### E. Manual verification checklist for Codex (NOT automatically passed)

1. Open an etude on `redesign`. The Score toolbar begins with icon-only Select, Pen and Eraser; Select is active by default, all icons have accessible labels, and Record is still on the far right.
2. Play notes with stems in both directions, including simultaneous notes, rests, and multiple wrapped systems. Confirm a **small arrow with slight separation** appears near each sounding note, not a circle. Stop clears it; Pause freezes it; Resume progresses it.
3. Select Pen. Hover on the staff and directly over existing noteheads. The mouse cursor should look like a pencil rather than an ordinary pointer. Click blank staff: one correctly timed note is inserted and persists after reload. Click an existing note: no settings dialog appears.
4. Select Eraser. Confirm eraser cursor on the staff and noteheads. Erase a note from a middle row and a note from a chord; only the clicked note is removed and the change persists on reload. Blank clicks do nothing.
5. Return to Select with the mouse-pointer icon. The ordinary cursor returns, note-selection and Note settings work normally, and Shift/Ctrl/Meta selection still works.
6. Test switching tools during playback and while recording. Active playback should not stack or retain stale note indexes after erasing; recording should still prevent erasure. Try desktop and narrow/touch layouts, LTR/RTL and light/dark themes.
7. Ensure no changes were introduced to piano audio, etude export/import, AI generation, practice scoring, the generated rhythmic notation, or unrelated pages.

**Verification status:** JavaScript source syntax and the intended DOM/CSS wiring were checked at source level. The browser, mobile/WebView, audio output and real pointer-cursor rendering were not exercised here; do not mark these manual checks as passed without actually executing them.

## Studio Pen and Eraser keyboard Undo — Ctrl+Z (2026-11-20)

**Branch:** `redesign`. **Requested scope:** Add Undo for note insertions made with Pen and deletions made with Eraser, without changing other Studio editing features.

### Implementation details

- **`web/src/app.js` / editor state:** Introduced `scoreUndoStack = []`, an in-memory history dedicated exclusively to Pen/Eraser actions; capped at the most recent **100** changes. This is not persisted to storage.
- **`rememberScoreEdit(action)`:** Records action kind (`pen` or `erase`), the exact note object reference, the erased note's former array index (for Eraser), current `activeId`, and the current `e.notes` array reference.
- **Pen / `sheet()` insert callback:** Creates a note with the preexisting values `{m, at, d:60/e.bpm}`, pushes it to `e.notes`, records a `pen` history action, saves, and redraws. Normal note insertion semantics do not change.
- **Eraser / `sheet()` pick callback:** Checks index validity, stops the current Score transport as before, splices exactly the targeted note, records an `erase` history action with the removed note object and original index, clears selection, saves, and redraws. Does not open a modal.
- **`undoScoreEdit()`:** Undoes only the most recent supported edit (last in, first out):
  - Undo Pen = find that specific inserted note by object identity and remove it.
  - Undo Eraser = reinsert the same removed note object at its former index (bounded by current notes length), restoring pitch, onset, duration, and any original per-note metadata.
  - Before editing, rejects missing/stale etudes or replaced `e.notes` arrays and clears stale history; does not apply actions to another etude. Also refuses Undo while recording.
  - Stops Score playback before changing notes; on successful Undo removes the history entry, clears selected indices, calls the existing `save()`, then `sheet()`.
- **Route isolation:** `loadRoute()` clears the Undo stack when another route/etude is opened.
- **Keyboard handling:** Near the start of the existing `document.onkeydown` handler, detect **Ctrl+Z** (and **Cmd+Z** on macOS) with `ev.code === 'KeyZ'`, without Shift or Alt, only in Studio with an active etude, and only when not recording.
  - Ignore auto-repeat and any open modal.
  - Do **not** intercept Undo when focus is in `input`, `select`, `textarea`, or a contenteditable region; native text-field undo stays intact.
  - Call `preventDefault()` **only if** a Score edit was actually undone. No default browser shortcut is hijacked when history is empty.
  - No Redo (`Ctrl+Y`/`Ctrl+Shift+Z`) or new toolbar button was added, since neither was requested.
- **`web/index.html`:** Changed the `app.js` import query to `score-pen-eraser-undo-1` to avoid stale loaded JavaScript.
- **`CODEX_AI_ETUDE_HANDOFF.md`:** This handoff section documents the new behavior, scope, and checks.

### Suggested manual checks (not yet executed)

1. Insert 2 notes using Pen, press Ctrl+Z twice: last added note disappears first, then the earlier one; both removals persist after reload.
2. Erase 2 distinct notes, press Ctrl+Z twice: the second removed note returns first, then the first, with identical original pitch, timing, and note metadata.
3. Mix actions (Pen, Eraser, Pen) and verify repeated Ctrl+Z reverses them in reverse chronological order.
4. Undo a deleted note in a chord or in a wrapped Score line; the original index is used and other notes remain untouched.
5. Click in an Etude title/timing input field and use Ctrl+Z for text editing: the Score history must **not** be consumed. Undo should likewise be unavailable in an open dialog.
6. Verify an Undo stops Score playback and leaves no stale marker; confirm that recording mode does not permit Undo.
7. Switch etudes, then Ctrl+Z: earlier etude history cannot change the newly active etude. Replacing a note array through another operation makes old history invalid.
8. Try Ctrl+Z/Cmd+Z on supported desktop platforms. No additional button, Redo behavior, or unrelated audio/AI/practice change should appear.

**Verification:** Source-level syntax and wiring were checked. Browser interaction and persistence tests have not been run; do not mark the checks above as passed without executing them.

## Studio Score toolbar refinement — BPM numeric-only and zoom below staff (2026-11-20)

**Branch:** `redesign`. **Scope:** Studio Score layout and Tempo entry controls only.

### Requested visual changes
- Move the existing **Tempo (BPM)** control and the **zoom − / +** buttons from the primary Score toolbar to a new compact row **directly under the staff**, before **Edit notes & timing**.
- Keep the other primary toolbar controls in their previous position under the Score heading: Select/Pen/Eraser, Play/Stop, Pause/Resume, Wrap staff, and the Record control anchored to the far right.
- Remove the adjacent **Tempo slider** completely. Tempo changes now occur through a single text-enterable **numeric input**; the `BPM` unit label remains for clarity.
- Hide the browser-native number spinner affordances in CSS so there is no additional adjacent up/down stepper; the numeric field accepts typed values only and remains keyboard accessible.

### Exact implementation
1. **`web/src/app.js` / `studio()`:**
   - Removed the Tempo widget and zoom −/+ buttons from the `scoreActions` row above the staff.
   - After `el('div', panel, undefined, 'score')`, inserted `const scoreBelowActions = row(panel)` with class `score-below-actions`. It contains Tempo and the existing zoom buttons; the existing `details.controls` timing editor follows it.
   - The new `score-tempo` control holds its localized label, a single `input[type=number].score-tempo-number`, and the `BPM` suffix. Valid values remain **20–300 BPM**, step **1**, with `inputMode = 'numeric'`.
   - Deleted `tempoSlider`, its `input[type=range]` DOM, slider listeners and slider sync logic. The number's `onchange` validates the field and invokes the **existing `setEtudeTempo(Number(value))`**, restoring the current BPM on invalid input. Do not replace the tempo implementation with a display-only number: it scales all note onset times, durations and rests and saves the etude.
   - Zoom handlers are unchanged: minus invokes `zoom = Math.max(.4, zoom - .2); sheet()`; plus invokes `zoom = Math.min(3, zoom + .2); sheet()`. Only their parent DOM row moved.
2. **`web/style.css`:**
   - Added scoped flex styling for `#app[data-page="studio"] .score-below-actions`, with wrap and spacing, and a minimum 44×44 touch target for each zoom button.
   - Retained the existing Tempo label/input/unit visual language with a compact numeric field.
   - Deleted the former `.score-tempo-slider` styling and its mobile media-query stretch behavior.
   - Hid native spinner buttons for the BPM field through `appearance:textfield` and `::-webkit-inner-spin-button`/`::-webkit-outer-spin-button`. This does not change keyboard input or numeric validation.
3. **`web/index.html`:** Updated the query-string versions of `web/style.css` and `web/src/app.js` to `score-below-controls-1` to avoid stale cached layouts.
4. **`CODEX_AI_ETUDE_HANDOFF.md`:** Documented these changes here.

### Required manual verification — not yet executed
- The primary row under the Score title has no BPM/slider/zoom buttons. Only the previously existing editing, playback, Wrap and Record controls remain there.
- Directly **below** the staff, there is a single compact Tempo number with `BPM` label and the existing `−` / `+` zoom buttons; no range slider or browser spinner controls appear.
- Type a valid BPM (e.g. 80 then 120), commit the field, and confirm that actual note/rest timing changes, playback and persistence follow the existing `setEtudeTempo` behavior.
- Invalid numbers and out-of-range values must not overwrite the saved tempo. Check pressing Tab/Enter and using keyboard accessibility.
- Check responsive layouts and light/dark theme. The bottom toolbar must not overlap the staff or Edit notes & timing, and no unrelated editor/transport behavior should change.

**Testing status:** Source-level JavaScript syntax and code placement checked; no live browser/device visual or audio tests have been run.
