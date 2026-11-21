# Codex Handoff — OpenRouter Persian Etude Generator in Goosh v2

## 2026-11-20 — Soften only the tuned-preview button fill in Studio

**User scope override:** The previous instruction to redesign all buttons across the entire project (except Enter Workspace and New Etude) was explicitly withdrawn. The latest request applies **only to the bright filled Tuned-preview button** shown in the key-signature tuning panel screenshot. Do not modify other buttons, global styling, landing/home, New Etude or Enter Workspace.

**Before:** `web/style.css` scoped selector `#app[data-page="studio"] .signature-tuner-actions .signature-editor-tuned` used `background:var(--accent)`, `border-color:var(--accent)`, `color:var(--panel)`. This creates a fully saturated cyan/teal fill that the user dislikes in both light and dark themes.

**After (CSS only):** In that EXACT existing selector, replace the three declarations with a subdued tinted fill `background:color-mix(in srgb,var(--accent) 12%,var(--panel))`, a restrained visible outline `border-color:color-mix(in srgb,var(--accent) 42%,var(--line))`, and readable theme text `color:var(--ink)`. The preview keeps its existing icon, note/frequency label, spacing, dimensions, click action, hover/active semantics, and layout. These theme tokens automatically adapt to both light (`--accent:#006e7a`) and dark (`--accent:#40eded`) without inventing separate app themes or changing any other design tokens.

**Other changes:** `web/index.html` updates **only** the cache-busting `style.css?v=...` reference so the browser requests the revised CSS. This Codex note is included in the SAME commit. Do not change `web/src/app.js`, other styles/selectors, text, global button rules, component logic, tuning model, sample engine, or other pages.

**Verification:** Confirm the selector still targets only `.signature-editor-tuned` within Studio, original preview still uses the unchanged style, and Home buttons remain unchanged. Static source checks verify the exact selector and the two theme tokens; final light/dark browser visual confirmation remains unperformed.

---

## 2026-11-20 — Center the natural sign and try pitch-based preview-button labels

**User scope:** Two *visual/wording* changes in the existing Studio Key Signature Editor only. First, the natural (bekar, ♮) symbol is not optically centered in its square selection button. Second, trial replacement of "Play original" with the selected natural note name + existing Play icon, and "Play tuned" with the selected note name, its **current** frequency in Hz, and the existing Play icon. The user explicitly reserves the option to revert if the experiment looks worse. No note staff, key tuning, audio or actual preview behavior was requested to change.

**Exact changes in `web/src/app.js`:**
1. Preserve `SIGNATURE_MARKS` and all button handlers, values, accessible descriptions and selected styling. For `option === ''` (natural/bekar) only, render its existing Unicode ♮ inside a dedicated `span.signature-natural-symbol` and add `signature-natural-mark` to its existing button. This isolates glyph centering from the flat/sharp and SVG Koron/Sori buttons. Clicking the existing button still removes the accidental and clears that pitch's offset exactly as before.
2. On the original-sound preview, preserve the current Play SVG and `auditionSignature(440*2**((selected.midi-69)/12), true)` callback. Replace the text "Play original" with `selected.name` (e.g. A), and retain the full `Play original natural note` text as tooltip and accessible name so the semantic distinction isn't lost.
3. On the tuned-sound preview, keep the Play SVG and `auditionSignature(freq(e,selected.midi), true)` callback. Replace the old "Play tuned" button text with a dedicated span updated through the **existing** `updateReadout()`: `selected.name + ' · ' + freq(e,selected.midi).toFixed(2) + ' Hz'`, e.g. `A · 427.47 Hz`. `updateReadout()` already runs on initial editor rendering, slider input, slider change, and ±/Reset/numeric updates, so the button's displayed frequency stays in sync with the same `freq()` data used for playback. Its `aria-label` dynamically identifies it as the tuned preview.
4. No frequency calculations were invented: original still uses its existing 12-tone equal-tempered sample frequency; tuned still reads `freq(e,selected.midi)`. No alteration to `e.key`, `e.marks`, `e.offset`, engine, voice duration, preview throttling or transport.

**CSS:** `web/style.css` adds only three narrowly scoped rules: inline-flex centering for the natural-mark button, a consistently centered 24×28 inner natural-sign span with a 1px optical correction, and no-wrap/tabular digits for the tuned button text. Existing button borders, theme, active states and other mark sizes remain unchanged. The optical 1px tweak is explicitly a visual experiment and can be reverted independently.

**Cache and handoff:** `web/index.html` refreshes only the app and CSS import version tags. This section is added to `CODEX_AI_ETUDE_HANDOFF.md` **in the same commit**. No changes to `web/src/key-signature.js`, `web/src/persian-accidentals.js`, `web/src/score.js`, `web/src/model.js`, `web/src/audio.js`, Python, AI generation, saved etudes, other routes or functionality.

**Verification / remaining QA:** Check natural button visually against flat/sharp on desktop and mobile; check its click still removes a mark. For selected A, confirm original-button text `A` and tuned-button text `A · 427.47 Hz` when tuned to -50 cents (rounded), updating instantly as the slider changes. Check both preview buttons still play the same original/tuned frequencies they played before. Source-level/mocked DOM tests do not certify cross-browser glyph placement or audible playback. If the trial is rejected, revert only these visual and label changes without altering core data/audio behavior.

---

## 2026-11-20 — Correct Persian accidental sizes in mark buttons and actual pitch position in regular score

**User's screenshots and scope:** The Koron rendered in the dedicated key-signature editor was already approved: **do not touch it**. In the row of mark-choice buttons, Koron and Sori were disproportionately large compared with the existing ♭/♯ buttons; in the **regular etude score staff** the Koron was oversized and its triangle pointed near **C5** when the configured mark was actually **A4**. Correct only visual SVG sizing and positioning, keeping the existing meaning, data, piano, frequency, staff interaction and approved editor layout unchanged.

### Source of the staff bug
- `web/src/score.js` used a text-glyph baseline Y `106 - step(note)*4.5` as the origin of a separate SVG, then subtracted `19` from the nested SVG's top. The shared Koron artwork has a `120×160` viewBox with its relevant right-pointing triangle tip at source coordinate **(100,46)**. The previous nested SVG was `20×27`: effective scale `20/120`; letterbox padding `(27 - 160*(20/120))/2`; the tip fell roughly **11.2 SVG units above the intended pitch**, almost exactly the A4→C5 staff-position difference (two diatonic steps = 9 units). This was a display-coordinate bug, **not** incorrect musical pitch or tuning data.
- In the normal score, the text glyph baseline adjustment is relevant only for flat/sharp. A vector accidental must instead use the note's actual geometric staff Y `104 - step(midi)*4.5`, exactly as noteheads do.

### Exact patch
1. `web/src/app.js`: Change only the SVG dimensions on the existing microtonal-selection buttons from `{width:24,height:30}` to `{width:18,height:22}`. Both marks use the same compact box and shared paths; the flat/sharp/natural buttons, CSS, selection callbacks, preview controls, tuning, click behavior and `e.key` data are unchanged.
2. `web/src/score.js`: For configured key-signature Koron/Sori, use the pitch's real staff Y, with a smaller `16×22` inline vector. The Koron triangle tip is aligned to that Y with `glyphTop=6.5`. Sori's right-facing angle vertex (source y=98) is centered to that Y with `glyphTop=13.4`. Both are derived using the vector's `120×160` viewBox and its aspect-ratio-preserving fit, rather than adapting a font baseline. Keep original horizontal ordering of key signature entries and keep the flat/sharp/natural text glyph branch exactly as before.
3. `web/src/score.js`: Apply the same compact, pitch-anchored positioning to explicit per-note Koron/Sori symbols (`n.staffAccidental`) so an AI-generated E-koron or any user-set accidental does not exhibit the old mismatch next to a note. The notehead, its `staffM`, playback marker, cursor, note time, and tuning semantics are preserved.
4. `web/src/app.js` and `web/index.html`: Refresh only the score and app import-version strings so the browser loads the corrected UI instead of cached SVG-renderer modules.
5. This Codex handoff section is committed **together with** the code. No changes to `web/src/key-signature.js`, `web/src/persian-accidentals.js` SVG paths, `web/style.css`, `web/src/model.js`, audio engine, AI parser, persistence format, and other UI.

### Vector geometry and tests
- With the score's `16×22` viewport and `viewBox 120×160`, the scale is `16/120 ≈ 0.13333` and the vertical meet-padding is `(22 - 160*0.13333)/2 ≈ 0.3333`. Koron's source tip y=46 maps to `0.3333 + 46*0.13333 ≈ 6.4667` from the SVG top. Placing the top at `staffY-6.5` aligns it within **0.04 SVG unit** of the intended pitch. For Sori, source y=98 maps to `0.3333 + 98*0.13333 = 13.4`; placing it at `staffY-13.4` aligns it exactly.
- Test cases: key signature `{9:'کرن',4:'♭',5:'سری'}` places Koron's tip on A4 and Sori's vertex on F5; explicit `staffAccidental:'کرن'` is at the associated note's true staff Y; both glyphs use smaller `16×22` notation size. Buttons use `18×22`. Flat/sharp remain text symbols; clicking/editing and playback-marker nodes are preserved.
- Source/synthetic SVG tests verify coordinate math and rendered attributes. **No live browser/device pixel QA was run.** User should visually verify the corrected placement and size at normal zoom.

---

### 2026-11-20 — Studio editor-switch button first, with actual G-clef icon

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

## Restore return-to-score icon without modifying the key-editor entry icon (2026-11-20)

**Branch:** `redesign`. **Exact user instruction:** The user independently updated the **entry** icon for the Key Signature Editor and confirmed that new icon is correct. Preserve it **exactly**, and only change the same toggle button's icon **while the Key Signature Editor is open** back to the earlier musical-staff-with-notes design.

### Implementation

1. **`web/src/app.js`:** Kept the current `scoreSignatureIcon()` function unchanged. It draws the user's preferred treble-clef (`𝄞`) entry icon with the existing 32×34 SVG viewBox and music-font fallback; do not revert it to the older sharp/key-signature drawing.
2. Added a separate, self-contained `scoreReturnStaffIcon()` function that restores the previously implemented return icon: a 32×24 inline SVG featuring five horizontal staff lines, two filled elliptical noteheads (at x=11/y=15.75 and x=23/y=12), and their stems. The SVG uses `currentColor`, does not require any external image or font and is hidden from screen readers because the enclosing button is labeled.
3. Only changed the existing Key Signature Editor toggle's icon append from unconditional `scoreSignatureIcon()` to `signatureMode ? scoreReturnStaffIcon() : scoreSignatureIcon()`. Thus, **normal Score mode** still shows the user's current treble clef, while **editing Key Signature** shows the restored five-line note-staff icon for returning to Score.
4. Preserved the toggle's actual handler, `signatureMode` behavior, `data-signature-toggle` selector, active class, localized "Edit key signature" / "Return to score" tooltip and aria-label, and all editor, audio, tuning and score logic.
5. **`web/index.html`:** Updated only the `app.js` query-string cache version to `signature-return-staff-1` to ensure browsers load the new conditional icon. No CSS change was necessary; existing `.signature-toggle svg` sizing handles both icons.

**Manual QA still required:** In normal Studio Score view, the entry button must remain the user's treble-clef icon. Click to enter the key editor and confirm it switches to the five-line staff with two notes; clicking again must return to the user-approved treble clef. Check both themes and directions. Only JavaScript syntax/source checks were performed, no browser/device visual test.

## Center cents readout above the tuning slider (2026-11-20)

**Branch:** `redesign` only.

**Request:** In the Studio Key Signature Editor's compact Tuning layout, the large signed cents readout (e.g. `−28 ¢`) was left-aligned. Center it horizontally with respect to the tuning slider (as the Hz readout already is). The user did not ask to move the slider, the numeric ± controls or the preview buttons.

**Exact changes:**
1. `web/style.css`: In the existing scoped `#app[data-page="studio"] .signature-tuner-readout` rule, changed `align-items: flex-start` to `align-items: center` and added `text-align: center`. The readout occupies the same CSS grid column as the slider (`grid-area: readout` above `grid-area: scale`), so this centers the large cents value over the slider rather than at the left edge.
2. `web/index.html`: Bumped only the stylesheet cache query to `tuning-cents-centered-1` so the corrected alignment loads on refresh.
3. The `web/src/app.js` DOM structure and all frequency/cents calculations, slider handlers, save logic, original/tuned audio and other controls were deliberately untouched.

**Manual checks pending:** At desktop widths, the signed cents readout should be horizontally centered above the slider, visually aligned with the already-centered Hz label. Verify responsive layouts in both languages and themes. This was a source-level CSS alignment change; no live browser/device visual verification was performed.

## Remove redundant Studio Tuning & key signature section (2026-11-20)

**Branch:** `redesign`. **User request:** Completely remove the legacy expandable `Tuning & key signature` section located beneath the Studio score area. The newer in-place **Key Signature Editor** now owns key-signature selection and per-note tuning, so the older accordion is redundant.

### Changes

1. **`web/src/app.js` / `studio()`:** Removed the single `tuning()` invocation that inserted the old collapsible `Tuning & key signature` panel into the Studio page. The next `rules()` call and `sheet()` rendering remain in the same order.
2. **`web/src/app.js` / obsolete helper:** Removed the unreferenced `function tuning()` in its entirety. This removed only the old legacy editing UI: global accidental cent fields, pitch selector, signature selector, numeric per-pitch offset field, and its listen-note button. No shared tuning data, model fields, or musical pitch calculations were modified.
3. **`web/index.html`:** Updated the JavaScript cache-busting query string to `remove-legacy-tuning-1` so the accordion disappears reliably after refresh. CSS assets were not changed.

### Preserved

- The newer **Key Signature Editor** inside the Studio Score area, including the accidentals, selected pitch, compact cent and frequency readouts, draggable slider, reset and preview controls, all associated save/preview/tuning behavior and the view-switching toggle icon.
- The separate `Practice settings` accordion, which continues to be rendered by `rules()`, including its own `Allow tuner` option. The user requested removal of the old *Tuning & key signature* section only, not unrelated practice configuration.
- Studio's title/pencil icon, piano, transport, Share/PDF, AI Generate, zoom and other UI and functionality.

### Validation needed

- In an open Etude Studio, verify there is **no longer a collapsible `Tuning & key signature` section** below the score.
- Enter the Key Signature Editor and verify accidentals, cents slider, numeric steps, tuning persistence and playback previews work unchanged.
- Verify the `Practice settings` section is still present, with unaffected controls, and the normal Studio Score loads properly.
- Static JavaScript syntax/source checks have been performed; browser/device QA was not performed.


## Hide Score transport and AI actions in Key Signature Editor (2026-11-20)

**Branch:** `redesign` only. **User request:** When the Studio is switched to the in-place **Key Signature Editor** (`signatureMode === true`), remove **Play/Stop, Pause/Resume, Record/Stop, Generate AI** from the visible toolbar. When returning to the normal Score view, all those controls must reappear with their original handlers and states.

### Exact changes
1. **`web/src/app.js` / `studio()`:** Added `transportActions.hidden = signatureMode;` immediately after constructing `div.score-transport-actions`. The group already contains Play/Stop, Pause/Resume, Record/Stop, and the desktop-only Generate AI button. Hiding the entire group rather than each child keeps the group in its original order and avoids altering or cloning any callbacks.
2. **`web/style.css`:** Extended the existing key-signature hidden-control override with `#app[data-page="studio"] .score-actions .score-transport-actions[hidden]` so its `display:flex` does not override the native `hidden` attribute. It stays hidden in Key Signature view and returns automatically when `render()` reconstructs the normal Score view.
3. **`web/index.html`:** Updated CSS and JS query-string versions as part of the subsequent combined layout update.

### Preservation and tests
The existing Score edit modes, key-signature switching, active transport behavior, recording/AI callbacks, audio engine, document model, and Practice page remain unchanged. The earlier hiding of note-edit buttons/Zoom/Tempo in signature view stays intact. Manually test both views in English/Persian and mobile/desktop: in signature view only the mode-switching control relevant to Score should remain available, while Play, Pause, Record and Generate are absent; they must return after toggling back. No browser/device QA was run.


## Move Key Signature Editor switch beside the active Score heading (2026-11-20)

**Branch:** `redesign` only. **User request:** Move the existing editor-switch button out of the Score tools row and position it **directly after the heading** `Score` or `Key Signature Editor`, with a natural gap, in both modes. Preserve the user-customized treble-clef icon for entering key-signature editing and the existing five-line staff-with-notes icon for returning to Score.

### Exact changes
1. **`web/src/app.js` / `studio()`:** Wrapped the already-dynamic `h2.score-title` in a `div.score-heading`, created the existing `button.score-tool-button.signature-toggle` inside **that heading container** rather than `scoreActions`, and only then created the ordinary `div.score-actions` toolbar. The new visual/DOM order is: **Score heading text → editor switch icon**; underneath, the appropriate editing tools (Select/Pen/Eraser/Wrap/Zoom in Score mode) and transport actions. In Key Signature view, the title switches to `Key Signature Editor` and the toggle remains beside the heading to return to Score.
2. Preserved the toggle's exact `signatureMode = !signatureMode; render()` action, `stopSignaturePreview()` and `stopScorePlayback()` conditions, `signaturePitch` selection logic, `data-signature-toggle`, `aria-label`/tooltip/pressed/active state, and conditional `signatureMode ? scoreReturnStaffIcon() : scoreSignatureIcon()`. All other toolbar handlers remain unchanged.
3. **`web/style.css`:** Added a narrowly scoped `#app[data-page="studio"] .score-heading` flex row with `14px` gap, wrap and compact vertical spacing; reset the nested `h2.score-title` margin; sized the adjacent toggle as an accessible 44px target, and retained active-state border. Switched the 30×23px SVG sizing rule from `.score-actions .signature-toggle svg` to `.score-heading .signature-toggle svg` because the button has moved. Added a print-only rule to hide the whole interactive heading (the separate `print-title` remains the intended printed heading).
4. **`web/index.html`:** Updated both CSS and JS query versions to `editor-heading-toggle-1` for correct cache invalidation.

### Manual verification
Open Studio's normal Score view: the treble-clef switch button appears immediately after `Score` with appropriate spacing, not in the tools row. Click to enter Key Signature Editor: the title changes, and the switch becomes the existing staff-with-notes icon immediately after `Key Signature Editor`. Play/Pause/Record/AI remain hidden in this mode; return to Score and verify normal toolbar is restored. Check both RTL and LTR, narrow layouts, button focus/tooltip and printed PDF output. Only JavaScript syntax and source inspections are claimed, not live browser/device testing.


## Correct editor-switch order and add bidirectional icon (2026-11-20)

**Branch:** `redesign`. **User feedback:** The editor-switch button looked *before* the editor heading in Persian/RTL despite coming after it in the DOM. Make it visually follow the heading, and make its dual-editor action unmistakable.

**Exact changes:**
- `web/src/app.js`: Added `scoreEditorSwitchArrowsIcon()`, an 18px inline SVG pictogram of opposing horizontal arrows. The existing editor-switch button now renders its existing conditional musical icon—user-approved treble clef from `scoreSignatureIcon()` when viewing the score, or five-line staff with two notes from `scoreReturnStaffIcon()` when viewing signature editor—together with the new arrows. Original music artwork and actual toggle handlers were not modified.
- `web/style.css`: Set `direction:ltr` specifically on `.score-heading` to keep the heading physically **before** the switch button in both document language directions; in RTL the heading text itself retains `direction:rtl`. Gave the combined icon button sufficient horizontal width (min 60px), appropriate gap, and separate size rules for `.score-switch-symbol` (30×24px) and `.score-switch-arrows` (18×18px). Existing theme and active styles remain.
- `web/index.html`: Initially bumped CSS and JS query versions to `editor-switch-order-2`; the app version was subsequently bumped for additional requested changes.

**Manual checks:** Compare both directions and themes; visual order must be title then icon button (physically to its right). Confirm different clef/staff art in the two modes with two-way arrows. Static checks were performed; browser rendering not verified.


## Editor heading labels reflect the switch action (2026-11-20)

**Branch:** `redesign`. **User request:** The text alongside the two-mode editor switch should read **Edit Key Signature** in the normal Score view and **Back to Score** while inside the Key Signature Editor.

**Exact changes:**
- `web/src/app.js` / `studio()`: Updated only the heading's dynamic localized text and the button's matching localized `title` / `aria-label`:
  - `signatureMode === false`: `Edit Key Signature` / `ویرایش سرکلید`.
  - `signatureMode === true`: `Back to Score` / `بازگشت به خط حامل`.
- The existing `.score-heading` layout, two-way switch art, key signature toggle functionality and all controls remain unchanged.
- `web/index.html`: Bumped the script version to `editor-switch-labels-1` (subsequently bumped again).

**Manual checks:** Open a Studio etude and switch views; the heading and button accessible names should always match the action, in English and Persian. Confirm score and tuning behave normally.


## Automatically return Pen/Eraser to Select after clicking outside score (2026-11-20)

**Branch:** `redesign`. **User request:** In the normal Studio Score editor, when Pen or Eraser is selected, clicking anywhere **outside the score/staff surface** should restore the Mouse/Select tool.

**Exact changes:**
1. **`web/src/app.js`:** Added **one** document-level `pointerdown` event listener next to the other global browser listeners. It operates only if `page === 'studio'`, `activeId` is valid, `signatureMode` is false, and the active `scoreTool` is either `pen` or `eraser`. It returns early if a modal dialog is open, or if the pointer target is inside `.score` or the editing tool buttons `.score-actions [data-score-tool]`.
2. An outside pointer click now sets `scoreTool = 'select'`, toggles the `.active` class and `aria-pressed` state on all Studio editing tool buttons so Select visibly becomes active, and calls `sheet()` once to remove the pen/eraser cursor and restore the standard score pointer. It does **not** call the full `render()`, so unrelated clicked controls (including input fields) are not replaced and lose neither focus nor interaction.
3. Clicking within the score still keeps the currently selected tool (Pen/Eraser) so users can draw or erase multiple notes. Clicking the Pen or Eraser toolbar buttons remains a deliberate tool change, unaffected by the outside-click listener.
4. **`web/index.html`:** Updated the app.js cache version to `outside-score-select-1`. **No CSS**, tuning behavior, note data, Score editing algorithms or other routes were changed.

**Manual checks:** Select Pen, click inside score (should remain Pen), click elsewhere (should become Mouse/Select); repeat for Eraser. Check selecting Pen/Eraser by toolbar click still works. Check unrelated input focusing/clicks, modal dialogs, RTL/LTR and Practice/Home do not suffer side effects. No live browser QA was performed; this was checked by syntax and source inspection only.

## Editor switch becomes a single icon-and-label button (2026-11-20)

**Branch:** `redesign`. **Requested UX correction:** The user rejected the previous separate large action heading ("Edit Key Signature" / "Back to Score") plus an icon-only button with swap arrows. There must instead be exactly **one clickable button** incorporating the appropriate musical symbol **and** the corresponding visible text. In the normal Score editor this is **treble clef icon + Edit Key Signature**; in the Key Signature Editor it is **notation staff with two notes icon + Back to Score**. Crucially, the Back to Score state must **not** have the filled, accent-colored active background.

### Scoped source changes

1. **`web/src/app.js` → `studio()`:** Kept the existing `div.score-heading` container, but removed the redundant `h2.score-title` that repeated the editor action label. The existing `button.score-tool-button.signature-toggle` now contains an SVG musical icon followed by `span.signature-toggle-label` containing the localized `signatureAction` string. Its text shows **Edit Key Signature / ویرایش سرکلید** when `signatureMode` is false, and **Back to Score / بازگشت به خط حامل** when true. The inline text span uses `dir="auto"` for Persian/English correctness.
2. Preserved the **existing approved music icons** unchanged: `scoreSignatureIcon()` for the treble clef, and `scoreReturnStaffIcon()` for the five-line staff with two notes. Removed only the unused `scoreEditorSwitchArrowsIcon()` helper and no longer appended two-way arrows, which had made the button look cluttered. The toggle's `signatureMode = !signatureMode; render()`, initial selection, audio cleanup, `data-signature-toggle`, accessible name, tooltip and `aria-pressed` semantics were all retained.
3. Removed the conditional `.active` class on the editor-switch button to prevent the global `button.active` CSS from applying a saturated background to Back to Score. `aria-pressed` still indicates the currently active editor for accessibility.
4. **`web/style.css`:** Reworked only the scoped `#app[data-page="studio"] .score-heading .signature-toggle` styles to render a compact, 44px-minimum-height, unfilled button with SVG and text separated by 9px. Set transparent background and standard text color in both normal and `[aria-pressed="true"]`/pressed states, along with a subtle border, accent-colored hover border and accessible keyboard focus ring. Removed CSS for the unused swap-arrow symbol and duplicate title in the editor-switch heading. Kept the existing musical-symbol SVG sizing.
5. **`web/index.html`:** Bumped CSS and JavaScript versions to `editor-labeled-switch-1` for reliable refresh.

### Unchanged features
Everything else in Studio remains unchanged: Key Signature Editor functions, tuning and frequency displays, piano/score editing tools, Show/Hide transport controls, audio playback, recording, AI generation, Share/PDF actions, and the separate practice settings. The prior outside-score Pen/Eraser → Select interaction is also unchanged.

### Manual verification still required
Normal Score view must show exactly one button with treble clef at the start and "Edit Key Signature" beside it. Clicking opens Key Signature Editor and makes the same button read "Back to Score" beside the staff-with-notes icon, **without filled accent background**. Clicking returns to the normal score. Confirm both languages, keyboard focus, responsive layout and themes. Source-level JavaScript parsing and static checks were performed, but there was no live browser/device visual testing.

## Display current editor title below switch button (2026-11-20)

**Branch:** `redesign` only. **User instruction:** Keep the existing **single icon-and-label toggle button** and insert a separate **current editor section title beneath that button, but above the Score toolbar (Play/Pause/Record/AI and score editing controls)**. When the switch button reads `Edit Key Signature`, the title beneath it must read **Score**. When the button reads `Back to Score`, the title beneath it must read **Key Signature Editor**.

### Exact source changes

1. **`web/src/app.js` / `studio()`:** After `const switchLabel = el('span', keyButton, signatureAction, 'signature-toggle-label'); switchLabel.dir = 'auto';`, inserted:
   ```js
   el('h2',panel,signatureMode
     ? t('Key Signature Editor','تنظیم سرکلید')
     : t('Score','خط حامل'),'score-title');
   ```
   This inserts the current-view title **after** the editor switch's heading container, and **before** `const scoreActions = row(panel)`. The title is informational, not another button. Existing switch button text, musical icon, transparent Back to Score background, view logic, and transport visibility are unchanged.
2. **`web/style.css`:** Added a narrow, Studio-specific `#app[data-page="studio"] .score-heading + .score-title` style for compact spacing, a clear bold label, and no extra card. It leaves the other `.score-title` usages and print visibility unchanged.
3. **`web/index.html`:** Bumped the app/style cache-busting query strings to `editor-title-under-switch-1`.
4. **`CODEX_AI_ETUDE_HANDOFF.md`:** This note.

### Expected visual order

- **Normal Score:** single icon + `Edit Key Signature` button → **Score** text heading → regular Score action buttons including Play, Pause, Record, AI Generate.
- **Key Signature Editor:** icon + `Back to Score` button (no filled active-state background) → **Key Signature Editor** text heading → Key Signature notation/editor content. Existing hiding of Score-only tools and Play/Pause/Record/AI in signature mode remains as before.
- Preserve English/Persian translations, RTL behavior, original approved icons, tuning/audio and all unrelated features.

### Manual checks still needed
Open an etude in Studio, confirm the section title appears **between** the switch and the toolbar in both view modes and translations, with appropriate spacing and no duplicate title text in the button. Confirm score-only transport is hidden while editing key signature and returns in normal Score view. Validate mobile layout and printed PDF output. Static source syntax/structure were checked; no live browser or device QA was performed.


---

# Practice Sequence authoring in Etude Studio — feature branch (2026-11-20)

**Branch:** `feature/practice-sequence-studio`, created from the exact `redesign` head `5734d4402329bd0a04a7cf56858c6d655a64accf`.

## User-approved boundary and conceptual model

The existing Goosh architecture has two primary sections. **Etude Studio** is where a teacher or AI composes an etude **and** designs one or more associated learning exercises. **Practice** is exclusively the learner-facing player. Do **not** move exercise authoring into Practice, split authoring into a separate standalone application, or assume the Practice player has already been upgraded to run the new multi-step format.

The user requested: ten standard solfege/ear-training exercise goals, several independently configurable exercises per etude, sequential order, manual authoring plus OpenRouter assistance, reuse of the existing Goosh visual theme and stack, strict scope control, reusable components, a single source of truth, and preservation of unrelated code. This branch implements the **Studio authoring and persistence foundation**. It does not implement the future learner runtime.

## Files added

1. **`web/practice-goals.json`** — the sole canonical exercise-goal catalog, authored once and consumed in the frontend **and** Python server. It defines exactly ten IDs, bilingual labels/descriptions, category grouping, permitted response methods, defaults, content scopes, reference/feedback choices and concise music-generation guidance:
   - `note-identification` — Note Identification.
   - `pitch-matching` — Pitch Matching.
   - `interval-training` — Interval Training.
   - `melodic-imitation` — Melodic Imitation.
   - `melodic-dictation` — Melodic Dictation.
   - `sight-singing` — Sight-Singing.
   - `rhythm-imitation` — Rhythm Imitation.
   - `rhythmic-dictation` — Rhythmic Dictation.
   - `scale-mode-recognition` — Scale & Mode Recognition.
   - `chord-recognition` — Chord Recognition.
   The four catalog categories are Pitch & Intervals, Melody & Sight-Singing, Rhythm, and Scales & Harmony. Do not clone this list into additional JS or Python dictionaries. Python loads the exact same JSON file from `WEB_ROOT`.

2. **`web/src/practice-model.js`** — shared, UI-independent helpers:
   - `practicePlan(etude)`: ensure `etude.practiceSequence` is an ordered array.
   - `newPracticeStep(goal,catalog)`: create a fresh step with a unique ID and catalog-derived response/scope defaults.
   - `validatePracticeStep(step,catalog?)`, `validatePracticeSequence(sequence,catalog?)`: check data shape, bounds and uniqueness; with catalog supplied, also enforce legal goal IDs and goal-specific response methods.
   - `assessPracticeContent(etude,step)`: lightweight, non-destructive warnings on missing/insufficient content, invalid selected note indices and current polyphony limitation.
   - `localized(item,fa)`: shared bilingual label helper.
   Both `model.js` and the editor use these helpers rather than maintaining duplicate validation rules. In `model.js`, catalog-less structural validation is deliberately used because legacy etude loading is synchronous whereas the JSON catalog is loaded asynchronously in the Studio editor.

3. **`web/src/studio-practice.js`** — reusable vanilla-JS Studio authoring UI: dynamically loads the catalog; shows the ten goals grouped in a select; adds/reorders/duplicates/deletes/enables steps; edits step title, goal, scope, selected 1-based note indices, group size, response, reference, feedback, answer time, attempts, tuner, pitch tolerance and wrong-answer policy. The editor uses existing native HTML form controls, `details` disclosure, existing app callbacks for saving, and retains expanded step/advanced/AI panels during rerenders. It never imports or calls the learner `practice()` function.
   - AI subsection sends the chosen goal, short free-text teacher preference, and a bounded etude summary to `POST /api/design-practice`.
   - It maps returned strict, validated settings into `newPracticeStep` and saves the resulting step to the **same** `practiceSequence` used by manual editing.
   - It does not modify notes, piano, score, tuning, or navigation.
   - Loading errors surface visibly rather than substituting a second catalog.

4. **`web/practice-designer.css`** — scoped styles using existing `--accent`, `--panel`, `--bg`, `--ink`, `--line` variables, preserving the current project's light/dark identity and responsive behavior. The authoring UI is excluded from score printing. No CSS framework, UI kit or new package was added.

## Existing files changed and exactly why

5. **`web/src/model.js`** — imports `validatePracticeSequence`, initializes new etudes with `practiceSequence: []`, and validates the optional sequence. `version: 1`, old `rule` defaults, score-note representation, legacy `valid()` requirements, frequency behavior and the old Practice player remain unchanged. Legacy `.goosh` files with no `practiceSequence` still validate and can be opened. Files with a sequence serialize it automatically because existing import/export/localStorage already serialize the whole etude object.

6. **`web/src/app.js`** — imports `renderStudioPractice` and mounts one `studio-practice-host` inside `studio()` just before the existing legacy `rules()` UI. The editor uses the existing `e`, `save()` and bilingual `fa` state. The old `rules()` and `practice()` code paths were not refactored or modified. The legacy rule UI remains intentionally present so there is no accidental regression in the existing player.

7. **`web/index.html`** — adds a single stylesheet link for `practice-designer.css`. No other page layout or theme controls were changed.

8. **`web/src/ai-etude.js`** — the existing `generateStudioEtude` request now includes the unique list of enabled `current.practiceSequence[].goal` IDs in `practiceGoals`, alongside the already existing `dastgah`. This means **teachers should choose practice goals first and then use Generate** if they want AI-composed musical material that targets those educational goals. Disabling a step removes it from the submitted educational objectives.

9. **`scripts/goosh_server.py`** — reads the canonical catalog once at module load and uses it for both AI paths:
   - Existing `POST /api/generate-etude` accepts optional `practiceGoals`, validates IDs/length, and appends catalog-derived educational constraints to the existing music-generation prompt, including the special Shur ABC path. It preserves the existing response contract and legacy call with no goals.
   - New `POST /api/design-practice` accepts `{goal,instruction,etude:{title,bpm,noteCount,notes}}` and requests one goal-specific structured settings object from OpenRouter using `json_schema` with `strict: true`. The schema and enums derive from the same catalog. The server validates every returned field and legal numeric range before responding with `{settings}`, and prevents tuner=true on non-microphone response types. It does **not** alter the etude.
   - `call_openrouter(payload)` is shared by both endpoints, preserving server-side API-key handling, timeout and error paths; no separate HTTP client was introduced.
   - JSON request max was increased from 2048 to 32768 bytes to accommodate bounded note summaries. The new endpoint remains a local POC endpoint; before any public deployment add user authentication, request throttling, spend controls, service validation and abuse protection.

## Current serialized example (illustrative, abbreviated)

