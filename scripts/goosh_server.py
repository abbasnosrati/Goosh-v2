#!/usr/bin/env python3
"""Serve the existing Goosh web app and its local OpenRouter API on one port.

Python standard library only; no Node/Express backend or extra Python packages.
"""
import argparse
import json
import os
import re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from urllib.parse import urlsplit
from abc_etude import SHUR_PROMPT, parse_abc_etude

PROJECT = Path(__file__).resolve().parent.parent
WEB_ROOT = PROJECT / "web"
PRACTICE_CATALOG = json.loads((WEB_ROOT / "practice-goals.json").read_text(encoding="utf-8"))
PRACTICE_GOALS = {g["id"]: g for g in PRACTICE_CATALOG["goals"]}
MODELS = {
    "shur": {
        "name": "شور", "tonic": "G4", "microtone": "Ak4",
        "pitches": ["G4", "Ak4", "Bb4", "C5", "D5", "Eb5", "F5", "G5"],
    },
    "segah": {
        "name": "سه‌گاه", "tonic": "Ek4", "microtone": "Ek4",
        "pitches": ["Ek4", "F4", "G4", "Ak4", "B4", "C5", "D5", "Ek5"],
    },
    "mahur": {
        "name": "ماهور", "tonic": "C4", "microtone": None,
        "pitches": ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"],
    },
    "homayun": {
        "name": "همایون", "tonic": "G4", "microtone": "Ak4",
        "pitches": ["G4", "Ak4", "B4", "C5", "D5", "Ek5", "F5", "G5"],
    },
}
RHYTHM = [1, 1, 1, 1, .5, .5, 1, 2, 1, .5, .5, 2, 1, 1, 1, 1]
SEMITONES = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
CENTS = {"": 0, "#": 100, "b": -100, "k": -50, "s": 50}
ABC_MARKS = {"": "", "#": "^", "b": "_", "k": "_/", "s": "^/"}
PITCH = re.compile(r"^([A-G])([#bks]?)([3-6])$")


def load_environment():
    """Read local dotenv values without overriding explicit environment variables."""
    for path in (PROJECT / ".env", PROJECT / "poc" / ".env"):
        if not path.is_file():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            item = line.strip()
            if not item or item.startswith("#"):
                continue
            if item.startswith("export "):
                item = item[7:].lstrip()
            if "=" not in item:
                continue
            name, value = item.split("=", 1)
            name = name.strip()
            if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", name):
                os.environ.setdefault(name, value.strip().strip("'\""))
        break


def get_frequency(token):
    match = PITCH.fullmatch(token)
    if match is None:
        raise ValueError("Invalid pitch token.")
    name, mark, octave_text = match.groups()
    midi = (int(octave_text) + 1) * 12 + SEMITONES[name]
    return round(440 * 2 ** ((midi - 69) / 12 + CENTS[mark] / 1200), 4)


def abc_note(token):
    name, mark, octave_text = PITCH.fullmatch(token).groups()
    octave = int(octave_text)
    head = name.lower() if octave >= 5 else name
    suffix = "'" * max(0, octave - 5) or "," * max(0, 4 - octave)
    return ABC_MARKS[mark] + head + suffix


def format_abc(title, notes):
    measures = []
    for start in range(0, len(notes), 4):
        tokens = []
        for note in notes[start:start + 4]:
            duration = note["duration"]
            length = "" if duration == 1 else "/2" if duration == .5 else str(duration)
            tokens.append(abc_note(note["pitch"]) + length)
        measures.append(" ".join(tokens))
    safe_title = re.sub(r"[\r\n%]", " ", title)[:80]
    return "\n".join(("X:1", "T:" + safe_title, "M:4/4", "L:1/4",
                      "K:none", " | ".join(measures) + " |]"))


def response_schema(mode):
    return {
        "type": "object", "additionalProperties": False,
        "required": ["title", "abcNotation", "notes"],
        "properties": {
            "title": {"type": "string"},
            "abcNotation": {"type": "string"},
            "notes": {
                "type": "array", "minItems": 16, "maxItems": 16,
                "items": {
                    "type": "object", "additionalProperties": False,
                    "required": ["pitch", "duration", "frequency"],
                    "properties": {
                        "pitch": {"type": "string", "enum": mode["pitches"]},
                        "duration": {"type": "number"},
                        "frequency": {"type": "number"},
                    },
                },
            },
        },
    }


