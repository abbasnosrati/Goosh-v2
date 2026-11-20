# Codex Handoff — OpenRouter Persian Etude Generator in Goosh v2

## 2026-11-20 — Studio editor-switch button first, with actual G-clef icon

**Request:** Two narrowly scoped UI changes to the Studio Score toolbar: (1) place the existing toggle that switches between the normal note score and the key-signature editor at the very beginning, ahead of Mouse/Select; (2) replace the toggle's former multi-line staff/sharp/note illustration with the actual treble-clef symbol (𝄞). No new toggle or mode, and no transport or tuning changes.

**Code change — `web/src/app.js`:** Lifted the already-existing `keyButton` creation from inside the `if(mode==='select')` branch of the tool loop and inserted it directly after `scoreActions` is created, before the `for (select, pen, eraser)` loop. This creates the DOM order **editor toggle → Select/Mouse → Pen → Eraser → other controls**. The callback still stops the active tuning preview, stops playback when entering signature mode, picks the existing configured signature pitch, toggles `signatureMode`, and calls `render()`. The original context-sensitive tooltip/`aria-label` (Edit key signature vs Return to score), `aria-pressed`, active state, `signature-toggle` class and dataset are all retained. In signature-editing mode, the edit tools continue being hidden as before.

**Icon change — `scoreSignatureIcon()`:** Replaced the old SVG staff-with-sharps/staff-with-notes switching artwork with one consistent treble-clef (G-clef, Unicode U+1D11E) rendered as an inline SVG `<text>`, using the same musical symbol already used in Goosh's existing score staff. The icon inherits `currentColor`, stays decorative with `aria-hidden=true`, and the parent button continues owning accessibility. Existing `.signature-toggle svg` size/styling is reused; no external image or new icon dependency is added. Music-font fallback is `Noto Music`, `Bravura`, `Segoe UI Symbol`, serif, consistent with the app's staff.

**Other files:** `web/index.html` only updates the existing `app.js` cache-busting import to display the new order/icon after refresh. This Codex section is included **in the same commit** as the code. No changes to CSS, other controls, `web/src/score.js`, `web/src/key-signature.js`, data model, piano samples, audio timing, pitch tuning, or AI generation.

**Verification:** Check the toolbar DOM order and that there is exactly one editor switch; verify that mouse comes next in standard mode, and selecting signature mode hides mouse/pen/eraser while preserving the editor switch. Both toggle directions should keep the same clef icon and context-sensitive accessible label. Syntax and mocked DOM tests are applicable; full browser/device render should be checked visually for music-font availability and icon sizing.

---

## 2026-11-20 — Correct Koron size and A4 vertical alignment in key-signature editor

**Screenshot feedback:** The user approved the actual Persian Koron vector shape but reported that, when it appears over pitch A (La) in the Studio key-signature editing view, it is too large and the triangular flag sits noticeably higher than the A4 staff position. The request is a strictly visual positioning/scale correction; no new feature or glyph redesign is authorized.

**Root cause:** In `web/src/key-signature.js`, the previous call to `appendPersianAccidental(svg,mark,{x:x-13,y:y-23,width:26,height:37})` used the same dimensions and top-left offset for both Persian marks. The shared artwork has a normalized SVG `viewBox="0 0 120 160"` and Koron's triangular tip is at `(100,46)`, high up within that box. With the old 26×37 SVG, its tip rendered about **11.9 units above** the actual pitch Y coordinate from `yFor(pitch.midi)`. Thus the Koron visually floated above A4.

**Exact correction:** In `web/src/key-signature.js`, only the `mark==='کرن'` branch of the existing SVG render call is adjusted to `{x:x-10,y:y-8,width:18,height:26}`. This shrinks the displayed Koron by roughly 30% while maintaining the original aspect ratio and artwork. Because SVG `preserveAspectRatio="xMidYMid meet"` fits 120×160 into 18×26 with horizontal scale `18/120 = 0.15`, the triangle tip's Y inside the fitted box is `(26 - 160*0.15)/2 + 46*0.15 = 7.9` units from its top. Placing its top at `y-8` makes the triangular tip effectively coincide with the staff position `y` (within 0.1 SVG unit). For A4, `yFor(69)=90.5`, so the tip now appears around Y=90.4 instead of Y≈78.6. Its horizontal footprint becomes narrower and remains centered around the existing letter/pitch target.

**Scope protection:** Sori retains the original `{x:x-13,y:y-23,width:26,height:37}` and the shared paths in `web/src/persian-accidentals.js` are unchanged. Do not alter the symbols shown in the regular score, the control buttons, other pitches' data, `e.key/e.offset/e.marks`, note pitch or timings, audio, AI, transport, layouts, mobile sizing, or existing tuning controls. The actual seven-column key-signature view and hit targets are preserved.

**Files:** `web/src/key-signature.js` (one contained display-only conditional), `web/src/app.js` and `web/index.html` (module cache-version-only edits, to force the updated view to load without stale JS), and this `CODEX_AI_ETUDE_HANDOFF.md` section in the same commit.

**Test/verification expectations:** Assert the nested Koron SVG has `width=18,height=26`, `x=x-10,y=y-8` while Sori retains its original dimensions; inspect a test etude with `e.key[9]='کرن'` and verify the computed A4 triangle tip aligns to `yFor(69)`. Ensure blank pitches still have no placeholder, and selectable pitch hit targets remain. Compare the actual appearance at normal zoom and on desktop/mobile in a browser; no live browser visual verification or audio test is claimed.

---

## 2026-11-20 — Replace Persian Koron/Sori glyphs with in-repo vector artwork (UI only)

**User's requirement:** Existing staff/selection buttons already support b (flat), # (sharp), koron and sori. Do NOT implement new key signature functionality; instead replace ONLY the rendered **shape** of koron and sori with the two specific Persian visual references provided in this chat. The screenshots are visual references, not image assets; no screenshot pixels or fonts are embedded. Preserve flat, sharp, natural and all original musical meaning.

### What changed