```json
{
  "version": 1,
  "title": "Example",
  "notes": [{"m": 69, "at": 0, "d": 1}],
  "practiceSequence": [
    {
      "id": "a-unique-id",
      "goal": "pitch-matching",
      "enabled": true,
      "title": "",
      "content": {"scope": "each", "selectedIndices": [], "groupSize": 1},
      "response": {"method": "mic"},
      "reference": {"timing": "before", "repeat": 1},
      "feedback": {"timing": "after", "revealCorrect": true},
      "assessment": {"toleranceCents": 35, "responseSeconds": 8, "attempts": 1, "tuner": false},
      "flow": {"onIncorrect": "next"}
    }
  ]
}
```

The array order is the intended future learner sequence; exercises do **not** need duplicated score contents. `content.selectedIndices` is zero-based internally and displayed as one-based user input. The sequence may contain zero, one or many distinct steps, including multiple instances of the same goal with different settings.

## What is NOT implemented (important)

- **No new Practice player.** The existing learner-facing Practice route still reads the legacy `e.rule`, iterates individual notes and does **not** run `practiceSequence`. Implement a dedicated runtime in a *subsequent, explicitly authorized* task. Do not claim all ten exercise types are currently playable.
- **No polyphonic harmony support.** Chord Recognition is a valid authoring goal in the catalog, but the current monophonic score/audio/AI parser cannot produce true chords. The Studio presents a warning. Future music-model work is required.
- **No finished phrase model.** The new `phrases` scope is an intention; the current note data does not have stable phrase IDs or boundaries. Teachers and AI cannot yet author reliable phrase-granularity playback/evaluation.
- **No full pedagogical correctness validator.** Structural JSON validation and simple content warnings are in place; verifying that a melody genuinely contains the requested characteristic intervals, modes, microtones, etc. requires future goal-specific validators.
- **No general per-note microtonal redesign.** The existing `m/at/d`, `key`, `offset`, ABC parser and legacy pitch-class tuning limitations remain unchanged.
- **No full AI dual-generation wizard.** AI can generate an etude guided by existing enabled goals and suggest *one new practice step* at a time, but there is not yet a single atomic AI transaction returning an etude plus multiple steps.
- **AI calls need connectivity and a server configured with `OPENROUTER_API_KEY`.** An Android APK running as a local static Capacitor bundle has no guaranteed `/api/design-practice` backend. The manual Practice Designer works when its local JSON asset loads, but AI endpoints require a deployed/reachable backend. Do not suggest the APK has working AI calls merely because web Studio does.

## Implementation details and follow-up for Codex

- Keep this branch's scope limited to Studio practice authoring. Do not move or replace the current Etude Studio score, recording controls, key-signature editor, score transport, existing UI/color tokens, or Practice player unless explicitly requested.
- To extend an exercise goal, update `web/practice-goals.json` **first**; the UI and server consume it. Update `practice-model.js` for any new schema property, then UI and eventual runner.
- Preserve stable step IDs and step array order. Never use array position as identity; moving a step must not change its settings.
- AI suggestions and manual edits must write exactly the same schema. All AI data must be validated server-side and client-side before saving.
- Future Practice runtime must read `practiceSequence`, with explicit backward compatibility for existing `e.rule`. It should distinguish content selection, response capture, assessment, feedback and conditional flow; do not confuse the ten pedagogical goals with low-level events.
- Before relying on deployed AI generate behavior, test the chosen OpenRouter model/provider's support for strict `json_schema`. The existing Shur fixed-composition prompt may conflict with some goals, especially chords; validation and explicit unsupported-goal handling will be necessary.
- Existing local score music notation/ABC limitations remain as documented in prior handoff sections. Do not remove historical notes from this document.

## Verification status / exact scope

Implementation changes are committed to the feature branch, not `redesign` or `main`. Repository contents and changed files were inspected through the connected GitHub integration. The container runtime has no network access to GitHub and no live browser/app session was attached; therefore **no claim of successful end-to-end browser, Android, or OpenRouter execution is made**. Follow up with `node --check` on the changed ES modules, `python3 -m py_compile scripts/goosh_server.py`, local Studio manual save/reload/export/import validation, both themes and languages, and real OpenRouter responses. Confirm the original Practice page behavior remains unchanged.



### Final incremental hardening (same feature branch, 2026-11-20)

- Added `retryPolicies` to the canonical `web/practice-goals.json`. The editor and Python AI schema now derive retry choices from that catalog; the frontend structural model checks legal options against catalog when available rather than keeping a second vocabulary table.
- The Studio editor retains its selected goal, draft AI instruction, open AI panel, open exercise sections and open advanced sections across ordinary save/rerender operations. A new generated or manually added step opens automatically for configuration. An AI response arriving after the Studio host was removed is ignored.
- Adjusted the Studio `app.js` and `ai-etude.js` cache-busting module import keys in `web/index.html` and `web/src/app.js`, so browsers do not reuse an obsolete bundled script after this change.
- Performed **JavaScript parse-only checks** against the connected GitHub source content of `web/src/practice-model.js`, `web/src/studio-practice.js`, `web/src/model.js`, `web/src/ai-etude.js` and `web/src/app.js`: all parsed successfully after removing module-import/export declarations for the syntax check. This is not browser integration testing. No Python compile or real OpenRouter request was executed; validate those in a local checkout before deployment.
- A Github compare of `redesign...feature/practice-sequence-studio` confirmed the branch is ahead only and all modifications are limited to the ten documented files. No existing Practice-route implementation file was separately rewritten; `practice()` in `app.js` remains the original legacy flow.

### Important practical setup detail

For local browser AI functionality run the existing Python-backed `npm run web` command and configure `OPENROUTER_API_KEY` in a local uncommitted `.env`. Merely serving the `web/` folder as static files allows manual editing, but does not provide the new AI endpoint. The catalog JSON file must be deployed beside the other `web/` assets; it is fetched at runtime by the Studio module.

- Final single-source-of-truth cleanup: the legacy AI etude handler no longer duplicates its OpenRouter API-key precheck; the shared `call_openrouter(payload)` now exclusively owns credential validation for both etude and practice AI requests.


---

# Goal-first AI composition and non-destructive multiple practices (2026-11-20)

**Branch:** `feature/practice-sequence-studio` (continues from the previously established `redesign`-based practice-sequence implementation).

## Agreed business rule — do not violate

**One Etude = one canonical collection of musical notes + multiple independently configurable practice steps.** A new practice step MUST NOT generate additional musical notes or duplicate the score. All steps in `etude.practiceSequence` refer to the **same** `etude.notes`, `etude.key`, `etude.offset`, `etude.marks`, and musical context. If the teacher needs completely different music, create a **new Etude**, not a second score nested under an existing practice step. The user explicitly rejected a “different score per practice” architecture.

The following workflows must be distinguishable:

- **Manual composition:** the teacher composes/edits the canonical staff and piano using the existing controls, then configures any number of practice steps in the existing `Practice Design` section.
- **AI composition:** the teacher chooses **AI**, then MUST choose one of the ten training goals from `web/practice-goals.json` before the `Generate Etude` button becomes active. They also choose the dastgah using the existing supported options. Goosh asks OpenRouter to compose notes for the selected goal, then creates exactly **one** default practice step for that goal. Additional exercises can be added from the Practice Designer without altering any notes.
- **AI exercise configuration:** the existing Practice Designer AI feature still generates *only settings for one new step*, using the unchanged score.
- **Regenerate Etude:** if the Etude already contains notes or practice steps, the label becomes `Regenerate Etude` and a confirmation modal explains that the existing notes, tuning, and practice steps will be **replaced**. On success, the score and old plan are replaced with the new music and exactly one step for the newly selected goal. The legacy `rule` settings are restored to `fresh().rule` for a clean practice configuration. **No mutation happens on cancel or API error**. The existing BPM is retained as the generation timebase. There is no undo for this destructive replacement; the confirmation explicitly states that.
- The pedagogical correctness of AI-composed music is not guaranteed by a prompt alone. The earlier goal guidance and basic response format checks remain; additional pedagogical validators will be needed later.

## Implementation details (files and contracts)

1. **NEW `web/src/studio-etude-generation.js`** owns the Manual/AI chooser and goal-first AI generation experience. Its `mountEtudeComposer(host, {etude,fa,isRecording,isCurrent,onGenerated})` presents two explicit modes within the current Etude Studio; it **does not** create new pages, fork the editor, or copy notes. It loads goals through the existing `loadPracticeCatalog()` exported by `studio-practice.js`, so AI and manual settings use the exact same catalog and categories. It uses a WeakMap keyed by the canonical etude for UI-only mode/selection state (no secondary score store). The active form requires a chosen goal and disabled Generate until it is valid; `chord-recognition` is visible but deliberately not generatable because the score is currently monophonic. The old score tools remain operational in Manual mode. Generated results are only committed if the current route/etude/host are still active, and an in-flight request is aborted during a full Studio rerender. The user can switch modes without changing music. The AI mode's instructional text explains the score-sharing rule.
2. **NEW `web/src/studio-dialog.js`** wraps Goosh's existing `<dialog>`-based confirmation styling (`etude-delete-dialog` and its action classes) and accessible inline status messages. `confirmStudioAction({...})` returns a promise resolving true only after the user explicitly confirms; Escape, Cancel, route navigation and modal closure abort the action. `showStudioMessage(host,text,tone)` uses `role="status"` or `role="alert"`. Neither helper calls browser `alert()` or `confirm()`.
3. **MODIFIED `web/src/app.js`** mounts the shared composer immediately in the Studio score panel. Replaced the previous desktop-only “AI generate” toolbar button and independent generate dialog to avoid two competing AI flows. On successful generation the existing etude object is updated **in place**, its practice sequence becomes one step, legacy `rule` is reset, score playback is stopped, the score undo stack and selection are cleared, and the Studio is rerendered with the generated practice step expanded. The teacher sees the newly composed notes on the **same** staff; the staff is not cleared, because clearing it would conflict with the agreed shared-score model. Nothing in the learner-facing `practice()` player was changed. `practiceToExpand` is transient presentation state, not a second saved practice store.
4. **MODIFIED `web/src/ai-etude.js`** changes `generateStudioEtude(dastgah, current, signal, practiceGoals = [])` to receive the goal IDs **explicitly** and posts exactly `{dastgah, practiceGoals}` to the existing Python API. This prevents stale goals from an existing practice sequence leaking into a regenerate request. The original music conversion, pitch/tuning validation, OpenRouter response format and backend transport remain unchanged.
5. **MODIFIED `web/src/studio-practice.js`** replaces a browser `confirm()` for deleting a single practice with the project's dialog pattern; deletion affects only that step, not the shared score. Replaces the browser `alert()` for invalid selected-note numbers with an inline, accessible validation message. Each step is explicitly labelled `Practice 1`, `Practice 2`, etc., while retaining stable step IDs and ordering. This component remains the single authoring UI for additional practice steps, including AI-generated configuration.
6. **MODIFIED `web/practice-designer.css`** adds only Studio-scoped styles for the Manual/AI control, goal/dastgah fields, generate action, inline status, and expanded step labels. All colors and surfaces use the project's existing `--accent`, `--panel`, `--bg`, `--ink`, `--muted`, `--line` and `--shadow` tokens. No UI framework or package was introduced. The new composer is hidden from printed scores.
7. **MODIFIED `web/index.html`** refreshes the Studio app and Practice Designer stylesheet cache-busting query strings. Both importers reference **the same** `studio-practice.js?v=goal-first-1` URL so the cached goal catalog is not duplicated as two separate JS module instances.

## Behavior examples

**Case A — new AI etude:** Start a new Etude > choose AI > select “Pitch Matching” > choose Shur > Generate Etude. New notes replace the empty staff, and `practiceSequence` becomes `[ {goal:"pitch-matching", ...} ]`. Its Practice Designer card is expanded for adjustment.

**Case B — add a second practice:** In Practice Design choose “Note Identification” and Add Exercise. The plan now has two steps ordered 1/2, but `etude.notes` is **byte-for-byte untouched**. Edit or configure either step independently.

**Case C — switch to Manual:** Choose Manual; all previous piano, recording, staff, key-signature and other tools remain. No automatic regeneration, note deletion or practice deletion occurs.

**Case D — regenerate:** Choose AI > select the desired new goal > Regenerate Etude. An in-app modal warns the teacher that prior notes, tuning and practice steps will be replaced. Cancel leaves the existing etude unchanged. Confirm starts generation; only a **successful and validated** response causes an atomic replacement with one new initial step. Failed requests leave the previous etude intact and show an inline error.

## Scope, limitations, and verification

- **No new Practice runtime**: the learner-facing Practice route still operates on legacy `e.rule`, not the ordered new `practiceSequence`. The user explicitly asked not to modify that route during Studio authoring work.
- **No multi-score architecture**, no background rerendering, no hidden modifications to etude notes during practice-only authoring.
- **No extra dependencies**.
- Existing unrelated browser alerts elsewhere in the legacy app (share, print, import) were deliberately left untouched under strict scope control. No new/edited Manual/AI or Practice Design path uses them.
- Syntax-only JavaScript parsing of all changed modules was checked through the GitHub-connected source retrieval workflow. No end-to-end browser/Android/OpenRouter integration test was performed or claimed.
- The local Python OpenRouter backend continues to accept the selected goal ID as `practiceGoals`, as implemented previously. Goal-aware **music-quality validation** is still a future requirement: the current server adds musical guidance to prompts but does not guarantee perfect adherence for all ten educational goals.
- Further changes should preserve the two-workspace product architecture: **author in Etude Studio, execute in Practice**. Keep a single notes model, a single goals catalog and a single ordered practice sequence.



---

# Clean path routing across Web, Android and iOS (2026-11-20)

**Branch:** `feature/practice-sequence-studio` (the same feature branch; this routing work follows the Practice Sequence and goal-first AI work). **User request:** Replace the browser's `/#studio` and `/#practice` hash URLs with actual readable paths, account for desktop web, Android APK (Capacitor) and iOS, keep other features intact, and document the change comprehensively. Do not add a second independent platform router.

## Final canonical URL contract

| View | Clean application URL | Historical form |
| --- | --- | --- |
| Home | `/` | `/` |
| Etude collection / Studio entry | `/etudes` | `/#studio` |
| One etude in Studio | `/etudes/:id` | `/#studio/:id` |
| Practice collection | `/practice` | `/#practice` |
| Practice for a selected etude | `/practice/:id` | `/#practice/:id` |

The internal JS page name `studio` is retained for compatibility with the preexisting render, data selection and CSS logic. Its public URL segment is now `etudes`; do not rename internal page state or modify Practice execution merely to match URL terminology. The `:id` value is a local etude ID, encoded with `encodeURIComponent` in URL construction and decoded when reading the route. Route parsing remains independent of the etude's saved data model. **A localStorage-backed etude path is not a public share URL or server-hosted etude record.** A foreign browser/device will not have the corresponding saved etude without a separate import/sync mechanism.

## File-by-file changes

1. **New `web/src/router.js` — the one canonical route module:**
   - Contains `PATHS` and mapping from URL segment `etudes` to existing internal page `studio`; recognizes `practice` and `home`.
   - `routePath(page,id?)` generates clean application URLs. `readRoute()` maps `location.pathname` to `{page,id}`; it understands `/index.html` as native/startup Home.
   - `navigateTo(page,id?,{replace?})` updates history with `history.pushState` (or `replaceState`) and notifies the registered navigation handler without a reload. It will not add a duplicate entry for the exact same path.
   - `listenToRoutes(callback)` handles the browser's `popstate` (Back/Forward) and legacy `hashchange` migration, routing both into the same callback.
   - `upgradeLegacyHash()` upgrades existing links `/#studio[/id]` and `/#practice[/id]` (also `/index.html#...`) into clean paths by `history.replaceState`. This is intentional compatibility support, *not* a second hash router. It preserves the existing query string without adding a history entry. Unknown fragments are not treated as routes.
   - Route lookup, route creation and navigation notifications MUST continue to live in this file. Do not reintroduce `location.hash = ...` in separate UI components.

2. **`web/src/app.js` — use the router without changing page behavior:**
   - Imports `readRoute`, `navigateTo`, `listenToRoutes`, `upgradeLegacyHash`, and `installAndroidBackNavigation`.
   - Converts a legacy hash *before* reading initial page state, so opening an old link loads the correct Etude/Practice rather than Home.
   - `page` initialization and `loadRoute()` obtain page/id from the new parser rather than `routeFromHash()` or `location.hash`.
   - Replaces the hashchange-only navigation handler with `listenToRoutes`, preserving the existing `cancel()`, `loadRoute()`, `render()`, and top-scroll behavior. These are triggered by internal navigation and Back/Forward.
   - Nav buttons, footer buttons, Studio new-etude action, collection etude selection, Home's create-etude callback and imported-file destination all use `navigateTo(page,id?)`.
   - Passes a `navigate(page,id?)` callback into the Home module; the Home module has no direct browser route logic.
   - Registers the optional Android Back listener once at startup after the initial render.
   - Keeps `page === 'studio'/'practice'` checks, CSS selectors, Studio editor, Practice learner function, audio, score, recording, AI generation, file validation and data storage unchanged.

3. **`web/src/home.js` — remove hidden hash navigation paths:**
   - Removed `navigateToEtude()` that previously set `location.hash`.
   - The desktop hero cards already received a navigation callback and continue to use it.
   - The dashboard now receives that same callback and uses it for recent Etudes, View All Etudes, Start Practicing and individual Practice shortcuts. This prevents unintentional reintroduction of `/#studio` from the Home dashboard.
   - The Home module remains presentation-focused. A source-level search of the entire `web/src/` directory found no live `location.hash = ...` assignments outside the centralized router's legacy link parser (the remaining `hashchange` in `studio-dialog.js` is only for closing a dialog on old-link navigation).

4. **`scripts/goosh_server.py` — web server deep-link and refresh fallback:**
   - Added `GooshHandler._serve_app_route()` plus `do_GET()` and `do_HEAD()`.
   - For only the recognized path shapes `/etudes`, `/etudes/<local-id>`, `/practice`, `/practice/<local-id>` (optional trailing slash), rewrites the HTTP file request internally to `/index.html`. No HTTP redirect; the clean browser URL remains visible.
   - Asset requests (`.js`, `.css`, images, etc.), `/api/generate-etude`, `/api/design-practice` and unknown paths **are not** rewritten to the SPA entry point; missing assets should still report missing files.
   - The Python rewrite accepts a single non-empty path segment without a literal dot or slash; this includes the application's UUID/local IDs and percent-encoded segments. Dotted path IDs remain intentionally unsupported by the native local-serving contract. The JavaScript router decodes valid percent encodings but will only find a saved etude when the decoded ID exists in the local collection.
   - Existing POST AI endpoints and the Python-only local backend architecture are unaffected.

5. **`web/index.html` — root-relative asset resolution:**
   - Added `<base href="/">` ahead of stylesheets and scripts. Since a direct visit to `/etudes/abc` loads `index.html`, this prevents `style.css`, `./src/app.js`, `./practice-goals.json` and brand images from being incorrectly requested under `/etudes/` or `/practice/`. This base also resolves to the native WebView app root on `https://localhost` (Android Capacitor) and `capacitor://localhost` (iOS Capacitor).
   - Bumped `app.js` module import cache key to `clean-routes-1` so browsers load the changed routing logic.
   - This application now assumes **root deployment** at `/`; deployment under a subdirectory such as `/goosh/` needs deliberate base-path and rewrite changes instead of silently relying on relative assets.

6. **New `web/src/native-navigation.js` — Android Back interaction using the same Router:**
   - Detects `window.Capacitor.getPlatform() === 'android'` and subscribes to the official Capacitor App plugin's `backButton` event. It does not install listeners on plain web or iOS.
   - When a native Back event arrives: (a) close an open native-HTML `<dialog>` first; (b) otherwise call `history.back()` if the WebView reports `canGoBack` (the shared `popstate` callback renders the previous route); (c) if there is no WebView history and the current route is not Home, replace the route with Home; (d) only at Home with no history, call `App.exitApp()`.
   - There is no second route table, no separate Android page state, and no new platform UI. The iOS app uses the shared `pushState`/`popstate` route navigation plus the existing in-app Back-to-list control. iOS navigation gestures were **not** enabled or confirmed on a real device.
   - The handler uses the Capacitor native-injected `window.Capacitor.Plugins.App` bridge, matching the existing application's native bridge usage; it does not import a package into the static ESM web bundle.

7. **`package.json` — add only the required compatible official plugin:**
   - Confirmed the preexisting dependencies were `@capacitor/core`, `@capacitor/android`, and `@capacitor/ios` at `7.4.3`, with no `@capacitor/app`.
   - Added `"@capacitor/app": "7.1.0"` (official Capacitor 7 major) to handle Android native Back. No router library or UI framework introduced.
   - This GitHub integration updates source files but **does not run `npm install`, `npx cap sync`, Gradle, or Xcode**. A local build must fetch the dependency and sync native projects first:
     ```sh
     npm install
     npx cap sync android
     npx cap sync ios
     ```
     For a first-time platform setup, run the existing `npm run android:init` or `npm run ios:init` before the relevant sync. No native `android/` or `ios/` folders are tracked in this repository, and they were not fabricated.

8. **`web/src/studio-dialog.js` — modal lifecycle compatibility:**
   - Existing route-close listener based on `hashchange` alone was insufficient for History API browser Back.
   - Also listens to `popstate` while a confirmation dialog is open and cleans up both handlers on close. A Back action will not leave an orphaned confirmation modal behind. Existing dialog styling and business rules remain unchanged.

## Web hosting requirements

The checked-in `scripts/goosh_server.py` handles direct requests and reload on the new routes. On any **other** production web server or static hosting service, supply an equivalent SPA rewrite for `/etudes[/id]` and `/practice[/id]` to serve `/index.html` (HTTP 200 without changing the URL). Do NOT rewrite `/api/` requests or all missing JS/CSS assets to HTML. The server's current API-key storage and AI endpoints are separate from front-end routing. If hosted at root, any CDN/reverse-proxy/hosting config must resolve `/src/`, `/brand/`, `/style.css`, `/practice-goals.json` and other bundled assets at the root.

The new URL structure does not create authenticated sharing, Universal Links, Android App Links, or server-side etude sync. Those capabilities require separate product decisions and explicit authorization.

## Validation and regression checklist

**Completed via connected-source inspection and executable JS harness:**
- JavaScript syntax parse passed for `router.js`, `native-navigation.js`, `home.js`, `app.js`, `studio-dialog.js`, `studio-practice.js`, and `studio-etude-generation.js`.
- Mock History API scenarios passed: legacy `/#studio/:id` and `/#practice/:id` migrations, `/index.html#studio` migration, direct `/etudes/:id` route parsing, `/practice` route parsing, encoded IDs, clean history pushes, navigation change notification and ignoring redundant same-path pushes. New navigation produces no hashes.
- Confirmed the `<base href="/">` element precedes stylesheets and the app import, and verified package versions and Python source presence of both `do_GET` and `do_HEAD` fallback methods.
- Inspected every JS file under `web/src/` for old `location.hash` navigation assignments; only compatibility parsing/cleanup retains hash references.

**Not executable in this GitHub-only session; must be tested locally before release:**
1. `npm install`, then `npm run web`. Verify `/`, `/etudes`, `/etudes/<real locally saved UUID>`, `/practice` and `/practice/<UUID>`; verify direct address-bar entry and Refresh both show the correct view and every stylesheet, script, sample, and image loads.
2. Browser Back/Forward across Home, library, detail, Practice, and imported etude. Test switching languages/themes and editing an etude after navigation; data should persist in the same localStorage collection.
3. Visit legacy `/#studio/<UUID>` and `/#practice/<UUID>` bookmarks; verify `replaceState` upgrades them without adding an extra Back step.
4. Android: after dependency install and `npx cap sync android`, build/run a fresh APK; verify navigating between views, native hardware Back from detail -> library -> Home, closing an open dialog on Back, then exiting only from root with no history. Also check reload/resume while on nested path and that `https://localhost` assets resolve correctly.
5. iOS: after dependency install and `npx cap sync ios`, build/run in Xcode on Simulator/device; verify the same local navigation, the in-app Back-to-list action, state restoration and `capacitor://localhost` asset resolution; check whether swipe history navigation is enabled by that platform configuration.
6. Verify new paths are not treated as filesystem assets, missing JS/CSS remain 404, and both `/api/` endpoints retain their original JSON responses. Current Python GET fallback was reviewed but a live web-server regression test and Python compilation were **not** executed in this session.
7. Production hosting (if different from `goosh_server.py`) needs a separate route rewrite configuration and end-to-end deep-link smoke test.

**Preserve:** Existing Etude Studio composition rules, key-signature editor, audio and AI logic; Practice runner logic and `e.rule`; canonical `etude.notes` plus multiple `practiceSequence` steps; the ten-goal catalog; existing design tokens; and all functionality outside navigation. No additional page component or second repository is required.

- Final server rewrite refinement: the route fallback now also accepts percent-encoded single-segment IDs (e.g. `%20` in a URL path), while still excluding file extensions (literal `.`) and nested routes. This aligns the Python server more closely with `encodeURIComponent`-based URL generation. Automatically generated local etude IDs remain UUID-compatible and do not need escaping.


### Final route regression checks (same branch)

- An isolated, executable JavaScript mock of the new Router passed clean-path creation and reading, legacy Studio/Practice hash upgrades (including `/index.html#studio`), single-entry history pushes, no duplicate navigation and correct URL encoding/decoding for route IDs. No hash URL is produced for newly selected routes.
- An isolated, executable mock of the Android App-plugin callback passed priority handling for an open dialog, `history.back()` when `canGoBack=true`, replacement navigation to Home on a direct-start nested route without history, exit only at Home without history, and no Android Back listener registration on iOS.
- Re-read the pre-routing `redesign` version and the current feature-branch source: the body of `function practice()` is **byte-for-byte identical** (5,975 bytes). The routing listener immediately following that function changed, but exercise execution did not.
- Parsed the changed JavaScript sources without syntax failures. The Python server logic was inspected at source level; no Python runtime compilation or network-backed server/device verification was possible. A container GitHub checkout attempt failed because the execution container could not resolve github.com; the connected GitHub source was the authoritative editing and inspection channel.


---

# Studio UX refinement: Iranian/Western AI composition and single-goal Practice Design (2026-11-21)

**Repository:** `abbasnosrati/Goosh-v2`. **Branch:** `feature/practice-sequence-studio` from `redesign`. This section supersedes older documentation wherever it describes the former standalone `AI: Design exercises` disclosure, the old preselected Practice Design goal, or the AI composer as Iranian/Dastgah-only.

## Approved user journey and non-negotiable rules

The teacher identified a UX conflict: when composing music through AI, the teacher had to select a training goal *above* the score, while the Practice Designer *below* simultaneously presented another selectable goal, Add Exercise and the independent AI design disclosure. This created competing decisions. The approved solution is **not** a wholesale restructuring of the Manual composer or a multi-score Etude architecture.

- **Manual mode:** Preserve the existing normal Studio editing journey. The teacher can author notes and use Practice Design. No new first-Generate prerequisite applies to Manual mode. The Practice Designer has a blank goal placeholder by default, requiring an explicit choice before adding a new exercise.
- **AI mode on a new, empty Etude:** Freeze/disable the Practice Design section **until successful first AI music generation**, with a short visible explanation. The muted section remains visible to orient the teacher but is not interactive or keyboard-focusable while frozen. The primary AI training goal is chosen above, along with musical system and scale/dastgah. Generate composes the canonical Etude's music, creates exactly one default `practiceSequence` item for the chosen goal and opens that item. Practice Design is then unlocked. Merely placing notes manually while the first-AI workflow is pending must not accidentally unlock it.
- **AI mode on an existing Etude:** If the Etude already contains notes and/or saved practice steps, Practice Design remains available. Switching modes never deletes notes or exercises, and the current `practiceSequence` stays intact. `Regenerate Etude` is a separate explicitly confirmed destructive operation, as documented above.
- **One Etude, one canonical score, multiple different practice steps:** `etude.notes` remains the single source of musical truth. Adding a manual or AI-designed exercise changes only `practiceSequence`; it does **not** call `/api/generate-etude`, recompose notes, copy the score, or change tunings.
- **The current Practice learner/runtime stays unchanged** and continues to use `e.rule` until a separately authorized player implementation exists. Changing the authoring UI here is not the same as implementing 10 learner-facing modes.

## Musical-system selector and supported generation

The AI composer now contains an actual `input[type="radio"]` group under **Musical System**, with two choices:

- **Iranian Music** — the next select is explicitly labelled **Dastgah**, currently listing Shur, Segah, Mahur, Homayun, retaining their previous generation behavior and special Shur ABC pipeline. Do not rename this to Western modes or remove the Persian microtone support.
- **Western Music** — the next select is labelled **Scale / Mode**. Western Music here means **Western tonal scales and modes**, *not* Arabic/Turkish/Indian or other traditions. Supported items: Major (Ionian), Natural Minor (Aeolian), Dorian, Phrygian, Lydian, Mixolydian, Locrian. These seven unique pitch collections avoid redundant Ionian/Aeolian duplicate menu entries. A **Tonic** selector provides all 12 chromatic tonics, with enharmonic labels for black-key choices. The server chooses the compatible single-accidental spelling for the selected scale/tonic (e.g. C-sharp vs D-flat) based on the existing notation capabilities.

This is **functional AI generation**, not merely radio-button mockups or a text rename. The user runs Goosh on desktop with `python3 scripts/goosh_server.py 8081 --bind 0.0.0.0`. No Node or npm installation is needed for desktop web testing. AI still requires an accessible OpenRouter API key/server as previously.

### Single Source of Truth for music catalogs

**New `web/music-systems.json`:** one data catalog read by BOTH the browser composer and the Python server. It contains system IDs, EN/FA labels, style IDs, EN/FA style labels, Western eight-degree chromatic interval formulas (tonic through octave), 12 chromatic tonic IDs/labels/possible enharmonic spellings, and **the existing Iranian mode's exact allowed pitch tokens, tonic, and microtone**. The last fields were moved out of the old hardcoded Python MODELS dictionary so the actual Iranian generation constraints remain identical without duplicate lists.

**New `web/src/music-catalog.js`:** caches one validated fetch of `./music-systems.json`; rejects missing/invalid catalogs and retries after fetch failure. Composer uses this loader, while Practice goal selection continues using the existing `web/practice-goals.json` as its authoritative ten-goal catalog.

**Updated `scripts/goosh_server.py`:**
- Reads `web/music-systems.json` at Python server startup (restart the server after updating this branch).
- Derives Iranian `MODELS`, Western `WESTERN_SCALES`, and tonic spellings from the canonical file.
- `generate_etude(..., music_system="iranian", scale=None, tonic="C")` preserves backward compatibility for callers omitting the new fields, validates the system and mode against the catalog, and retains the original Shur ABC parsing branch.
- Added `make_western_mode(scale,tonic)`, which derives valid diatonic note names and pitch tokens for eight successive scale degrees from interval formulas. It prefers a spelling requiring only naturals, single sharps and single flats; no double sharps/flats are sent into the current Goosh score model. The same existing schema, pitch normalization, frequency calculation, 16-note non-Shur POC rhythm pattern, OpenRouter integration and API endpoint remain in use. The generated music must use allowed scale pitches; prompt guidance is not a full expert-level composition validator.
- `POST /api/generate-etude` receives optional `musicSystem`, `dastgah`, `scale`, `tonic` and `practiceGoals`. The server validates any Western scale and tonic options, reuses the existing generic generator for Western non-Shur notation and recomputes canonical frequencies. The separate `/api/design-practice` endpoint is unchanged and never generates note data.
- OpenRouter's request title is now `Goosh Etude` rather than a Persian-specific label, because it serves both traditions.

**Updated `web/src/ai-etude.js`:** `generateStudioEtude(context,current,signal,practiceGoals)` now sends the selected musical context explicitly instead of a single `dastgah`. `convertEtude` only activates the specialized Shur/free-meter converter when the selected context is **Iranian Shur**; Western modes use the existing standard 16-note adapter and the existing `freq()` / `valid()` verification. The error message explains how to launch the Python server directly on port 8081.

**Updated `web/src/studio-etude-generation.js`:**
- Actual accessible radio controls, contextual Dastgah vs Scale/Mode dropdown, Western-only Tonic dropdown, unchanged required AI Primary Practice Goal.
- State for last chosen style per musical system and the current tonic is transient per-etude UI state in the existing WeakMap, not a second saved score model or duplicate goal source.
- Music choices are read from the shared JSON. `Generate` remains disabled until catalogs, musical style and a training goal are ready. Chord Recognition remains visible but unavailable to generate because the current score is monophonic.
- Maintains `awaitingFirstAI`: entering AI on a new completely empty Etude activates the workflow freeze, which remains until **successful Generate**. Returning to Manual unlocks immediately. Entering AI on existing notes/steps does not freeze. On API failure, cancellation or incomplete response, saved content is not overwritten and the new-Etude workflow remains frozen.
- `onModeChange(locked)` communicates only the frozen/unfrozen presentation state to the existing Practice Design host; it does not edit `e.practiceSequence` or the music.
- Existing confirmed Regenerate behavior is preserved: it replaces canonical notes and practice sequence only after successful generation and deliberate confirmation.

## Practice Design UX — no redundant goal selector in AI

**Updated `web/src/studio-practice.js`:**
- The **only Practice Design goal picker** is now a select with a **blank, explicit placeholder** (`Select a practice goal…`). It no longer defaults silently to the first goal.
- **Add Exercise** and **Design with AI** are adjacent actions reading this very same select; neither action works until an explicit goal is chosen.
- Both are genuinely `disabled` when the goal is empty. A compact `role="tooltip"` message, `Select a practice goal first.`, appears via a focusable wrapper on mouse hover, keyboard focus or pointer/tap. The wrapper receives pointer events even though the actual button is disabled. This is **not** a browser alert, confirm, or a blocking dialog.
- Add Exercise directly appends one `newPracticeStep(selectedGoal,catalog)` with default settings and expands it. The canonical score is never changed.
- Design with AI now opens a **native HTML `<dialog>`** styled using Goosh's existing modal classes. It displays the **already chosen goal as read-only text** (NO second goal select), an optional teacher-instruction textarea, Generate Exercise and Cancel buttons, and accessible in-modal status/error text.
- On Generate Exercise, POST the chosen goal, optional instructions and a bounded copy of the existing score context to the pre-existing `/api/design-practice`. Validate the returned settings against the shared catalog, create and expand one exercise, and keep music unchanged. On failure, keep the modal open and show an in-app error. Cancel or modal close does not write any data; an AbortController cancels a pending request.
- Existing practice items can still be rearranged, duplicated, edited and deleted through their original controls. Existing in-app delete confirmation is retained. Selected Goal and expanded-card state are preserved during regular Practice Design rerenders.
- **New `setStudioPracticeLocked(host,locked,fa)`** toggles `inert`, the visual freeze class, `aria-hidden`, and a localized explanatory message on the existing Practice Design section; it does not remove saved steps. Crucially, rerenders inherit **the section's actual current inert state**, so returning to Manual and editing cannot accidentally reactivate the AI freeze due to a stale initial option.
- The former `AI: Design exercises` `<details>` and independent always-visible AI prompt have been removed, not duplicated in another part of the page.

