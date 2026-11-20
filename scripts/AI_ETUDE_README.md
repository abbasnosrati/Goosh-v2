# AI-generated Persian etudes (redesign branch)

This feature is integrated into Goosh **Etude Studio**. One Python process
serves the existing static web UI and the OpenRouter API on the same origin.
No Express / Node backend, ABC.js renderer, or second server is required.

## Run

From the repository root (Python 3.9+):

```bash
cp .env.example .env
# Put your real OPENROUTER_API_KEY in .env, do not commit it.
npm run web
```

You may also run `python3 scripts/goosh_server.py` without npm.

### Previous port 8081 / LAN access

To keep the same port and bind address as your previous static-server command:

```bash
python3 scripts/goosh_server.py 8081 --bind 0.0.0.0
```

This serves **both** the current Goosh UI and its OpenRouter API on port 8081.
Open http://localhost:8081 on the development machine, or
http://<your-computer-LAN-IP>:8081 on another device.

For testing only on this computer, omit `--bind 0.0.0.0`:

```bash
python3 scripts/goosh_server.py 8081
```

**Security:** binding to `0.0.0.0` exposes the AI endpoint to other clients
that can reach your computer. They can spend your OpenRouter credits. Use only
on a trusted network, with firewall restrictions, and never expose this POC to
the public internet. The API key itself stays in the server-side `.env`.


Visit **http://localhost:8080**, open **Etude Studio**, create or open an etude,
then select **Generate** in the desktop editor. The **Shur** option now
sends the user's supplied 8-bar Daramad-e Khara prompt to OpenRouter
verbatim; OpenRouter returns ABC notation in a code block. Python parses
and validates the ABC into the JSON format used by the Goosh editor. The
other three modal presets retain their original 4-bar JSON generation.
The OpenRouter model is specified in `.env`.

The API is **POST /api/generate-etude** with JSON `{"dastgah":"shur"}`.
It returns `title`, `abcNotation`, and `notes` (pitch, duration in beats,
and computed frequency in Hz). The Shur response additionally includes
`bars` (phrase count), `totalBeats`, and note-level `atBeats` so rests are preserved.
The frontend adapter converts pitches/timing to Goosh's native
`{m,at,d}` notes using its existing key/tuning fields.

The key signature is `K:C _B _E _/A`. Shur supports both E-flat and
variable E-koron at the same time; because the legacy model tunes by MIDI
pitch class, E-koron is stored as an acoustically equivalent D-sharp with
a +50-cent offset, plus optional staff display metadata so it appears on
the E staff position with a koron accidental. Existing score and audio
engines are reused; only optional display metadata support was added to
score.js. This is a POC interoperability workaround, not a general
per-note-accidental data-model upgrade.

This is still a proof of concept: koron/sori use fixed -50/+50 cents,
the available pitch collections are simplified reference scales, and
the rhythm is fixed at 4 bars. Verify melodic and modal accuracy
with a musician before treating the output as authentic Persian music.

An existing etude's notes are not replaced without confirmation.
Errors/cancellation do not change them. All code changes are isolated
to the Python server entrypoint, AI adapter, Studio Generate control,
and entrypoint configuration. No server-side key is sent to the browser.

If you previously created `poc/.env` on the POC branch and kept it locally,
the server can also read that file when root `.env` is absent. Prefer root
`.env` on this branch. The API does not work with Python's original
`python3 -m http.server`; use the updated `npm run web` command.

## New Shur ABC-only prompt (2026-11-20)

The current prompt lives as `SHUR_PROMPT` in `scripts/abc_etude.py`.
The user replaced the earlier sample motif with the complete ABC example
**"Goosheh - Shoor Sol"** (X:1, M:none, L:1/16, Q:1/4=80,
K:Gm ^/A and its free-length phrases). This example is supplied to the
AI as **an inspiration for new improvisatory melodic phrasing**, not
as music to copy, play back, or convert directly.

For original output, the **Shur target key remains K:C _B _E _/A**
(B-flat, E-flat, A-koron), with explicitly marked variable E-koron;
the example's A-sori spelling is reference material, not a change to the
required target key. The AI must create fresh **M:none** ABC with
variable-length phrases (approximately 4–20); a numeric duration such
as G4 means four L:1/16 units, NOT octave 4.

OpenRouter is still asked for **only an ABC code block**, not JSON.
The same Python process parses that ABC into the structured JSON result
used by Goosh Studio: `title`, `abcNotation`, `bars` (the number of
free-length phrase divisions), `totalBeats`, and `notes` with
`atBeats`, `duration`, `pitch`, and `frequency`. The browser
continues to receive structured JSON, converted to Goosh's existing
native score/playback format. No second backend is involved.

The parser accepts a bounded monophonic ABC subset, `M:none` for
free-meter phrases, notes and rests with varied durations, signature
and note accidentals, and simple tuplets. It allows **4–20 phrase
divisions** for `M:none` without requiring each phrase to sum to
the same number of beats. Fixed-meter ABC continues to receive its
existing 8-bar validation. Pitch range and target key restrictions
remain enforced. Invalid ABC is reported via HTTP 502 rather than
silently rewriting the improvised rhythm.

This ABC parsing feature has not yet been exercised with a live OpenRouter
response in this environment. Verify in the user's environment, and
do not mistake simplified accidentals/tuning for fully authentic
Persian classical music notation.

**Latest Shur generation limit (2026-11-20):** A creative range of **4–20 free-meter phrases** is requested. Python and the AI frontend both accept that range; the score/audio engine is not affected. Future user-selectable counts may constrain the requested range (e.g. exactly four).

**Phrase-count handling (2026-11-20):** For Shur, the 4–20 phrase range is a creative instruction to OpenRouter, not a hard validity check. Free-meter ABC with a different number of phrase divisions (or no barlines) is accepted when pitches and timing are otherwise valid; the API reports the actual count. The score renderer and audio engine are unchanged.