1. **New `web/src/persian-accidentals.js`:** A single shared SVG factory, `appendPersianAccidental(parent, mark, options)`, draws the requested symbolic outlines as real `<svg>` / `<path>` DOM nodes, with a normalized `120×160` viewBox, `currentColor` strokes, and caller-controlled position and size. The Koron path is the slender vertical stem with outlined right-pointing triangular flag seen in reference #1. The Sori has two heavy upright stems, two diagonal arms and right-pointing angle as in reference #2. Uses no inline PNG/JPEG, emoji, Unicode microtonal glyph or external font. All artwork is defined exactly once and reused at every SVG display point. `aria-hidden` and `pointer-events:none` keep symbols decorative and allow the existing parent controls to own interaction and accessible names.
2. **`web/src/key-signature.js`:** Existing `SIGNATURE_MARKS` data still uses the EXACT strings `'کرن'` and `'سری'` as values, while their old font-dependent `𝇪` / `𝇫` glyph strings are no longer displayed. In `drawKeySignatureEditor()`, the SVG helper is called where a configured koron/sori is already rendered on the staff, at the selected note position. Empty positions remain blank and clickable; natural, flat and sharp still use their previous ordinary text rendering.
3. **`web/src/app.js`:** The two existing Koron/Sori selection buttons now append the same SVG shapes instead of displaying font characters. The same click handlers continue updating `e.key[pc]`, resetting corresponding fine-tuning offsets, saving and redrawing. All labels, `aria-label`, hover tooltips, button selection state, slider and the original/tuned preview controls stay unchanged. The app refreshes imports of the modified score/signature modules.
4. **`web/src/score.js`:** The normal etude score calls the same SVG factory for BOTH (a) configured `e.key` key-signature accidentals and (b) per-note explicit accidentals such as the AI E-koron `staffAccidental:'کرن'`. This prevents the key-signature editor from showing the new shape while the normal score still shows the old Unicode font glyph. The two SVGs are positioned near the same note/staff targets where the old characters appeared. Existing flat/sharp, note duration, note stems/flags, playback arrow, pen/eraser and musical timing are unchanged.
5. **`web/style.css`:** Minimal selector scoped to Studio Koron/Sori mark buttons to keep the inline symbols centered, sized and inheriting the theme text color; existing dark/light design tokens are reused. **`web/index.html`** changes only the app/CSS version strings to avoid stale cached JS/CSS.
6. **Files explicitly not modified:** `web/src/model.js`, `web/src/audio.js`, `web/src/ai-etude.js`, the Python AI converter, persistent note data and etude schema, piano keyboard, note playback frequency, cent adjustment math, transport logic, and unrelated pages. A Koron still carries its user-defined cent value (e.g. -50 cents), and a Sori still carries its user-defined value (e.g. +50 cents); only displayed paths change.

### Why this implementation and whether there is a more principled approach

- **Best fit for Goosh's current architecture:** Goosh already draws the musical staff using direct SVG DOM operations in `web/src/score.js` and `web/src/key-signature.js`. A small *shared* vector primitive is the most reliable, narrowly scoped solution now: it is scalable, consistent across browsers and devices, works in dark mode and staff SVG as well as HTML buttons, and does not depend on `Noto Music` / fallback music glyph support. Centralization prevents Koron in the signature editor from drifting visually away from Koron next to a note.
- **Alternative: SMuFL-compliant music font and actual music engraver** (e.g. a font such as Bravura, an engraver such as VexFlow). For a future full standard-notation product, using a consistent licensed SMuFL music font plus a dedicated engraving engine is ultimately more systematic for accidentals, staff positioning, collision avoidance, scaling, beams, slurs, ligatures and multi-staff layout. However that would be a much broader rendering/data integration change, require correct glyph mapping, asset-license verification, layout migration and browser/mobile QA. It is **not warranted for merely replacing these two symbols**, especially with the user's strict no-unrelated-changes rule.
- **Alternative: simply use Unicode code points `𝇪` / `𝇫`**. This is concise but renders wrong or missing symbols when the expected music font is unavailable, which caused this problem; not robust or visually controlled.
- **Alternative: PNG screenshots or separate CSS background icons**. Raster screenshots are not resolution-independent and can contain baked-in background or color. CSS-only icons also complicate use inside the SVG staff and PDF/print path. A shared inline SVG factory is a more coherent fit for this codebase.
- **Limitations of this trial:** The shapes are vector approximations of the two user-supplied images and should be visually compared at actual staff size before claiming glyph-perfect engraving. The legacy native HTML `<select>` in the separate `Tuning & key signature` details panel continues to use text option labels; embedding SVG children into native option rows is not portable and changing that control into a custom dropdown would violate this task's scope. No audio or tuning semantics changed.

### Validation to perform

- Confirm the SVG factory produces a Koron with the right-pointing triangular flag and a Sori with two stems and diagonal arms, both using `currentColor`.
- Confirm both new paths are used in the **existing** signature-mark buttons, selected positions on the key-signature staff, configured key-signature entries on the normal score, and explicit AI E-koron per-note glyphs.
- Confirm flat, sharp and natural still render as before, and no unsupported SVG icon accidentally captures clicks on staff hits, buttons or editor tools.
- Compare rendering in dark/light modes, small staff sizes, mobile browsers and print/PDF output; the current test does not certify pixel-perfect matching or cross-device visuals.
- No functional audio/pitch/tuning tests should be needed beyond verifying the unchanged source paths; tests must not be described as live sound verification if not performed.

---

## 2026-11-20 — Focused key-signature UI improvements (requested revision)

**User changed their mind about redesigning the key-signature staff:** The existing horizontal key-signature staff and seven C–B pitch positions must stay visually the same size and placement. Do not replace the staff with a centered/shortened version or add any unrequested features. The changes below apply **only while key-signature mode is active**.

### Exact changes