**Updated `web/src/app.js`:** imports the exported `setStudioPracticeLocked`; mounts the existing composer with `onModeChange`, then the existing Practice Designer with the composer-provided initial locked flag. Switching Manual/AI toggles only the Practice Designer's interactive state, without remounting the score or rewriting notes. After generated content is saved, the existing rerender opens Practice 1. The router, sound engine, key-signature tools, legacy Practice learner and unrelated pages are unchanged.

**Updated `web/practice-designer.css`:** scoped Studio-only layout for the new radio group, two side-by-side Practice Design buttons, disabled styles and focus/hover/touch tooltips, AI instructions modal, and frozen practice explanation. Existing CSS color variables are reused; no new palette, framework, global change, or unrelated restyle. Responsive layouts stack or shrink safely. The stylesheet and JavaScript import cache-version URLs were updated in `web/index.html` and related module imports.

## Regression and testing record

**Completed (non-network, source-level and isolated tests):**
- All edited JS modules pass syntax-only parsing: `app.js`, `studio-etude-generation.js`, `studio-practice.js`, `ai-etude.js`, `music-catalog.js`, `studio-dialog.js`.
- Ran an isolated JavaScript DOM mock against the **actual connected-repository composer source**: checked that a new AI etude freezes, returning to Manual unfreezes, Western Scale/Mode choices appear, Generate is disabled until a goal is explicitly selected, the request uses selected Western Phrygian/E tonic and `pitch-matching` goal, successful generation creates the first Practice Step and unlocks design, and existing Etudes are never frozen upon switching to AI.
- Ran an isolated JavaScript DOM mock against the **actual connected-repository Practice Design source**: both buttons disabled without a goal, two in-app tooltips exist, selecting a goal enables both actions, Add Exercise inserts only one step, the selected goal survives a rerender, AI opens a modal with **no second select**, its request contains that one goal, it appends a second step without changing notes, and lock/unlock keeps existing steps intact.
- Independently verified all **84 Western scale/tonic combinations** (7 distinct diatonic scales/modes × 12 chromatic tonic classes) can be spelled within single-sharp/single-flat notation and that every generated pitch maps to the exact intended semitone and Goosh pitch-class tuning. This is **algorithmic math validation**, not an OpenRouter generation-quality test.
- Python source and data contracts were inspected, but no live Python server, OpenRouter request, browser visual regression, Android build or iOS build was executed via the connected GitHub editing workflow. No claim of full end-to-end verification is made.

**Manual desktop acceptance checklist (`python3 scripts/goosh_server.py 8081 --bind 0.0.0.0`):**
1. Stop and restart the Python process after fetching these commits (the server reads both catalogs on startup). Refresh `http://localhost:8081/etudes/<local-id>`.
2. In Manual: verify Studio and Practice Design are fully usable; Goal has an explicit unselected placeholder; hover/focus/tap either disabled action to see its hint; select a goal to enable both. Add Exercise -> Practice 1.
3. Choose Design with AI on the **same** selected goal; check the modal has no second goal input, cancellation writes nothing and success adds Practice 2 without modifying `etude.notes`. Errors should remain inside the modal rather than native alerts.
4. Start a new empty Etude, select AI. Confirm the entire Practice Design section is muted/inert and explains to generate first. Select Iranian and Shur, pick a primary goal, Generate. On success the generated score appears on the existing staff, Practice 1 expands and the frozen section unlocks. The same procedure should work for Western Major/Minor/Modes with Tonic and valid OpenRouter credentials.
5. Switch back to Manual before Generate to ensure the Practice Design reactivates. With an existing Etude containing notes/practices, switch to AI and back; make sure all stored settings remain visible and unchanged.
6. Test Regenerate confirmation separately (Cancel preserves existing work; success creates a new score and one new practice). Test both languages, dark/light themes and mobile-width layout in the desktop browser.
7. On this Python backend, an API request that fails because no OpenRouter key is configured should present the error in context without erasing the Etude. No npm install is required to run the **desktop web** server.

**Do not** reinterpret “Western Music” as all global music traditions, reintroduce a second Goal in the AI modal, unfreeze the first-AI workflow on incidental note edits, create multiple scores per etude, or change the legacy learner runtime without explicit user authorization.


---

# Real-time musical key-signature and pitch synchronization across AI/score/playback (2026-11-21)

**Repository:** `abbasnosrati/Goosh-v2`, **branch:** `feature/practice-sequence-studio`. This section records the follow-up request: selecting *any* supported Iranian dastgah, Western Major/Natural Minor, mode, or Western tonic in the AI composer must immediately apply the appropriate signature accidentals to the existing score everywhere they are used, affect actual piano/playback/Practice frequencies, and be conveyed to AI. After selection, a teacher can further adjust signs and cents in the existing **Edit Key Signature** editor. Do NOT just decorate the AI dropdown or add a second sound model.

## Canonical design and invariants

1. **The authoritative pitch model is still `e.key`, `e.offset`, `e.marks` and `freq(e,m)`.** The Etude has exactly one canonical `e.notes` array, shared by any number of Practice Steps. A musical preset is only a *way to populate* the existing signature, not a parallel source for notes, audio, or playback. Key editor, score, piano/live voices, score transport, old Practice playback and export all read the existing Etude model.
2. **Selecting a Dastgah/Scale/Mode immediately applies the preset** before AI music generation: e.g. Iranian Shur -> B-flat, E-flat, A-koron; G Major -> F-sharp; A Natural Minor -> no key signs; E Phrygian -> the corresponding flat degrees. Changing Western tonic reapplies the newly selected mode's accidentals. On a previously chosen system, switching back from the other radio option restores and reapplies that system's selected preset. No notes are generated or deleted by choosing a musical mode.
3. **Preset selection is an intentional retune of the canonical Etude.** It replaces `e.key` with the selected signature and resets previous `e.offset` fine-tunings; accidentals' default cent values are normalized to standard `♯:+100`, `♭:-100`, `Koron:-50`, `Sori:+50`. The teacher can then open Edit Key Signature to change a mark or make fine adjustments. Those manual changes are saved and immediately affect all existing `freq(e,m)` consumers (including the piano and score playback). The next AI generation sends those currently effective cents. Switching to a *different* musical preset deliberately resets the custom edits to that preset's defaults.
4. **Do not silently retune on an ordinary page render.** Musical-style selects initially use an unselected placeholder on a brand-new Etude. Merely entering AI mode must not overwrite the signature of an already-authored Etude, and loading its saved `musicContext` must not reapply the preset over the teacher's custom tuning. Only an *actual user selection/change* of a style, tonic or a radio switch to a previously chosen style applies a preset.
5. **Existing compatibility:** imported / old Etudes without `musicContext` remain valid, retain their original notes and tuning, and do not trigger any automatic migration. Older AI-generated Etudes may contain the earlier MIDI-accidental representation; this change fixes **new** AI conversions but does not silently rewrite older files. If older notes sound wrong, they require a separate explicit and safely validated migration or regeneration.

## Code changes and responsibilities

**New `web/src/music-signature.js`:**
- Pure functions `westernPitchTokens(catalog,style,tonic)`, `signatureForMusic(catalog,context)`, `applyMusicSignature(etude,signature)`, `effectiveTuningCents(etude)`, and `orderedSignatureEntries(key)`.
- Derives the seven diatonic degree spellings (plus octave) from the existing `web/music-systems.json` tonic spellings and chromatic interval formulas. Prefers a valid enharmonic spelling with only naturals and single sharps/flats, compatible with the current Studio model. Iranian key-signature pitch tokens come from the existing catalog: Shur's three marked pitches and the supported Segah/Homayun koron sets, etc. No new hardcoded mode lists were added.
- Converts tokens to the **natural-letter pitch class** keys used by `e.key`, e.g. F-sharp changes `e.key[5]='♯'`, not `e.key[6]`. E-koron uses `e.key[4]='کرن'`. Reapplying a preset resets `e.offset` so stale cents from a previous scale do not leak. Never clone or store a second music score.
- `effectiveTuningCents` serializes **all seven natural pitch classes**, including 0 cents, into a JSON-friendly object, calculated from the *current* `e.key`, `e.offset` and `e.marks`. Including zero-valued entries ensures that a teacher manually removing a preset accidental remains unambiguously natural in the Python AI response.
- `orderedSignatureEntries` orders sharps by **F, C, G, D, A, E, B** and flats by **B, E, A, D, G, C, F** for conventional key-signature engraving. Mixed Iranian signatures still use the current `e.key` values and renderer.

**Modified `web/src/studio-etude-generation.js`:**
- Loads and uses `signatureForMusic` on explicit Dastgah/Scale/Mode select changes, Western Tonic changes, and switching radio systems when a style has already been chosen in that system. Calls the `onSignatureChange(signature,context)` callback immediately. Only the existing shared music-system catalog supplies mode definitions.
- Style selects now have an explicit blank `Select a Dastgah…` / `Select a scale or mode…` placeholder; Generate still requires the style and the primary practice goal. This avoids accidentally retuning an existing Etude just by entering AI.
- Initializes the UI's selected musical system, style and tonic from `etude.musicContext` if available. **Crucially it does not call the preset callback on initial load**, preserving edits the teacher previously made from the key editor.
- The previous Manual/AI toggle, Practice Design freeze and Regenerate confirmation remain intact.

**Modified `web/src/app.js`:**
- Passes `onSignatureChange` to the existing Studio composer. On change, checks route/Etude identity, stops held notes, transport and signature preview, applies `applyMusicSignature` to **the current `e` object in-place**, writes `e.musicContext`, saves the same localStorage Etude, then calls `sheet()` to refresh the main score **or** the Key Signature Editor. Piano key tooltip frequencies are recalculated in place, while actual piano notes always use the current `freq(e,m)` on each key press.
- No full Studio rerender is needed merely for a musical-mode selection. The score/piano/recording engine, old Practice runtime and routing flow are not rewritten. Existing manual signature editing uses the same `e.key` and `e.offset`, so its changes are immediately heard and included in future AI tuning requests.
- Bumped score/composer module version keys to ensure desktop reloads do not keep using the old adapter code.

**Modified `web/src/model.js`:**
- New Etudes have optional `musicContext: null`. When a user selects a mode, the compact context is persisted, e.g. `{musicSystem:'western',scale:'major',tonic:'G'}` or `{musicSystem:'iranian',dastgah:'shur'}`.
- `valid(e)` accepts legacy files missing this property, validates the optional known-shape data, and does not change any note, pitch offset, audio or practice step representation. **This context is descriptive metadata; `e.key` remains the only authoritative sounding signature.**

**Modified `web/src/score.js`:**
- Renders key marks via `orderedSignatureEntries(e.key)` rather than numeric object-key sorting; this shows a conventional order for Western key signatures. Adjusts the common G-flat / F-flat staff positions to the usual flat register. Remains wired to the same score and `e.key` used by the Key Signature Editor. No duplicate accidental state.

**Modified `web/src/ai-etude.js`:**
- **Critical tuning bug fix for new AI Etudes:** previously the adapter decoded e.g. `F#4` as *MIDI F#* and also inserted a sharp into the key. Then `freq(e,m)` could apply an alteration to an already altered pitch (or attach the sign to the wrong letter). The converter now always stores the **natural written letter's MIDI** (e.g. F4, MIDI 65), while the signature `e.key[5]='♯'` performs the single +100-cent alteration. For B-flat, store B-natural MIDI 71 and let `e.key[11]='♭'` perform -100 cents. For E-koron in Segah, store E-natural MIDI 64 and let `e.key[4]='کرن'` perform -50 cents.
- The historical special Shur `Ek4` versus `Eb4` coexistence case remains explicitly supported through a separate D-sharp +50-cent encoding with `staffM=E` and an explicit koron mark, since the score's per-letter signature cannot hold both E-flat and E-koron simultaneously. This isolated exception is not generalized into a second note model.
- `convertEtude` preserves the **currently selected and optionally manually tuned** `current.key` and `current.offset` rather than deriving a second signature from AI output. It still verifies all returned note frequencies against `freq()` and validates the saved Etude format.
- `generateStudioEtude` sends the selected music system/style/tonic **and** the canonical `tuningCents` dictionary to the same `/api/generate-etude` Python endpoint. No new API endpoint, package or player was added.

**Modified `scripts/goosh_server.py`:**
- The existing `generate_etude` accepts optional `tuning_cents`, and its POST handler extracts `body['tuningCents']` without changing the established endpoint names. It validates exactly seven natural pitch-class keys and numeric, finite cents between -1200 and +1200.
- Sends the active tuning to OpenRouter as part of the AI musical guidance, alongside the chosen Iranian/Western mode and its allowed pitch tokens, so the prompt knows the correct active pitch environment.
- Normalizes **the server's own resulting pitch frequency values** from the supplied effective tuning after AI generation; it does not trust the model's arbitrary frequency guesses. Both the generic 16-note JSON mode and the existing special Shur ABC parser use a `frequency_for_pitch` callback. If no new tuning is supplied (legacy callers), the original standard `get_frequency` logic remains.
- For the special Shur `Ek4` explicit accident, the callback retains E half-flat (-50 cents) even though `e.key[E]` may be E-flat, matching the client's isolated D-sharp-plus-50-cent encoding.
- The Python server remains **standard-library only**. Run the desktop version using `python3 scripts/goosh_server.py 8081 --bind 0.0.0.0`, not npm. Restart after updating code because music catalogs are read on startup.

**Modified `web/index.html`:** the app entry module version was bumped to `key-signature-sync-1`. No page layout, new library, new routing scheme or platform-specific alternative was introduced.

## Verified behavior and limitations

**Source-level / isolated JS verification completed on this branch:**
- Passed syntax parsing for `web/src/app.js`, `score.js`, `model.js`, `ai-etude.js`, `studio-etude-generation.js`, `music-signature.js` and the unchanged `studio-practice.js`.
- Verified all **88 preset selections** (4 Iranian + 7 Western scales × 12 tonic classes) with exact signed-cent frequency comparisons. All **84 Western** synthetic sixteen-note AI responses passed the updated `convertEtude` musical-note encoding, frequency tolerance and `valid(e)`.
- Verified the Shur exception permits E-koron alongside E-flat at their distinct correct frequencies and score spellings.
- Verified the D Major F-sharp signature plus a manual +15-cent override results in +115 effective cents passed to AI.
- Verified conventional E-major signature order `F#, C#, G#, D#` (by staff letter).
- Verified the source-backed composer UI behavior with a simulated DOM: explicit Shur selection applies B-flat/E-flat/A-koron; initial composer load does not change the signature; a remount restores its Dastgah and preserves manual edits; choosing Western then C Major resets marks, and choosing G tonic applies F-sharp; another remount preserves Western context and manual +22-cent tuning.

**Not verified in a real browser, live Python/OpenRouter server or native device:** audio quality, visual accidental alignment, end-to-end HTTP response, Python source compilation and production persistence after a complete process restart should be manually smoke-tested. The new key encoder is verified through simulated AI responses but actual OpenRouter-generated output can still violate musical/pedagogical constraints.

**Desktop acceptance steps:**
1. Get the latest branch code, restart the Python server at port 8081 and hard-refresh the browser. Open a new Etude, switch to AI.
2. Choose Iranian Shur: inspect Score and Edit Key Signature for B-flat, E-flat and A-koron *before* pressing Generate. Press/preview the matching natural piano pitches and verify the altered frequencies. Switch to Segah/Homayun for their E/A koron signs and Mahur for the natural signature.
3. Switch to Western, select C Major (natural signature), G Major (F-sharp), D Major (F-sharp/C-sharp), and a modal such as E Phrygian (flats). Change the tonic, verifying both key-signature display and piano/score notes update immediately. No additional practice should appear until explicit Generate.
4. Open Edit Key Signature, change one mark or fine-tune cents, return to the score; the frequency changes should persist. Refresh the page; the saved music-system selection should return **without overwriting your manually tuned pitch**.
5. Generate an AI Etude with valid credentials. The generated notes must follow the selected signature and sound in that tuning, with no doubled sharps/flats; further changes in Edit Key Signature should affect playback. For Shur, verify the special E-koron/E-flat alternate handling.
6. Add a second Practice Step; neither the musical signature nor notes should regenerate. Return to Practice and check that its existing player reads the updated canonical frequency values. Test existing/imported Etudes for backwards-compatible loading.
7. If switching to another mode intentionally, expect manual tuning overrides to reset to the newly selected mode's canonical accidental values. This is the only automatic reset; ordinary screen mounts should never do it.

**Avoid follow-on scope creep:** Do not rewrite the Practice runtime, do not create a new staff/key editor, do not migrate historical AI notes silently, do not create one score per Practice Step, and do not change mobile/audio engines or shared color/design without explicit authorization.


---

# Manual + AI share musical-system selection and live key signature (2026-11-21 follow-up)

**User request:** The Iranian Dastgah / Western Major, Minor and Modes selector must also be available in **Manual mode**, not only AI. Selecting a musical system, scale/mode or tonic must immediately establish the existing Etude's key signature and affect score, piano and pitch frequencies. If desired, the teacher subsequently opens the existing **Edit Key Signature** to customize marks and cent offsets. This follow-up is strictly a Studio UX positioning change that reuses the previously implemented shared music catalog, signature/frequency synchronization, and saved `musicContext`.

## Implemented layout

**Updated `web/src/studio-etude-generation.js`:**

- A single, shared **`studio-compose-music`** section appears **below the Manual / AI toggle and above AI-specific content**. It holds the same real Iranian Music vs Western Music radio group, Dastgah/Scale/Mode select and Western-only Tonic selector. There is **one instance**, not duplicated forms with competing state.
- **Manual mode (initial default):** The shared musical controls are visible and usable. The previous AI Primary Practice Goal, Generate/Regenerate and AI-specific instructions remain hidden. The teacher selects a mode and immediately sees its marks on the existing score, can play the newly tuned notes and can proceed to ordinary handwritten/piano note entry, then adjust marks/frequencies using Edit Key Signature. **No AI call and no automatic Practice creation** is triggered by selecting a mode.
- **AI mode:** The very same shared musical controls stay visible with the user's existing system, scale and tonic selections. Only below them does the existing AI-specific Primary Practice Goal and Generate area appear. Switching between Manual and AI does not silently reapply a preset or erase previously edited frequencies.
- The actual music selection change handlers are unchanged and invoke the existing `signatureForMusic(musicCatalog, selectedContext())` and `onSignatureChange(signature, context)` callbacks. The existing `web/src/app.js` callback applies the canonical `e.key`, `e.offset`, `e.marks` and `e.musicContext`, saves and refreshes the score and piano frequencies. No duplicated per-mode tuning logic, extra preset models, or changes to `freq()`.
- A short localized explanatory hint in the shared section explains that choosing a mode sets score/piano tuning and **Edit Key Signature** allows subsequent fine-tuning. It is a text hint, not an extra modal or a separate editor.

**Updated `web/practice-designer.css`:** Small Studio-scoped spacing for the always-visible music selector, a muted hint and the AI-only goal. Uses the existing theme tokens, supports the existing responsive grids and avoids any unrelated visual redesign.

**Updated `web/src/app.js` and `web/index.html`:** Bump the Composer module import and page/CSS cache keys to `shared-music-manual-1` so local desktop browser hard refreshes load the updated code. The Python server continues to run at `python3 scripts/goosh_server.py 8081 --bind 0.0.0.0` without npm.

## Important boundaries

- The canonical signature/tuning still lives in the Etude; both authoring modes only *operate on the same existing state*. Manual edits via **Edit Key Signature** persist across rerenders and changing the composer mode. An explicit selection of a different preset intentionally replaces previous tuning/offset values, per the earlier accepted behavior.
- Music choice does not overwrite/delete already-authored notes, existing `practiceSequence`, audio recordings, or the legacy Practice player. The prior AI-only first-generation Practice Design freeze logic is unchanged. In Manual, Practice Design remains available as before.
- On a newly created Etude, the Dastgah/Scale selector initially has the blank placeholder; opening the page alone does not forcibly select a preset or retune pre-existing data. An explicitly selected option immediately updates the staff and actual frequencies.
- No new Python endpoints, npm dependencies, React/Router, or iOS/Android-specific code were needed for this request.

## Verification performed (isolated JS test with fetched repository source)

The current `mountEtudeComposer` source was evaluated with a simulated document, actual `music-signature.js` helpers and `model.js` `freq()` implementation. The checks all passed:

1. Manual is the initial active mode, AI-specific Goal and Generate content is hidden, and the radio/mode/tonic controls live in a distinct, visible shared section outside that hidden content.
2. Selecting **Iranian Shur in Manual** immediately applies B-flat, E-flat and A-koron to the canonical Etude key; no Generate callback fires.
3. Selecting **Western G Major** through the shared Manual radio, scale and tonic controls applies F-sharp; the actual F4 frequency changes by +100 cents without AI generation.
4. The same original etude note count and Practice Sequence length remain unchanged while selecting music in Manual.
5. The `musicContext` metadata is saved alongside canonical key changes. A rerender does not overwrite a manually added +23-cent offset. Moving from Manual to AI and back retains the mode and the custom tuning without reapplication.
6. Entering AI on an Etude with existing notes/steps does not freeze Practice Design or remove any content.

**Not tested in a real browser/device:** final on-screen layout, click ergonomics on a mobile-width viewport, actual piano audio, live OpenRouter API. JS parse checks and behavior mocks do not substitute for those checks.

**Desktop acceptance:** Fetch branch, restart Python if necessary, hard-refresh `http://localhost:8081/etudes/<your-etude-id>`, verify the music selector is visible in Manual, select Shur or G Major and inspect the immediately changed staff and piano notes. Use **Edit Key Signature** to adjust a pitch's cents, return to Manual and then toggle AI; the edits should stay. Finally verify AI Primary Practice Goal and Generate appear only in AI, and existing exercises/notes are untouched by a mode selection.

This section supersedes any earlier handoff wording that says the musical-system controls are **AI-only**. AI goal/generation controls remain AI-only; musical-system selection is explicitly shared.


---

## Unselected music-system switch must clear the key signature (2026-11-21)

**Follow-up acceptance rule:** When the teacher switches between **Iranian Music** and **Western Music**, and the **destination** system has **no Dastgah / Scale / Mode selected**, the existing key signature must become completely empty immediately. Do not display or sound the source system's previous accidentals. The same rule applies if the user explicitly reselects the blank placeholder within the current system.

**Implementation:** `web/src/studio-etude-generation.js` now handles the empty style in `applySelectedSignature()`: when the shared music catalog is ready but `state.styles[state.musicSystem]` is empty, call the existing `onSignatureChange({key:{}}, selectedContext())` instead of returning without change. The existing app callback applies the signature to the original Etude in-place via `applyMusicSignature()`, clearing `e.key` **and** `e.offset` so both displayed marks and pitch frequencies return to natural tuning, then saves and refreshes score/piano labels. The unselected `musicContext` with empty `dastgah` or `scale` persists the destination radio choice across reloads without claiming a mode was chosen; the existing optional context validator accepts empty strings. The radio controls remain disabled until the shared music catalog is loaded to avoid race conditions.

**Preserved behavior:** Switching back to a system whose style was selected earlier in the current Studio session reapplies that chosen style. When both styles are unselected, both have empty key signatures. Choosing a new style immediately applies its signs. Manually edited cents are intentionally reset when a different preset (including a blank preset) is explicitly selected; ordinary page rendering does not reset saved adjustments. No note, practice step, score-editing tool, AI generation behavior or Manual/AI workflow is deleted or altered.

**Verification:** Isolated tests against the actual GitHub composer source, actual `music-signature.js`, and `model.js` passed: Shur displays B-flat/E-flat/A-koron; switching to unselected Western produces empty `e.key`, empty `e.offset`, natural 440 Hz A4 and valid saved Western/blank metadata; choosing G Major produces F-sharp; returning to the earlier Shur restores its signs; selecting the blank Iranian placeholder clears its signs; returning to earlier G Major restores F-sharp; rerender retains the selected signature and existing notes/practice steps. JavaScript parsing passed. Real browser/audio end-to-end validation remains to be completed.

**Cache:** Composer module import and `web/index.html` app entry are bumped to `clear-empty-music-1` for desktop browser reloads.


---

# Key Signature Editor navigation: entry in Musical System, return beside editor (2026-11-21)

**Approved UX:** Once Iranian/Western music selection was moved into the shared Musical System section (both Manual and AI), **Edit Key Signature** should live **in that same Musical System section**, not above the Score. However, putting **Back to Score** at that distant entry position would be confusing. Instead, show Back to Score **immediately beside the Key Signature Editor title** at the destination.

**Implemented (same branch `feature/practice-sequence-studio`):**

- `web/src/studio-etude-generation.js`: Adds one `Edit Key Signature` button immediately following the shared music selection/description, inside `.studio-compose-music`, using the existing app's treble-clef icon supplied by `signatureIcon`. It is available in **both Manual and AI**, and calls the injected `onEditKeySignature` function. It is hidden while the signature editor is already active to avoid duplicate or misleading controls. It is disabled during in-flight AI generation so opening the editor cannot abort an in-progress generation on composer rerender.
- `web/src/app.js`: Passes `signatureEditing:signatureMode`, `signatureIcon:scoreSignatureIcon` and `onEditKeySignature` to the same composer. Reuses one local `showSignatureEditor(editing)` handler for both entering and leaving the editor. On entry it retains the previous behavior: stop the current score transport/previous signature preview, initialize the selected signature pitch from `e.key`, set the tool to Select, and switch the **existing** `signatureMode` before rerendering. On exit it stops preview, sets `signatureMode=false`, and rerenders the normal Score. After either transition, it focuses the new `.score-heading` and smoothly scrolls it into view, respecting reduced-motion settings.
- The `.score-heading` now contains the **actual Score / Key Signature Editor heading**. Only when `signatureMode=true` does the adjacent **Back to Score** button appear there, using the existing `scoreReturnStaffIcon()` and localized text. There is **no entry/toggle button beside the normal Score title** anymore. The key-editor controls, staff drawing, tuning sliders and persistence are still the same.
- `web/style.css`: Keeps the existing neutral button styling, places the Back to Score action beside the actual editor title, allows wrapping at narrow viewports, and reserves scroll margin for the top header. The old sibling-title selector was replaced with a heading-contained title selector.
- `web/practice-designer.css`: Styles the single Musical System Edit button using the existing theme variables, supports keyboard focus and keeps it hidden while already editing; no new palette or unrelated visual changes.
- `web/index.html` and `app.js` module import: use the `key-editor-navigation-1` cache key so the desktop browser receives new HTML/CSS/JS.

**Tests performed:** Current GitHub JS source parsed. An isolated DOM mock showed that Edit Key Signature is in the shared visible Musical System area in both Manual and AI, is absent from the AI-only goal/generation section, renders the existing treble-clef icon, invokes the same editor-entry callback, and is hidden when the editor is already active. Checked that Back to Score is only created inside the editing-state conditional, belongs to the same element as the Key Signature Editor heading, and calls the return handler; verified scrolling/focus, protection against editing mid-generation and cache keys. No actual browser visual or audio integration test was run.

**Manual acceptance:** Run local Python web server as previously, fetch branch and hard refresh. Open an Etude in Manual: the **Musical System** section contains Edit Key Signature and the regular Score section has **no duplicate switch**. Click Edit: scrolls to **Key Signature Editor**, shows **Back to Score** immediately alongside its title. Change a mark/cents and click Back: Score reappears with those settings preserved, at the same location. Repeat in AI mode, with or without a saved Etude, and verify that the Practice Design freeze behavior remains unchanged. Test keyboard focus and compact desktop width. No npm/Capacitor required for desktop.

**Strict scope:** Do not duplicate the key editor, move its tuning UI into the Music System box, modify `e.key` / `e.offset` / `freq()`, or alter note generation/practice behavior merely to support this navigation.


---

# Piano key labels mirror the active key signature and tuned frequencies (2026-11-21)

**User request:** When a Persian Dastgah changes the signature, corresponding physical Goosh piano keys should explicitly display **the same flat/sharp/Koron/Sori symbol** and **their actual changed frequency**. The existing audio already uses `freq(e,m)`; the bug was that a visually unchanged natural key label (e.g. A4) did not reveal its altered tuning. This visual feedback also needs to follow manual edits made in **Edit Key Signature** and, because it uses the same canonical signature, also works for Western musical systems.

## Implemented

**`web/src/app.js`** (scope: piano display only):
- Added `updatePianoKey(button,shortcut)` and `refreshPianoKeyLabels()`. They read only the canonical `e.key`, `e.offset`, `e.marks` and `freq(e,m)`; no second tuning engine, state store, or duplicated note collection was introduced.
- A key whose **natural pitch class** has an active signature mark now shows its letter, actual musical accidental and octave (e.g. A [Koron SVG] 4, E♭4, B♭4). Persian Koron/Sori use `appendPersianAccidental` from the existing shared SVG module, not a font glyph; flats/sharps use the existing ♭/♯ signs. The same alteration applies to the corresponding key in every octave.
- Affected white keys additionally display the actual sounding frequency to two decimal places, with an explicit small **Hz** unit. Keys with a manually adjusted cent offset but no accidental also show tuned frequency. Unaltered keys retain their original note plus localized solfège syllable. Each key's accessible name and hover title include its up-to-date pitch label and frequency.
- Black keys retain their own existing separate MIDI spelling and sound. **Important architecture note:** Goosh stores per-natural-letter signature marks in `e.key`; for example E♭ changes the E-natural-key playback, not the distinct D♯ black key. Showing ♭ on the E key is intentional and matches `freq()` and the existing staff model; do not silently remap black keys or change note IDs.
- Both the octave-switch `jump()` path and first piano rendering now invoke the same presentation helper. `sheet()` refreshes labels after preset/dastgah selection and key-mark edits. The existing key editor's `updateReadout()` refreshes them during cents-slider dragging, numeric changes and ±1 cent controls, **without rebuilding the instrument or changing active key event handlers**. The previous app callback's tooltip-only refresh was replaced with this unified presentation refresh.
- The original `b.begin`, `liveVoice(freq(e,m),...)`, onStart recording, pointer/multi-touch handling and octave scrolling remain untouched. All changes are in display-layer DOM nodes and tooltips, not audio synthesis or recorded note semantics.

**`web/style.css`**:
- Compact, scoped `.board button .piano-key-*` styles for accidental-aligned note labels, small shared SVG marks and two-line exact-Hz readouts on altered keys. Retains Goosh's existing white/black key colors, widths and interactive states. Unaltered keys retain their original two-line layout.
- No new palette or unrelated restyle.

**`web/index.html`**:
- Refreshes CSS + app JS version keys to `piano-key-signature-1` for hard-reloaded desktop browser updates. The local Python server remains `python3 scripts/goosh_server.py 8081 --bind 0.0.0.0`.

## Tests and expected behavior

Isolated tests evaluated the actual fetched `app.js` keyboard helper functions with the real `model.js` frequency implementation and `music-signature.js` preset applier:
- Untuned A4 retains standard `A4` + solfège (no Hz chip).
- Under Shur `E♭, B♭, A-Koron`, A4 displays the existing **Koron SVG** and **427.47 Hz**; E4/B4 display the actual flat signs and correct frequency values (E♭4 ~311.13 Hz). It also labels altered A and B in higher octaves.
- Independent black D♯5 keeps its own spelling and sound; it is not retuned just because E-flat affects E-natural.
- A manual +13-cent change on A immediately changes the displayed frequency. Returning to a blank/natural signature removes the marks and frequency chips without deleting notes.
- Sori uses the same shared vector symbol. Existing keyboard `.begin` functions remain intact across DOM-label refreshes.
- Confirmed the new refresh hooks are called by score redraw and by the signature tuner slider readout. Full app JS syntax parsing passed.

**Not completed:** a live desktop-browser visual regression, physical piano playback quality test, or end-to-end live OpenRouter test. Inspect narrow key widths and contrast in light and dark themes in the actual browser.

**Scope warning:** Do not move each pitch to another MIDI key or change `freq()` to match visual labels. This is only a truthful representation of the currently sounding, already-tuned notes in the pre-existing Goosh keyboard. Do not alter the Manual/AI workflow, key signature editor, note recognition, or Practice learner as a follow-up without explicit user request.


---

# Pencil notation preview, faint auxiliary ledger guides, and precise sequential vs chord insertion (2026-11-21)

**Approved user request:** Pencil-mode notation needs ultra-faint extended ledger lines to help position notes above/below the five-line staff. As the pointer moves over the staff, show a translucent preview note snapped to the exact intended staff position; the eventual rendered note may shift horizontally as score layout changes, but the preview must communicate its pitch and intended **insertion semantics**. The teacher must be able to insert a new note **before the first**, **between existing notes**, **after the last**, or at the **same onset as an existing note** to build a chord without accidentally replacing/overwriting the previous or next note.

**Strict scope:** `web/src/score.js` (score SVG rendering and Pen hit plan), `web/src/app.js` (Pen time insertion and single-action undo), `web/index.html` (JS cache key), and this handoff. No changes to sound generation, instrument samples, note model, musical scale/key editor, AI composition, Practice Design, or the Manual/AI composer. Remains on branch `feature/practice-sequence-studio`.

## Score rendering and hover behavior

