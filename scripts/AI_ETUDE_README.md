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
then select **Generate** in the desktop editor and choose شور, سه‌گاه, ماهور,
or همایون. This generates exactly 16 notes across 4 bars of 4/4 using the
OpenRouter model specified in `.env`.

The API is **POST /api/generate-etude** with JSON `{"dastgah":"shur"}`.
It returns `title`, `abcNotation`, and `notes` (pitch, duration in beats,
and computed frequency in Hz). The adapter converts pitches into Goosh
native `{m,at,d}` notes with its `key` / `marks` tuning system.
The **existing** score renderer, audio engine and editor are reused.

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