1. **Explicit mode heading:** Existing Studio score heading reads `Key Signature Editor / تنظیم سرکلید` while the key-signature toggle is active, and reverts to the original `Score / خط حامل` in ordinary note view. No extra/duplicate heading.
2. **No phantom accidentals:** `web/src/key-signature.js` removes the faint plus placeholder from every unmarked natural pitch. Empty positions have no symbol at all; existing pitch-letter labels, staff, treble clef, selection highlight and transparent mouse/keyboard hit targets are unchanged. A custom-tuned natural continues to show a natural sign (♮) so its alteration is not silently hidden.
3. **Real draggable tuning:** `web/src/app.js` adds a horizontal range slider beside the existing numeric cents field. The range focuses on fine adjustments around the currently selected sign (normally ±200 cents relative to that sign's default), and expands if a stored adjustment lies outside that span. The precise number field still supports the existing valid range. Sliding updates `e.offset[selectedPc]` **immediately**, keeping the same single source of truth for piano, score playback and all octaves. The numeric field stays synchronized; the final value saves to the same etude with `save()`. The selected sign's `e.marks` value is never globally modified.
4. **Audible slider preview:** During slider movement, the app auditions the newly calculated `freq(e,selected.midi)` through the EXISTING piano `voice()`. Preview triggering is bounded to one retrigger about every 140ms; an older preview is released before the next to limit overlap/noise. A final preview plays on release. This is a series of short natural piano samples, NOT a synthesized continuous oscillator, altered sample envelope or sustain-pedal simulation. On pitch change, toggle exit and route cancellation the preview is released. Existing score playback is stopped on tuning changes to prevent stale scheduled notes.
5. **Two comparison buttons:** The existing tuned-note preview remains but is visually labeled `Tuned / صدای تنظیم‌شده`. An adjacent `Original / صدای اصلی` button plays the same selected NATURAL note in 12-tone equal temperament, unaltered by e.key/e.offset, using `440 * 2 ** ((midi - 69) / 12)`. Thus A versus A-koron can be compared immediately. Both use the pre-existing piano engine and do not write data.
6. **Contextual toolbar:** While in key-signature mode, hide Mouse/Select, Pen, Eraser, Wrap/multiline, Zoom +/− and the lower numeric Tempo container. Leave the key-signature toggle itself visible so the user can return to normal view. The other transport controls remain as they were because the user did not request changing them. When leaving the mode, the original toolbar and Tempo return with their existing values and behaviors. The UI uses `hidden` on those controls plus narrowly scoped CSS to override their pre-existing flex display.
7. **Tidier panel:** CSS reorganizes just `.signature-editor-controls` into a compact bordered thematic panel using existing `--soft`, `--line`, `--accent` and existing light/dark colors. Mark buttons, slider, numeric cents and two preview buttons are arranged for desktop and wrap on mobile. The SVG staff layout is not resized or redesigned.

### Files and non-goals

- `web/src/app.js`: mode heading, visibility flags, slider and audition controls; changes limited to key-signature functionality.
- `web/src/key-signature.js`: removes empty-position plus glyphs only.
- `web/style.css`: narrowly scoped signature-only styles and hidden-control rules.
- `web/index.html`: refreshes app and CSS cache query versions, as well as the signature module import in `web/src/app.js`.
- `CODEX_AI_ETUDE_HANDOFF.md`: this required same-commit handoff. No edits to `audio.js`, `model.js`, `score.js`, AI generation, note timing, note glyphs, pencil/eraser logic, or other pages.

### Test scope and cautions

- Verify empty pitch has no + sign yet remains selectable; existing accidentals and glyph labels stay visible.
- Verify dragging from A-koron -50¢ to -70¢ updates only `e.offset[9]`, updates the numeric display, and yields audible pitched previews; compare the unmodified A button and tuned A button at multiple slider settings.
- Verify returning to normal mode restores every hidden tool and Tempo, without changing BPM.
- Preview events are bounded to reduce overlapping piano attacks. It does not continuously pitch-bend a held sampled piano note; it replays updated short piano voices as the slider moves.
- Source-level and mocked event tests, not actual on-device listening or visual QA, must be reported accurately.

---

## 2026-11-20 — Key signature view and global per-pitch tuning

**User request:** Add one toggle button immediately after the Mouse/Select score tool. In that view, replace the normal note-staff surface with an editable key signature staff where the user can place accidentals and tune each pitch. The effect must be global to the etude and piano.

### Implementation detail (commit 898aa050)

1. **Toolbar button:** `web/src/app.js` adds the new key-signature icon immediately after the Mouse/Select tool. The toggle switches between the existing notes display and a key-signature editor. When active, Select/Pen/Eraser are not visually active; clicking another drawing tool returns to normal note view. Transport, tempo, zoom, pen, eraser, record and the user's later toolbar arrangements are intentionally preserved.
2. **View lifecycle:** `signatureMode` and `signaturePitch` exist only as temporary Studio UI state, resetting on etude navigation. `sheet()` replaces the contents of the SAME `.score` element with the signature staff or the original `score()` view; no parallel instrument, second model or permanent data duplication. Toggling into signature mode stops current score playback so already-scheduled audio cannot be mistaken for the newly tuned sound.
3. **Staff renderer:** New file `web/src/key-signature.js` draws a five-line treble staff with clickable, keyboard-accessible positions C, D, E, F, G, A and B. Each column has a musical position, small identifying note letter, existing accidental glyph if selected, and a faint plus marker when empty. The staff uses the existing horizontal scroll on narrower screens.
4. **Available accidentals:** The editor buttons support natural (♮), flat (♭), sharp (♯), koron (𝇪) and sori (𝇫). They write to the existing `e.key[pc]`, not a visual-only flag. Changing the sign resets that pitch class's prior fine-tuning offset so it starts at the selected symbol's current default in `e.marks`. Removing a sign clears that same pitch class's key and offset, leaving other pitches untouched.
5. **Fine tuning in cents:** The numeric input displays the EFFECTIVE signed cent alteration of the selected pitch: `(e.marks[e.key[pc]] || 0) + (e.offset[pc] || 0)`. Saving an input target computes `delta = targetCents - e.marks[e.key[pc]]` and stores only that delta in `e.offset[pc]` (or removes a zero delta). Input validation respects the existing valid range. Example: A koron at -50¢ adjusted to -70¢ stores `e.key[9] = 'کرن'`, `e.offset[9] = -20`. The existing E-flat `e.key[4]` remains unchanged.
6. **Global playback behavior:** Goosh's existing `freq(e,m)` uses `e.key`, `e.marks` and `e.offset` by MIDI pitch class; the change therefore applies to all octaves of that pitch in the piano, Studio playback and future played notes. The existing preview button uses this same frequency and the unchanged piano voice. Already-scheduled score playback is stopped before changing a sign or cents to prevent stale frequencies.
7. **Normal score display:** `web/src/score.js` renders the same `e.key` values as conventional Unicode accidental glyphs at their respective treble staff positions rather than writing the Persian accidental name as a word. Original note shapes, timing, selection and playback arrow remain intact.
8. **Files and styling:** `web/style.css` only adds scoped classes for the key editor within Studio using the existing color tokens. `web/index.html` only refreshes the module-import version. No edits to `audio.js`, `model.js`, AI prompts, ABC parsing, practice activities, or persisted etude schema.

### Tested behavior

- The signature SVG module and the app/score JavaScript all passed syntax checks; a mock SVG test verified seven clickable pitch-class targets, the selected-state attribute, E-flat and A-koron glyphs, and both click and keyboard selection.
- A direct UI/controller test started with A koron -60¢, changed it to -70¢, verified the stored A offset became -20¢, and confirmed E-flat pitch frequency did not change. Switching the selected A marking to sharp reset the offset and left E-flat unchanged. Saves and transport stops were called for both changes.
- Changes were committed with an update to this Codex handoff. This paragraph expands the original concise summary in a docs-only follow-up, without changing the executable feature.

### Boundaries and known limitations

- Goosh represents the key signature and cent offset by 12 MIDI pitch classes; this view exposes the seven natural note-letter positions relevant to conventional key signatures. It is not an enharmonic or independently octave-specific key signature notation engine.
- Existing AI-specific note metadata such as explicit E-koron spelling on an enharmonic D# note is not rewritten when the E key signature changes; intentionally preserve explicit single-note accidentals.
- The legacy Tuning & Key Signature detail panel remains for compatibility, accessing the same stored data rather than creating two tuning systems. No live browser, Android, or paid OpenRouter end-to-end test has been performed for this editor.

---

### 2026-11-20 — Studio tempo control and note-duration propagation

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

## Studio: remove Edit notes & timing section (2026-11-20)

**Requested change:** Remove the entire **Edit notes & timing** expandable section from the Studio interface; do not replace it with another panel or relocate its controls.

**Branch:** `redesign` only.

**Changes made:**
- In `web/src/app.js` inside `studio()`, removed the `details.controls` element with the localized `Edit notes & timing` summary and all of its associated controls/handlers: `Select all`, the section's `Delete` button, `Duration (s)`, `Rest (s)`, and `Apply timing`.
- Removed the `document.onkeydown` branch that clicked `[data-del]` on the Delete key because it targeted the now-removed section button. Other keyboard handling, including Ctrl/Cmd+Z for Pen/Eraser and `R` for recording, was not touched.
- Did **not** remove or modify `noteSettings()`, the existing per-note editor, the Score selection/pen/eraser interactions, Undo, the Tempo numeric input, zoom buttons below the staff, playback controls, or any other unrelated functions.
- Updated the app.js query-string cache version in `web/index.html` to `remove-edit-notes-timing-1` to prevent an old cached UI from reappearing.
- No CSS changes were required.

**Post-change layout:** Score title → editing/playback toolbar → staff → numeric Tempo and zoom controls → the remaining Studio content; there is no `Edit notes & timing` accordion between them.

**Manual verification still needed:** Open Studio in desktop and mobile layouts and both languages; confirm the accordion and its controls are gone while Note settings opened by clicking a note, Pen/Eraser, Undo, Tempo, Zoom, Record, Play/Pause/Stop and remaining Studio sections continue to work. Only static syntax and source checks were performed; no browser/device verification is claimed.

## Studio editor width aligned with desktop navbar (2026-11-20)

**Branch:** `redesign`. **User request:** The open Etude Studio editor appeared much narrower than the shared desktop header/navigation content width. Match the editor's outer content edges to the established desktop header gutters, rather than the small centered navigation pill.

### Exact changes
- `web/style.css`: Added one scoped `@media (min-width: 1100px)` rule targeting `#app[data-page="studio"]:not(:has(> .shelves))`. The `:not(:has(> .shelves))` clause distinguishes the **opened editor** from the separately designed Etudes library; only the opened Studio editor receives this width change.
- Used the identical shared-header gutter calculation from `web/home.css`: `max(clamp(20px, 4vw, 64px), calc((100vw - 1360px) / 2 + 64px))`. Set the editor to `width: calc(100% - 2 * var(--studio-desktop-gutter))`, `max-width: 1232px`, `margin-inline: auto` and `padding-inline: 0`. This removes the old 1050px content-width bottleneck and aligns Studio's headline, title/actions row, piano, score and remaining editor sections to the same horizontal edges as the desktop header content.
- Below 1100px, existing mobile/tablet width, padding, piano scrolling and bottom navigation styles remain unchanged.
- `web/index.html`: Bumped only the `web/style.css` query-string version to `studio-header-width-1` to avoid browsers retaining the old narrow stylesheet.

### Non-goals / preserved behavior
No `app.js`, rendering, musical/recording logic, keyboard handling, playback transport, export, modal, or other routes were changed. The shared navbar appearance and the existing Etudes gallery/Practice widths remain unchanged.

### Manual checks still required
Compare Studio left/right outer edges to the desktop header's wordmark/controls at common viewports (1100, 1280, 1360, 1600px). Confirm the Studio body and piano/staff expand without horizontal page overflow, the separate Etudes list does not change width, and mobile/tablet layouts stay as before. Only CSS/source checks were performed, no actual browser/device visual validation.

## Studio Score toolbar regrouping — playback at Record and zoom beside Wrap (2026-11-20)

**Branch:** `redesign` only. **User request:** Relocate Play/Stop and Pause/Resume beside the right-aligned Record control, replace the text of Wrap staff with an icon, and move Zoom −/+ from the bottom Tempo row to immediately beside Wrap staff.

### Exact changes
1. **`web/src/app.js` — `studio()`:** Preserved the three existing Select/Pen/Eraser SVG tool buttons at the beginning of `scoreActions`. Immediately after them, replaced the old `Wrap staff` text button with a compact icon-only `wrapButton` using `scoreToolIcon('wrap')`; the existing click handler still toggles `wrap` and calls `render()`. Preserved its active state via `.active`; added a localized `title`/`aria-label` and `aria-pressed` reflecting the current wrap state.
2. **`web/src/app.js` — `scoreToolIcon(mode)`:** Added the `wrap` path, drawn as multiple staff lines with a line-wrap arrow. It reuses the existing inline 24×24 SVG helper and `currentColor`, with no new icon packages or external assets.
3. **`web/src/app.js` — Zoom placement:** Moved the **unchanged** Zoom out (`−`) and Zoom in (`+`) controls from `scoreBelowActions` (below the staff, next to Tempo) to `scoreActions`, directly following the Wrap icon. Only the parent element moved; the existing `zoom = Math.max(.4,zoom-.2)` / `Math.min(3,zoom+.2)` and `sheet()` handlers remain unchanged. The zoom buttons receive a `score-zoom-button` class for sizing.
4. **`web/src/app.js` — Transport grouping:** Added one `div.score-transport-actions` as the last group inside the top Score toolbar. Moved the existing **Play/Stop**, **Pause/Resume**, and **Record** buttons (in that exact order) into this group without modifying their event handlers, `data-score-transport`, `data-score-pause`, `data-record`, visual update function, or keyboard shortcut. `updateScoreTransportButtons()` still resolves the buttons by their original data attributes and preserves the single-instance playback rules.
5. **`web/src/app.js` — Tempo:** Left the single numeric `score-tempo` input in `scoreBelowActions`, directly beneath the staff. It retains its existing global BPM timing logic, validation and persistence. No slider or additional zoom controls are displayed there.
6. **`web/style.css`:** Expanded shared score-button alignment rules to `.score-transport-actions > button`. The transport group uses `display:flex`, `gap:9px`, `flex:0 0 auto`, `margin-left:auto` and `direction:ltr`, keeping Play/Stop and Pause/Resume immediately adjacent to the right-aligned Record button in both languages. The Record control no longer individually carries `margin-left:auto`; its parent group handles right alignment. Added 44px minimum hit targets for Wrap and Zoom plus `fill:none`/`stroke:currentColor` on the Wrap icon. Removed the now-unused bottom-row zoom-button sizing rule, leaving the compact Tempo row styling intact.
7. **`web/index.html`:** Changed only the CSS/JS cache-busting query versions to `score-toolbar-rearrange-1` so clients receive the revised button layout.
8. **`CODEX_AI_ETUDE_HANDOFF.md`:** Recorded this complete handoff.

### Final order / preservation
**Below Score title, above staff:** Select · Pen · Eraser · icon-only Wrap staff · Zoom out (−) · Zoom in (+) **[flex spacer]** Play/Stop · Pause/Resume · Record (far right).

**Below staff:** Tempo numeric BPM field only, followed by the existing Studio sections.

No modifications were requested or made to the audio engine, transport scheduling, notes, notation, live piano, recording, AI, Practice page, or etude gallery.

### Manual verification (not yet executed)
- Check the order and edge alignment at desktop sizes; Play/Stop and Pause/Resume must be beside Record on the physical right, and the three editing tools with Wrap and Zoom on the left.
- Check that the Wrap icon is recognizable and accurately reflects its active state, including RTL and light/dark.
- Confirm Zoom still changes score scaling; Tempo remains numeric-only below the staff and changes actual playback timing.
- At narrow widths, ensure groups wrap without clipping, Record remains grouped with Play/Pause, and controls remain operable.
- Check rapid Play/Stop clicks, Pause/Resume and Record shortcut remain unchanged. This change was source-inspected; browser/device visual and audio tests are not claimed as passed.

## Studio Generate AI / Record icon toolbar update (2026-11-20)

**Branch:** `redesign` only. **Scope:** User requested moving the existing Generate button next to Record on the Studio Score toolbar, using iconography for both actions. This is a visual/DOM placement change only, not a feature rewrite.

### Exact changes
1. **`web/src/app.js`, `studio()`:** Removed the old text-only `Generate` button from the Studio project title / `.project-actions` row. The project actions still contain the title input, Share file, and PDF actions.
2. **`web/src/app.js`, Score toolbar:** Created the identical Generate handler as `generateButton = btn(transportActions, '', ...)` after the existing Record control in the right-aligned `.score-transport-actions` group. The order is now **Play/Stop, Pause/Resume, Record, Generate AI**, with Generate directly adjacent to Record.
3. **Preserved the previous desktop feature gate:** Generate still renders only when `window.matchMedia('(min-width: 768px)').matches`. Do not make Generate available on mobile as an unintended side effect of this change.
4. **Preserved Generate functionality:** The click callback, modal `<dialog>`, Dastgah picker, status text, AI request through `generateStudioEtude()`, abort-on-close/route-change behavior, busy state, replacement confirmation, error handling, save and render behavior all remain exactly as before. The only intentional change to this block is its parent button and its visual presentation.
5. **Record visual change:** The existing Record control is now icon-only: a filled circle for idle Record and a square for active Stop. Its existing toggle handler, `data-record` identifier, `primary`/`recording` state classes and `R` keyboard shortcut remain unchanged. Added a localized `aria-label` distinguishing Start recording / Stop recording; the localized `title` includes the `R` shortcut.
6. **AI Generate icon:** Extended the existing `scoreTransportIcon(type)` inline SVG factory with a `generate` branch using a sparkles/star icon. The new button uses `score-generate`, appends `scoreTransportIcon('generate')`, and has localized `title` and `aria-label`. No image files, dependencies, or icon libraries were added.
7. **`web/style.css`:** Gave `.score-record` and `.score-generate` identical 44×44 minimum hit areas and centered icon alignment. Added a narrow scoped `.score-generate svg` rule for outlined sparkles (`fill:none`, `stroke:currentColor`). Kept the rest of the shared Score toolbar / group layout unchanged, including the left editing/Wrap/Zoom tools, the right-edge transport group and the numeric-only Tempo row below the staff.
8. **`web/index.html`:** Updated the cached CSS and app.js import query versions to `score-generate-record-icons-1` so the relocated button and styles load without stale assets.
9. **`CODEX_AI_ETUDE_HANDOFF.md`:** Added this complete technical handoff.

### Verification checklist for Codex (not automatically completed)
- Open an etude on desktop (at least 768px wide). Confirm Generate no longer appears by Share/PDF at the top, and appears immediately **after Record** in the right-hand Score toolbar group.
- Confirm both buttons display clear SVG icons at matching sizes, with mouse-hover localized tooltips and screen-reader labels. Record switches visually from a recording circle to a square while recording.
- Generate still opens exactly the same modal and retains the existing workflow and cancel/abort behavior; no behavioral changes were intended.
- Check Play/Stop, Pause/Resume, Record/Stop, the Record `R` shortcut, Pen/Eraser, Wrap and Zoom still work normally.
- Confirm the existing Generate desktop-only breakpoint remains enforced below 768px; this change does not alter mobile availability.
- Verify narrow desktop widths, light/dark and both language directions, especially that the group stays aligned and icon controls do not overlap.
- Browser and device interaction tests are **not** claimed as passed based on source checks alone.

## Studio header simplification — remove Back, iconize Share/PDF, unbox title (2026-11-20)

**Branch:** `redesign`. **Scope:** Only the *opened* Etude Studio page, not the etude list or Practice.

### Requirements and implementation details

1. **Remove "Back to list" on open Studio only:** In `web/src/app.js`, `render()` now calls `studio()` directly for `page === 'studio'` when an etude is active. The old leading `btn(row(app), 'Back to list', ...)` is retained in the **Practice** branch only; no global navigation links, routing, list handling, or keyboard shortcuts were changed. The shared navbar remains available for navigation.

2. **Simplify editable etude title:** In `web/src/app.js`, `studio()`, replaced `field(top, t('Etude','اتود'), ...)` with a single `<input type="text" class="etude-title-input">`. This removes the visible "Etude" label entirely. The input displays the existing `e.title` (for example, "Etude in Dastgah-e Shur") without decorative form framing. It has a localized `aria-label="Etude title"` and a localized placeholder for untitled etudes. The original title edit behavior remains: on `change`, update `e.title`, update the existing `h2.print-title` used for print/PDF, and persist using the existing `save()` helper. Do not replace the title with a hard-coded value or remove editability.

3. **Share file icon-only button:** Reused the original Share handler (Android Capacitor file share, native Web Share, fallback `.goosh` download) in `shareButton`. Removed the visible "Share file" text and appended an inline SVG *share/upload* icon from `studioFileIcon('share')`. Kept a localized tooltip (`title`) and added a localized `aria-label`. The click behavior, file format, permissions, and fallback handling are unchanged.

4. **PDF icon-only button:** Reused the original PDF/print handler in `pdfButton`. Removed the visible text and appended an inline SVG *document with folded corner and PDF lettering* from `studioFileIcon('pdf')`. Kept a localized tooltip ("Export PDF" / "خروجی PDF") and added a localized `aria-label`. The existing `wrap` adjustments, Android Capacitor printing and browser `print()` are unchanged.

5. **Icon implementation:** Added `studioFileIcon(type)` in `web/src/app.js`, which constructs a 24×24 SVG using `document.createElementNS`. It uses theme-inheriting `currentColor`, with no new assets or dependencies. Both new file buttons share the CSS class `studio-file-action`.

6. **CSS:** In `web/style.css`, scoped to `#app[data-page="studio"]:not(:has(> .shelves))`: `.project-actions .etude-title-input` has transparent background, **no box/border**, no rounded field edge, no box shadow, and typographic weight; only a subtle underline when keyboard-focused, so it remains accessible. It flexes to occupy remaining toolbar space. `.studio-file-action` buttons have consistent 44×44 touch targets, centered 22×22 SVG icons and preserve theme tokens. Nothing in the global input controls, Etudes list or Practice is modified.

7. **Cache busting:** In `web/index.html`, changed the CSS and app.js versions to `studio-title-file-icons-1` to load the new layout rather than stale cached assets.

8. **Codex documentation:** This section records exactly what was changed and what was intentionally preserved.

### Manual verification (not executed here)

- Open Studio: there is **no Back to list button**; Studio's navbar still works. Open Practice separately and confirm its Back to list remains.
- The top project-action row shows just the actual etude title (without "Etude" prefix or enclosing input box) and two icon buttons for Share and PDF. The title remains editable on click/focus and the rename persists.
- Share exports a `.goosh` file exactly as previously; PDF still prints/exports the active etude. Both buttons have appropriate localized accessible names and visible icons in light/dark themes.
- Verify keyboard focus is clearly visible on the borderless title and file icons; check desktop and narrow/mobile layouts and RTL/LTR.
- Confirm AI Generate remains beside Record in the Score toolbar and the score tools, Tempo, piano and audio behavior are unchanged.
- Only source-level checks were run. Browser/device visual and functional testing is **not** claimed complete.

## Studio key-signature toggle: context-sensitive staff icons (2026-11-20)

**Branch:** `redesign`. **Requested change:** On the Etude Studio Score toolbar, use a visual **key-signature pictogram** for the button that opens the key-signature editor. While the user is already editing the key signature, the same button must display a **musical-staff pictogram** indicating return to the normal score/notes view. This is a two-state icon and tooltip change only, not a new editor or route.

### Exact changes

1. **`web/src/app.js` — `scoreSignatureIcon(view = 'signature')`:**
   - Replaced the old generic single-path symbol with a clear 32×24 inline SVG illustration, built from native SVG DOM elements through `document.createElementNS` and theme-aware `currentColor`.
   - **Normal Score view (`view='signature'`):** Draw five horizontal staff lines plus two conventional **sharp accidentals (♯ shapes)** at different vertical positions, making the icon depict an actual **key signature** rather than an abstract lines/crosses symbol.
   - **Key-signature editing view (`view='staff'`):** Draw the same five-line staff with **two noteheads and stems**, and **no key-signature accidentals**. This visually communicates returning to the regular note/staff editing view.
   - SVG retains `aria-hidden="true"` and `focusable="false"` because the button, not the graphic, owns its accessible name. No raster assets, image queries, external fonts, or icon dependencies were introduced.

2. **`web/src/app.js` — `studio()` Score toolbar signature toggle:**
   - The existing single toggle button still uses `.score-tool-button.signature-toggle`, `data-signature-toggle`, and the current `signatureMode` state and toggle callback **unchanged**.
   - The icon now follows the current view: `scoreSignatureIcon(signatureMode ? 'staff' : 'signature')`.
   - Button `title` and `aria-label` are localized and action-specific:
     - Normal Score view: **Edit key signature** / **ویرایش سرکلید**
     - In key-signature editor: **Return to score** / **بازگشت به خط حامل**
   - Preserved `aria-pressed` and the `.active` class when `signatureMode` is true. Each existing `render()` automatically rebuilds the button with the correct icon and accessible label.

3. **`web/style.css`:** Added a narrowly scoped `#app[data-page="studio"] .score-actions .signature-toggle svg` rule to render the pictogram at **30×23 CSS pixels**, giving the small staff and accidentals enough visual clarity inside the existing button. The rest of the toolbar's icons, alignment, colors, and behavior remain unchanged.

4. **`web/index.html`:** Updated the CSS and JavaScript cache query strings to `signature-toggle-icons-1` so existing clients load the new visuals.

5. **`CODEX_AI_ETUDE_HANDOFF.md`:** Documented this change in detail for subsequent Codex work.

### Explicitly preserved

The `signatureMode` toggle flow, selected key pitch, signature editing SVG, accidental selection, tuning and listening controls, Score notes renderer, playback transport, Pen/Eraser, Wrap staff, Zoom, Tempo, AI generation, Record, and all unrelated routes/features remain unchanged.

### Manual checks for Codex (not yet run)

- Open an etude in the Studio Score view: key-signature button should show a tiny five-line staff with sharp accidentals and have the "Edit key signature" tooltip/accessible label.
- Click it: the key-signature editor should open in place, while the same button becomes a **plain notation staff with noteheads** and exposes the "Return to score" tooltip/accessible label. The active state remains visually clear.
- Click the button again: normal score must return with its original key-signature icon; no note/tuning data should change simply by switching views.
- Confirm visibility and alignment in light/dark themes and English/Persian, and at narrow/mobile widths; inspect browser rendering of the small SVG shapes.
- Source-level code validation was performed; no live browser/device visual test was run.

## Studio Key Signature Tuning — tuner-style UI redesign (2026-11-20)

**Branch:** `redesign` only. **Reference:** User-provided dark tuner screenshot depicting a prominent cents measurement and frequency, a graduated horizontal slider, decrement/increment controls, Reset, and a Play note action. The task is a scoped visual/UX redesign of the **existing inline Tuning section inside the Key Signature Editor**. It does **not** create a new route or modal or change the tuning model.

### Resulting layout

- Retain the existing selected-pitch heading and separate key-signature accidental selection controls. Only the tuning/previews area underneath them is replaced.
- Render one centered, softly elevated `div.signature-tuner-card` (up to 550px wide) matching the Goosh light/dark design tokens, with a subtle accent-tinted gradient, generous spacing and rounded edges.
- **Header:** small localized `KEY SIGNATURE TUNING` label and `Tune <actual selected MIDI note>` heading. Unlike the screenshot, do not label this a *recorded* note: these pitches come from the selected key-signature staff position, not a microphone recording.
- **Primary feedback:** large signed total tuning value in cents (e.g., `+0 ¢`, `-50 ¢`) using the existing accent color; live calculated frequency beneath it in `Hz` with two decimals. The frequency comes from the existing `freq(e,selected.midi)` function, ensuring that the readout and playback agree with the actual current accidental and offset.
- **Slider:** horizontal, 1-cent step, with a clearly visible drag thumb and five graduated tick labels. The default fine-adjust range is **base accidental cents ±100** (clipped to -1200..1200); it automatically extends to include an existing manually entered value outside the fine-tune region. Tick labels represent **absolute cents relative to the natural note**, so they are accurate even when an accidental's nominal offset is not zero. The current value also drives an accent-colored progress line.
- **Direct adjustments:** a centered numeric input accepting whole cents in the existing `-1200..1200` range, flanked by `−` and `+` buttons moving the value by **exactly one cent**. Browser-native spin arrows are visually suppressed; keyboard entry remains available and labelled for accessibility.
- **Bottom actions:** Reset (returns to the **selected accidental's default value**, not always natural zero), Play original (unaltered equal-tempered natural selected pitch), and Play tuned (current audible tuning). Both listening actions use the existing, bounded short-note audition helper rather than introducing any new audio engine.
- Responsive layout: three bottom actions across on larger widths; at very narrow widths Reset spans the row and the two Play buttons remain side-by-side. Sliders, cent ticks and numeric controls remain readable, without replacing the site's theme colors with screenshot-specific colors.

### Precise source changes

1. **`web/src/app.js` → `renderSignatureControls()`:**
   - Replaced the old inline `div.signature-editor-tuning` and separate `div.signature-editor-previews` with a self-contained `div.signature-tuner-card` and its sub-elements: `signature-tuner-heading`, `signature-tuner-readout`, `signature-tuner-scale`, `signature-tuner-ticks`, `signature-tuner-adjust` and `signature-tuner-actions`.
   - The selected `SIGNATURE_PITCHES` entry, `base=e.marks[mark]||0`, `effective=base+(e.offset[pc]||0)`, accidental buttons and their selection/save behavior remain unchanged.
   - `updateReadout(value)` synchronizes displayed signed cents, actual `freq(e,selected.midi)`, and the CSS custom property `--tuning-progress`.
   - `updateSliderRange(value)` creates fine-grained bounds around `base` and reprints the five tick values; numeric entry or step buttons can extend the slider range if needed.
   - `applyCents(value)` retains the original validation and sound-model persistence semantics: it computes `delta = value - (e.marks[e.key[pc]]||0)`, validates values and delta within -1200..1200, stops any running Score playback, and changes **only `e.offset[pc]`** (or deletes the zero offset). No alternate pitch formula or backing data field was added.
   - `setAndSave(value)` handles the ±1 buttons, Reset and committed numeric edits: applies cents, updates slider/readout/input, invokes the existing `save()`, then immediately auditions the tuned note.
   - Slider `oninput` keeps the previous instantaneous pitch adjustment and throttled audible audition while dragging; `onchange` persists the final value and auditions it again. Direct numeric entry validates and reverts visibly on rejection.
   - Reset is explicitly relative to the selected accidental's baseline: for an accidental like Koron, Reset does **not** silently change/remove the accidental or force it to natural pitch.
   - The original/tuned preview buttons still use `auditionSignature()` with `force=true` for deliberate clicks. Their current labeling is localized and they show compact existing Play SVGs.
   - The card is rendered only while `signatureMode` is active because the parent signature-controls section remains hidden on the normal Score view.

2. **`web/style.css`:** Removed obsolete `.signature-editor-tuning` and `.signature-editor-previews` layouts. Added tightly scoped `#app[data-page="studio"]` rules for the card, hierarchy, theme-aware gradient, big cents display, frequency, range slider and thumbs (Chromium/WebKit and Firefox), graduated tick scale, 1-cent buttons, numeric field and three action buttons. Preserved existing mark-selection styling and key-signature grid. Added narrow-screen breakpoints for the card/actions; no global form colors, navigation styles or other pages were modified.

3. **`web/index.html`:** Bumped the `web/style.css` and `web/src/app.js` query versions to `signature-tuner-redesign-1` so browsers load the new tuner rather than cached old styles.

4. **`CODEX_AI_ETUDE_HANDOFF.md`:** Added this detailed implementation record for subsequent changes.

### Manual verification checklist (not executed automatically)

- Switch into the Key Signature Editor; select a pitch. Confirm the accidental controls remain intact and only the tuning area has the new centered tuner-card design. Confirm no extra modal appears.
- Observe the initial cents and Hz; change the accidental between natural, flat, sharp, Koron and Sori. Check that the readout reflects the actual total cents and tuned frequency, and that Reset returns to the selected accidental's **default** offset.
- Drag the slider through different values: the center readout, Hz and numeric field should update together; the audible previews should remain short and not accumulate; release and reload the etude to confirm persistence.
- Click −/+ to move by exactly 1 cent; type a valid signed cent value into the central field and commit it; validate both slider bounds and frequency updates. Invalid values and out-of-range deltas must not be saved.
- Compare Play original against Play tuned at an altered tuning; they should remain distinct actions. Confirm switching notes or leaving the editor does not corrupt the previously selected pitch.
- Check light/dark and English/Persian modes as well as desktop and narrow mobile widths, including labels and 44px+ touch targets. Ensure no accidental horizontal overflow or interference with Score/AI/recording tools.
- Only source-level checks were made; do **not** claim a browser/device or live audio QA pass without running it.

### Explicit non-goals

No changes to `web/src/key-signature.js`, `web/src/model.js`, `web/src/audio.js`, note data schemas, other tuning places, piano, Score playback sequencing, AI generation or Practice functions.

## Studio key-signature tuner compact visual revision (2026-11-20)

**Branch:** `redesign` only. This change is a refinement to the previously implemented tuner-inspired Tuning UI in the Studio Key Signature Editor, based on explicit user feedback that the new tuner was too large and unnecessarily boxed.

### Requested changes, exact scope
- Make the Tuning UI **significantly more compact**.
- Remove the tuner-specific rounded rectangular card, border, background gradient, and shadow. Tuning should feel like an inline part of the existing Key Signature Editor, not a second nested panel.
- Remove the duplicated **KEY SIGNATURE TUNING** eyebrow and **Tune C5**-style title entirely. The chosen pitch and key-signature context are already visible elsewhere in the editor; do not add replacement heading text.
- Keep useful controls and information: cents reading, Hz frequency, fine-tuning slider/ticks, signed numeric input, ±1-cent step buttons, Reset, Play original and Play tuned.
- Make no changes to the tuning formula, pitch data, note selection, audio previews, persistence, or unrelated layouts.

### Source changes
1. **`web/src/app.js` — `renderSignatureControls()`:** Removed the `div.signature-tuner-heading` DOM subtree including its `signature-tuner-eyebrow` (`KEY SIGNATURE TUNING`) and `signature-tuner-title` (`Tune <pitch>`) elements. Renamed the wrapper class from `signature-tuner-card` to `signature-tuner-inline` to reflect the new unboxed presentation; no separate dialog was introduced. All remaining readout, slider, numeric input, buttons and their handlers were retained verbatim.
2. **`web/style.css`:** Replaced the previous oversized card-oriented block with scoped `#app[data-page="studio"]` CSS for `.signature-tuner-inline`: an unboxed, borderless, transparent three-column grid with zero shadow and very small padding. On desktop the readout, ticked slider and numeric ± controls fit on one row; small Reset/Original/Tuned preview controls align at the end of the following short row.
   - Reduced the cents typography to **25–32px** (previously up to 54px), Hz to **12px**, slider tick spacing, slider thumb and numeric input heights to **38px**, and secondary action buttons to **38px**.
   - Kept the existing Goosh accent, text, background and line design tokens; there are no new palette colors.
   - Responsive rules at **920px**, **760px**, and **490px** stack/wrap only when necessary to prevent controls overlapping on smaller viewports.
   - Removed now-unused styles for `signature-tuner-card`, `signature-tuner-heading`, `signature-tuner-eyebrow`, and `signature-tuner-title`. The pre-existing outer Key Signature Editor container and accidental selection row are unchanged; the inner redundant Tuning card is removed.
   - The thumb, ticks, cents progress, numeric field accessibility, two audio preview buttons, and visual focus affordances are preserved.
3. **`web/index.html`:** Incremented the CSS and app module cache-busting versions to `signature-tuner-compact-1` so the revised layout and removed headings appear reliably.
4. **`CODEX_AI_ETUDE_HANDOFF.md`:** This implementation note records the exact work.

### Verification checklist (not yet executed)
- On `redesign`, open Studio → Key Signature Editor → Tuning and verify the duplicate eyebrow/title no longer appear anywhere in Tuning.
- There must be **no inner card**, border, gradient or shadow around the Tuning area. Existing accidental controls and their outer editor section remain in their prior design.
- At desktop widths, verify cents/Hz + slider + one-cent controls occupy a clean, compact row, with small Reset/Play-original/Play-tuned actions nearby; no overlap or unintentional overflow.
- On mobile/tablet, controls should wrap without clipping in English and Persian, light and dark themes.
- Move slider and confirm numeric value/Hz update, audio is auditioned, and final cents are saved. Check ± steps, Reset to accidental baseline, input validation and both original/tuned sounds.
- No manual browser/device/audio QA was performed in this change; static source checks alone must not be reported as an end-to-end test pass.


## Studio tuning layout — slider aligned with preview actions, centered frequency (2026-11-20)

**Branch:** `redesign`. **User request:** Keep the compact, borderless Key Signature Editor tuner. Move the pitch slider to the same lower horizontal row as Reset, Play original and Play tuned; place the live Hz frequency centered immediately above the slider.

**Changes:**
1. `web/src/app.js` → `renderSignatureControls()`: moved the existing `span.signature-tuner-frequency` from `.signature-tuner-readout` into the beginning of `.signature-tuner-scale` immediately before the range input. The numeric frequency still comes from `freq(e, selected.midi).toFixed(2)`; no sound-model changes.
2. `web/style.css`: reorganized `.signature-tuner-inline` as a two-row/two-column CSS grid with named areas `"readout adjust"` and `"scale actions"`. The signed cents readout and ±/number controls stay on the upper row; the Hz-over-slider block and Reset/Original/Tuned actions share the lower row. Frequency is centered with `text-align:center` and a small bottom margin. Under 700px and 490px, the existing controls stack responsively to avoid clipping.
3. `web/index.html`: updated JS/CSS cache query strings so the moved Hz element and grid layout load.
4. No changes to tuning values, actual frequencies, slider handling, persistence, original/tuned previews, pitch selection or unrelated Studio features.

**Manual checks still needed:** desktop alignment of slider and action row; Hz centered over the slider; responsive layouts (both RTL/LTR, light/dark); drag slider and verify Hz/readout/preview/save still work. No actual browser/device/audio test was run.


## Studio title edit affordance — pencil icon (2026-11-20)

**Branch:** `redesign`. **User request:** Make it visually obvious that the Etude Studio title is editable by placing a pencil icon immediately next to the name.

**Changes:**
1. `web/src/app.js` → `studio()`: wrapped the existing `input.etude-title-input` in a `div.etude-title-edit`, then appended a **small pencil icon button** (`button.etude-title-edit-button`) immediately after the input. The SVG reuses the already existing `scoreToolIcon('pen')` generator; no icon dependency or new asset was added.
2. The pencil is a functional accessibility-friendly button: its localized `title` and `aria-label` say Edit etude title / ویرایش عنوان اتود. Clicking it focuses the same existing title field and selects its text. The field is still a normal text input; changing its value still updates `e.title`, the printable `h2.print-title`, and saves using the original `save()` handler.
3. Added a bounded `input.size` calculation (12–48 characters) updated on input, so the icon stays beside a variable-length title rather than at the far end of a stretched input; this only affects visual input width, not validation or stored data.
4. `web/style.css`: styled `.etude-title-edit` as a responsive inline-flex area within `.project-actions`. The input remains **borderless** and transparent until keyboard focus, preserving the previously requested unboxed title presentation. The pencil button is subtle (34px square, transparent background, muted currentColor); hover uses existing theme variables, keyboard focus gets a clear accent outline. The SVG is 19px and inherits the current theme.
5. `web/index.html`: updated the app.js and stylesheet version query strings to `studio-title-pencil-1` for cache invalidation. Other Studio title/Share/PDF/Generate controls are unchanged.

**Manual checks still needed:** ensure the pencil is adjacent to short/long titles, clicking it focuses and selects title text, rename persists, the title remains unboxed, and icon alignment is correct across English/Persian and narrow/desktop layouts. Check keyboard navigation and focus ring. No live browser test was run.