- `score(host,e,{...,tool='select',fa=false})` now receives active Studio tool mode and UI language from `app.js`. The same renderer remains available to the Practice view with default `tool='select'`, hence **no extra overlays** in Practice or when selecting/erasing.
- Only in **Pen mode**, draw **12 ultra-faint dashed helper ledger lines** across the SVG (6 above and 6 below the existing five staff lines, y=14…59 and y=113…158), with `stroke-opacity:0.13`, `stroke-width:0.7`. The original five staff lines, note heads, existing ledger lines and pitch/key-signature artwork remain unchanged.
- A separately layered `<g pointer-events="none">` **preview ghost** follows `pointermove` inside each staff SVG. Its translucent elliptic notehead snaps vertically to the *same diatonic staff step and MIDI letter* that the eventual Pen click uses. It also draws localized, solid mini-ledger segments at the ghost's particular pitch, a fine vertical insert guide, and a tiny localized placement hint (`Before` / `Between` / `After` / `Chord`; Persian equivalents). The ghost stays hidden outside the staff and on `pointerleave`. It **never intercepts pointer/click selection**. On touch devices, the next click uses the same resolver even without continuous hover.
- The preview uses SVG attributes and existing `var(--accent)`; it does not require new color schemes, external canvas packages, libraries or CSS framework. The existing editor Pen cursor remains intact.

## One placement resolver for preview **and** click

`planPlacement(rowIndex,x,forceChord)` in `web/src/score.js` resolves horizontal intent with a dedicated **±11 px chord band** around each existing note-group center:

- **Inside the note-centered band / directly on the notehead:** `kind:'chord'`, `at` equals that note group’s existing onset; the new note has a different pitch chosen by vertical hover/click, so it can be placed on another staff pitch at *exactly* the same time. `Shift` + click also explicitly forces `chord` at the nearest note group, useful when alignment is awkward. Clicking a note’s transparent selection target no longer swallows the SVG click while the Pen is active; Select and Eraser still intercept clicks normally.
- **Left of the first note:** `kind:'before'`, `at` equals that first onset.
- **In the horizontal space between groups:** `kind:'between'`, `at` equals the *following* group’s onset, not the nearest previous/next note arbitrarily.
- **Right of the final note:** `kind:'after'`, `at` equals the actual latest sounding end, not just the last note’s start. For wrapped SVG rows, the area after one row’s last note inserts **before the next row’s first note**, not at the end of the whole score. A leading rest in a wrapped score maps to Before on the first note.
- **Empty score:** start at `at=0`.
- Preview and click share the **identical** `planPlacement()` and `pitchFromY()` functions: no mismatch between where the ghost says the note goes and where the click is interpreted.

## Safe insertion in `web/src/app.js`

- The previous `insert:(m,at)` always pushed a note at the nearest existing onset. New callback `insert:(m,placement)` reads `placement.kind` and resolves one default quarter-note `d=60/e.bpm`.
- **Chord:** append with exactly the existing group onset, do not move any notes. This creates genuine simultaneous notes in the current `e.notes` model; the original score already groups same-onset notes for rendering and score transport.
- **Before / Between:** insert a new note at the chosen group's original onset and shift **every existing note whose onset is at/after the target** by the new note’s default duration. Shifting entire simultaneous groups together prevents existing chords from being broken, and preserves the original relative timings/silences further along the timeline. The original notes remain the **same objects**; no detached copy of the score is created.
- **After:** append at the latest note end, not at an existing onset, leaving all previous note timings untouched.
- All Pen placements guard recording state, invalid times and disallowed overflow, stop score playback before edit, save, redraw the score and clear selection, as before.
- Extended the existing Pen undo record with `shifted:[{note,at},...]`. **Ctrl/Cmd+Z** removes the inserted note *and* restores each shifted original note’s **exact prior onset**. Existing Eraser undo behavior and at-most-100-steps history are unchanged.

## Tested (isolated source-backed JS)

- Full `score.js` and `app.js` parse successfully as JavaScript.
- A DOM/SVG mock of the actual `score.js` verified that hovering creates a transparent, pointer-pass-through notehead and a `Between` hint on the snapped ledger step; pointer leaving hides it; Pen reveals exactly 12 very faint extra ledger lines; Select mode has none.
- Click at the center X of a note produces a chord at its original onset; click in the gap is a sequential insertion; click left of the first note produces Before; click right of the last note produces After; Shift-click forces a chord. The notehead click target does not swallow Pen-mode click.
- Multiple SVG rows and rests were checked: clicking after one wrapped row correctly resolves to before the next row group rather than end of entire Etude.
- Isolated integration test of the actual Pen handler and `undoScoreEdit()`: inserting a simultaneous note leaves all prior onset times unchanged; inserting before a *two-note chord* shifts both notes' start times together and later events too; inserting before the first shifts the full score; inserting after the last appends at the sounding end. Each associated Undo restores the original exact array of note pitches/times/durations, with the expected save/redraw calls.
- **Not yet tested in a real desktop browser or device:** pointer precision/touch hit boxes, visual line/glyph contrast at actual screen sizes, real time playback quality and zoom/wrap interactions. These require a manual visual smoke test.

## Desktop acceptance checklist

1. Fetch branch, restart or refresh local Goosh and hard-refresh the Studio page; select the **Pen** above Score.
2. Confirm six pairs of auxiliary ledger lines (above and below the staff) appear only in Pen and are faint. Move the pointer vertically: a translucent preview note should snap to the intended line or space, and local ledger guides should appear outside the five normal lines. Remove the pointer: the ghost must disappear.
3. Move horizontally: hover over a note's X → `Chord/هم‌زمان`. Hover between two note X positions → `Between/بین نت‌ها`. Hover before the first note and after the final one → appropriate hints. A direct click over a C notehead at the height of F should append F at exactly C’s onset.
4. Insert a new note between two existing notes: the new note must be in sequence; existing later notes must move by exactly one beat while old simultaneous groups stay aligned. Use Ctrl/Cmd+Z and verify all original timings are restored.
5. Test multi-row wrapped scores, rests, empty scores, Set/Erase tools, and both light/dark themes. Returning to Select/Eraser removes the ghost and all extra auxiliary staff lines; the original eraser and note-settings actions should still work.

**Preserve:** Do not make ordinary staff clicks cause AI generation, do not change pitch tuning/frequency rules, do not convert all insertions into chords, and do not intercept Pen hits on note heads with the old Select handler. This implementation intentionally avoids requiring a new "Chord mode" toggle: the user sees the precise outcome in the ghost preview instead.


---

# ONE canonical Etude engine: exact time signatures + Free meter, including Pen/Eraser, AI and Practice (2026-11-21)

**Important clarification from the user:** DO NOT BUILD TWO DIFFERENT SCORE/TIMING ENGINES. The pre-existing Goosh `e.notes` objects (`m`, onset `at` seconds and duration `d` seconds) remain the **single canonical source of truth** for both measured and Free meter, playback, piano recording, Pencil, Eraser, AI composition and Practice. The implementation introduces derived **notation/measure analysis within the existing `web/src/model.js`**, not new storage of note events, a separate audio engine or a second Score renderer. Accurate rhythmic validity matters more than drawing decorative barlines.

## Core design and compatibility

**`web/src/model.js`:** Existing `fresh()` gains `meter:'none'` (default Free) and `measureCount:4` (prepared bars; ignored in Free). Both fields are optional in `valid(e)` to preserve old imported and stored Etudes. `METER_PRESETS`: Free, 2/4, 3/4, 4/4, 5/4, 6/8, 7/8, 9/8, 12/8. `meterInfo(e)` computes bar size as quarter-note beats `numerator*4/denominator`. Global BPM continues to specify quarter notes even in compound meters; changing BPM rescales existing `e.notes` like before and retains rhythmic proportionality.

**`meterTimeline(e)` is the single source of metering truth for every consumer**:
- In Free it returns `measured:false` and **does nothing** to the original expressive timing. No barlines or time signature are forced.
- In measured mode it maps the original (seconds/BPM) times into integer rhythmic ticks (`960` per quarter note), preserving the original note objects and all chords. Rounding is **NOT** silently performed on the existing notes; onsets/durations more than 1.5 ticks off the supported grid cause `issues`. It verifies exact representability into regular/dotted/double-dotted note values through 32nd-notes and their ties, without claiming triplet or arbitrary tuplet support.
- It derives the exact bars, crossings and ties for notes sustaining across barlines, and exact rests for all time where no note sounds. Chord voices whose notes overlap do not create false rests. Empty bars are conventionally represented by one full-measure rest even for 6/8, 9/8 and other compound signatures.
- The explicit `measureCount` enables drawing blank measures *before* the teacher writes any notes, without fake audio, dummy notes or a second copy of the composition. The analysis can return a larger count when the music extends beyond prepared bars; deliberate Pencil/retiming changes check and respect the prepared capacity rather than silently appending bars.

**`web/src/score.js`:** The **same original `score()` function** chooses derived measured events or its old Free events based only on `meterTimeline(e)`. It renders the correct numerator/denominator, actual note/rest types, ties crossing barlines, bars and full-measure rests. When possible it wraps to the next system at a **bar boundary**, not mid-measure. If a metered Etude has invalid unsnapped existing timing it displays a warning and deliberately does **not** fake a valid barline pattern. Its original SVG staff, Key Signature, audio marker IDs, pencil ghost note, eraser hit targets, pitch/tuning and free-meter notation remain in place. Playback marker fragments can be highlighted by their actual segment start/end, so two tied noteheads do not both appear active simultaneously.

## Uniform editing semantics — no exception for Pencil or Eraser

**`web/src/app.js`:**
- Studio Score now has a localized **Time signature** dropdown (Free default or supported signatures), an explicit **Measures** number control for prepared bars and a **Pen note value** select with whole, half, quarter, eighth, sixteenth, thirty-second and common dotted durations. Uses the original Studio and existing `e.notes`. Meter change is rejected with an in-context message if current expressive/free timings cannot be represented exactly; it never quantizes them behind the teacher's back.
- The original **Pen** inserts the selected musical duration rather than always one quarter in measured mode. Pen's ghost preview and click both use the same previously implemented placement planner. It can **fill an existing rest** without shifting later notes, insert before/between notes shifting later notes by the chosen duration, add at end, or add a chord at exactly the original onset. Each potential edited set is checked using `meterTimeline({...e,notes:candidate})` before mutation: reject invalid grids, insufficient rest capacity and unplanned extra measures; explain how to choose a shorter value or add measures. Free retains its older arbitrary time-based insertion behavior.
- The original **Eraser** removes only the selected underlying note (even if the note had several tied visual segments), leaving later notes at exactly their original onsets. The shared analyzer then produces the correctly sized **rest** in its place; it does not slide the score backwards or lose remaining notes of an existing chord. Uses `meterTimeline` to validate the resulting state.
- The pre-existing **Note settings** can edit note duration and rest-before. In measured mode these numeric fields explicitly use **quarter-note beats** instead of free seconds. A proposed edit is checked using the same meter analyzer; invalid values are rejected, never silently rounded. In Free the existing seconds-based controls remain intact. The global tempo editor continues to rescale all notes/rests proportionally.
- The existing **Undo** restores exact previous times for sequential Pencil insertion and exact Eraser deletion as previously implemented. These actions are tested in a measured score, including editing through a chord. No separate undo stack for the measured system.
- **Piano live recording** in measured mode explicitly snaps onset and duration to a 1/32-note grid (stated in the visible UI hint). When recording stops, the displayed number of measures is extended if necessary; Free mode retains the original raw playing timing with no quantization. This is deliberate UI behavior, not a second recording engine.
- Changing time signature uses `sheet()` to repaint the same Score and does not remount the AI composer / cancel an in-flight AI generation.

## AI and Practice share the same meter, not a second music engine

**`web/src/ai-etude.js`:** The existing Generate request sends `meter:e.meter||'none'` in addition to musical system, Dastgah/mode, tonic and actual tuning. The existing `convertEtude` accepts valid metered note durations and explicit rest-before values, creates **the same standard e.notes**, checks that four requested measures have the correct total quarter-note beats and calls `meterTimeline(result)` to reject any inexact or unrepresentable rhythm BEFORE overwriting any existing Etude. The previous Iranian Shur **Free** ABC parsing remains intact, including the E-koron special spelling; metered Shur uses the same JSON result path and retains the E-koron notation exception.

**`scripts/goosh_server.py`:** No new API and no new server technology. The Python AI endpoint accepts a whitelisted `meter` field. In measured mode its AI JSON schema expects a variable number of notes, note duration and `restBefore` expressed in quarter-note beats, with correct overall duration for **four bars** of the requested signature. The Python layer performs basic input/response and total-duration checks, then the **browser's canonical meterTimeline** is the final authority about actual notation/beat capacity; there is no separate Python playback engine. AI cannot silently change current music on an invalid response. In Free, the existing 16-note generic POC and Shur's special ABC prompt remain available; no barlines are imposed by the frontend. For metered AI, an unverified ABC string is intentionally **not fabricated**: the authoritative Score is rendered directly from validated notes.
- Python exercise-design prompt receives the current meter and measured bar count, while still returning only Practice Step settings, never a new score.

**`web/src/studio-practice.js`:** AI Practice Design forwards the actual Etude's meter/bar count and canonical notes as read-only context. Original Exercise goal, sequence, settings and same-score relationship are unchanged.

**Existing Practice learner in `web/src/app.js`:** Shows the current meter and corresponding measure number; its Staff option shows the original complete canonical measured Score instead of moving a note to a fake first measure. Free retains the old isolated-note Staff view. This makes measure context visible to students, while the legacy per-note assessment timing itself remains unchanged. Full multi-voice rhythmic evaluation/tuplet/chord exercise assessment is **not** falsely claimed implemented.

**`web/style.css` and `web/index.html`:** Small theme-consistent, responsive meter/measure/Pen controls and warnings; cache version `meter-one-timeline-1`. No new palette or dependency.

## Completed tests and limitations

Isolated source-backed JavaScript checks performed:
- `valid()` accepts old Etudes without meter/measureCount; Free preserves rubato and has no bars. All modified JS modules parse.
- New empty 4/4 creates exactly four measure lines and four full-measure rests but no fake notes; 6/8 similarly renders four correct bars/full-measure rests.
- Correct beat capacity in 4/4 and 6/8, note-duration decomposition, leading and internal rests, sustained chords (no false rests), long notes split and **tied** across barlines, and rejection of non-notatable arbitrary free timings rather than silent timing alteration.
- SVG score mock verifies meter numbers and barlines, in-Score Pencil click targets a rest at its exact musical onset, actual tied note fragments are rendered, and multi-row 4/4 Score preferentially wraps after measure boundaries. Free has no meter or extra lines.
- Isolated test with **actual Pencil and Eraser handler source**: Eraser removes only the intended note and creates a derived one-beat rest without shifting existing note onsets; Undo restores it. Pencil creates simultaneous chords without shifting, inserts eighth notes before existing pitches with exact corresponding onset shifts, and Undo restores the old timestamps. Inserting into an unplanned fifth bar is rejected rather than silently extending a four-bar score.
- AI adapter tests for 4/4, 6/8, explicit rests, meter crossings and Shur E-koron; irregular unnotatable AI beats are rejected. Legacy Free 16-note adapter still works.
- Model regression checks: old Etudes import; accurate empty bars, meter-specific full-measure rests and unchanged note values.

**Not performed / not guaranteed:** a real desktop-browser visual inspection and interaction test, live Python/OpenRouter API integration or Python interpreter compilation, audio-device recording test, or native APK test. The initial supported notation vocabulary does **not** include tuplets/irrational rhythmic subdivisions, complex voice-dependent beam grouping, or sophisticated multi-voice measure editing; these should be separate explicit milestones rather than misrepresented as fully solved.

## Desktop manual acceptance checklist

1. Fetch branch and hard-refresh. New Etude defaults to **Free** (no time signature or barlines); choose **4/4**, default **four empty measures** appear immediately with full-measure rests and the correct time signature. Switch to 3/4 and 6/8 to verify capacities, silent bars and numerator/denominator.
2. Choose Pencil and a **note value**, e.g. eighth or half. Insert into a visible rest; the resulting rest reduces by the exact duration. Insert between notes; later notes shift by exactly the inserted beat count while previous chords remain simultaneous. Insert on a notehead to create a chord. Ctrl/Cmd+Z restores exact note times.
3. Choose Eraser and delete a note in the middle or a member of a chord: later onsets must stay fixed and the removed temporal space becomes a correctly sized rest. Undo must restore it.
4. Edit one note's duration and rest-before as **quarter-note beats** in measured mode. Invalid off-grid timing must be rejected. Change BPM and verify measure structure and audio/pitch stay consistent.
5. Attempt to add beyond prepared measures: see an explanation instead of auto-overflow; deliberately increase **Measures** and try again. Then test live recording: measured timing is snapped to the disclosed 1/32 grid and can extend measures; Free recording preserves natural timing.
6. Try switching a free-recorded rubato Etude to 4/4: app must not pretend its expressive durations exactly fit; it should reject the selection without altering `e.notes`. Back to Free retains the original performance.
7. Generate a metered AI Etude with API credentials: verify server/client agree on 4 bars and that music has real correct rests/ties. Try Exercise Design with AI and verify that meter context is present without changing music. Open Practice and check the original measure positions are shown.
8. Check free mode, imported older files, key signatures/Koron/Sori, piano playback, score transport, editing and Undo on desktop/light/dark/mobile-sized viewports.

**Do not** add a second e.notes collection, second meter renderer, per-mode audio engine, automatic silent retiming of existing music, or a disconnected AI/Practice rhythmic grid.


### Late safety addition: prevent stale AI output across meter changes

The AI composer now captures `{...selectedContext(),meter:etude.meter||'none'}` at the instant Generate is pressed. `generateStudioEtude` sends that immutable selected meter in the Python request; when a response arrives it verifies that the current Etude still has the same meter **before** calling the existing converter or overwriting any notes. If the teacher changed 4/4 to 3/4 while OpenRouter was still generating, the earlier answer is rejected with an explicit message instead of being silently applied to an incompatible measure grid. This is a guard within the **same** existing AI generation pipeline, not another engine.


---

# Score piano timbre must match clicking Goosh's own piano keys (2026-11-21)

**User's listening issue:** Pressing keys on the built-in Goosh piano gives a rich, attractive acoustic piano tone, while playing the same Etude from Score sounds dry/unnaturally MIDI-like. The report explicitly excludes clicks, crackle, noise and distortion. Do not solve by replacing the piano samples, synthesizing a different instrument, adding new reverb or changing tuning.

## Identified cause (existing code)

Both paths already use the **same existing `voice(hz,...)` sample player** and the same `web/piano` MP3 files. All 30 root samples expected by `web/src/audio.js` were verified present in the repository; Score did **not** intentionally use a different soundbank. However:
- A quick keyboard tap below 180 ms in `piano()` released its sample after **2 seconds**, allowing its recorded piano body and natural decay to ring; normal Score playback called `release(n.d)` at the exact note's written length (often much less than 2 s), making it sound notably drier.
- Score's end-of-transport timeout disconnected the dedicated output only about 220 ms after the last **notated note end**, cutting the last acoustic piano tail before its natural decay completed.
- Score could start while MP3 samples were still loading and `voice()` would use its oscillator fallback rather than the sampled piano. The `ready` promise existed but had not been awaited by Score.
- The live piano's `liveVoice()` damps a previous instance when the same key is re-struck. Previously Score only called `voice()`, so repeated same-pitch samples could overlap and sound less like direct key tapping.

## Changes (only score transport presentation/sonority; no second engine)

**`web/src/audio.js`:** Exported `PIANO_TAP_RING_SECONDS=2`, the *existing unchanged* short-tap envelope threshold. This is a shared constant; original `voice()`, MP3 mapping, pitch shifting, gain, compressor, attack, decay and `liveVoice()` implementations were NOT changed.

**`web/src/app.js`:**
1. The live keyboard's existing `off(d<.18 ? 2 : Math.min(6,d))` now references `PIANO_TAP_RING_SECONDS` instead of duplicating the literal 2, with no behavior change.
2. Score keeps the same original `voice(n.hz,delay,output)`, sample data, `freq(e,m)`, written note positions, onsets, written durations, score marker timing, tempo, chords and rest scheduling. For an Etude note, its acoustic ring release is now `Math.min(6,Math.max(PIANO_TAP_RING_SECONDS,duration))` instead of immediate `release(duration)`, analogous to clicking a piano key briefly. The piano sample itself decays; this is **not a sustain pedal, new oscillator, new instrument or new audio engine**. Musical note time and acoustic ring-off are intentionally distinct.
3. A per-note unity-gain gate connects to the existing Score output; when the *same frequency* occurs again, the previous sample's gate is damped with `setTargetAtTime(0,nextOnset,.012)`, analogous to the existing live piano's previous-string damping. Other pitches/chord tones are left ringing. The scheduling view is **sorted by note onset** (preserving original indices and canonical `e.notes`) because Pencil can append an earlier note at the end of the stored array.
4. The Score transport's natural-completion timer waits for the **last scheduled audible piano tail** (at least 2 seconds after a short final note, plus sample release), instead of abruptly disconnecting output as soon as the last written duration expires. Pressing **Stop** or **Pause** still silences the output immediately; Stop cancels all scheduled output/tails. Note visual playback markers continue to follow original written durations, not the acoustic release tail.
5. `startScorePlayback()` waits for the existing `ready` sample-load promise **after unlocking audio on the real click**. Loading state and a request token guard against duplicate play, cancellation, route changes or changing Etude while samples load. The Score play button acts as Stop during pending load; Pause is disabled until a transport actually starts. If any required root sample fails to load, Score displays a concise inline localized error rather than silently playing the brighter oscillator fallback. Users can reload the page to retry.
6. `web/style.css` styles that error only if sample decoding failed, reusing the existing muted color and font size.
7. `web/index.html` updates JS/CSS cache keys to `piano-score-same-tone-1`; the app's audio import uses `score-piano-sample-articulation-1`.

**No changes** to the actual MP3 content/paths, piano keyboard samples, frequency and Iranian microtone mapping, metered vs Free mode, notes/Practice, AI, transport tempo, recorded note lengths, or note scoring. Existing Score playback's scheduled audio/bus remains in use.

## Tests and limitations

- Verified 30/30 root sample filenames exist under `web/piano`.
- Source-backed isolated scheduling test: Score waits on `ready` before producing a voice; Stop during loading prevents scheduling; three short sample notes retain their exact original attack times/hz while each uses 2 s ring time; repeated same-pitch note damps the earlier gate at the next onset; the last tail determines when output is naturally disconnected (rather than last notated note-off); Pause and Stop clean up; failed sample load shows status and schedules NO oscillator voice.
- Isolated mocked Web Audio run using the **existing actual `audio.js`** code: decoded all 30 samples; both `voice()` and `liveVoice()` created the same `AudioBufferSourceNode`-style sample playback, with no oscillator creation; verified the original sample envelope and two-second ring. (Mock AudioContext only, not an actual hearing/listening test.)
- JavaScript syntax parsing passed for the edited app and the audio module after substituting `import.meta.url` in a non-module parser. Browsers support the unchanged `import.meta.url` natively.
- **Not yet verified:** audible sound quality in the real desktop browser and on Android/iOS, actual MP3 decoding on each target system, high-note tone and high polyphony under load. User should compare the same pitched piano key clicked briefly against a Score note, especially at short durations, repeated pitches and the end of a phrase.

**Acoustic / notation distinction:** The written `n.d` is still the source of truth for notation, learning feedback, metered bars and onset scheduling. The acoustic sample's quiet decay may continue after its notated end, exactly as a tapped piano key naturally rings. If users request hard staccato or strict damping for silent rests in the future, that should be a separate, explicitly specified articulation feature rather than undoing the sampled-piano consistency here.


---

## UI cleanup: fixed-position Key Signature toggle, keyboard labels, retired Practice Settings, reusable Etude cards (2026-11-21)

**User-requested scope, applied on `feature/practice-sequence-studio`:**

1. **One Set Key Signature / Back to Score button in Musical System:** `web/src/studio-etude-generation.js` renders ONE button inside `.studio-music-choices`, in the same parent flex row as the **Iranian Music** and **Western Music** radio options. The button does NOT disappear or move when switching the score/editor; the text changes to **Back to Score** in place, and its icon switches between the existing editor-entry and return icons. The existing `showSignatureEditor(editing)` function is reused through `onToggleKeySignature`, preserving editor state, scrolling, focus and pitch tuning. The prior duplicate Back button alongside the score/editor title is removed from `app.js`. The score title remains Score / Key Signature Editor as appropriate. Shared selector works in both Manual and AI; no change to the music-system, signature, frequency or AI computation.
2. **Piano key labels:** Removed the supplemental solfège syllables (`Do/Re/Mi/Fa/Sol/La/Si` and Persian variants) from `updatePianoKey()`. Existing pitch names such as `A4`, displayed Koron/Sori/flat/sharp glyphs, actual tuned Hz readouts, keyboard shortcuts, accessible names and audio/touch/recording remain unchanged.
3. **Remove legacy Practice Settings UI completely:** Removed the `rules()` call and the entire old `Practice settings` details/form renderer from `app.js`. The newer **Practice Design** (per-step settings under Studio) and the Practice learner remain. The old `e.rule` field and default values are retained ONLY for importing/playing existing Etudes and `valid(e)` compatibility; don't erase them or alter unrelated playback rules merely because the old editor is gone. The AI freeze hint was updated to say Practice Design instead of the retired Practice Settings.
4. **Reusable Etude/Practice list cards:** Extracted one `renderLibraryEtudeCard(section,id,entry,destination)` function used by `etudeList()` in both routes; cards retain their title/note count, delete action/icon/confirmation and link to the appropriate `studio` or `practice` route. In `web/etudes.css`, the existing **Etudes gallery** is now the *single styling source* for both `#app[data-page="studio"]:has(>.shelves)` and `#app[data-page="practice"]:has(>.shelves)`: the shared rules use `#app:has(> .shelves)`. Removed ~200 lines of duplicated Practice card/grid/responsive rules and duplicated card metadata rules; retained each route's localized page heading, filtering, toolbar-specific controls and routing. Equal-height card rows, imported-card decoration, backgrounds, spacing, hover behavior, delete placement and mobile layout now follow the Etudes reference rather than a drifting copied Practice variant.
5. **CSS/cache:** The signature toggle stays beside the music radios, and reserves stable minimum inline size to avoid width-jump when its text/icon changes. CSS and browser import version tags bumped to `music-toggle-reuse-1`. No new palette, dependencies, audio engine, note model or visual redesign.

**Verified in isolated source-backed tests:** app/studio-composer/practice modules parse; button shares the same parent with the two radios and stays at the same child position in both states; clicking it invokes true/false editor toggles; labels/icons switch accordingly. Old Practice Settings form absent while Practice learner still reads e.rule. Piano solfège removed without touching Hz/glyphs. Etude/Practice use the same renderer and CSS selectors, with destination routing and delete preserved. **Still requires real desktop/mobile browser visual smoke test**, including narrow widths and scroll from the shared toggle to editor.


---

# Drag existing Score notes in Select mode: horizontal onset and vertical pitch, following current key signature (2026-11-21)