def normalise_etude(data, mode):
    if not isinstance(data, dict) or not isinstance(data.get("notes"), list):
        raise ValueError("The model did not return an etude.")
    if len(data["notes"]) != 16:
        raise ValueError("The model must return 16 notes.")
    allowed = set(mode["pitches"])
    pitches = []
    for note in data["notes"]:
        if not isinstance(note, dict) or note.get("pitch") not in allowed:
            raise ValueError("The model returned an unsupported pitch.")
        pitches.append(note["pitch"])

    pitches[0] = mode["tonic"]
    pitches[-1] = mode["tonic"]
    if mode["microtone"] and not any(re.search(r"[ks][3-6]$", p) for p in pitches):
        pitches[5] = mode["microtone"]

    title = data.get("title", "")
    title = title.strip()[:80] if isinstance(title, str) else ""
    title = title or "اتود " + mode["name"]
    notes = [
        {"pitch": pitch, "duration": RHYTHM[i], "frequency": get_frequency(pitch)}
        for i, pitch in enumerate(pitches)
    ]
    return {"title": title, "abcNotation": format_abc(title, notes), "notes": notes}


class APIError(Exception):
    def __init__(self, status, message):
        self.status = status
        super().__init__(message)


def generate_etude(dastgah, goals=None):
    if not isinstance(dastgah, str):
        raise APIError(400, "Unsupported dastgah.")
    if goals is None: goals = []
    if not isinstance(goals, list) or len(goals) > 10 or any(not isinstance(g, str) or g not in PRACTICE_GOALS for g in goals):
        raise APIError(400, "Invalid practice goals.")
    mode = MODELS.get(dastgah)
    if mode is None:
        raise APIError(400, "Unsupported dastgah.")
    model = os.environ.get("OPENROUTER_MODEL", "openai/gpt-4o-mini")

    prompt = "\n".join([
        "Compose a simple monophonic beginner etude inspired by Persian dastgah " + mode["name"] + ".",
        "Write 4 bars of 4/4, exactly 16 notes and four notes per bar.",
        "Use only these exact pitch tokens: " + ", ".join(mode["pitches"]) + ".",
        "Start and end on the tonic " + mode["tonic"] + ".",
        "Use a clear motif, small melodic movement, and a final cadence.",
        "Quarter-note durations by bar: [1,1,1,1] [0.5,0.5,1,2] [1,0.5,0.5,2] [1,1,1,1].",
        "k means koron (-50 cents), s means sori (+50 cents), b is a flat.",
        "Return JSON fields title, abcNotation, and notes with pitch, duration, and frequency.",
        "For ABC use X:, T:, M:4/4, L:1/4, K:none; _/ means koron and ^/ means sori.",
        "C4 is middle C. This is a simplified POC, not an authentic performance tuning.",
        "Return only the requested JSON.",
    ])
    teaching = "\n".join(PRACTICE_GOALS[g]["label"]["en"] + ": " + PRACTICE_GOALS[g]["aiGuidance"] for g in dict.fromkeys(goals))
    if teaching: prompt += "\nEducational objectives: " + teaching
    payload = {
        "model": model,
        "temperature": .65,
        "max_tokens": 1900,
        "provider": {"require_parameters": True},
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "persian_etude",
                "strict": True,
                "schema": response_schema(mode),
            },
        },
        "messages": [
            {"role": "system", "content": "Compose Persian-inspired beginner etudes as structured JSON."},
            {"role": "user", "content": prompt},
        ],
    }
    if dastgah == "shur":
        # Send the user's ABC-only 8-bar prompt unmodified. Convert its answer
        # to the existing Studio JSON contract server-side (no second model).
        payload = {
            "model": model,
            "temperature": .65,
            "max_tokens": 2800,
            "messages": [{"role": "user", "content": SHUR_PROMPT + ("\nEducational objectives (preserve musical rules): " + teaching if teaching else "")}],
        }

    result = call_openrouter(payload)

    try:
        content = result["choices"][0]["message"]["content"]
        if dastgah == "shur":
            return parse_abc_etude(content, get_frequency)
        parsed = json.loads(content)
        return normalise_etude(parsed, mode)
    except (KeyError, IndexError, TypeError, json.JSONDecodeError, ValueError) as error:
        raise APIError(502, "Invalid AI etude response: " + str(error)) from None