**User request:** A note already on the staff must be draggable both **vertically** (change its written staff line/space and actual sounding pitch) and **horizontally** (change its position in the Etude's timeline). A moved note must **lose any per-note accidental** that was attached to it and be reinterpreted according to the **destination note's current key signature**, including flats, sharps, Iranian Koron/Sori and exact cents previously set in Edit Key Signature. The user can manually add an accidental afterward. This applies to the SAME existing Studio note model, not a second composition or tuning engine.

## What changed (strictly same Studio branch)

**`web/src/score.js`:**
- Added optional `move(index,{m,at})` callback to the original `score()`. It is only used when `tool==='select'`; Pen's click-to-insert and Eraser's click-to-delete still use the previous callbacks. The Practice staff viewer does not pass `move` and remains read-only.
- Each note's existing transparent hit circle now handles pointerdown/move/up/cancel in Select mode with a 5 px movement threshold. **Click without movement still selects exactly once and opens the existing Note Settings**. A completed drag does not accidentally trigger a subsequent Select click.
- A translucent, pointer-pass-through ghost note plus faint vertical guide and auxiliary ledger segments show the proposed final notehead on the staff **while dragging**. This preview follows the same `pitchFromY()` diatonic staff-to-natural-MIDI calculation previously used by the Pen. Thus A4 lands on A4; it does not retain a black-key MIDI/spelling from the source note.
- Horizontal placement reads the existing score's grouped note/rest/barline X positions, snapping near another note to **that note's onset** for possible chords, and interpolating accurately between visible timeline anchors for other positions. In metered mode it snaps to the existing **1/32-note grid** (quarter beat / 8); in Free it retains millisecond-scale timing rather than imposing a new meter. The existing prepared measure capacity is respected; no silent fifth measure is appended by dragging.
- Dragging between wrapped staff rows works using actual SVG client rectangles. Pointer capture prevents a lost drag when moving away from the originating notehead, and pointer cancel/loss hides the ghost without editing anything. The transparent notehead itself uses `touch-action:none` in Select mode, keeping mobile touch gestures scoped to the note rather than disabling page scrolling globally.
- The preview never creates, copies or retimes any `e.notes`. All changes are proposed and applied only on pointerup if the application validates them.

**`web/src/app.js`:**
- The same `sheet()` renders the original `score(h,e)` with a `move` callback (omitted while piano recording). Movement edits exactly **one original note object**; its `m` becomes the natural MIDI note for its destination staff position and its `at` becomes the target onset. All **other notes, existing chords, rests, durations, Practice steps and transport BPM remain unchanged**. If the moved note lands on an existing onset it intentionally forms a chord.
- On an actual move, delete the moved note's `staffM`, `staffAccidental` and `displayPitch` metadata. These fields are legacy per-note overrides (e.g. Iranian `Ek4` with `m=63` and written E-Koron). Keeping them would make the moved note continue showing/sounding the original alteration. After clearing them, **do not add a replacement accidental**: the canonical `e.key` / `e.offset` and existing `freq(e,m)` automatically give the destination pitch the appropriate signature, with the same sounding frequency as the app piano. Do not reset global `e.key`, `e.offset`, `e.marks` or affect other notes.
- Before mutation, validate that the new onset and note are finite/in range and call the already-existing `measuredEditAllowed(candidate)`, which uses the **single canonical `meterTimeline()`**. Reject invalid destinations with an inline bilingual message; do not silently quantize, shift other notes or overflow prepared measures.
- An actual drag stops Score playback, pushes one `{kind:'move',note,before}` entry onto the **existing Undo stack**, selects the moved note, saves and redraws. Ctrl/Cmd+Z restores the original note onset, MIDI pitch, and **all previous specific accidental/spelling metadata**, including previously absent fields. It never modifies a different note or regenerates practices.
- The keyboard audio, recording engine, piano key labels, key-signature editor, AI and Practice logic are unchanged.

**`web/index.html`** updates app cache key to `select-note-drag-1`; `web/src/app.js` updates Score import cache key to the same version.

## Verification (source-backed isolated JS mocks)

- The actual Score SVG code was exercised with synthetic PointerEvents: C4 dragged vertically onto the A4 staff position resolves to **natural MIDI 69 at the original onset**; dragging horizontally onto E4's note group moves the original C4 to E4's onset without changing its written C pitch; metered horizontal targets snap to a multiple of 1/8 quarter-note beat; dropping across wrapped rows resolves the correct destination onset.
- Select single-click opens its original selection exactly once; no move callback is made. Pen and Eraser render without Select pointer dragging handlers.
- The actual app `move` callback plus Undo code was exercised with a note originally stored as **E-Koron (staffM=64, m=63, explicit Koron)** and a Shur-like key containing **A-Koron** and **E-flat**. Dragging to A4 cleared its per-note Koron while giving it the canonical **A-Koron pitch ~427.47 Hz**, and did not retime the other note. Horizontal drag on the same written E line reset legacy E-Koron to E-flat as defined by the key signature (~311.13 Hz). Undo restored the exact original E-Koron data and onset. Rejected a move outside four prepared measures; allowed an exact valid 1/32-beat move.
- Both edited JS source files parse successfully. **Not yet run:** a full browser pointer/zoom/scroll test on actual devices or auditory listening test; verify with mouse and touch in the desktop and mobile layouts.

**Acceptance:** In Studio, activate Select, drag a note diagonally to a different staff line and timeline slot. The note must follow the ghost's destination, the old per-note accidental must disappear, the destination's key signature must dictate its sound, no neighbor notes must move, and Ctrl/Cmd+Z must fully restore the prior notation. If a meter placement is invalid, reject it and leave the existing score untouched. Click-only still opens Note Settings; Pen and Eraser remain separate tools.


### Final notation safeguards for note dragging

- Staff-to-MIDI conversion was additionally corrected **below middle C**: descending through a staff step must resolve to the natural letter (e.g. A3, MIDI 57), not the enharmonic preceding black MIDI pitch (A#3, MIDI 58). This correction is within the one shared `pitchFromY()` used by **both Pen and Drag**. An isolated source-backed test from C4 down to C3 verified [60,59,57,55,53,52,50,48], all natural keys. Dragging to A3 in a signature containing A-Koron therefore uses the correct A3 staff MIDI and its canonical half-flat frequency, not a wrong accidental.
- Metered Drag no longer silently clamps a dropped note to the last allowable position if it would overhang prepared bars. Instead, the application uses its existing `meterTimeline()` validation and presents the original bilingual invalid-placement message while retaining the old note unchanged.
- Drag pointer capture is cleaned up on unexpected cancellation/loss. During active piano recording the optional `move` callback is omitted, so nonfunctional drag affordances do not appear.


---

## Final Meter Preset List and Persian Terminology (2026-11-21)

The user explicitly changed the terminology: the Persian label formerly `کسر میزان` must be **`میزان‌نما`** everywhere in the Studio Score controls, Practice summary and validation/error messages. The musical/English term remains `Time signature`.

**Supported selections are now exactly:**
- Free — `none` (existing default, no enforced meter, retained from earlier user requirements)
- `2/4`, `3/4`, `4/4`, `6/4`, `6/8`, `6/16`, `7/8`, `5/8`

**Removed completely from the selection/validation allowlist:** `5/4`, `9/8`, `12/8`. No extra presets should be reintroduced without explicit user approval.

Implementation: `web/src/model.js` exports the one canonical ordered `METER_PRESETS` list consumed by the existing Studio dropdown and canonical `meterInfo()/meterTimeline()`. The Python server's `METER_CHOICES` allowlist is updated to the same exact set so AI generation and AI Practice validation agree with the UI. `web/src/app.js` and `web/src/score.js` replaced all user-visible instances of `کسر میزان` with `میزان‌نما`. The app entry import cache key in `web/index.html` is `meter-presets-8-1`.

Verification: JS source parses; all eight metered presets create four correctly-sized empty measures with a full-measure rest; `6/16` resolves to 1.5 quarter-note beats/1440 rhythmic ticks per measure; `5/8` resolves to 2.5 quarter-note beats/2400 ticks; all other numerators/denominators produce their exact values; simple valid notes in `6/16` and `5/8` are accepted. `none` remains Free. Python and JS preset sets agree, and the removed presets no longer occur in either supported allowlist. Actual desktop/browser/API end-to-end execution was not performed.

**This later user decision supersedes the broader meter list described elsewhere in this handoff.** Retain the single shared original `e.notes` model, meter-aware Piano/Pencil/Eraser/AI/Practice behavior and Free mode; only the term and preset allowlist were changed.


---

# FIX: Score SELECT horizontal Drag is SLOT REORDER, not continuous Timeline movement (2026-11-21)

**Confirmed user intent and previous bug:**
The user observed that nudging a Score note slightly to either side created or changed musical rests. Previous `web/src/score.js` `dragOnset()` mapped every X pixel to a timestamp, then rounded to 1/32 in metered mode or a millisecond in Free. Previous `app.js` updated ONLY that note's `at`. The canonical `meterTimeline()` correctly re-derived rests from the modified timeline, but this was the WRONG editing UX: merely wiggling a note must not rewrite its rhythm. This original approach was an intentional low-level timeline implementation and is a bug for the user's requested *notation-based movement*. The user may request an entirely different specialized continuous Timeline mode in future; **do not add or anticipate that feature now.**

**Implemented correctly in the existing `e.notes` engine, no new timeline/audio engine:**

1. **`web/src/score.js` — discrete target selection:** The old `dragOnset()` and all continuous-pixel-to-time interpolation were removed. The existing Select-mode notehead pointer handler now finds the nearest *actual visible note or (in a metered score) rest slot* using `dragSlot(rowIndex,x,sourceIndex)`. The closest slot changes only when the pointer crosses the midpoint between two displayed events. Returning to the source note's slot means no horizontal operation, even if the mouse moved several pixels. The existing translucent ghost shows the exact snapped destination slot, not an arbitrary intermediate time. On release it passes `{m,slot:{type:'note'|'rest',at,barIndex}}` to the same Studio handler. The existing vertical pitch-from-staff logic and handling across wrapped staff rows continue to work. Pen and Eraser are untouched.

2. **`web/src/model.js` — pure `planScoreNoteReorder(etude,sourceIndex,targetSlot)`:** This is **only a pure notation editing planner** built on the original `e.notes`, `meterInfo()` and `meterTimeline()`, not a second renderer, data collection, playback engine or compositional mode. It proposes an atomic `moves:[{index,at}]` set, never mutates the source score, validates that notes do not exceed prepared bars and that rests/durations remain notatable. Its input is a **discrete musical destination slot**, never a free-form floating timestamp.
   - **Metered, SAME measure:** dragging a note onto another note or an existing rest *swaps the two complete rhythmic slots*; their musical durations remain attached to the original notes/blocks. All affected onsets are recomputed from the measure start, so the measure has exactly the same total length. Small moves whose target is the original slot return `moves:[]`: no save, no synthetic rest, no changes to other notes. Existing simultaneous chord groups encountered during a swap remain together.
   - **Metered, DIFFERENT measures:** the moved note's original slot becomes an implicit rest of **exactly the moved note's original duration**. The destination measure inserts the note at the chosen note/rest slot, consumes the corresponding duration from real *existing silent capacity* in that measure (starting with the targeted rest or nearby rests), and recomputes the affected notes' onsets in that **destination measure only**. The rest of the score is untouched. If insufficient silence is available, it **rejects** the drop and shows a localized message; it never deletes notes, overfills the bar, fakes shorter durations, or invisibly ripples every following measure. All candidate changes go through `meterTimeline()` verification before committing.
   - **Free (no meter):** horizontally dragging the third note onto the eighth moves that note to the eighth ordinal position and shifts the intervening note groups. This is a **stable sequence reorder**, not a timeline offset. Each note retains its original duration and pitch, intentional silence/gaps stay associated with ordinal slots, and the total original time span is preserved. A small horizontal move inside the same slot is a complete no-op.
   - **Chords and overlapping polyphony:** existing whole chord groups (same onset and equal duration) stay intact when another note swaps around them. A vertical change of one member **within its own slot** is allowed. However, horizontal removal of only one chord member, unequal-duration overlapping voices or a note tied over a bar boundary are currently **refused instead of corrupting another voice's time**. Such per-voice rearrangement needs an explicit separate music-notation design, not an accidental implementation. This safety is intentional and must be communicated if the user tries it.

3. **`web/src/app.js` — atomic application and Undo:** The Select move callback gets the proposed slot and calls `planScoreNoteReorder()`. It rejects invalid operations with an explanatory inline message without mutating `e.notes`. For a valid operation it first creates a whole-note candidate with every planned onset, reuses the existing `measuredEditAllowed()`, then applies all changed onsets in ONE edit, stops ongoing Score playback, saves and redraws. `rememberScoreEdit({kind:'move',note,before,shifted})` records every affected original note/time in the **existing Studio Undo stack**, and Ctrl/Cmd+Z restores **all** old onsets, plus the dragged note's exact original Pitch/spelling fields.
   - **Horizontal-only:** keeps `m`, `staffM`, `staffAccidental`, `displayPitch` unchanged. A per-note Koron/Sori/flat/sharp is **NOT** wiped just by rearranging its temporal slot.
   - **Actual vertical pitch change:** converts to the natural letter of the destination staff line/space, clears old explicit per-note accidental/spelling metadata, then reuses `e.key` and `e.offset` to determine sound (e.g. an A with A-Koron in the key signature sounds A-Koron). Undo restores all old per-note fields.
   - **No-op horizontal wiggle:** if the target slot and written pitch are unchanged, the handler returns BEFORE stop/save/selection/metadata changes. This directly fixes the unwanted silence/rest changes reported by the user.

4. **Browser cache:** `web/src/app.js` loads `score.js?v=slot-reorder-not-timeline-1`, and `web/index.html` loads `app.js?v=slot-reorder-not-timeline-1`. No new dependencies or new CSS themes. Remains on **`feature/practice-sequence-studio`**; do NOT merge or change `main` without explicit instruction.

**Verification performed with actual fetched source in isolated JS/DOM/PointerEvent mocks:**
- Metered 4/4 third-to-second note swap keeps the bar completely filled; short wiggles snap back with ZERO state mutation; swapping a note with an actual rest yields the rest at the vacated position without adding silence elsewhere.
- Intermeasure transfer into a bar with sufficient existing rest preserves the source's exact missing duration as a rest and adjusts destination note times; transfer to a full measure is rejected without changes.
- Free third-to-eighth ordinal reorder updates notes 4–8 as expected, preserves each note's duration and original intentional gaps, and does NOT invent extra silence. Whole-note original time span is unchanged.
- App/Undo source-backed integration: single atomic undo action restores all touched onsets; horizontal-only E-Koron retains its own explicit sign, vertical-only move to the A line clears the override and uses the existing A-Koron key, and Undo restores the original E-Koron data.
- Score PointerEvent mocks: moving a few pixels within the same visual slot targets the original onset; dragging to a neighboring note snaps exactly to that note's beat; dragging to a visible rest resolves `type:'rest'`; Free third-to-eighth drag resolves to the eighth event.
- Additional property-style testing: 1504 candidate metered 4/4, 6/8 and 6/16 swaps preserved bar validity, without modifying original notes; 6400 varied-length Free reorder cases kept all notes nonoverlapping and preserved total time span and gaps. Full JavaScript source syntax parsing passed.
- **Not performed:** manual visual pointer interaction in the live desktop/mobile browser, end-to-end audio listening, or native APK runtime validation. The additional per-voice/chord-member horizontal move semantics and automatic multi-bar overflow pushing remain intentionally out of scope and safe-rejected.

**Acceptance checklist:** In Select, wiggle a note a little sideways and release: ZERO change to rhythm or rests. Drag it to a neighboring note: exact swap within the bar. Drag it onto a rest: swap/rest follows note's original position. Drag it into another measured bar with enough silent capacity: original space becomes a rest of equal duration; the target measure reflows without exceeding the meter. If it is full: show the error and do not damage the Etude. In Free, move the third note onto eighth: reorder the sequence, keep original intentional silence and note lengths. Horizontal-only must preserve an explicit accidental; vertical must apply the new key signature. Ctrl/Cmd+Z must restore every changed note.


---

## Language-only presentation adjustment: Western modes vs tonic notes (2026-11-21)

**User request:** In the Western Music mode/scale dropdown, keep all actual mode names in **English**, even when the application language is Persian (for example `Major`, `Natural Minor`, `Dorian`, `Phrygian`, `Lydian`, `Mixolydian`, `Locrian`). For the **note-name / Tonic dropdown**, show Persian musical note names when the UI language is Persian and the original English notation when the UI language is English.

**Implementation (display only, NO musical-data changes):**
- `web/src/studio-etude-generation.js`: `fillStyleOptions()` uses `entry.label.en` unconditionally only for `musicSystem==='western'`, and keeps `localized(entry.label,fa)` for the Iranian Dastgah selector. Selector headings, controls and all existing functions remain unchanged.
- The `tonicDisplayName(tonic,fa)` display-only helper converts `tonic.spellings` into Persian note names: C/دو, D/ر, E/می, F/فا, G/سل, A/لا, B/سی. It retains exact sharp/flat glyphs and enharmonic pairs, e.g. `F♯ / G♭` -> `فا♯ / سل♭`. In English it returns the unchanged original catalog `tonic.label`.
- The underlying `option.value=entry.id` and `option.value=tonic.id` remain **identical** in both languages. The music-systems catalog, `signatureForMusic`, `e.key/e.offset`, piano sample/tuning, AI request, and Practice are not modified. Only the visible text changes.
- `web/src/app.js` composer import cache tag and `web/index.html` app import tag bumped to `western-modes-tonics-language-1`; other files untouched apart from this handoff.

**Verified:** All 12 Western tonic entries produce the expected Persian note-name/spelling display and retain all 12 original English labels; the seven Western mode labels use their English catalog text in both languages; all option IDs remain stable. Full edited composer JS parsed successfully. Real device/browser visual QA still required.

**Do not** translate Western mode names into Persian again or save localized Tonic display labels in Etude data. Locale only controls presentation, not pitch identifiers.


---

# Free Score Drag correction: INSERT before/after NOTE or REST; NEVER swap/replace (2026-11-21)

**User correction (supersedes previous Free horizontal Drag design):**
The user saw that pulling note #3 "in front of" note #5 visually behaved as though note #5 replaced note #3 in its original slot. This is explicitly **WRONG in Free meter**. Free is not a timeline-position drag or a two-item swap. User further specified that **a rest is also a musical event/slot and counts in the sequence, just like a sounding note**. A dragged note must move **before or after another note OR before or after a rest**. The target must remain in the same relative order with all other untouched events. Only the intervening events shift as needed to close the vacated slot and open the new insertion slot. The original note's pitch, accidental, duration, and unique identity must stay unchanged during a horizontal-only move. There is no need for a second music/audio engine or new storage collection.

## Actual changes

- **`web/src/model.js` → existing `planScoreNoteReorder()` Free branch only:** Previously it grouped *only sounding notes* and used note-index-aligned silent gaps; the user correctly pointed out that this fails to treat rests as first-class notation positions. The Free branch now derives one ordered ephemeral event sequence from the existing canonical `e.notes`: each **note/chord group** as a note event, and each true time gap between groups as an explicit derived **rest event** with its original duration. No new persistent rest model is created. On horizontal drop, remove only the dragged note event and insert it before or after the actual destination event. Do NOT exchange its position with the target. Reflow the event sequence into normal onset times using unchanged event durations; preserve the relative order of every other note AND rest event, as well as their total temporal span. A drop within the original source slot returns `moves:[]`, so no silence is unexpectedly created. Chord/overlapping voice restrictions remain as safe guards. The existing Metered branch (slot swapping within a bar, capacity-aware transfer between bars) is intentionally unchanged.
- **`web/src/score.js` → existing `dragSlot()`:** In Free, the drop candidates now include both rendered `notes` AND `rest` events. A target drop near the event's head/left side means `position:'before'`; moving right of the target means `position:'after'`. The ghost note and thin vertical guide preview the proposed insertion **to the left or right of** the target, instead of sitting over and looking like it would replace the target. The existing Select pointer capture, vertical pitch handling, Pen, Eraser, Score rendering and audio are unchanged.
- **`web/src/app.js`:** The existing move callback already passes the whole `slot` object to `planScoreNoteReorder()` and atomically applies the proposed `moves:[{index,at}]`, with a single Undo entry retaining every prior onset. No second apply/undo path is needed. Its Score import version is updated to `free-note-rest-insertion-1`. `web/index.html` app import version is also `free-note-rest-insertion-1`.
- **Codex instruction:** For any future Free Drag change, treat silence as an event in the stable ordinal sequence, not as an incidental property attached to note indexes. **Do NOT** move target note #5 into note #3's vacated position; **do NOT** implement continuous/free-floating timestamp movement for this interaction; **do NOT** silently omit rest slots. If a dedicated Timeline UI is requested later, it is a separate future feature not authorized by this task.

## Concrete musical examples

- Free note order `1, 2, 3, 4, 5, 6`: drag **3 BEFORE 5** → `1, 2, 4, 3, 5, 6`. Note **5 stays after 3** and does **not** jump back into position 3. Drag 3 AFTER 5 → `1, 2, 4, 5, 3, 6`.
- With a rest event `N1, N2, REST(quarter), N3, N4`: drag N1 BEFORE REST → `N2, N1, REST, N3, N4`. Drag N1 AFTER REST → `N2, REST, N1, N3, N4`. Rest is an actual independent item with its own quarter duration, not a detached gap that arbitrarily follows a changed note.
- Drag a note a few pixels while still within its source slot → *no change at all*. A horizontal-only reordering preserves per-note Koron/Sori/accidentals. Vertical moves keep their existing signature rules and Undo exactness.

## Validation

- Checked all 12 tonic/naming changes from the previous independent task remain intact; no changes to Western styles, score audio, Practice, AI, tempo, meter presets or stored event format.
- The actual `model.js` Free reorder planner + original `app.js` move/Undo callback were exercised: third note before fifth preserves other note order, never swaps fifth into the third slot; a dragged note can be inserted before/after a rest event; Undo restores every old onset and the exact gap durations. Metered note swap remains unchanged.
- The actual Score SVG pointer logic was tested with mocked PointerEvents: dropping over note #5's head targets `before`; dropping to its right targets `after`; Free quarter rest is recognized as an actual drop target on both sides; a small source-slot wiggle remains a no-op in the planner.
- Property testing generated **35,000 Free insertion candidates** spanning varied lengths, initial/intermediate rests and before/after destinations. Every valid result preserved all note and rest events' relative order (except the moved note), their exact lengths and total time span; original note data was never mutated by the planner.
- Source JavaScript syntax checks passed. **Real browser mouse/touch, audio and APK end-to-end testing has not been performed.**

This section takes priority over the earlier handoff passage that described Free Drag as a note-only ordinal reorder with gaps associated with positions rather than explicit rest events.


---

# Studio Score rest editing + disable native text selection (2026-11-21)

**User-reported defects:** Although rests had been treated as ordinal musical events for Free note insertion, **the drawn rest glyphs themselves were not interactive**: the Score `rest()` SVG renderer drew their shape but did not add the transparent pointer hit area given to noteheads. Consequently a user could **neither drag a rest with Select nor erase it with Eraser**. Separately, native browser text selection/highlighting on SVG text/glyphs/staff felt like selecting ordinary website text. The user explicitly wants to stop ONLY native text selection; they still want normal note selection and Drag using the app's own Select tool.

**Implementation on `feature/practice-sequence-studio` only:**

1. `web/src/score.js`: `score()` now accepts optional `moveRest(source,targetSlot)` and `eraseRest(source)`. Each **rendered rest** (Free gaps, metered short rests, whole-measure rests) now has a 26×48 transparent SVG hit rectangle with its actual source `{at,duration,barIndex,wholeMeasure}`. In Eraser mode, clicking that region calls `eraseRest` and stops propagation; in Select mode a 5-pixel pointer-drag threshold, pointer capture, cancellation cleanup, and the original cross-row `dragDestination()` support moving that rest to an actual note/rest slot. On release, pass its true event time/duration and before/after target selection. On hover/drag, preview a translucent **rest glyph** and position guide, *not* a ghost notehead. Pen mode deliberately gets no new hit target, so previous pencil-click behavior is unchanged. Practice viewer does not supply callbacks and remains read-only. Original note selection/dragging, Koron/Sori rules, key editor and score engraving remain intact.
2. `web/src/model.js`: New pure `planScoreRestEdit(etude,source,target=null)` uses the **existing e.notes onsets/durations and canonical `meterTimeline()`**. It creates NO persistent rest array and does not introduce a second timing engine. It emits only the affected original note-onset edits `{moves:[{index,at}], measureCount?}`, or a specific reason when a move/deletion is not representable. It never mutates source data:
   - **Free Eraser:** removing a rest closes its original time gap; following note groups shift earlier by precisely the erased silence duration. Their pitches, durations, relative order, per-note accidentals and other retained rests are unchanged.
   - **Free Select Drag:** removes the selected rest EVENT from the ordered Free note/rest sequence and inserts it *before or after an actual destination note or rest*. All other events remain in the same relative order with their original lengths. This respects the user's rule that a rest counts as a note-like musical event. It is never swapped against a target. Purely trailing silence **after the final sounding note** cannot be persisted in current Free e.notes and is explicitly rejected with a localized inline explanation rather than faking a successful move.
   - **Metered Eraser, internal rest:** a measure MUST remain exactly full. Removing a rest among sounding notes closes that temporal gap, shifts later notes *within the same measure* earlier and leaves the exact removed duration at that measure's end as a rest. Erasing that final required rest is not a valid operation: explain that it is needed to complete the measure and a note must replace it.
   - **Metered Eraser, complete empty measure:** erasing its single `wholeMeasure` rest removes the **entire empty measure**, reduces `measureCount` by one, and shifts notes in subsequent measures backward by precisely the removed bar length, if at least one measure remains. A final single remaining measure cannot be deleted; show a localized message. This prevents the same full-bar rest from being invisibly regenerated after a supposed deletion.
   - **Metered Select Drag, same measure:** removes the rest token and reinserts before/after the selected note/rest event while reflowing the measure without changing its exact total duration. Existing note durations/identities remain untouched.
   - **Metered Select Drag, across measures:** equal-duration note/rest slot exchange is supported when both bar totals remain unchanged; different-length moves are **rejected** rather than silently corrupting the time signature or crossing barlines. Polyphonic overlapping and tied passages also reject unsafe edits. All resulting candidates are rechecked with canonical `meterTimeline()`.
3. `web/src/app.js`: Existing Studio `sheet()` passes the above rest callbacks only when not recording. `editScoreRest(source,destination)` calls the pure planner, validates candidate note timings and measureCount, applies all onset changes in ONE atomic edit and uses the **existing Studio Undo stack** with `{kind:'rest-edit',shifted,measureCount:oldCount}`. Ctrl/Cmd+Z restores every shifted original note onset and prior measure count. It reports specific localized inline reasons for required trailing rest, last remaining measure, unsupported Free after-final-note rest, unsafe polyphony, or inter-measure unequal durations. Never mutate notes on a rejected edit. No changes to actual piano/audio, AI, Practice, pitch tuning, BPM, note duration, Key Signature or separate rest storage.
4. `web/style.css`: New selector `.score svg, .score svg *` sets `user-select:none`, `-webkit-user-select:none`, `-moz-user-select:none` and `-webkit-touch-callout:none`, **without any `pointer-events:none`**. SVG text, clef, accidental glyphs, noteheads and staff lines no longer highlight like web text when dragged. Existing Select, Pen, Eraser and key-signature click and pointer interactions remain enabled. This is scoped only to notation SVG, not application forms or ordinary text.
5. ESM import and CSS browser-cache versions updated to `rest-events-edit-1` in `web/src/app.js`, `web/src/score.js` and `web/index.html`, including consistent versioned model imports. No new files or dependencies.

**Validation conducted (source-backed isolated JS + SVG PointerEvent mocks):**
- Actual Score SVG creates Select pointer hit regions on **each Free and metered rest**, including four whole-measure rests in a blank 6/8 Etude; Eraser click reports correct `at/duration/barIndex/wholeMeasure`; Select rest drag to a note passes the correct target and correctly resets the rest preview; Pen mode does not intercept rest clicks. User-requested app-level Select note dragging is preserved.
- Actual app rest-edit + Undo tested in Free: delete a one-second gap and shift following notes, drag a rest before a note, undo restores exact original timings; in 4/4: deleting an internal rest shifts following notes earlier, leaves the remaining rest at measure end, undo exact; deleting a whole empty measure reduces count by one and retimes later notes, undo restores both. Required final rest / final measure deletion rejected safely with explanatory status.
- Pure planner tests of more than **16,800 Free** remove/reinsert candidates preserved order, original note durations, silence lengths and source immutability, with 600 intentional unsupported trailing-rest drops; more than **15,600 valid metered** rest deletion/moves preserved meter validity, rejecting 133 unsafe/unequal-length cases. JavaScript syntax checks passed on all edited modules. CSS remains scoped to Score SVG without disabling pointer interaction.
- **Still needs an actual desktop browser and touchscreen visual smoke test**, especially clicks on quarter/eighth/whole-measure rest glyphs, text-selection highlighting on the staff, user-visible feedback for unavailable final rests, and SVG scaling/scroll coordinates. No actual audio output or APK test was performed.

**Important design constraint for later Codex work:** Never add a separate rest playback engine or second note timeline to resolve this task; rests still arise from the single canonical `e.notes`. A user may request persistent *trailing* Free silence or independent rest lengths in a future feature, but they have not approved extending the data format here. Respect musical measure capacity; do not silently make bars shorter.


---

# Post-handoff bug fixes: Free piano-recorded overlap Drag, rest editing, recording onset and score playback marker (2026-11-21)

This section records **confirmed user-reported bugs and subsequent assistant fixes** after the original rest-edit / SVG text-selection handoff. It supersedes any older assumptions that **Free recordings must be monophonic/non-overlapping**, or that **Score arrows represent all still-sounding notes**. These updates were committed **only** to `feature/practice-sequence-studio`, not `main`.

## Bug 1 — old and newly recorded Free piano etudes could not reorder notes or edit rests

**User reproduction:** A Free (no meter) etude made with piano recording displayed:
`This overlapping or chord passage cannot be reordered safely.`
Dragging notes with Select failed, even though notes handwritten with Pen in newly created etudes could be reordered. The same problem affected dragging/erasing rests in passages containing overlapping recorded notes.

**Root cause:** In `web/src/model.js`, `planScoreNoteReorder()`'s Free path used `validateGroups()`, rejecting **the entire etude** whenever any adjacent notes overlapped (`next.at < prior.at + prior.d`). `planScoreRestEdit()` had an equivalent blanket overlapping/polyphony guard. Live piano recording deliberately preserves original key-on times and key-held lengths without quantizing in Free mode, so a later note may begin before the previous note releases. This can occur in **new** recordings too; it is not inherently a legacy-etude or bad-data problem. Normal Pen insertion does not usually exhibit this because it creates sequential notes.

**Fix:**
- `web/src/model.js`: The existing pure Free planners now support ordered note/rest events when recorded note **releases overlap later onsets**. Shared helper `overlappingFreeEvents(groups, EPS)` derives ephemeral event blocks without a second persisted notes/rests collection. Each note event retains its **onset-to-next-event advance**, while actual rest events retain their silence durations. `reflowOverlappingFreeEvents(order)` computes new canonical note onsets for **both** note Drag and rest Drag/Eraser; an explicit rest begins after preceding sounding notes finish. Original note objects' durations, pitches and accidentals remain unchanged.
- For Free horizontal note Drag, remove source event and **insert** before or after the selected note/rest event. **Never swap** the target into the vacated source position; other unaffected events retain their relative order. The standard non-overlapping Free path and all Metered timing rules remain unchanged.
- True **same-onset chords** remain grouped. Moving a **single member of a simultaneous chord** is intentionally rejected; moving other independent notes among overlapping groups is supported. Free trailing rests after the final sounded note remain unrepresentable under the existing `e.notes` format and are still rejected.
- `web/src/app.js`, `web/src/score.js`, `web/index.html`: ESM cache-query updates accompany the revised shared model to prevent stale browser modules. **No new UI tools**, note schema, audio engine, or persistence format were added.

**Commits:**
- `a5dde5e8b7210980ec5221c48f10ec560dea4307` — initial Free piano-overlap note Drag support.
- `795e0a3d4ca321180b95f1daad3d226527b8f690` — shared Free overlap event reflow for **both notes and rests**; final version for this bug.

**Validation:** Isolated real-model planner tests demonstrated overlapping-recorded note reordering, overlapping-recorded rest dragging/erasing, unchanged handwritten Free and Metered behavior, no swap of other notes, true chord safety, and rejected trailing Free rest. The assistant also ran 6,000 randomized note-drag scenarios plus focused rest/meter regressions. These are **programmatic tests, not a real-browser mouse, native-device, or live-audio end-to-end test**.

## Bug 2 — Record began timing when Record button was clicked, rather than on first piano key

**User requirement:** Pressing Record should arm recording, but the timing for the new take must begin **on the first piano key-on**, regardless of how long the user waits before playing.

**Root cause:** `web/src/app.js` previously initialized `rec.start = unlock().currentTime` on Record click. The first created note used `rec.base + Math.max(0, at - rec.start)`, so pre-performance waiting became an unintended initial rest.

**Fix:** In the existing `studio()` Record toggle, initialize `rec.start = null` while keeping `rec.base` equal to the end of existing notes and preserving the Metered rhythm step. On the **first** existing piano `onStart(m, at)` callback, assign `rec.start = at`, then continue using the unchanged `rec.base + Math.max(0, at - rec.start)` formula. This preserves later notes' exact relative performance intervals and allows append-recording onto an existing etude. No changes to live piano sample playback, capture release/duration, meter quantization, or data schema.

## Bug 3 — playback arrows followed overlapping sustained notes instead of latest note onset

**User requirement:** The score's arrows should advance according to **the note that has most recently begun**, not every note whose audio is still ringing.

**Root cause:** `paintPlaybackMarker()` selected all `playback.notes` whose `elapsed` fell inside `[note.at, note.at+note.d)`, so notes overlapping the following note could display **multiple outdated arrows**. The sounding piano sample's natural decay is separately controlled by the audio transport and must not dictate the displayed current-note arrow.

**Fix:** `web/src/app.js` now finds the **latest note onset at or before playback elapsed time**, displays arrows only for notes having that exact onset **while their written duration remains active**, and preserves **simultaneous chord** arrows. No arrows appear during genuine later silence, even when an earlier note's sample remains audible. Marker segments' `data-playback-from`/`data-playback-to` are checked on **every frame**, avoiding stale arrows when a sustained note is tied/split into multiple engraved sections. Pause/resume keeps the original transport clock and logic; only obsolete marker-signature caching is removed. The audio scheduler and note lengths were **not** altered.

**Combined commit for Bugs 2–3:**
- `cfe6207518766850031d2d3b698a8d631147df06` — first piano key anchors recording, Score marker follows latest note onset.
- Changed files: **`web/src/app.js` and `web/index.html` only**. The HTML change updates the app-module cache version to `piano-record-onset-marker-1`; `model.js`, `score.js`, audio, and the musical data model were not modified in this commit.

**Validation:** JavaScript syntax verification; isolated marker checks across ten onset/overlap/chord/silence boundaries, a tied-score-note segment transition, and three first-key recording timing scenarios passed. **Full desktop browser, mobile pointer interactions, real piano recording, live audio, and APK end-to-end tests are still not confirmed.** Do not claim those tests occurred.

## Guidance for future Codex / assistants

1. Treat the latest code on `feature/practice-sequence-studio` and **these newer sections** as authoritative over superseded handoff text.
2. Keep `e.notes[{m, at, d}]` as the single canonical musical-time and pitch/audio source; derived rest events are not a second persisted model. Keep Pen, Select, Eraser, Studio transport, Practice, and piano timing consistent.
3. A Free piano recording may legitimately have **overlapping note releases**. Do not reinstate whole-etude monophony validation for Free note/rest Drag. Do not silently collapse or round performance time; do not rewrite every recorded note into a sequential score.
4. Free Drag is **remove + insert**, never swap. Preserve unrelated order, note durations, rests, and undo. Metered drag and bar capacity validation are separate and must remain constrained.
5. Record's start clock is established by **the first actual piano key-on** after arming; `rec.base` remains the append point. Score arrows indicate **the latest performed/notated onset**, not every continuing voice/sample tail; simultaneous notes at identical onsets are an intentional exception.
6. Every future user-reported bug fix must be appended to **this very handoff file** with reproduction, root cause, actual changed files, behavior/limits, commit(s), tests performed, and tests **not** performed. Do not present mocked tests as browser/device validation. Avoid unrelated code changes.


---

## Regression fix: piano sample decay was recorded as note length in Metered Etudes (2026-11-21)

**User symptom:** While recording on-screen piano with a time signature, the staff produced unnaturally long notes, overlapping voices, bar-spanning ties, and confusing rest notation. Free handwritten note entry did not produce the same problem.

**Root cause:** The existing piano handler deliberately lets a very short physical key tap ring for `PIANO_TAP_RING_SECONDS = 2` seconds, passing that sound-release duration into `liveVoice()`. The same callback was also fed to Studio's `onDuration` recorder, storing `e.notes[].d = 2` instead of the real ~100-ms key hold. `meterTimeline()` then faithfully engraved the incorrect two-second lengths in Metered notation. Re-striking a still-ringing sample could also trigger `onDuration` a second time and overwrite a previous note.

**Minimal fix:** In **`web/src/app.js` only**, the existing `piano()` key handler uses a per-key `finishRecording` function that reports a physical key-hold duration (minimum 1 ms, maximum 6 s) to the unchanged `onStart` recording callback **once**. On release, it calls `finishRecording(heldSeconds)` before the existing sample-release function. The sample continues to ring for the **same** 2 seconds on sub-180-ms taps, or releases after the held duration otherwise. If the same key is re-attacked before key-up, the original `liveVoice` damp callback reports the interrupted hold once; later physical release or tail damping cannot overwrite that note. The one-off record gate exists in the current `piano()` function and does not introduce a second recorder or modify `liveVoice` itself.

**Unchanged:** `web/src/audio.js`, `web/src/model.js`, `web/src/score.js`, note data schema, Free/Metered notation rules, 1/32 grid, original piano sample/envelope, existing transport/playback, pitch, Free Drag and rest editing, practice, Undo and first-key Record onset. The only other code file touched is **`web/index.html`**, solely to bump the app ESM cache key to `metered-piano-record-keyhold-1`. No new tools, UI, backend or dependencies.

**Validation (isolated, not live-browser):** The actual modified keyboard handler was exercised together with the **original unmodified** `liveVoice` against mocked WebAudio controls. A 100-ms key-up recorded 100 ms while the acoustic release remained 2 s; a 700-ms held key recorded/released 700 ms; over-6-second holds stayed capped; non-recording piano kept its existing sound; restriking a released tail did not rewrite the earlier note; restriking a still-held key recorded its elapsed time once. The unchanged `meterTimeline` accepted short snapped notes without ties in 2/4, 3/4, 4/4, 6/4, 6/8, 6/16, 7/8 and 5/8. JS syntax checked. **No actual browser, physical piano playing, audio-listening, touchscreen, or APK test was performed.**

**Compatibility:** Affects **new recordings only**; previously saved long note durations are not silently rewritten. If future complaints concern sophisticated live MIDI transcription/quantization or legitimate simultaneous voices, address those as separate explicit tasks rather than changing sample playback or the canonical `e.notes` representation.


---

## Follow-up: metered live piano duration inferred from attacks; optional metronome (2026-11-21)

**User diagnosis:** The previous fix separated the acoustic piano's two-second release tail from physical key-held time, but still treated **key-held time** as the written note length. This is not valid rhythmic transcription: at **60 BPM**, playing four quarter-note attacks at 0, 1, 2 and 3 seconds may involve holding each key only 100–400 ms. Metered Score must display **quarter notes**, not lots of short notes/rests. The user also requested a **toggleable metronome** to help maintain tempo.

**Implementation (existing canonical `e.notes`):**
- `web/src/app.js`: `snapRecordedOnset()` uses the existing 1/32-quarter grid, favoring whole/eighth/sixteenth beat positions for onsets near clean musical subdivisions. The previously fixed **first-key Record anchor** and append base remain in place.
- `reconcileMeteredTake(take)` uses the **next distinct quantized attack**, not short physical key hold or sound tail, to infer durations in the Metered live take. Intervals up to **1.5 quarter beats** become the corresponding rhythmic note value. For a longer gap, a short physical tap implies **one quarter note followed by a derived silent rest**; a long hold (>=1.5 beats) supplies evidence for a sustained longer note. Final short notes default to a quarter. Simultaneous chord entries use the next distinct onset. The original note objects in **`e.notes`** get updated in place; transient `rec.events` is for recording only, not a new saved data model. **Free recording continues to retain exact key-held times**, including its overlap-aware drag logic; the acoustic piano samples remain unchanged.
- `startRecordingMetronome()` and `stopRecordingMetronome()` use short click oscillators scheduled with the existing **Web Audio clock**, not JS timer timestamps. The JS interval only preloads a lookahead buffer. Accent marks the start of a measure; compound **6/8 and 6/16** pulse in 3-denominator-note groups, other meters in denominator units. A metronome icon button sits **before the Record button**; it appears only in Metered Studio, defaults OFF, and clicks **only while recording**. Turning it off, ending Record, changing to Free, navigating away, or window blur stops clicks. It can resume after focus if recording is still active. Meter and tempo controls are disabled during recording so the current take's rhythmic grid stays stable.
- `web/style.css`: minimal metronome control styling with existing theme variables. `web/index.html`: bump app and CSS cache keys to `metered-onset-metronome-1`. **No changes** to `web/src/audio.js`, `web/src/model.js`, `web/src/score.js`, note schema, piano timbre, Score player, Pen values, Undo, Practice or other pages. Metronome clicks are not added to score data.

**Musical ambiguity:** It is not possible to determine solely from key-on timestamps whether a two-beat interval means a held half note or a quarter followed by a quarter rest. The above **explicit heuristic** uses physical holds as evidence only for long sustained notes and is editable in Score afterwards; it is not a guarantee of perfect expressive/polyphonic transcription.

**Validation:** Isolated actual-helper tests at 60 BPM: short-key-hold attacks near 0,1,2,3 seconds wrote four quarters; a two-second gap following a short tap generated the expected full quarter rest from the unchanged `meterTimeline`; a held ~2-second note became a half note; half-beat eighth attacks, same-onset chords, and short final note were checked. The existing `meterTimeline` accepted outputs in all eight supported meters. A mocked Web Audio clock verified immediate first click, correct subsequent one-second beat spacing, and stop. Parsed the modified `app.js` and verified exact Free/Metered branches in recording callback. **No browser/device/live audio/APK end-to-end testing was performed.**

**Scope guard:** Do not quantize Free notes, alter existing saved etudes, add separate audio/score engines, change current piano sample tails, or implement Pen-value/rest-entry redesign under this fix.


---

## Fix: Western music signature must not retune physical Goosh piano (2026-11-21)

**User bug and explicit distinction:** Selecting a Western musical system (Major/Minor/Mode and tonic) must continue to set the actual **Score key signature and sounding written notes**, but it must **NOT** turn the on-screen physical piano's natural/black keys into the transposed key-signature notes, labels or frequencies. A pianist playing G-major still needs a physical **F-natural white key** and a distinct **F-sharp black key**. Selecting an **Iranian Dastgah**, however, intentionally retunes the appropriate keys (Koron/Sori/flat/sharp) and should continue to label/tune them exactly as before. No other behavior is requested.

**Root cause:** `web/src/app.js` used the canonical `freq(e,midi)` both in the original Score and in the physical piano's `liveVoice` and key labeling, so Western written key signatures unintentionally altered the physical piano. The shared `freq()` itself is correct for the *Score*, and **must not be modified**.

**Minimal implementation:**
- In `web/src/app.js`, add a tiny **piano-only** `pianoFrequency(midi)` adapter that still calls the original `freq()`, but with an empty key/offset/marks tuning object **only when** `e.musicContext?.musicSystem === 'western'`. This means all 12 piano keys are in normal A440 equal temperament, independent of the selected Western mode or saved manual key-signature offsets. For Iranian and legacy `musicContext === null`, pass `e` unchanged; no change to old instruments/etudes. No duplicate oscillator or musical pitch engine.
- `updatePianoKey()` reads the musical-system flag: Western piano keys have unchanged natural note names, normal black-key labels, no signature accidental badges or tuned-frequency labels, and show natural Hz in the existing tooltip/ARIA. Iranian keys retain the existing marks, per-note altered frequency labels, tooltips, and audio.
- The existing single `liveVoice` call inside `piano()` now consumes `pianoFrequency(m)`. The original key-on MIDI value, physical note hold, recording, release, tactile/click behavior, octaves and shortcuts stay unchanged.
- **Do not change** `web/src/model.js` `freq(e,m)`, `web/src/music-signature.js` preset application, Key Signature Editor, the Score's `freq(e,n.m)` playback, score engraving, playback markers, imported notes, pitch customization, note schemas, or the Studio composer. The existing `onSignatureChange` callback already saves `musicContext` and invokes `sheet() -> refreshPianoKeyLabels()`, so switching music systems immediately updates the keyboard without any extra render.
- `web/index.html` only bumps app import cache key to `western-physical-piano-1`. No CSS or other source files are modified.

**Tests (isolated code/mocked key DOM):** Compare Western G-major with F-sharp key signature and optional cent offset against piano MIDI F4=65, F-sharp4=66 and A4=69: Western piano remains natural equal temperament, while `freq(e,65)` continues playing the altered Score F-sharp. Confirm every Iranian/legacy MIDI key equals its prior `freq(e,midi)` behavior and Iranian Koron/Sharp labels remain. Toggle Western → Iranian → Western on the same object to confirm the actual UI helper updates. Validate JS syntax and that neither score playback nor Key Signature Editor sound functions were modified. No physical browser/audio or APK end-to-end test was performed.

**Compatibility note:** This change is deliberately restricted to the physical piano. Existing piano-to-Score note-entry stores the original MIDI `m`, while written Score notes continue to obey `e.key`. For example, pressing Western F-natural and transcribing under a Western G-major signature may have different piano audition versus saved Score pitch without an explicit natural accidental. This is an older broader notation-interpretation concern, **not** corrected in this narrowly scoped bug fix; do not claim otherwise.


---

## CRITICAL OPEN BUG — Metered live piano recording / written rhythm is NOT fixed (user-confirmed, 2026-11-21)

**STATUS: UNRESOLVED / REQUIRES USER APPROVAL BEFORE ANY CODE CHANGE.** The user explicitly reports that the previous attempts to fix **live piano Record -> metered Score notation (note durations, rhythm, and rests)** still **do not work correctly**. Do **not** mark this bug as solved, and do not treat earlier mock/unit test passes or commit descriptions as real-world acceptance. This latest user report supersedes all earlier "fixed", "passes" or "validated" claims concerning this specific feature.

**Scope and relevant history:**
- `db989769a41adb7fc3558b9af2271241544e761b`: separated the physical piano key-held duration from the audible piano sample tail (originally a short tap could be recorded as a 2-second note). User then clarified that treating key hold as a written rhythmic duration is also wrong.
- `1dea61efe51bf8772e129a22257477dd2dd50984`: attempted onset-based rhythmic transcription of metered piano Record plus an optional metronome. **User now confirms the resulting recording-to-notation behavior remains incorrect.** The exact remaining failure case has not yet been independently demonstrated/confirmed; do not invent or assume a specific symptom beyond the user's report.
- `45683271785d43b9e5a5434a9ee1baaab37c3c0b`: separate Western-versus-Iranian **physical piano** tuning/display correction. Do not confuse it with or use it as proof that metered Record transcription was fixed.
- The relevant existing code is principally `web/src/app.js` (piano key-on/key-off callbacks, `rec` state, `snapRecordedOnset`, `reconcileMeteredTake`, `startRecordingMetronome`) and its interface with the shared `web/src/model.js` `meterTimeline()` and `web/src/score.js` rendering. The single canonical musical representation is `e.notes[{m,at,d}]`. Keep that architecture and preserve existing Free recording, audio release behavior, meter validations, rest editing, Undo, playback, Iranian/Western tuning, and the opt-in metronome unless the user expressly authorizes changing any of them.

### MANDATORY — ask for confirmation BEFORE implementation

**Codex must not edit, refactor, commit, push, or otherwise change any code in the piano-recording / metered-score-transcription path until the user explicitly confirms that Codex understands the bug and approves the proposed direction.** This documentation update is not that approval.

1. First **read the latest source code and this handoff**. Explain in Persian, plainly and specifically, how live piano attacks, physical key holds, sound tails, BPM, beat/grid alignment, inferred note values, rests, and the final note are currently handled.
2. State clearly that the **bug is still open**, and identify where the current inference may disagree with the musical result. **Do not state a hypothetical cause as established fact.** Ask the user to describe an actual reproducible input/output example if needed: time signature, tempo, the sequence of keys/onsets, how they were pressed, **what appeared on the staff**, and **what the user expected**.
3. Provide the user with a **precise understanding of the reported issue** and a **proposed musical/technical rule set and narrowly scoped plan**, including the treatment of note onset versus physical key hold, short notes and true rests, simultaneous notes, long notes, final note, and the relation (if any) between metronome phase and note quantization. Explain ambiguity where performance data cannot unambiguously distinguish e.g. half note versus quarter plus rest.
4. **Ask explicitly:** “آیا برداشت من از مشکل و روش اصلاح پیشنهادی درست است و تأیید می‌کنی که اجرا کنم؟” Wait for an unambiguous **yes / approval from the user**. If the user corrects the understanding, revise the explanation and ask again **before writing code**.
5. **Only after explicit approval**, implement the **minimum** change in the existing shared functions, validate actual time-signature/tempo examples, note/rest durations, score display and sound, and check regressions in Free mode and other app features. Update this handoff with exact findings, changed files, tests *actually performed*, and any remaining limitations. Do not claim browser/device/audio tests unless truly run.

**Important:** The earlier programmatic/mock test results are not a substitute for the user's observed behavior and approval. **No code repair is authorized by the user's present message; they requested only this documentation warning and the pre-fix confirmation gate.**


---


## Mobile-only design pass: Studio toolbars, keyboard and Practice Sequence (2026-11-21)

**User instruction:** Improve Goosh's mobile UI but **do not break or change Desktop**. This is a visual/responsive-only pass and does **not** authorize edits to audio, piano recording/notation, transport, music systems, score model, Practice logic or navigation behavior. The separate **Metered live piano transcription bug remains OPEN**, and the prior Codex approval gate remains in force.

**Changes:** Only two CSS files get new `@media screen and (max-width: 700px)` scoped rules, with a nested `min-width:480px` / `max-width:700px` subsection for wider phones and a landscape-height guard. The existing non-mobile CSS declarations remain byte-for-byte untouched.
- `web/style.css`: opened Studio's title and Share/PDF actions form a stable mobile grid. The original Select/Pen/Eraser, wrap and zoom buttons become three equal-width touch targets per row; Play/Pause/Metronome/Record receive a dedicated full-width four-column row, with visible audio status occupying its own row. Staff and piano remain horizontally scrollable, and the piano keys **retain their current width and touch handlers**; only the mobile keyboard height/padding changes. Meter, Pen value, measure count and tempo fields use a predictable stacked layout on narrow phones and two columns when 480–700px. Existing hidden controls remain hidden, and all button callbacks are untouched.
- `web/practice-designer.css`: mobile-only composition and Practice Sequence sections receive consistent inset/padding, full-width Manual/AI tabs, two balanced musical-system choices, an accessible full-width key-signature entry, single-column fields, and 44px action touch heights. No hiding, duplicating or moving DOM nodes.
- `web/index.html`: update **only** style.css and practice-designer.css stylesheet cache query strings to `mobile-studio-layout-1`.

**Desktop safety:** Both changes are appended within **`@media screen and (max-width: 700px)`** only. At 701px or wider, original desktop CSS is unchanged. No JavaScript, model, audio, Score renderer, HTML structure or other stylesheets were changed.

**Validation:** Static stylesheet structure/guard review and changed-file scope verification, including mobile portrait/landscape CSS branch inspection. No real browser, screenshot, phone, Android APK, actual touch, or desktop visual smoke test was performed; treat runtime visual appearance as unverified.

**Follow-up:** Test 320px, 375px, 430px, 600px and desktop >= 1100px visually before any further UI refinements. If user prefers another layout, adjust only mobile CSS and preserve the desktop selectors and open Metered Record bug.


---

## Mobile-only: four-tab bottom navigation and logo-only header / Settings sheet (2026-11-21)

**User request:** On mobile phones, remove top-header navbar and the separate language/theme buttons, show **only the Goosh logo** at the top, and make the existing bottom navbar contain **Home | Etudes (Studio route) | Practice | Settings**. Place Persian/English and Light/Dark controls in the new Settings tab. Keep Desktop **exactly unchanged**. The user explicitly approved proceeding with four tabs and keeping Home.

**Implemented:**
- `web/src/app.js`: The existing `render()` still uses the same original three routes and callbacks. Added CSS-hidden-on-desktop icons to the route buttons and a **mobile-only Settings tab**, not a new route. `openMobileSettings(trigger)` creates a small native accessible `dialog` settings sheet. It delegates to the **existing desktop `#lang` / `#theme` click handlers**, so preference persistence, translation, theme class and data remain single-source. Language change closes the sheet and follows the original render lifecycle; theme updates in place. Dialog Close, Escape and backdrop dismissal are supported; cleanup removes the dialog. No new state storage or changes to the original preference handlers.
- `web/style.css`: Additive desktop-default rules **hide only the new** settings tab and icons; all actual header, bottom navbar and settings sheet styling is inside mobile-only media. Fixed a **Home-specific overlap**: `web/home.css` originally hides the global mobile navbar on Home and draws its own `g-home-tabs` at the bottom. Mobile-specific selector `body.home-screen > header > #nav` now shows the global four-tab navigation, and the existing Home internal panel tabs move above it; both remain available. Existing desktop navbar, header controls and footer are untouched. The same responsive mobile condition as the existing app covers compact phone landscape; no desktop CSS rules were edited.
- `web/index.html`: Bump **only** the `style.css` and `app.js` version query strings to `mobile-settings-nav-1`.

**Safety/verification:** New JS parsed successfully; source checks confirm existing route callbacks, keyboard/audio, piano recording, metronome, Score, Practice and key signature functions were not edited. New CSS appended to previous stylesheet; desktop page styles remain byte-for-byte unchanged, apart from intentional hide rules for newly created mobile-only DOM. Settings option actions require separate real-device check for focus/backdrop/soft keyboard and Persian/English / Light/Dark. Static media review covers 320/375/430/700px plus landscape small-height. No physical browser/mobile screenshot, actual visual regression, or APK test has been performed.

**Unrelated unresolved:** Metered live piano Record -> rhythmic transcription remains **NOT FIXED**, and Codex must still get the user's explicit approval on understanding and proposed plan before any changes to that recording logic.


---

## Mobile navigation visual refinement: borderless Goosh logo and floating bottom dock (2026-11-21)

**User design feedback:** Remove the visual line/border beneath the Goosh logo on mobile, and replace the previous plain full-width four-column bottom menu with a polished, modern dock. **No redesign of Desktop** and no change to navigation or Settings functionality.

**Change strictly in `web/style.css`:** The existing **mobile-only media block** now sets `border:0`/`box-shadow:none` on the logo-only header. The same mobile bottom `#nav` becomes an inset floating rounded rectangle with a subtle translucent theme-aware background, softened border, restrained shadow, and backdrop blur. Four route buttons stay at least 58px high, with appropriately sized icons and small legible labels. Active route / opened Settings use an accent-colored icon tile and active label instead of filling the entire button. Touch feedback is subtle. A <=359px guard keeps four choices usable. Reduced-motion preference disables only mobile icon/button transitions. All accents use existing light/dark CSS theme variables; no new color scheme or asset.
- Updated Settings dialog bottom offset to clear the taller floating dock.
- On Home, existing dashboard-local tabs remain above the shared dock, with enough gap and page bottom padding.
- **`web/index.html`** updates only the `style.css` version query to `mobile-floating-nav-2` to bypass old cached styling.
- `web/src/app.js`, `web/src/model.js`, `web/src/audio.js`, `web/src/score.js`, `web/home.css`, all controls and data remain untouched. No new assets or dependencies.

**Verification:** Source/static review only: all changed UI declarations are inside existing mobile media or tiny additional <=359px mobile/reduced-motion blocks, no desktop selector changes, CSS braces balanced, and existing app script unchanged. No browser screenshots, physical mobile, APK, or desktop visual testing was performed.

**Unrelated open issue:** The metered piano live-recording transcription remains UNRESOLVED, and Codex must ask the user for explicit understanding/plan approval before changing it.


---

## Mobile Home: remove duplicate two-tab Etudes / Practice navigation (2026-11-21)

**User request:** On a phone, Home currently shows TWO fixed bottom menus: the newly introduced four-item shared dock (Home, Etudes, Practice, Settings), and an older two-item Home-specific Etudes/Practice switcher. Keep **only** the shared four-item dock and remove the two-item one. Do not alter Desktop or any recording/transcription functionality.

**Fix (mobile CSS only):** In `web/style.css`, replace the existing `@media screen and (max-width:699px)` Home-tab offset block. The new mobile-only rule hides `.g-home-tabs` and, crucially, makes **both** `.g-dashboard-panel` sections visible in the normal vertical scroll, including whichever was previously `:not(.is-selected)`. This avoids hiding user-accessible Home content behind a removed switcher. Add a 16px separation between the Etudes and Practice dashboard panels and return Home bottom padding to room for just the single floating four-tab dock. Home navigation itself remains available; the existing functions, buttons, and routes are unchanged. `web/index.html` only bumps the `style.css` cache version to `mobile-home-single-nav-1`. No edit to `web/home.css` or `web/src/home.js` is needed; their preexisting mobile tab UI is suppressed by the higher-specificity `body.home-screen` override.

**Desktop/logic protection:** At viewport width 700px and up, this CSS block is inactive and the original design is unchanged. No JavaScript, Score/audio/piano/recording code, schema, navigation handlers, or theme controls are modified. The separate Metered piano recording transcription bug remains unresolved and requires explicit user approval before Codex changes its logic.

**Validation:** Exact CSS-block replacement, mobile-breakpoint gate, rule precedence relative to the existing `web/home.css` mobile tab and `.g-dashboard-panel:not(.is-selected)` selectors, stylesheet-brace check, and cache-only HTML change checks passed. **No real mobile or desktop screenshot/browser/APK validation was performed.**


---

## Mobile editorial Home, compact shared libraries and library-header actions (2026-11-21)

**User-requested scope:** Redesign mobile Home to inherit the actual professional design system already used in Desktop Home; the old phone dashboard is not acceptable. Keep Desktop unchanged. Correct mobile bottom menu copy `Etude studio → Etudes` and `Practice → Practices`. On the mobile Etudes list place the **existing** New Etude and Import controls next to the Etudes title. On mobile Practices place the **existing** Import control next to the Practice title. In **both** Etudes and Practices, use the shared existing card component to show **full-width, compact** list cards (prior 213+px cards were too tall).

**Implementation:**
- `web/home.css`: Add a new **phone-only** `@media screen and (max-width:699px)` composition that shows the already-rendered **`g-desktop` hero and workspace card DOM** on a phone, while hiding the old `g-dashboard`. This reuses the true Desktop Hero copy, accent chips, score-staff mock, floating practice/art card, CTA, import/download explanatory copy and Etudes/Practice workspace cards. Resize/reflow for narrow viewports: editorial heading, scrollable single-row feature chips, more compact staff illustration, full-width button, stacked workspace cards with music artwork and waveform. Original Desktop >=1100 and tablet 700–1099 render unchanged. No independent mobile route/action callbacks are created; the existing links and workspace navigation function as before. Existing shared bottom dock stays.
- `web/src/app.js`: Render each original route tab with separate label spans; Desktop retains full original `Etude studio / Practice` naming, while mobile now displays `Etudes / Practices` (localized Persian `اتودها / تمرین‌ها`). In `etudeList()`, the actual New and Import buttons still call their identical existing handlers. The buttons receive short *visual* phone labels and the existing full localized names as accessible labels; Desktop full labels remain. A small `syncMobileLibraryActions()` helper re-parents the SAME action row into the relevant static library title area **only while `matchMedia('(max-width:719px)')` matches**. On widening it restores the original direct child position before `.shelves`. On navigation/re-render it cleans up old mobile action rows rather than leaving duplicate buttons. No copied button handlers or second library UI.
- `web/etudes.css`: A single appended phone `@media screen and (max-width:719px)` block covers **BOTH** Etudes and Practices: compact single-column full-width cards (100px touch-friendly rows), a small notation glyph tile, title/note count and preserved 44px Delete action with logical positioning for LTR/RTL. Removes the old giant 213px mobile staff art area and misleading hardcoded fake-date decoration **on mobile only**. Studio list header has New + Import; Practice list header has Import. Shared book/score/card and source callbacks are unchanged.
- `web/style.css`: Only new route-label-span display rules for mobile/dark and desktop. `web/index.html`: update cache keys for changed CSS and app JS, without HTML markup changes. `web/src/home.js`, `web/src/model.js`, `web/src/score.js`, `web/src/audio.js`, recording, tuning, Practice logic, and the four-item dock behavior stay untouched.

**Validation:** JS parse; static checks for canonical buttons, original route callbacks, relayout symmetry/mobile breakpoint, card layout only under phone media, CSS bracket integrity, cache version-only HTML changes. **No actual browser, device visual comparison, UI screenshot, APK, or touch test was run; visual quality must be checked on a phone.**

**Open unrelated regression:** Metered live piano Record-to-Score transcription is still **NOT FIXED**. Codex must first explain and seek explicit user approval before editing that path. This mobile Home/gallery task grants NO permission to modify metered recording.


---

## Mobile Home feature carousel + whitespace fix + shared Etudes/Practices card repair (2026-11-21)

**User observed UI issues:** All current work is **MOBILE ONLY**. The Home feature chips below the Hero are swipe-scrollable but should **animate automatically** to draw attention and loop indefinitely; manual swipe must remain possible. Home has excessive whitespace between the bottom of the Practice workspace card and the floating four-item nav. The newly compact Etudes and Practices cards have broken backgrounds and a misplaced delete/trash button. Both libraries use the **same shared card style**, and both must be fixed together. Desktop appearance and app functionality must not change.

**Implementation:**
- `web/src/home.js`: Adds `startMobileFeatureTicker(features)`, invoked on the existing Desktop-derived Home feature chip container by `renderHome`. Uses `matchMedia('(max-width:699px)')`, duplicates purely **presentational** chips (aria-hidden to avoid duplicate accessible content) and animates `scrollLeft` via `requestAnimationFrame` at a restrained 27px/s, resetting seamlessly at the repeated copy boundary. Works with RTL and LTR scroll directions, respects `prefers-reduced-motion`, tab visibility, mobile breakpoint changes, and pauses 6.5 seconds after touch/pointer/wheel/keyboard input. A `MutationObserver` disposes handlers/frames when the rendered Home element is detached, avoiding background work after route changes. No Desktop DOM duplication (media query gating); existing feature labels and route actions untouched.
- `web/home.css`: Mobile-only `.g-feature-auto` disables snap while the seamless animation runs. For the phone Home, set body bottom padding to zero and reduce main bottom padding to the **single** 86px+safe-area gap needed for the floating dock; also remove extra bottom margin below the workspace Hub. This avoids summing the previous body+main+Hub bottom spacing.
- `web/etudes.css`: Repair the **single common mobile** `.etude-item` styling for Etudes and Practices: theme-aware panel background and subtle score-staff music tile, preserving the compact full-width (~100px) size and titles/note count. Use logical start-side icon positioning and logical end-side, vertically centered 44px delete button with `top:50%` + `translateY(-50%)` instead of inconsistent `bottom:50%` positioning. Drop the old competing physical anchoring for the trash button and keep its styling/contrast consistent across light/dark and LTR/RTL. Actual delete callback and the shared card render function remain unchanged.
- `web/src/app.js`: only bump the local Home module import's cache query string. NO changes to `render()` or any routing, musical, audio, recording or other JS logic.
- `web/index.html`: only bump app, Home and Etudes CSS version strings for cache invalidation. No structural HTML changes.

**Validation scope:** JS syntax and selector/media checks; tested ticker with mobile DOM mocks including looping, pause after manual pointer input, RTL, reduced-motion and detach cleanup; checked both libraries still share exactly the same card renderer and mobile CSS. Desktop source CSS unchanged outside existing mobile selectors. No actual browser/device screenshot or APK test was performed. Metered live piano Record -> Score transcription remains **OPEN**, and Codex must seek user's explicit approval before changing that recording path.


---

## Mobile Home last Practices card clearance (2026-11-21)

**User-observed issue:** After reducing excess whitespace under Home, the lower edge of the last Practices workspace card sits about 10px underneath the floating four-tab mobile dock. Increase clearance by a small margin only; do not resize cards, redesign the dock, change scroll behavior, or touch Desktop.

**Only CSS change:** In the existing `web/home.css` phone-only `@media screen and (max-width:699px)` Home block, increase `body.home-screen main` bottom padding from `calc(86px + env(safe-area-inset-bottom))` to `calc(104px + env(safe-area-inset-bottom))`, i.e. **+18px**. This reserves a little visible space for the floating dock and its shadow without restoring the excessive old body+main+Hub gaps. Leave the explicit mobile `body.home-screen {padding-bottom:0}` and `.g-hub {margin:0}` unchanged. `web/index.html` bumps only `home.css`'s query string to `mobile-home-dock-clearance-1`.

**Desktop/behavior:** All existing desktop CSS, the four-tab navigation, Home graphics, ticker, Etudes/Practices cards and actions, JS, app music/recording, and unrelated pages are unchanged. Metered live piano transcription remains unresolved and still requires explicit user approval before Codex edits it.

**Validation:** Exact one-line CSS replacement confined to an existing max-699px media block; stylesheet braces balanced and original CSS unchanged otherwise; index change only its Home CSS cache version. No real device/browser visual test performed.


---

## Mobile Home feature chip ticker: slight speed increase (2026-11-21)

**Requested change:** Increase the automatic phone Home feature-chip marquee speed only **slightly**, without changing any layout, playback, controls, Desktop behavior or other components.

**Only behavior change:** `web/src/home.js` `startMobileFeatureTicker()` moves from `dt * .027` (27 CSS px/second) to `dt * .032` (32 CSS px/second), a modest **18.5%** increase. The existing seamless loop, mobile-only breakpoint, Arabic/Persian RTL support, manual swipe pause, reduced-motion behavior, requestAnimationFrame scheduling, visibility handling and cleanup are unchanged.

**Cache:** `web/src/app.js` changes only the `home.js` import version to `mobile-home-ticker-speed-2`. `web/index.html` changes only the `app.js` version to `mobile-home-ticker-speed-2`. No styling, Desktop rendering, audio, Score, recording, navigation or musical code edits.

**Validation:** Compared before/after strings, checked exactly one speed expression change, JS parse and all remaining source preserved. No actual browser/APK playback test was performed. Metered recording transcription remains unresolved with a mandatory explicit user approval gate for future Codex modifications.


---

## Mobile Settings appearance buttons: Light/Dark sun and moon icons (2026-11-21)

**User request:** In **mobile Settings only**, use a recognizable icon for each Light/Dark appearance choice rather than showing text alone. Desktop and the working theme toggle must not change.

**Implementation:** `web/src/app.js` adds `mobileAppearanceIcon(mode)`, a presentation-only 24×24 inline SVG icon: **sun for Light**, **crescent moon for Dark**. Icons are `aria-hidden="true"` and non-focusable; existing localized labels remain visible and accessible. The two current `mobile-settings-choice` buttons prepend the appropriate icon and receive a dedicated mobile-only class. Their original `#theme` click delegation, `dark` state, `aria-pressed` updates and active styling remain unchanged. No duplicate theme storage or settings route.

**Mobile-only CSS:** `web/style.css` appends mobile/coarse-landscape media rules for 22px icon sizing, flex centering and spacing. All previous CSS and the Desktop toolbar remain byte-for-byte unchanged. `web/index.html` updates only CSS and entry-JS cache-version query strings to `mobile-settings-appearance-icons-1`. No other code, navigation, piano/Score/recording, audio, theme persistence or data files were modified.

**Validation:** Parsed the modified application JavaScript and checked both icons have distinct SVG paths, are decorative, and the same Light/Dark buttons still run their original theme handlers and preserve pressed state. Exact source diff and mobile media guard checked. Actual phone/browser screenshots and Android APK were **not** tested. The unrelated metered live piano transcription bug remains unresolved and requires Codex to seek user approval before any changes to that code path.


---

## Fix mobile Persian/RTL Etudes and Practices cards (2026-11-21)

**User report:** The shared compact Etudes/Practices list renders correctly in English (LTR) but is still broken in Persian (RTL), especially the card decoration and delete/trash alignment. Keep English and Desktop unchanged.

**Implementation:** `web/etudes.css` adds a narrowly scoped `@media screen and (max-width:719px)` block with `html[dir="rtl"]` selectors only. Position the existing notation tile **14px from the right** (logical start in RTL) and the existing 44px Delete action **12px from the left** (logical end in RTL), clearing inherited physical/logical inset conflicts. Explicit 78px right and 68px left content padding keeps text clear of both controls; the title and note count are right-aligned. Reuse the same card component, original height/background, original button callbacks and all original English CSS. `web/index.html` only increments `etudes.css` cache key to `mobile-rtl-list-1`. No JS or functional code modifications.

**Verification:** Confirmed app sets `document.documentElement.dir = fa ? 'rtl' : 'ltr'`. Original CSS preserved byte-for-byte; new rules active only for RTL phone widths. Checked CSS brace balance and cache-only HTML edit. No actual mobile browser/screenshots or APK test; Persian visual result still needs device confirmation. Metered piano live-record bug remains unresolved and retains the explicit pre-fix user-approval requirement.


---

## RESOLVED: Persian mobile Etudes/Practices card regression — user-verified (2026-11-21)

**CURRENT STATUS — RESOLVED, USER VERIFIED:** On 2026-11-21, after the fix at `2aa8bd0bd82b64e5c5c8bc262a1be3ea96dbe91d`, the user explicitly confirmed the Persian/RTL Etudes and Practices mobile cards are now correct ("آها درست شد"). The earlier attempts, including `69210a3b5fb82afa52965f1667343f8c9eb73652`, had failed; that is historical context only. **Codex must no longer treat this Persian mobile card issue as open or attempt further fixes without a new user report.** English mobile and Desktop were preserved.

**Confirmed CSS root cause:** In `web/etudes.css`, a fake localized date is injected as `html[lang="fa"] #app:has(> .shelves) .etude-item strong::after { content: ' · ۲۹ آبان ۱۴۰۵' }`. Its selector has specificity **(1,3,3)**, exceeding the preceding phone `#app:has(> .shelves) .etude-item > strong::after { content:none }` at **(1,2,2)**. Therefore the Persian-specific date was **still rendered inside the new ~100px compact cards**, while English suppressed its date, creating a real language-dependent overflow. This is not an actual user date and must not appear in compact mobile card titles. The previous patch focused on left/right offsets but did not address this.

**Fix implemented and confirmed by the user:**
- Replace the last **Persian-only @media(max-width:719px)** block in `web/etudes.css` (instead of appending another conflicting position override). Selectors require **both** `html[lang="fa"][dir="rtl"]` and list context; English and Desktop CSS are unchanged.
- Use a stable three-column **grid inside the existing `.etude-item` button**: 48px notation tile on the RTL start/right, flexible title and note-count column in the center, and 44px reserved on RTL end/left for the *existing sibling* Delete button. Use two rows for title + count; standard 100px minimum height and the existing theme-aware background remain.
- The music `::before` visual is now a **static grid item**, not absolute, eliminating mixed physical and logical insets. Explicitly reset old inset/transform values. The original Delete button remains a separate absolutely positioned sibling, centered vertically at physical **left:12px** after clearing inherited offsets; its callback and modal are unchanged.
- Add a **higher-specificity** Persian mobile `strong::after {content:none; display:none}` to eliminate the fake hard-coded date that previously survived.
- `web/index.html` only bumps the Etudes stylesheet cache key from `mobile-rtl-list-1` to `mobile-rtl-grid-2`. **No changes** to `web/src/app.js`, data, Score, audio, piano recording, routing or any other feature.

**Verification:** Static CSS comparison checked all style outside the dedicated mobile RTL block remained unchanged; selector specificity, grid positions, both Studio/Practice selectors, CSS braces and cache-only HTML change were checked. Chromium rendering was not available in the execution environment, **but the user subsequently checked the result on their own mobile device and explicitly confirmed it works**. **This issue is closed.** Do not reapply guessed left/right patches or reopen without a new report.

**Separate open bug:** Live metered Piano Record → rhythmic Score transcription remains UNRESOLVED and requires explicit user approval before Codex changes that code.


---

### Current bug status for Codex (latest user confirmation, 2026-11-21)

- **CLOSED / FIXED:** Persian/RTL compact Etudes and Practices cards on mobile. User confirmed success after commit `2aa8bd0bd82b64e5c5c8bc262a1be3ea96dbe91d`. Previous "STILL OPEN" statements about this exact issue describe historical failed attempts and are superseded by this update. **Do not work on this issue unless the user reports a new regression.**
- **SEPARATE ISSUE, STILL OPEN:** Metered piano live Record → Score transcription. Unchanged; explicit user approval before any Codex fix remains required.


---

## Mobile Etude Studio: move shared dock to top, remove accent border, reclaim horizontal width (2026-11-21)

**User instructions (MOBILE ONLY):** In the actual **Etude Studio editor**, remove the green (light theme) / blue (dark theme) line over the main Studio content box; reduce excessive nested horizontal gutters from the page → outer section → piano container → musical and exercise panels, while still leaving a modest gap from phone edges. User further instructed: **move the entire four-item Home / Etudes / Practices / Settings menu to the TOP inside Etude Studio**.

**Root causes found:** `web/style.css` has the cross-theme rule `[data-page=studio] section:has(.instrument){border-top:3px solid var(--accent)}` which creates the unwanted colored line. At phone width, `#app` main has 12px left/right padding, nested `section` adds ~12px each side, and `.instrument` adds 10px each side. Further composer and practice sequence components add another 12px of nested padding. The shared header navbar is fixed to the bottom at mobile widths by the global dock rule, which is appropriate for Home and library views but not for the editing workspace.

**Fix, CSS ONLY:**
- In `web/style.css`, append a rule under `@media screen and (max-width:700px)` scoped specifically to `body:has(#app[data-page="studio"]:not(:has(> .shelves)))` for the actual editor **not the Etudes library**. Make the existing header a small vertical stack, keeping the Goosh logo first, then the **same real four-route navbar** in normal document flow (replaces `position:fixed;bottom` with `position:static`, does NOT duplicate or reimplement nav or Settings). Bottom docking on Home, Etudes LIST and Practices remains unchanged; no new route or app logic. Reduce now-unneeded body bottom allowance. Keep navbar touch targets.
- For the same editor on phone, reduce main padding-inline to 10px, outer `section:has(.instrument)` padding-inline to 8px, and piano `.instrument` padding-inline to 6px; retain the panel border but set **`border-top:0`** so the green/blue accent stripe goes away. Keep the piano horizontally scrollable and retain native keyboard dimensions and audio behavior. The content doesn't touch screen edges.
- In `web/practice-designer.css`, append mobile-only, editor-only selectors for composer, practice-designer, advanced section and practice steps: reduce nested inline padding to 9px, without changing controls, text, breakpoints or functions.
- In `web/index.html`, change only cache query strings for `style.css` and `practice-designer.css` so the new mobile styling loads immediately.
- **Other code unchanged:** `web/src/app.js`, score, piano, metered record logic, key signatures, note deletion, desktop, both libraries, Home, and native code.

**Static validation:** Confirmed accent stripe root selector, distinct Studio EDITOR vs list DOM, mobile-only selectors, no change to existing base/desktop CSS, preserved original CSS as byte prefix, stylesheet braces, and HTML cache-only edit. **No live phone or browser visual test was performed; user must verify new mobile spacing / top menu.** Metered piano live-recording transcription is a separate still-open issue requiring explicit user approval before changes. The Persian mobile cards were user-confirmed FIXED earlier and remain closed.


---

## Remove transient blue touch flashes on mobile buttons (2026-11-21)

**User report:** On mobile, touching a button briefly paints an unwanted blue / teal background that disappears. The user is currently refining the Etude Studio mobile UI. **Do not confuse this with a deliberately selected/toggled button.**

**Root cause:** The global `web/style.css` rule `button.active, button:active { background:var(--accent); color:var(--panel) }` assigns the accent background to ANY momentary touch. Mobile WebKit/Chromium can ALSO render a transient blue native `-webkit-tap-highlight-color` overlay.

**Fix, presentation only:** Preserve the original `button.active` persistent selected style. Preserve the original generic `button:active` accent response for desktop screens **>700px with hover support**, but do not apply it on a phone. Apply `-webkit-tap-highlight-color:transparent` to interactive controls in a mobile-only media block, including landscape coarse-touch cases. Existing component-specific `.active`, `.primary`, `.recording`, piano `.down` and `:focus-visible` styles are unchanged. Only `web/style.css` is edited for presentation. In `web/index.html`, only the style query version bumps to `mobile-no-tap-flash-1`. NO other CSS, any JS, piano audio/recording/notation logic, routing, page or Desktop layout changes.

**Static validation:** Exact source reversal confirms the global selector change + added phone media rule are the entire CSS diff. CSS braces and cache-only HTML changes checked. Existing selected/keyboard focus state styles and desktop mouse click accent retained. No real device/browser tap validation performed.

**Open issue separation:** The Persian/RTL compact Etudes/Practices cards were FIXED and verified by the user and must not be reopened without a new report. Metered live piano Record→Score rhythmic transcription remains an unrelated OPEN issue; Codex needs explicit user approval before changing it.


---

## Mobile Etude Studio navigation still bottom after previous patch — explicit route-class correction (2026-11-21)

**User says previous attempt did not work:** In **open Etude Studio editor on MOBILE**, the same four-tab Home / Etudes / Practices / Settings menu must appear **at top under Goosh logo**, not at the bottom. Prior commit `df71f642b34f485f3771a9de0a3815419bb4e092` tried CSS selectors `body:has(#app[data-page="studio"]:not(:has(> .shelves)))`, but the user reports that navigation was still on the bottom. This issue remains pending device confirmation; do not assume success from static validation.

**Correction:** Add a deterministic `document.body.classList.toggle('studio-editor-screen',page==='studio' && Boolean(activeId))` in the existing `render()` function in `web/src/app.js`. The class is present only when an etude is actually being edited; it is absent on `/etudes` (the Etudes list, where `activeId` is null), Home, and Practices. Replace only three previous editor nav/header/bottom-padding CSS selectors with simple `body.studio-editor-screen` selectors in the original mobile Studio block in `web/style.css`, removing dependence on nested CSS `:has()` for the menu position. Widen the mobile media condition to include coarse-touch landscape (matching the app's existing bottom nav media). Use the original header flow: logo first, then the **existing original nav** with `position:static`, cleared insets and transform, full reasonable phone width, normal flow above content. Nav buttons/active state/Settings callbacks remain untouched. Studio's removed green/blue accent line and tightened inline padding remain untouched. Other routes retain the existing bottom fixed dock, and Desktop layout stays unchanged.

**Cache busting:** `web/index.html` only updates the `style.css` and entry JS version query strings to `mobile-editor-top-nav-2`. Do not change navigation/route, piano, audio, editing, metered recording, or theme logic. **No new menu, buttons, duplicated event handlers or different desktop navbar.**

**Validation:** JS syntax parsed; CSS braces, stricter explicit marker/selector and media rules checked, single route marker update per render, exact diff scope and cache-only HTML change checked. Physical mobile-browser layout still requires verification by the user. Other known open issue: metered piano recording → Score still requires explicit user approval. Persian mobile Etudes/Practices RTL list bug remains user-verified FIXED.


---

## Mobile Etude Studio: visually separated piano, Manual/AI, Musical System, Score-to-tempo and Practice Design (2026-11-21)

**User-requested design, MOBILE ONLY:** Within the open Etude Studio editor's existing overall content box, make the following regions visibly distinct and easy to scan, without touching screen edges, adding excessive horizontal padding, changing functional controls or opening new screens: (1) Piano, (2) Manual/AI choice with AI-only controls when selected, (3) Musical System, including Iranian/Western music, mode/tonic and key signature, (4) everything from the **Score / خط حامل heading** through notation tools, actual score, time signature/measures/note-value and Tempo/BPM as ONE region, and (5) the already-separate Practice Design / طراحی تمرین component.

**Mobile implementation / minimal DOM-only grouping:**
- In `web/src/app.js`, Studio `studio()`, introduce a `div.studio-score-surface` as a **presentation wrapper** around the *existing* Score heading, Score tools/action row, the same interactive Score node, key-signature editor controls, and meter/tempo row. Each child is created in exactly the same relative order, with unchanged handlers, references, data, rendering and audio logic. The wrapper has `display:contents` on Desktop for neutral visual layout, and a card surface only on mobile. No new state, inputs, event handlers or copies of Score were added.
- In `web/style.css`, append **mobile @media(max-width:700px)** styles: accent-compatible, theme-aware 1px borders, rounded 15px surfaces and subtle shadow for the existing Piano `.instrument` and new Score group; Piano title has a quiet bottom divider; Score title has its own divider while all score tools, staff/notation, time signature and tempo remain in the same section. Side gutters remain modest (mobile editor outer main 10px, section 8px, inner surfaces ~8–10px). The previous removed green/blue accent stripe does NOT return. Piano keys remain horizontally scrollable at original dimensions.
- In `web/practice-designer.css`, append **mobile editor-only** styles to turn `.studio-compose` itself into a transparent grouping container. Its existing `.studio-compose-tabs` becomes a clearly outlined Manual/AI card. When AI is selected, the AI-specific goal/settings extend that card without separate large box margins. The same `.studio-compose-music` is a **different visual card BELOW method/AI**, with its original musical system fieldset/legend, Iranian/Western selection, mode/tonic and Key Signature entry. On mobile, use CSS flex `order` ONLY (rather than moving DOM nodes or altering workflows) so the conditional AI controls visually belong beside the method selector; on Desktop the original DOM order and styling are preserved. The existing `.studio-practice-host > .practice-designer` stays outside the main panel and receives a coordinated border/shadow for an unmistakable independent Practice Design card. Existing data bindings and functions remain unchanged.
- `web/index.html`: bump only local cache version strings for `style.css`, `practice-designer.css` and `app.js` to `mobile-studio-zones-1` so the UI updates without stale assets.

**Guardrails and checks:** No Desktop CSS rework, no routing, practice/AI generation, piano playback, key signature, Score manipulation, timing, recording, print/share, import/export logic updates. Original CSS files preserved byte-for-byte before appended mobile blocks; CSS braces balanced; new grouping contains all Score elements and maintains order. Rendering screenshots on an actual device are **not yet verified**; user should review the visual hierarchy, in both light/dark and Persian/English. Metered piano recording bug is unrelated and STILL requires explicit user approval before any separate fix. The Persian compact library RTL cards remain user-verified FIXED.


---

## Mobile Studio Score: Play/Pause/Record above six tools in one row (2026-11-21)

**User wants mobile Etude Studio UI only:** Put all six Score editing actions—Mouse/Select, Pencil, Eraser, Wrap/multiline, Zoom minus and Zoom plus—on **a single horizontal row BELOW Play / Pause / Record**. Metronome, when offered in metered mode, remains in the playback row. Preserve existing handlers, tool selection, visibility, notes and layout elsewhere.

**Change:** Append a phone-only and coarse-touch landscape media block to `web/style.css` with selectors scoped to `#app[data-page="studio"]:not(:has(> .shelves)) .studio-score-surface > .score-actions`. Grid uses `repeat(6,minmax(0,1fr))`, 4px horizontal gap. Existing direct child tool buttons occupy `grid-row:2`; existing transport wrapper spans six columns on `grid-row:1`, before the tools. Override inherited 44px **minimum WIDTH** for these six tools to zero (keeping at least 44px HEIGHT and 18px icons), so narrow phone widths fit without overflow. Transport uses four columns when metronome is present; three when hidden in Free meter. Existing keyboard and score layout not changed.

**Scope:** No Javascript or score logic edits, no changes to the desktop, piano, notes/rests, playback, recording, Studio navigation or other pages. `web/index.html` changes only `style.css` cache version to `mobile-score-controls-6-1`.

**Verification:** Source inspection confirmed the original Score creates exactly three select/pen/eraser buttons from a loop, one Wrap button and two Zoom buttons, followed by the transport wrapper, so the grid has exactly six edit actions. Static CSS brace validation, narrow-only media guard, explicit transport/top vs six tools/bottom ordering and HTML-only-cache change passed. Actual mobile device render not tested; user to confirm layout.


---

## Mobile Studio Musical System: side-by-side Scale/Mode and Tonic with bottom sheet choices (2026-11-21)

**User request:** In Etude Studio on MOBILE, place Scale/Mode (or Dastgah) and Tonic **next to each other** and replace the unattractive native dropdown appearance with a polished touch-friendly chooser. On Iranian music, Tonic is not shown; the Dastgah selector uses the full row. All Desktop UI and existing music logic unchanged.

**Implementation:** `web/src/studio-etude-generation.js` introduces a small presentation adapter `attachMusicBottomSheet` for only two existing Musical System selects (style and tonic). Wrap each existing label+select in `.studio-select-field`, with `display:contents` on Desktop; add one mobile button per selector. Mobile trigger displays current localized option and opens a native modal HTML `<dialog>` rendered as a bottom sheet with scrollable option rows, selected check, backdrop tap dismissal, keyboard Escape, focus restoration and Close. Options are read from the live native select, so Persian and English labels reflect the catalog. Selection delegates through the original select's `change` event: this preserves all existing state, signature, tuning and piano logic. Trigger disabled/selected state is kept in sync during async catalog loading, mode changes, and AI state changes. Tonic wrapper follows the existing Western-only visibility condition.

**CSS:** `web/practice-designer.css` appends mobile/coarse-landscape styles only for the open Studio editor: two-column `1.3fr/1fr` layout, compact outlined 48px triggers with text ellipsis and chevrons, full-width Iranian field, bottom sheet with theme-token colors, accessible 48px options and clear selected state. Desktop still displays original native selects through layout-neutral wrappers; there are no changes to AI goal picker or other selects.

**Cache:** `web/src/app.js` bumps the composer module import query; `web/index.html` bumps only the relevant stylesheet and app-entry versions. No score, generator, recording, navigation or app business logic changes. Static JS parse and CSS braces verified. Actual phone screenshots/interaction remain for user to confirm.

**Separate bugs:** Metered live recording-to-Score bug remains open and requires explicit approval before code fixes. Persian RTL compact list cards remain user-verified fixed.


---

## Mobile AI guide and Generate placement; X-only visible close buttons (2026-11-21)

**User requests (mobile Etude Studio):**
1. When a user taps **AI / هوش مصنوعی** within Manual/AI, open a **beautiful short, dismissible information popup** saying to select their practice goal and necessary Etude settings within Musical System, then tap **Generate Etude / تولید اتود**. The info popup must dismiss on its **X icon**, any tap **on its surface or contents**, and any tap **outside**; standard Escape/Back dismisses it too. The popup is not a step gate and must not prevent returning to Manual.
2. Move the existing Generate button **beneath** the musical system description explaining how the selected mode sets the Score's key signature/piano tuning. Visually associate AI-only practice-goal/settings and Generate with **Musical System**, while leaving the Manual/AI method selection separate.
3. **Global visible-close-control preference:** Wherever the app currently shows a dismissal button and an X icon can represent closing, do NOT show a textual **Close/بستن** label; show the attractive X instead. Existing Settings already uses X. The other visible textual Close button found in source is in the mobile Musical System bottom-sheet chooser; replace only its displayed text with X, retaining an explicit accessible aria-label. Do not remove meaningful **Cancel/انصراف**, Keep, Back, or destructive action labels from confirmations; these are different actions. Do not change non-UI uses of `close()`.

**Implementation:**
- `web/src/studio-etude-generation.js` adds `showMobileAIGuide(fa)` with a native modal dialog, explanatory title and message in both English/Persian, accent-themed sparkle artwork, small two-step hints, X-only visible close control and accessible name. The guide listens for any click on the dialog surface or its children and closes; click on backdrop is also received by dialog; pressing Escape uses browser-native behavior. It cleans itself on close. Only the existing AI tab's click callback is extended to display the guide on phone widths; **no changes** to AI state, generation, goal, score, tune or note logic. Repeated AI-tab taps can reopen it.
- `web/practice-designer.css` appends phone-only overrides: the existing Musical System card gets mobile flex `order:1` and the AI-only controls card `order:2`. When AI is selected, they receive seamlessly contiguous borders, shared theme-aware surfaces, aligned widths and no gap. This places original practice-goal input and status/notes **beneath** the existing key signature/tuning hint, with the **original Generate button as the final item at the bottom**. Hide redundant introduction text on the phone only (the information is presented in the popup); all controls are retained. Desktop keeps its original styling, DOM sequence and functionality.
- The existing mobile musical option bottom sheet's visible **Close/بستن** button changes to **×** with a round 38px icon-only style. Its `aria-label` remains meaningful, and original close handler unchanged. Existing Settings X is unchanged. Source-wide scan of `web/src` and HTML found no other visible generic `Close/بستن` dismissal labels; Cancel/Keep on confirmations are preserved.
- `web/src/app.js`: composer-module import version only. `web/index.html`: stylesheet and app-entry cache query updates only. No changes to Desktop, data, audio, recording, export, mobile navigation or unrelated screen UI.

**Validation:** JS module syntax, CSS brace matching, exact diff scope for cache/version and app logic, modal dismiss paths, presence of X-only visible text, original generation callbacks, button order and mobile-only CSS media conditions checked. No actual phone screenshot or touch simulation performed; user should confirm interaction on their device. Separate metered live Piano Record→Score bug remains OPEN and requires explicit permission before any fix. User-verified RTL library cards remain CLOSED.


---

## Mobile AI guide popup: replace oversized × with precise SVG close icon (2026-11-21)

**User feedback:** The new AI guide popup itself looks good, but its **X close button is visually poor**. Change only this popup's close control, preserve the attractive popup and everything else. Never put visible Close/بستن text on a dismiss button when an X exists.

**Exact fix:** In `web/src/studio-etude-generation.js`, replace the popup's oversized font-rendered `×` character with a crisp, fixed 18×18 inline SVG with two 1.85px round-capped crossing strokes. Keep the button's semantic `<button>`, accessible bilingual aria-label, click handler and the other popup-dismiss paths (tap popup itself, tap backdrop, Escape) unchanged. In `web/practice-designer.css`, restyle **only** `.studio-ai-guide-close`: maintain its 40×40 touch target, replace the chunky circular border and huge 28px text glyph with a restrained 12px-radius rounded-square, very light theme-token border/background, subtle muted icon and a desktop-hover highlight. Keep keyboard focus outline. No change to the modal's background, decoration, layout, fonts or contents, the previous Musical System bottom sheet X, music generation or another route. All behavior and desktop appearance outside this mobile popup remain intact.

**Cache:** Bump only the composer module version in `web/src/app.js`, and the `practice-designer.css` and app-entry query strings in `web/index.html`. No other files changed.

**Validation:** AST-style JS parse, targeted exact source substitutions, all unchanged CSS retained, CSS brace balance and cache-only diffs checked. No actual phone visual QA was performed; await user confirmation.


---

## 2026-11-21 — Explicit AI meter selection and mobile mirror (same canonical Score)

**Original user request:** Preserve Goosh's one-Etude/one-Score musical engine while making time-signature choice deliberate for AI generation. The teacher must choose a meter, and **Free (no meter)** is a valid explicit choice. On **mobile**, show an additional Time Signature picker directly **below Primary Practice Goal** in the AI composer. **Do not remove** the existing Score Time Signature control. The previous code passed the implicit default Free meter through to AI without requiring user acknowledgement.

**Code changes (already committed to feature/practice-sequence-studio):**
- `web/src/studio-etude-generation.js` uses `METER_PRESETS` exported by `web/src/model.js`; there is NO duplicate meter catalog or independent etude timeline. A UI-only `meterConfirmed` flag within the existing per-Etude WeakMap starts false for an empty new default-Free Etude, true for Etudes already containing notes/practices or with a previously non-Free meter. Both Generate's disabled state and its click handler require this flag, without treating Free as invalid. A bilingual hint explains the choice. The added phone-only picker reuses the established `attachMusicBottomSheet` and forwards changes to `onMeterSelect`; it reads the very same `etude.meter`.
- `web/src/app.js` retains the original Score Time Signature select at its original location; an unconfirmed AI selection displays a disabled “Select a time signature…” option. Both the original Score control and the AI mobile mirror use exactly the original `meterSelect.onchange` validation/save/Score redraw/metronome path. Only a valid accepted choice calls `composer.confirmMeterSelection()`. Rejected edits revert the selection and resynchronize the mobile mirror. Existing manual editing behavior stays the same.
- **Additional real behavior mismatch corrected:** The preexisting AI adapter and Python backend hardcoded **four metered measures** even when `e.measureCount` was changed in Score. `web/src/ai-etude.js` now includes the canonical `measureCount` in the existing `/api/generate-etude` request and validates note/rest length against `measureCount × meter.barQuarterBeats`. It rejects stale responses if `meter` or `measureCount` changed while waiting. `scripts/goosh_server.py` validates an integer measureCount from 1 to 256, defaults to 4 for backward-compatible older callers, and uses it for the original metered generation prompt and exact duration normalization. No new API or model, no replacement of `meterTimeline` and no change to Free/Shur ABC generation.
- `web/practice-designer.css` appends mobile-scoped AI meter control styles in the established Goosh theme. On desktop the added picker is hidden and the original Score control remains visible. `web/index.html` and affected ESM imports refresh cache-busting keys.

**Scope and limitations:** No new metering/recording engine, notes array, rest storage, BPM model, Practice runtime or changed piano sound. This does NOT resolve the separately user-confirmed open bug with live Metered Piano Record→Score transcription; its approval gate remains in force. For a new Etude whose meter is explicitly set to Free, the confirmation is currently UI-only WeakMap state, not a persisted flag: on a fresh page load with no musical notes, the AI workflow may require confirming Free again. Large requested bar counts may exceed the 128-note AI schema/model capacity and must surface a generation error rather than silently shorten the score.

**Verification actually performed:** Connected-GitHub source inspection and contract/static checks confirmed the required Generate gating in both disabled and click paths, shared METER_PRESETS, delegation of mobile selection to the original Score onChange, same canonical etude.meter, measureCount flow from composer to API to Python and the client validator, and matching import/CSS cache keys. These were **not** real live WebView/browser interaction, audio-device, OpenRouter integration or Android/iOS tests. Before deployment check explicit Free in both selectors, a non-Free meter, rejected invalid meter changes, no unexpected change to Manual, the same selected value reflected in both controls, AI with non-default Measure count, mobile/desktop, RTL/LTR and both themes.

---

## 2026-11-21 — Manual Set Key Signature visible for Iranian music only

**Latest user request:** **Set Key Signature / تنظیم سرکلید must be displayed ONLY for Iranian Music**, not for Western Music. This is a visual/entry-gate change, not a prohibition on automatic Western key signatures. Western scale/mode + tonic must continue to assign the correct signature and pitch to the same Score via the existing music catalog; Iranian custom-tuning editor must remain available.

**Code changes:**
- `web/src/studio-etude-generation.js` uses the existing `state.musicSystem` in `sync()` to hide the **existing** `studio-signature-actions` wrapper whenever the selection is Western, and to reveal it for Iranian. No duplicate button was introduced. The click callback also guards against opening it while Western. When switching Iranian → Western **while the editor is already active**, it calls the existing `onToggleKeySignature(false)` to return safely to Score; the original signature update behavior remains intact.
- The existing explanatory hint is now contextual. Iranian explains how a Dastgah sets the key signature/piano tuning and links the user conceptually to Set Key Signature. Western says that Scale/Mode automatically sets the Score key signature, and does NOT instruct users to click the now-hidden manual editor. This also avoids incorrectly implying that the Western physical piano itself retunes.
- `web/practice-designer.css` adds one narrow `.studio-signature-actions[hidden] {display:none!important}` rule because the original CSS forces flex layout; hidden must work on desktop and mobile. `web/src/app.js` and `web/index.html` update only the related versioned module and stylesheet URLs, now `iranian-signature-only-1`. The current mobile AI meter mirror, prompt and UI order stay intact.

**Verification and boundaries:** Static source review confirms musicSystem-dependent hiding, close-on-switch, unchanged automatic Western `applySelectedSignature` path, CSS hidden override and current cache references. No real cross-device visual test has been performed; verify both languages, Manual and AI, desktop/mobile, both themes, Iranian↔Western switch while editing the key, and Western score key signature generated by its existing automatic musical-system logic. No changes to the legacy Practice runtime, audio, timing, API, recording, or the still-open Metered transcription issue in this follow-up.


---

## CURRENT IMPLEMENTATION — unified glass theme, bottom mobile dock, compact composer and mobile Key Signature dialog (2026-11-21)

**This is the latest state of `feature/practice-sequence-studio` through commit `31e1a2a24d8d701ff0679eb25b0eb315c5d43468`.** It SUPERSEDES earlier sections suggesting (a) that the open Etude Studio mobile dock must move to the top (notably the historical sections starting around lines 2615 and 2648), (b) that Manual/AI and Musical System should be separate cards (the historical design around line 2661), or (c) that mobile Set Key Signature should replace the main Score. Those older paragraphs are retained as history, **NOT** current implementation instructions. Do not resurrect their layouts unless explicitly requested by the user.

### 1. Shared Goosh glassmorphism across ALL pages — commit `471715a3dad890d254e29d40b10bdb840598b269`

User explicitly requested the **same teal/glass/gradient visual language throughout Goosh**, in Light and Dark, not solely Studio, while preserving existing placement and functions. Modify the original styles rather than creating a second parallel stylesheet, duplicated theme implementation, or an unrelated redesign.

- `web/style.css` owns the shared Light/Dark color and material variables: `--page-background`, `--glass-surface`, `--glass-elevated`, `--glass-control`, `--glass-selected`, `--glass-border`, `--glass-shadow`, `--glass-soft-shadow`, `--glass-blur`, `--action-fill`, `--action-ink` plus the existing semantic tokens (`--bg`, `--panel`, `--ink`, `--line`, `--accent`, etc.). They supply the glow/gradient background, translucent surfaces, fine borders, shadows and controls. Theme selection still uses `html.dark`.
- Existing `web/home.css`, `web/etudes.css` and `web/practice-designer.css` consume those **same** variables for Home, Etudes/Practices libraries, Studio and Practice Design; they remain the **original files**, not alternate copies. Maintain one shared source of truth for colors/materials. The Goosh wordmark/assets were not replaced.
- `web/index.html` only updated stylesheet cache-version query strings. No routing, audio, note model, music selection, AI generation, piano or practice behavior changed in this visual pass.

### 2. Latest mobile navigation location — commit `20371a2ccbb1ca515679902da235912fcfdf0f5d`

**Current user requirement: the four-tab mobile Home / Etudes / Practices / Settings dock stays FIXED AT THE BOTTOM on every page, including an opened Etude Studio editor.** The prior top-of-Studio location is obsolete.

- In `web/style.css`, the shared mobile `body > header > #nav` rule retains `position:fixed` and its safe-area-adjusted bottom inset, floating rounded glass surface and four buttons. Remove the Studio-only override that had set `body.studio-editor-screen > header > #nav { position:static; ... }`, along with its conflicting special body/header spacing. Existing compact Studio content gutters remain.
- The mobile header's inherited `backdrop-filter` was disabled to avoid a containing-block interaction that can trap a fixed child dock under the header. Other pages and Desktop navigation retain their existing position. `web/index.html` updates only the main CSS version.
- **Do not** move the Studio dock back to the top, duplicate navigation, or change any nav handlers. The `studio-editor-screen` body class may still be set by `web/src/app.js` but no longer moves the dock.

### 3. Manual / AI INSIDE Musical System as one compact mobile card — commit `2fc8eee7b6234a25d84aeed912b041adc2201431`

**Current mobile design:** Manual and AI are the method selector **inside** the existing Musical System card. They are intentionally no longer a separate floating card. Compact spacing, small tabs, one coherent border/surface; Iranian/Western controls, Dastgah or Scale/Mode + Tonic, the signature entry and contextual music hint continue beneath. AI-only Practice Goal, mirrored Meter and Generate remain below the musical settings, visually attached to the same surface.

- `web/src/studio-etude-generation.js`: create `div.studio-compose-music` first, then mount the **existing** `div.studio-compose-tabs` directly inside it (same original Manual and AI buttons/handlers/state); there is only one tab component and one canonical music system. AI-only `div.studio-compose-ai` continues as the next child of `div.studio-compose`. No independent logic or second form.
- `web/practice-designer.css`: modify the EXISTING mobile composer rules for a compact tab strip inside the shared card and attach AI-only controls seamlessly. Remove the obsolete independent method-card styling / duplicate mobile overrides; keep Desktop styles and all original controls. `web/index.html` updates asset cache versions.
- The AI guide's bilingual sentence now refers to the **current section**, not the named Musical System section: English `In this section, set the practice goal and the required etude settings. Then tap Generate Etude to create your music.` / Persian `در همین بخش، هدف تمرین و تنظیمات لازم اتود را مشخص کنید؛ سپس دکمه «تولید اتود» را بزنید.`
- The user's prior preference against visible generic Close/بستن buttons remains; use an accessible X icon on modal dismissal without removing Cancel/Back actions where they serve a distinct purpose.

### 4. MOBILE Set Key Signature is a floating modal; Desktop stays in-place — commits `0a55f9d5aad141ffec70ab8dcbe2dc13f1867d09` and `31e1a2a24d8d701ff0679eb25b0eb315c5d43468`

**Exact user scope:** On MOBILE only, tapping the existing Set Key Signature / تنظیم سرکلید button opens a compact, floating, glass-styled modal resembling the user's visual reference. It should NOT navigate away to the main Score staff. Place this button **directly below Select a Dastgah** within Musical System. **Keep the exact current Desktop editor and behavior as the functional reference.** No new music/tuning engine, extra accidentals, unrelated tools or functions.

**What is now implemented:**

- `web/src/studio-etude-generation.js`: when the phone/coarse-landscape media query matches, the SAME `.studio-signature-actions` wrapper and SAME existing button are created under `div.studio-compose-fields`, after `styleField` (Dastgah) and `tonicField` (which is hidden in Iranian mode). On Desktop they remain under the original `.studio-music-choices` parent. Entry remains **Iranian-only**; Western still automatically derives its signature and hides manual entry.
- `web/src/app.js`: the existing `showSignatureEditor(editing)` branches on the established phone/coarse-landscape query. On Desktop, the original `signatureMode` + full `render()` path remains (Score surface switches to Key Signature Editor as before). On mobile, it creates one native `<dialog>` inside the existing Studio panel, with a glass card/header, X-only visible close button, existing five-mark selector, selectable staff and complete original tuner controls. Closing uses native Escape, X, or a tap outside the dialog bounds. There is **no duplicate stored key signature or tuning state**.
- The existing `renderSignatureControls()` accepts an optional controls host + mobile-dialog flag. Both Desktop and mobile build their marks and tuner **with the same original code and callbacks**: `e.key`, `e.offset`, `e.marks`, `freq()`, `save()`, `sheet()`, `auditionSignature()`, `applyCents()`, `setAndSave()`, etc. The existing mark buttons, slider, +/- 1 cent, numeric cents, Reset, natural/tuned playback and Hz readout are reused; no alternate audio/validation implementation. `sheet()` also refreshes the open mobile dialog through `renderMobileSignatureDialog()`. Modal closing stops the audio preview and removes its DOM.
- `web/src/key-signature.js`: original `drawKeySignatureEditor()` gained an **optional** `compact=false` argument. Desktop still uses its original >=650px width, original positional formula and original click-target sizing. Mobile supplies `compact:true` to calculate SVG staff/pitch hit targets using the available dialog width; the follow-up commit `31e1a2a` adjusted the narrow-phone width/spacing to avoid the staff exceeding the popup.
- `web/style.css`: mobile/coarse-touch media-scoped modal presentation uses the **existing centralized glass tokens** (no second design system), floating backdrop, header, one row of **exactly FIVE** accidental options, clickable staff, then the existing cents/pitch/frequency tuner. The five actual canonical options remain **Natural (♮), Flat (♭), Sharp (♯), Koron and Sori**, taken from `SIGNATURE_MARKS` in `web/src/key-signature.js`. Koron/Sori use the project's existing SVG artwork `web/src/persian-accidentals.js` through `appendPersianAccidental()`; no newly invented unicode glyphs. **There are no double/triple flat buttons (bb/bbb).**
- `web/practice-designer.css` changes only the mobile button's width/placement under Dastgah. `web/index.html` updates stylesheet/app cache versions, and `web/src/app.js` updates relevant versioned ESM imports.

**Important source-of-truth / QA constraints:**
- On mobile `signatureMode` is intentionally NOT toggled to replace the main Score; the floating dialog renders its own *view* of the SAME canonical `e.key/e.offset`. The ordinary Score stays in place and is redrawn by `sheet()`. Avoid accidentally entering the Desktop screen-swapping path on a phone.
- Keep the existing desktop full-width editor, manual mark/tuner affordances and all musical behavior. The new optional compact mode must NOT change default desktop SVG geometry, key-signature editing, piano tuning or sound.
- The modal reference image includes additional bb/bbb controls, but the user **explicitly prohibited** them. Do not add them. No other functionality or product features were requested.
- Do not create a separate score/etude model, timing engine, pitch-tuning implementation or independent Mark/Pitch editor. Preserve `SIGNATURE_MARKS` and `appendPersianAccidental` as the source of truth for options/vector icons.
- Scope modifications for this feature to **mobile**. The shared theme applies to all routes by the user's separate explicit request; unrelated page layout and JS functions should remain unchanged.

### Validation actually completed and still outstanding

- Connected GitHub source review and committed-diff review verified the intended paths, source-of-truth reuse, five accidental definitions, visual-style scoping, cache version changes and Desktop branch retention. CSS braces were checked for the stylesheet changes; no separate app engine was introduced. The repo history shows exactly these recent commits: `471715a` (shared styling), `20371a2` (dock bottom), `2fc8eee` (compact unified composer), `0a55f9d` (mobile Key Signature modal + button relocation), `31e1a2a` (narrow phone staff hit targets).
- **NOT performed:** actual browser/Android/iOS WebView visual screenshots, live staff/slider touch testing, hardware audio playback, full cross-browser regression, or end-to-end automated UI tests. The user has **NOT** yet confirmed the new modal visually or functionally on device. Do not write that it has been verified on a real phone.
- Next manual QA for the user's review: Iranian Manual and AI on a narrow phone in both Light/Dark and Persian/English; button located under Dastgah; modal opens without main Score replacement; select C/D/E/F/G/A/B on staff; toggle Natural/Flat/Sharp/Koron/Sori; verify mark/cent/frequency preview, +/-/slider/reset/playback, persistence after close and reopen, X/backdrop/Escape dismissal and keyboard focus. Check Western keeps the signature button hidden while scale/tonic updates the actual score; verify Desktop Set Key Signature still edits the original in-place Score surface. Verify four-tab dock remains at the bottom on the open Studio editor and on every other mobile route.
- **Separately open preexisting bug:** metered live Piano Record → correct rhythmic Score transcription remains user-confirmed BROKEN. The explicit prior approval gate in the handoff around lines 2414–2434 still applies; **do not touch that code without the user's explicit approval**. The previously user-verified RTL Etudes/Practices compact card bug remains closed.

**Documentation maintenance:** This section was appended for Codex from the current branch and recent GitHub commits. It documents already-committed work, NOT new code changes; do not treat it as an authorization to implement further features.


---

## Follow-up fix: Key Signature must open as a real floating modal on mobile (2026-11-21)

**Current fix commit:** `595ef12e2ced433a37d9a5e7416cba8763ef072e` on branch `feature/practice-sequence-studio`. This follow-up SUPERSEDES the "implemented mobile modal" status in the immediately preceding documentation section wherever it implied success on a physical phone.

**User's actual feedback after the prior modal patch:** Tapping **Set Key Signature** on their phone was **still opening the editor in place on the Studio Score / خط حامل**, not a modal floating above the whole screen. The user explicitly clarified that a modal means a panel OVER the underlying page with a backdrop, not an editor replacing the Score. **The previous commit `0a55f9d` / `31e1a2a` did not satisfy this real-world requirement.** Do not mark the original mobile modal work user-verified.

### Scope and source-backed diagnosis

The original implementation already had a mobile `<dialog>` / `showModal()` branch, but its entry predicate was restricted to **<=700px** or **coarse-touch landscape at <=520px high**. Therefore some phone / native WebView / tablet viewport configurations could fall through to the **Desktop** `signatureMode = editing; render()` branch, which intentionally swaps the original Score to the in-place Key Signature Editor. The new dialog had also been appended inside the styled Studio `section` and the generic `sheet()` renderer selected the first `.score` in the document, which was fragile when the modal itself contained a `.score` host. These are **code-level risk factors**; the user's specific runtime viewport and exact root cause were not captured by a device inspection.

### Fix implemented in the existing source files (no duplicate music engine)

- **`web/src/app.js`**: The Studio function now defines **one** `isMobileSignatureView()` decision: `window.matchMedia('(max-width: 767px), (pointer: coarse) and (max-width: 1100px)')` OR Capacitor platform Android/iOS. `showSignatureEditor()` uses this decision for its **mobile modal branch**, and passes the same function into `mountEtudeComposer()` so both the entry-button placement and its action agree on the same mobile/touch contexts. Do **not** revive two unrelated mobile predicates.
- **`web/src/app.js`**: The existing mobile modal is now created as a child of the overall **`#app`** element (rather than inside the Studio `section.panel`). This keeps its native `showModal()` presentation separate from the Score card. It retains the original X/backdrop/Escape dismissal, existing single `mobileSignatureDialog` reference, existing staff rendering, accidental options and tuning controls.
- **`web/src/app.js`**: Generic DOM lookups that had ambiguity now explicitly address the **main Score**, `$('.studio-score-surface > .score')`, and its original editor controls `$('.studio-score-surface > .signature-editor-controls')`. The modal's own staff and controls are still addressed through `mobileSignatureDialog.querySelector(...)`. Thus `sheet()` should not render ordinary Score notes into the popup or vice versa. The mobile view still uses the **same canonical `e.key`, `e.offset`, `e.marks`**, `SIGNATURE_MARKS`, existing SVGs for Koron/Sori, `freq()`, save, cent slider, plus/minus, Reset and listening actions.
- **`web/src/studio-etude-generation.js`**: Composer now accepts `isMobileSignatureView` and uses it to place the **same existing** Set Key Signature button beneath `Select a Dastgah` in mobile/touch contexts. It marks the composer with `.studio-mobile-signature-view` solely for matching presentation rules. Original **desktop** entry remains at its preexisting position and still invokes the in-place Score editor via the original desktop branch. Iranian-only visibility and Western automatic signature/tuning behavior are unchanged.
- **`web/style.css`**: The dialog's existing uniquely-scoped `.studio-mobile-signature-dialog` glass/top-layer CSS no longer depends on the narrow 700px media query: it now lives in `@media screen`, but still matches **only this mobile-created dialog**. Thus a coarse-touch device with a wider visual viewport cannot open an unstyled dialog. Desktop never creates this dialog, so the original desktop editor presentation is untouched.
- **`web/practice-designer.css`**: Replace the previous breakpoint-specific rules for the mobile Dastgah action with rules keyed to `.studio-compose.studio-mobile-signature-view`; maintain the same below-Dastgah position and compact button width, without a parallel CSS implementation. **`web/index.html`**: Update only the CSS/entry script cache keys to `signature-dialog-top-layer-2`; app.js also refreshes the composer-module cache key.

### Expected behavior and test status

- **On mobile / Android / iOS:** Set Key Signature must open a **visibly floating native dialog over the current page**, with its own opaque/translucent glass card and dimmed backdrop. The original Score stays in its usual position in the page behind the overlay and never turns into the signature editor. The modal offers the same five supported symbols (Natural, Flat, Sharp, Koron, Sori) and the existing precise cents/Hz/listen controls. Set Key Signature is directly under Dastgah.
- **On desktop:** The existing Set Key Signature action must **continue to switch the original Score surface** into the in-place Key Signature Editor. Do not touch that branch or change its controls. On Western Music the manual Set Key Signature button remains hidden and automatic key-signature selection still works.
- **Validation performed:** Static source inspection, exact-match edits, confirmation that the reused handlers/data paths remain in place, balanced CSS braces and commit diff inspection. **No live mobile browser, Android/iOS device or UI screenshot test was performed. THE USER HAS NOT CONFIRMED THE FIX YET.** Codex must not describe the issue as resolved/user-verified until the actual phone visibly displays the modal and user confirms. Validate at narrow phones, wider/coarse-touch WebViews, both RTL/LTR and Light/Dark; check X/backdrop/Escape, staff pitch selection and cent/Hz updates.
- **Strict exclusions:** No extra symbol buttons (bb or bbb), new pitch/audio state, duplicate editor engine, score/recording modifications, other page changes or new UI features. The independent **metered live piano recording-to-Score defect remains OPEN** and still requires explicit user permission before implementation.

**Documentation-only update:** This entry records the already committed `595ef12e` fix, user feedback and outstanding QA. No application code is changed by the handoff-document commit itself.


---

## APPROVED IMPLEMENTATION — Metered live piano recording follows consecutive attacks (2026-11-21)

**Current state: CODE IMPLEMENTED, programmatically checked, NOT YET USER-VERIFIED ON A REAL DEVICE.** This new entry supersedes the **approval-required** gate under “CRITICAL OPEN BUG — Metered live piano recording” at lines ~2414ff: the user explicitly discussed and approved the exact proposed musical rule in the conversation (“خب بریم این رو انجام بدیم”). The older status was correct before approval, but it is no longer a prohibition on this *already approved* narrowly scoped implementation. Do not interpret approval or simulation passes as confirmation that their real phone/browser now records correctly.

### Explicitly agreed musical behavior

- In **Metered** recording, the rhythmic onset is the physical piano key **attack** (Note On), snapped to the preexisting 1/32-note grid with the existing `snapRecordedOnset()` near-beat heuristics. The first played key still anchors the take at relative time 0; Record-arm time does not create an implicit pickup.
- Group simultaneous notes at one snapped onset. **Each onset group's notated duration extends exactly to the next distinct snapped onset**, however far away, including across a barline. The existing Score/meterTimeline derives any necessary ties. **A gap between attacks never automatically becomes a rest** and releasing the piano key early never shortens a metered written note.
- Physical key release still controls the *live piano sound envelope* as before; it is **not** used for metered written duration. The key release callback still supplies physical duration to **Free** recording only, retaining the prior free-performance behavior.
- **Last note/group:** before stopping, provisionally ends at the next full quarter-beat or earlier barline. On Record Stop, project the stop instant onto the next full quarter-beat (if later than the minimum) **but cap the final note at the end of its current measure**. Stop is a user action, not a perfect musical event, so this is a consistent editing default rather than definitive intent detection; long sustains across several measures can be edited explicitly.
- The existing meter's **empty measures / trailing rests** may still be engraved to honor `measureCount`. This rule only prevents a release-induced or long-gap rest *between successive recorded attacks*. Deliberate rests remain available from the Score tools. The metronome remains optional and unchanged, and is not automatically phase-aligned to Note On; this limitation should not be misrepresented as solved.
- A measured take remains stored in the **same** canonical `e.notes[{m,at,d}]`, with no second recording engine, note arrays, new dependencies, or new serialization fields. Simultaneous note groups still share their duration to the next onset.

### Exact code changes (branch `feature/practice-sequence-studio`)

- **`web/src/app.js`, commit `601e43988a9fc59bdba53608e3df443db07aa38e`:** Replace previous `reconcileMeteredTake()` heuristic that capped gaps over 1.5 beats to one quarter and inferred sustain from `entry.held`; now compute duration strictly onset-to-onset for all nonfinal groups. Add `barSeconds` to the ephemeral `rec` take, and optionally pass Stop time for final-group ending. Never persist key hold or consult it for metered engraving. Preserve the original key hold / sound envelope and Free recording callback. Update the bilingual recording hint to match the rule. No changes to `model.js`, `score.js`, Audio, meter selectors, Practice or other pages.
- **`web/index.html`, commit `52ac1d3e05cb8dfff535ef05f590af647215d61c`:** Update only the app module cache query key to `metered-onset-to-onset-1` so browsers fetch the modified recording logic.

### Tests actually executed

A pure JavaScript runtime test was run using `snapRecordedOnset` and **the actual extracted latest implementations** of `reconcileMeteredTake()`, `meterInfo()`, and `meterTimeline()` from the connected GitHub source. **11/11 cases passed**, with expected durations, zero notation issues and no internal rests in the newly recorded sounding span:

- 4/4, BPM 60, attacks 0/1/2/3, stop 3.7 => four quarter notes (1/1/1/1 seconds).
- 4/4, BPM 60, attacks 0/2, stop 2.4 => 2 seconds then 1 second, **not quarter + automatic rest**.
- Same attacks, stop 3.7 => 2/2 seconds ending at barline.
- Attacks 0/5 => first 5-second note tied across barline, last 1 second.
- Simultaneous attacks 0/0/1 => 1/1/1 seconds.
- Four sixteenths at 0/.25/.5/.75 => .25 seconds each.
- 6/8 attacks 0/1.5 => 1.5/1.5 seconds.
- 6/16 attacks 0/.75 => .75/.75 seconds.
- 7/8 attacks 0/2.5 => 2.5/1 seconds, last capped at 3.5-second barline.
- 4/4 BPM 120 attacks 0/.5/1/1.5 => four .5-second quarters.
- Single attack at 0, stop .3 => provisional/final 1-second quarter.

These are **extracted-function / data-model runtime tests**, not an interactive browser, live piano, audio, mobile, Android/iOS, touch or visual acceptance test. No such end-to-end test was performed; the user has not confirmed success. Do not mark the original user-observed recording defect closed until they test the actual playing/Score and confirm.

**Out of scope / remaining ambiguity:** Early key-off cannot distinguish a long staccato-notated note from short note plus silence; this version deliberately assumes sustain-in-notation until next attack. True rests between hits must be set deliberately, not inferred. A stop after several beats may lengthen the last note up to (but never beyond) its enclosing barline. The optional metronome's phase is not synchronized to the first attack; it remains an auditory guide. The snap grid can map extremely close attacks to the same notated onset, forming a group. These are currently explicit limits rather than claimed fixes.

**Scope assurance:** This patch was specifically requested after the rule and ambiguity were explained; the unrelated Key Signature dialog documentation above and the older warning do not authorize unrelated code changes.


---

## USER FEEDBACK AND CODEX REVIEW REQUEST — Metered piano recording (2026-11-21)

**Latest user feedback (Persian, verbatim):** “خیلی بهتر شد فعلا خوبه .. اما توی کدکس بگو بهتر شده اما خودش وقتی داک رو خوندیه ببرسی کنه وپیشنهاد بهتر شدن روبده”

**Meaning / acceptance status:** The user has now tried the new attack-to-attack Metered piano recording and reports it is **much better and acceptable for now**. This updates the previous “NOT YET USER-VERIFIED” caveat: the user has given *positive practical feedback*, but has **not** claimed that every edge case is fully correct, professionally polished, or regression-free. Do not reopen the previous defect as though the new implementation did nothing, and do not present it as a final perfected transcription algorithm.

**Specific request to Codex — READ, REVIEW, THEN PROPOSE; DO NOT AUTO-IMPLEMENT:**

1. **Read this handoff thoroughly**, especially the older problem report, the approved onset-to-onset design, the latest implementation/test summary, and **this user's updated positive feedback**. Cross-check the **actual current code** in `web/src/app.js` (`snapRecordedOnset`, `reconcileMeteredTake`, `toggle`, piano event timing, optional metronome), `web/src/model.js` (`meterInfo`, `meterTimeline`), and `web/src/score.js` (notation rendering). Where old documentation differs from current code or user feedback, distinguish the historical state from the current one.
2. Perform an **independent technical and musical review** of how to make Metered piano Record -> Score transcription more accurate, intuitive and robust. In particular assess: attack timestamp vs audio/performance clock consistency; temporal quantization and tolerance at different BPMs; phase alignment with the optional metronome; expressive timing and near-simultaneous notes/chords; short-note versus silence ambiguity; repeated same-pitch taps; notes crossing measures/ties; the **last note and when Record Stop happens**; compound meters (6/8, 6/16), other supported meters, and whether changes could affect existing Score, Free recording, piano sound or mobile touch behavior.
3. **Present a prioritized, concrete list of proposed improvements to the user in Persian**, each explaining the current observed/verified limitation, the precise musical rule and expected benefit, trade-offs, implementation scope, and a specific playing example that can be used to validate it. Clearly distinguish verified code findings from hypotheses and optional ideas. Prefer minimal safe improvements over an unnecessary rewrite; do not invent requirements or imply that untested changes are already functional.
4. **Do not edit, refactor, commit, or push any application code merely as a result of this request.** The current version is considered sufficiently good for now by the user. Codex is asked for **analysis and recommendations only**; await explicit approval for any proposed implementation. Do not affect unrelated features, other pages, audio behavior, notation model, visual design, or the existing working behavior without an independently authorized request.

**Documentation-only action:** This entry communicates user feedback and a future review task. It is not a code fix or authorization to modify the recording implementation.


---

## IMPLEMENTED — Score range selection for atomic Erase and selected-only Play (2026-11-21)

**User request (Persian paraphrase):** In Etude Studio Score, add one new button directly beside the Eraser. Clicking that tool should let the user drag the mouse across a region to select a group of notes. For now the selection has exactly two actions: delete the selected notes, and when Play is clicked, play **only the selected music**. Maintain **one canonical code path**, not a second editor, player, note model or audio engine.

### Implementation on `feature/practice-sequence-studio`

- **`web/src/app.js`**, commits `9c3b0ec34b78f03cfda198a4f42aa8e2d5ab1086` and `dd8db04f549ef8eaf6fc3301bafb4ee433044359`:
  - Add a fourth tool **Select area / انتخاب ناحیه** (`scoreTool='range'`) immediately after Eraser, with a dashed-rectangle icon. The existing Select, Pen, Eraser, Wrap, Zoom and transport controls retain their handlers and meanings.
  - Keep the **existing `sel: Set<number>`** as the sole list of selected canonical note indices; `rangeSelectionActive` is only a lightweight UI origin/intent flag to distinguish an actual marquee from an old single-note click (which traditionally opens Note Settings). The actual content and sound never live in this flag.
  - `sheet()` passes `selected:sel` and the optional `selectRange` callback into the shared `score()` renderer. Finalizing a marquee replaces the selected indices and repaints the SAME score. Clicking blank score space in marquee mode clears the area selection.
  - **One erase path:** add `eraseScoreNotes(indices)`. Both the pre-existing single-note Eraser click and a new range delete use this exact function, its existing measured-meter validation, the SAME `e.notes` array, stop existing playback, save and repaint. When a range selection exists, pressing the Eraser button deletes it **as one operation** (without switching to individual erase); Delete/Backspace outside editable fields does the same. Without an area selection, Eraser retains original click-to-delete behavior. Erasing notes leaves their duration as **derived rests** in the same metered timeline; it does not shift unrelated note start times.
  - **Atomic Undo:** the existing `kind:'erase'` undo entry now supports `items:[{index,note}]` for one or more deletions and restores the original note array positions with one Ctrl+Z. No second undo stack.
  - **One Play path:** `startScorePlayback()` snapshots `sel` when `rangeSelectionActive && sel.size>0`, filters only the scheduling view, and sets the existing transport `offset` to the earliest selected note onset. The same `scheduleScoreTransport()`, `voice()`, Pause/Resume, sound samples and `paintPlaybackMarker()` are reused. No extra playback engine, silent gaps *between the selected notes* retain their original timing, and the selection starts playing immediately (no preceding unselected silence). Without a marquee selection, Play remains full-score, including when the old Select tool has highlighted a single note for Note Settings.
  - Preserve Free/Metered recording, other score tools, pitch/Key Signature, music systems and all current playback audio envelope behavior. Starting a new Record clears the temporary range so stale selected indices cannot restrict later Play.
- **`web/src/score.js`**, commit `a981d37aa0ed1969096d1f6aa2e7f9a86ec16460`: Add an **optional** `selectRange` callback and only when `tool==='range'` attach a pointer-captured box-marquee to the SAME `score()` output host. It intersects **actual on-screen SVG notehead hitboxes** from all visible/wrapped Score rows, sending deduplicated *existing* note indices upstream; tied notehead fragments share the same index. Show a temporary dashed rectangle and preview stroke while dragging. No separate note model, no second notation renderer and no global mouse listener. Pointer cancel restores the old highlight.
- **`web/style.css`**, commit `e3cf2d7bd4aeb1fdfae661b91d0fb8d78183adc1`: Add a scoped noninteractive glass/accent marquee and crosshair cursor for `data-tool=range`; retain Light/Dark tokens. Change mobile Score editing grid from six to **seven** columns so the additional toolbar button stays alongside existing controls on the second row while transport occupies the first. The tool uses pointer events on mobile too, but actual device touch behavior has **not** been verified.
- **`web/index.html`**, commit `0e86870b2b52f38e23811555ab127b4a0d03701a`: Bump app module and style cache keys to `score-marquee-select-1`, and `app.js` bumps the shared Score module key.

### Actual validation

- Parse/syntax-check the **actual current** `app.js`, `score.js` and `model.js` with JavaScript Function parsing after stripping only ES module import/export wrappers: **3/3 passed**.
- Runtime tests with the **actual extracted** `eraseScoreNotes()`, `undoScoreEdit()`, `measuredEditAllowed()` and meter functions using mock state: **6/6 passed**, including single erase+Undo; nonadjacent group deletion as one undo item; exact group Undo; duplicate-index deduplication; no deletion while recording; and derived rest continuity in metered mode.
- Runtime tests with **the actual extracted** `startScorePlayback()` and mocked audio dependencies: **4/4 passed**, covering consecutive selected notes, nonadjacent selections with time gap, default whole-score Play, and preserving legacy single-click Select behavior.
- Renderer pointer event tests with the **actual extracted** `score()` function and mock SVG/DOM geometry: **4/4 passed**, covering marquee outline display, selection of original note indices, blank-space selection clear and multiple wrapped staff rows.
- **No real browser, touch device, Android APK, piano-audio, end-to-end UI or visual screenshot tests were performed**. Do not mark it accepted by user before their own interaction.

### Deliberate scope / known limitations

1. A range selects **noteheads that intersect a dragged rectangular region** (not derived rest glyphs). A note tied over measure boundaries has one canonical index, so marking one displayed tie segment selects and plays/erases **the entire underlying note**, not a cropped fragment of its duration. A user requesting time-span trimming or rest-specific multi-selection needs a separate approved design.
2. Area selection is replacement-based; no additive Shift-marquee, copy/paste, move, pitch transformations, export selection or other operations were added.
3. Deleting multiple notes is undoable with **one** Ctrl+Z, but direct Eraser clicked with no selected marquee remains the original single-note tool; the user may also press Delete/Backspace when a marquee is active.
4. Playback uses the original note pitches, timing, sample scheduling and index-based markers, with a changed **initial offset only**. Testing on hardware remains outstanding.
5. Avoid implementing additional features without explicit user request. Future reviews should not duplicate shared Score/transport logic.

**Status:** Implemented and code-level checked; awaiting user confirmation on real desktop/mobile behavior.


---

## IMPLEMENTED — Free pen values, Free duration timeline, and per-staff seek/playhead (2026-11-21)

**User's requested UX changes (three scoped features):**

1. `Pen note value` (`کشش نت با مداد`) must stay visible and usable when the meter is **Free**, not only when a time signature is chosen.
2. Clicking a Score note must **not** open the old numeric Note Settings dialog for duration/rest and Save. In metered notation that workflow is misleading because editing a duration shifts/invalidates following rhythmic placements; remove the modal rather than trying to keep parallel editing rules. In **Free / avaz**, provide an **optional toggleable visual timeline** where note lengths can be freely shortened or stretched with the mouse.
3. Show a DAW-like **play-position/seek ruler above EACH staff row**. One staff row means one ruler; wrapped score with multiple rows means one ruler per row. Indicate playback position and allow mouse click on that ruler to seek so Play can continue from that musical location. Reuse ONE existing audio transport and note timeline.

### Source changes, implemented on `feature/practice-sequence-studio`

- **`web/src/app.js`:**
  - The existing `penQuarterBeats` dropdown is **never hidden in Free**, and the existing Pen insertion now uniformly calculates `duration=(60/e.bpm)*penQuarterBeats` in both Free and metered modes. Free uses BPM as its current duration unit scale even without a bar/time signature; the dropdown uses the existing whole/half/quarter/eighth etc. choices and is not a new Pen engine.
  - The legacy `noteSettings()` modal and `retimeNote()` helper are removed; normal Score Select click only highlights an individual note, retaining existing keyboard selection and Score drag functionality. No hidden numeric note timing editor remains in that click path.
  - The new **Timeline / تایم‌لاین** button appears near the meter/Pen controls **only in Free**. It toggles a single `.score-free-timeline` panel rendered directly from canonical `e.notes`. Each note is an onset-proportional clip labelled by pitch and length, arranged in visual lanes if notes overlap, with a right-edge resize handle. Pointer drag previews the change; release commits the new duration, with .01-second steps; right/left arrow keys on focused handle adjust by .1 seconds. Editing does **NOT move any other note's onset**: only the note's `d` field changes. Existing recording/audio, Score and Free rest derivation remain driven by the same saved notes. A resize is one atomic Undo action in the existing `scoreUndoStack` (`kind:'free-duration'`). Free clip editing is disabled for metered scores and while recording; switching away from Free hides the panel.
  - Add a transient `scoreSeekPosition` cursor. The existing shared `startScorePlayback()` now starts at this offset when requested, continuing to respect the existing marquee selection (only selected notes play). Clicking a ruler during playback stops and restarts **the same** existing transport at the chosen time; when idle it repositions the playhead, and Play starts from there. `scheduleScoreTransport()`, piano samples, note transport, and Pause/Resume are reused. Fix existing `playback.started` offset when starting mid-score: `transport.anchor - transport.offset`; otherwise the visual marker could lag behind the audible note after a seek or selected-only playback. The existing Score transport Play button still stops and returns the playhead to time zero.
  - `sheet()` passes the one `seekScorePlayback()` callback and calls the Score module's `paintScorePlayhead()`; the current `paintPlaybackMarker()` uses the same audio clock to update the ruler playhead on each animation frame, including pause/resume. It also renders (or hides) the Free timeline panel. No duplicate audio scheduler or second notes collection is introduced.
- **`web/src/score.js`:**
  - Extend the existing `score()` renderer with an optional `seek` callback. Every generated SVG staff row gets one small labeled seek ruler in the available space above its five staff lines, with clickable hit zone, time anchors derived from its **existing** notes/rests/barline events, live progress and a playhead. The `rulerMap()` interpolation function handles both time-to-x and x-to-time using the same anchors; `paintScorePlayhead(host,time)` updates these SVG markers rather than doing another Score render each frame. This is a visual music-time ruler, **not an audio waveform**.
  - Ruler clicks stop propagation, including `click`, so tapping the ruler in Pen mode never accidentally inserts a note. Keyboard support on the ruler: left/right by quarter beat and Home/End. In range-selection mode the ruler remains independent of the marquee.
  - Ruler art receives `.score-ruler-art` so it is excluded from printed Score output; the underlying staff and notation are unchanged.
- **`web/style.css`:** Add scoped Light/Dark-compatible glass Timeline styling, horizontally scrollable time-proportional clips, resize handle, optional responsive layout and print exclusions for both timeline and ruler art. Existing other pages/notation visuals are untouched.
- **`web/index.html`:** Only refresh the shared stylesheet and entry module cache keys to `free-timeline-ruler-1`. The app imports `score.js?v=score-ruler-seek-1` to avoid reusing a stale renderer.

### Actual checks performed (no unearned runtime claims)

- Static parsing after stripping import/export wrappers: `web/src/app.js`, `web/src/score.js`, `web/src/model.js` **3/3 passed**.
- Extracted-function Free duration + Undo tests **6/6 passed**: only one note's `d` changes, other `at` unchanged, one undo restores the duration, metered edit rejected, record-time edit rejected, short Free value valid, negative value rejected.
- Extracted Score SVG / mock DOM seek ruler tests **6/6 passed**: one ruler for one staff, several rulers for wrapped staves, click maps exactly to musical time, click does not trigger Pen, current-time playhead position updates, keyboard seek dispatches.
- Existing playback transport with mocked audio dependencies **5/5 passed**: start from clicked time, selected-only Play stays filtered, Pause keeps absolute time, Resume reuses same scheduler and offset, seeking during active playback restarts same scheduler at selected time.
- Extracted visual Free Timeline and mock pointer tests **4/4 passed**: each canonical note produces a clip, relative onset positions reflect original data, dragging one handle commits only that note's duration, and timeline hides for Metered.
- These are **source-backed programmatic tests and mocked DOM/audio checks**; they are **NOT real browser/device, real piano/audio, Android/iOS, scroll/resize rendering, visual acceptance or printed PDF tests**. User acceptance has not been recorded. Test actual mobile and desktop Free note editing, wrapped Score seeking, clipboard-free selection/erase, playback seeking and Ctrl+Z in the browser before declaring the UX fully correct.

### Deliberate boundaries / caveats

- In Metered notation, no on-click numeric duration modal and no arbitrary duration resizing; rhythmic placement continues through existing Score Pen/Select/Eraser and the shared measure validator. Free note length editing intentionally does **not** shift other starts; this can create or remove audible overlaps and derived rests, which are allowed in Free.
- Free note length clips use seconds, with .01-second drag resolution; the predefined Pen note-length menu is relative to BPM. The two views use one `e.notes` model but intentionally have different editing granularity.
- Seek rulers map actual musical event times onto **engraved spatial note spacing**. This is not a perfectly time-linear axis or waveform representation; intervals inside each pair of Score anchors are interpolated. A full precision DAW waveform, dragging a playhead across rows, or tempo-grid snapping are out of scope unless requested.
- Clicking a ruler while stopped **positions** the playhead; pressing Play begins there. While already playing it restarts the same transport from the click position. With an active marquee, the current selected-only playback behavior still takes priority.
- The old Note Settings dialog is intentionally removed, not moved to a second editor. No additional persistent note schema, timeline array, audio player or separate recording path is created. Do not reintroduce the old modal or change existing metered transcription based on this change alone.

**Status:** Implemented in source; logic and mock-UI checks passed; physical UX and audio behavior await the user's verification.


---

## IMPLEMENTED — Latest piano-recorded note and clearer Score selection (2026-11-21)

**User feedback / exact scope:** “وقتی داریم با رکورد پیانو میویسم همیشه خرین نتی که نوشته میشه با یه رنگ دیگه باشه که معلو بشه و چشم باشه. icon select رو هم دیدم درست کار میکنه. اما نت هایی که سلکت شدن خیلی واضح نیستن”

The user confirmed that the *area-selection icon itself works correctly*. Do not change the selection algorithm, marquee gesture, erasing or selected-only Play. They want two **visual affordances only**: emphasize the **most recently added piano-recorded note** while Record is armed, and make **all selected Score notes** substantially more recognizable.

### Implementation — existing shared Score renderer only

- **`web/src/app.js`**, commit `3125b6f9e3d9cb08c53ebf7732bc011be4ac2b0c`: The existing piano `onStart` handler sets a transient `take.latestNote=n` reference **immediately after pushing that exact note into the canonical `e.notes`**. `sheet()` passes `recordingIndex: rec?.latestNote ? e.notes.indexOf(rec.latestNote) : -1` into the same `score()` call. This works for **Free and Metered recording** and always follows the latest **attack**, including repeated notes of the same pitch (object identity, not pitch). The indicator appears during recording, changes to the latest note on each attack, and disappears when `rec` becomes null on Stop. No new note list, sound, duration, snap, recording state persisted to disk, audio engine or extra renderer.
- **`web/src/score.js`**, commit `40a54c49602d614a82149abdaa3485df326f5caa`: Add optional `recordingIndex=-1` parameter; use **one small `emphasizeNote()` visualization helper** for ordinary selected notes, marquee preview, and current latest recording note. Selected noteheads are rendered with the existing theme **`var(--accent)`** (cyan/teal according to Light/Dark), a **visible outer halo ring** with subtle translucent fill, and a thicker stroke. Their stems and flags use the accent too, keeping rhythm readable. Latest recorded note uses distinct **`var(--danger)`** (red/pink according to Light/Dark) halo, head, stem and flags. Hollow white/half notes retain an unfilled musical head (their interior uses `var(--panel)`) so highlighting cannot visually reclassify their notated rhythm.
- The existing range-selection `show()` / `clear()` use the same `emphasizeNote()` helper instead of merely toggling notehead stroke width, so hover/drag previews show the stronger ring + accent too. No pointer, drag, note hitbox, selection index, rest, score timing, playback or PDF algorithm was changed.
- **Cache-busting only:** `app.js` now imports `score.js?v=score-note-emphasis-1`; `web/index.html` now loads `app.js?v=score-note-emphasis-1` (commits `1d3d0232b9a467f7c3ed7097dd40c8c0302f8928`, `8c729e6d2745c729f42e5417256ca2fe5c7153e3`).

### Validation actually performed

- JavaScript syntax parse for current `web/src/app.js`, `web/src/score.js` and `web/src/model.js` **3/3 passed** (after stripping only ES import/export wrappers).
- **9/9 mock-SVG runtime rendering checks passed** using the actual extracted current `score()` code and original `meterTimeline()`:
  1. Multiple selected heads use theme accent and stronger stroke; others stay normal.
  2. Selected half-notes remain hollow instead of becoming a quarter-note-looking solid head.
  3. Selected noteheads have visibly enabled outer halos.
  4. The last recorded note uses `var(--danger)` rather than the selection accent.
  5. The latest marker moves from one recorded note index to another.
  6. No latest marker when recording finishes / no recordingIndex is passed.
  7. Recording highlight takes priority over selection only if both indices are the same (normally selection is disabled during Record).
  8. Live box/marquee preview applies the same stronger halo and head style.
  9. The marquee still emits the original canonical note indices.
- **No physical browser, touch, Play/audio, device, screenshot, PDF print, or visual cross-theme inspection was performed.** The user has not yet confirmed how these updated colors look on their device. Test at least 4/4 and Free, repeated same-pitch recordings, multiple wrapped staff rows, and Light/Dark.

**Restrictions:** This is a UI-only highlight change to shared notation rendering. Do not introduce blinking animations, modify rhythms or pitch, duplicate selection state, auto-scroll the page, change metronome behavior, or treat the mock tests as completed real-user visual acceptance.


---

## IMPLEMENTED — Keep only dashed Score playhead during playback (2026-11-21)

**User request (Persian):** Remove the unnecessary per-note follower shown during Play and the horizontal blue progress line. The existing **vertical dashed/dotted play-position line alone is sufficient**. Preserve the upper interactive time/seek ruler and audio behavior.

**Actual change on `feature/practice-sequence-studio`:**
- **`web/src/app.js`**: Simplify `paintPlaybackMarker()` to update **only** the existing `paintScorePlayhead()` with the Web Audio clock. Delete the per-note latest-attack scan, active-index calculation, and old `[data-playback-note]` arrow toggling. `clearPlaybackMarker()` still cancels the same animation frame and paints the current seek position. Remove the now-unused `playback.notes` snapshot, **without changing** `scoreTransport`, note sound scheduling, selected-only Play, seek, Pause/Resume, or recording. Audio and timing data remain canonical.
- **`web/src/score.js`**: Remove the per-note arrow SVG with the `data-playback-note` tracking attributes; remove the horizontal accent-colored `progress` line and its small `thumb` circle from the ruler; keep the **single vertical dashed** `cursor` and the existing unobtrusive base ruler, time labels, clickable/keyboard-accessible seek hitbox and `rulerMap()`. The shared `paintScorePlayhead()` now updates only the cursor's X/opacity and the seek control's ARIA value.
- **`web/index.html`** and the app Score import: bump module cache keys to `dashed-playhead-only-1` so the slimmer renderer is loaded. No CSS, audio engine, note model, Score selection/record highlight, Free timeline, or other screens were changed.

**Validation actually performed:** Both modified JavaScript modules parse; seven static checks passed (old arrow IDs absent, progress/knob removed, dashed cursor/seek/clock code intact, cache keys updated); two runtime tests of the actual simplified `paintScorePlayhead()` passed for an in-range time and an out-of-row time. **No real browser, audio, touchscreen or cross-device visual test was performed; user acceptance of this change is still pending.**

**Do not reintroduce** extra note-follow arrows, horizontal blue progress or redundant seeker dots without a specific user request. Keep one music-time/playhead path; the dashed vertical line should be the only moving playback affordance.


---

## USER VISUAL REVISION — Unified accent without notehead rings (2026-11-21)

**Current user feedback:** They like the existing **selected note color**, but the added circle/ring around a selected notehead is excessive. They also explicitly ask that the **latest piano-recorded note use precisely that same selected-note color** instead of a separate red color.

**Implemented on branch `feature/practice-sequence-studio`:**
- In `web/src/score.js`, remove the extra outer ellipse/halo altogether (both for selected and most-recently recorded notes). Keep the existing selected head/stem/flag color **`var(--accent)`** and thicker head stroke. The newest note while Record is active now uses **the exact same `var(--accent)`** through the existing `emphasizeNote()` helper and keeps its ephemeral `recording` visual state; other notes revert to normal when it is no longer latest. Half/whole rhythmic head shapes remain hollow via the existing `var(--panel)` treatment.
- This is **pure presentation**; there is no modification to `e.notes`, recording, selected indices, marquee event handling, deletion, Undo, seek or Play. No second style or selection path.
- `web/src/app.js` and `web/index.html` only change the module query cache key to `unified-note-accent-no-ring-1` so browsers reload the revised `score.js`.
- Commits: `1ad4461e648e1c43f7a20febcf97c64839ec6233` first removed rings around selected notes; `6c2fbdeb1705e3340b170d50dcd34c410a8d883d` then removed the remaining recording halo and unified colors; `098adb40db18ea874fc3a5708661b82f896fca34` and `336c805edc2750528faba50cf0f3d45eb23d45ab` update module cache keys.

**Checks actually performed:** Both current JavaScript modules parse; four runtime checks of the extracted shared `emphasizeNote()` confirm selected, recording, normal and hollow recording states; no extra ring SVG markup or separate `var(--danger)` note color remains in the Score renderer; cache-bust references agree. **No actual in-browser/mobile visual QA** was performed, and the user has not yet tested this latest revision.

**Visual acceptance criterion:** When a note is selected or is the latest note being written by the live piano Recorder, highlight only the existing note drawing in the same accent (no surrounding circle or halo). Do not reintroduce the earlier ring/red treatment without explicit instruction.


---

## FOLLOW-UP VISUAL CLEANUP — Hide horizontal timing rulers (2026-11-21)

**User request:** Remove the horizontal dark/black lines previously added above the Score to show note timing. Context: the prior user request already removed the horizontal blue progress bar and per-note follower; they repeatedly prefer **only the vertical dashed playback position indicator**.

**Implemented on `feature/practice-sequence-studio`:**
- **`web/src/score.js`, commit `9dcb009c44c95295b08761bbebb2f2bd38`:** Remove the Score seek ruler's visual horizontal baseline (`currentColor`), surrounding dark bordered track/background, small time ticks, and time labels from *each* staff row. Retain the same `points` event-to-x time mapping, per-row **vertical dashed** `cursor`, transparent clickable and keyboard-accessible `data-score-seek` hit target, and the shared `seek` callback. These are purely visual removals. Do **not** remove the five genuine musical staff lines, Score notation, the dashed playhead, or the ability to start Play from a clicked time.
- **`web/src/app.js`, commit `f72b64f4771930ae30c93a8f621acc247bde465d`** and **`web/index.html`, commit `87e8c7f575c19e4934f87b423144c1e7738abd8a`:** Update only the module cache keys to `dashed-playhead-clean-ruler-1` so the revised Score renderer loads. No audio, selection, recording or note-model behavior changes.

**Validation:** Both current JavaScript modules parse. Eight static source checks passed: horizontal timing line, border, ticks and labels are absent; vertical dashed cursor, transparent seek hitbox and time mapping remain; cache keys match. **No live browser, touchscreen or visual device test** was performed. User visual acceptance is pending.

**Scope:** Keep the vertical dashed playhead as the only moving playback affordance. Do not restore timeline/ruler decoration without explicit user instruction.