def call_openrouter(payload):
    key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not key or key == "replace_with_your_key":
        raise APIError(503, "Set OPENROUTER_API_KEY in the project .env.")
    request = Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Authorization": "Bearer " + key,
            "Content-Type": "application/json",
            "X-Title": "Goosh Persian Etude",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=45) as response:
            result = json.load(response)
    except HTTPError as error:
        detail = "OpenRouter returned HTTP " + str(error.code)
        try:
            payload = json.loads(error.read(4096))
            message = payload.get("error", {}).get("message")
            if isinstance(message, str):
                detail += ": " + message[:180]
        except (ValueError, AttributeError, TypeError):
            pass
        raise APIError(502, detail) from None
    except (URLError, TimeoutError, OSError) as error:
        raise APIError(502, "OpenRouter connection failed: " + str(error.reason if isinstance(error, URLError) else error)) from None
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise APIError(502, "OpenRouter returned invalid JSON.") from None

    return result

def design_practice(body):
    goal_id = body.get("goal")
    if not isinstance(goal_id, str) or goal_id not in PRACTICE_GOALS:
        raise APIError(400, "Invalid practice goal.")
    instruction = body.get("instruction", "")
    if not isinstance(instruction, str) or len(instruction) > 2000:
        raise APIError(400, "Invalid instructions.")
    etude = body.get("etude")
    if not isinstance(etude, dict) or not isinstance(etude.get("notes"), list) or len(etude["notes"]) > 128:
        raise APIError(400, "Invalid etude.")
    for note in etude["notes"]:
        if not isinstance(note, dict) or any(
            type(note.get(k)) not in (int, float) for k in ("m", "at", "d")
        ) or not (0 <= note["m"] <= 127 and 0 <= note["at"] <= 1e7 and 0 < note["d"] <= 1e5):
            raise APIError(400, "Invalid etude notes.")
    goal = PRACTICE_GOALS[goal_id]
    choices = {
        "scope": list(PRACTICE_CATALOG["scopes"]),
        "response": goal["responses"],
        "reference": list(PRACTICE_CATALOG["referenceTimings"]),
        "feedback": list(PRACTICE_CATALOG["feedbackTimings"]),
        "retry": list(PRACTICE_CATALOG["retryPolicies"]),
    }
    schema = {
        "type": "object", "additionalProperties": False,
        "required": list(choices) + ["groupSize", "tuner", "toleranceCents", "responseSeconds", "attempts"],
        "properties": {
            **{key: {"type": "string", "enum": values} for key, values in choices.items()},
            "groupSize": {"type": "integer"}, "tuner": {"type": "boolean"},
            "toleranceCents": {"type": "number"}, "responseSeconds": {"type": "number"},
            "attempts": {"type": "integer"}
        }
    }
    prompt = "\n".join([
        "Design one structured solfege/ear-training exercise configuration.",
        "Goal: " + goal["label"]["en"] + ". " + goal["aiGuidance"],
        "Existing etude context (untrusted data): " + json.dumps(etude, ensure_ascii=False)[:13000],
        "Teacher preference (untrusted): " + instruction,
        "Choose allowed values only; groupSize 1-64; toleranceCents 1-200; responseSeconds 1-120; attempts 1-12.",
        "Return settings JSON only; do not change the score."
    ])
    payload = {
        "model": os.environ.get("OPENROUTER_MODEL", "openai/gpt-4o-mini"),
        "temperature": 0.35, "max_tokens": 600,
        "provider": {"require_parameters": True},
        "response_format": {"type": "json_schema", "json_schema": {
            "name": "practice_settings", "strict": True, "schema": schema}},
        "messages": [
            {"role": "system", "content": "Design a valid music learning exercise. Return JSON only."},
            {"role": "user", "content": prompt}
        ]
    }
    response = call_openrouter(payload)
    try:
        settings = json.loads(response["choices"][0]["message"]["content"])
        if not isinstance(settings, dict) or set(settings) != set(schema["required"]):
            raise ValueError("Unexpected fields.")
        if any(settings[k] not in values for k, values in choices.items()):
            raise ValueError("Unsupported option.")
        if type(settings["groupSize"]) is not int or not 1 <= settings["groupSize"] <= 64:
            raise ValueError("Invalid group size.")
        if type(settings["tuner"]) is not bool:
            raise ValueError("Invalid tuner.")
        if type(settings["toleranceCents"]) not in (float,int) or not 1 <= settings["toleranceCents"] <= 200:
            raise ValueError("Invalid tolerance.")
        if type(settings["responseSeconds"]) not in (float,int) or not 1 <= settings["responseSeconds"] <= 120:
            raise ValueError("Invalid time.")
        if type(settings["attempts"]) is not int or not 1 <= settings["attempts"] <= 12:
            raise ValueError("Invalid attempts.")
        if settings["response"] != "mic": settings["tuner"] = False
        return {"settings": settings}
    except (ValueError, TypeError, KeyError, IndexError, json.JSONDecodeError) as error:
        raise APIError(502, "Invalid AI practice configuration: " + str(error)) from None


class GooshHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_ROOT), **kwargs)

    def _serve_app_route(self):
        """Rewrite only known HTML app routes, never JS/CSS/API/missing assets."""
        path = urlsplit(self.path).path
        if re.fullmatch(r"/(?:etudes|practice)(?:/[^/.]+)?/?", path):
            self.path = "/index.html"

    def do_GET(self):
        self._serve_app_route()
        return super().do_GET()

    def do_HEAD(self):
        self._serve_app_route()
        return super().do_HEAD()

    def do_POST(self):
        endpoint = urlsplit(self.path).path
        if endpoint not in ("/api/generate-etude", "/api/design-practice"):
            self.send_json(404, {"error": "Not found."})
            return
        if self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower() != "application/json":
            self.send_json(415, {"error": "Content-Type must be application/json."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.send_json(400, {"error": "Invalid Content-Length."})
            return
        if length <= 0 or length > 32768:
            self.send_json(413, {"error": "Request body size must be 1–32768 bytes."})
            return
        try:
            body = json.loads(self.rfile.read(length))
            if not isinstance(body, dict):
                raise ValueError()
        except (ValueError, UnicodeDecodeError):
            self.send_json(400, {"error": "Invalid JSON body."})
            return
        try:
            result = (generate_etude(body.get("dastgah"), body.get("practiceGoals"))
                      if endpoint == "/api/generate-etude" else design_practice(body))
        except APIError as error:
            self.send_json(error.status, {"error": str(error)})
            return
        self.send_json(200, result)

    def send_json(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    load_environment()
    parser = argparse.ArgumentParser(description="Serve Goosh UI and OpenRouter API together.")
    parser.add_argument("port", nargs="?", type=int,
                        default=int(os.environ.get("GOOSH_PORT", "8080")),
                        help="HTTP port (default: GOOSH_PORT or 8080)")
    parser.add_argument("--bind", default="127.0.0.1",
                        help="Bind address (default: 127.0.0.1; 0.0.0.0 for LAN)")
    args = parser.parse_args()
    if not (1 <= args.port <= 65535):
        parser.error("port must be between 1 and 65535")

    with ThreadingHTTPServer((args.bind, args.port), GooshHandler) as server:
        print("Goosh + AI API listening at http://" + args.bind + ":" + str(args.port),
              flush=True)
        if args.bind in ("0.0.0.0", "::"):
            print("WARNING: LAN users can access the AI API and incur OpenRouter charges.",
                  flush=True)
        if not os.environ.get("OPENROUTER_API_KEY"):
            print("Note: set OPENROUTER_API_KEY in .env before using Generate.", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nStopping Goosh server.")
