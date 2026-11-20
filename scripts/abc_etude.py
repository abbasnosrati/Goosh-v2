"""Parse an ABC-only OpenRouter response into the existing JSON API contract.

This is a deliberately narrow, monophonic ABC subset for the fixed Shur /
Daramad-e Khara experiment, not a replacement for a general ABC parser.
"""
import re
from fractions import Fraction

# Sent to OpenRouter verbatim for the Shur experiment, with backticks restored.
# The model returns ABC; this module converts it into the JSON contract for Goosh.
SHUR_PROMPT = r"""You are a master Persian Classical Music composer. Generate an original, soulful free-meter etude in Dastgah-e Shur (Gusheh: Daramad-e Khara) using standard ABC Notation. Use expressive, variable-length phrases as in an improvisatory avaz; use approximately 8–12 phrase divisions, not uniform 4/4 measures.

STRICT RULES:
1. Do NOT copy the sample motif literally; use its rhythmic feel, phrasing, and modal gravity to compose a fresh etude.
2. Output ONLY valid ABC notation inside a code block (no explanations).
3. Use microtonal ABC syntax where needed: <BT>_<BT> for flat, <BT>^<BT> for sharp, <BT>_/<BT> for Koron (quarter-flat), <BT>^/<BT> for Sori (quarter-sharp).
4. Remember: In the target key signature below, B is Bb, E is Eb, and A is Ak (La Koron). Therefore, write plain <BT>A<BT> for La Koron, plain <BT>B<BT> for Bb, and explicitly write <BT>_/E<BT> when shifting to the variable note Mi Koron (Ek4).
5. Your original output MUST use X:, T:, M:none, L:1/16, and K:C _B _E _/A. Under M:none, barlines separate expressive phrases; their lengths may differ. Use rests and varied durations as expressive devices, not a fixed meter.
6. The reference sample below uses a different key spelling (K:Gm ^/A). Study only its contour, phrasing, pauses, and rhythmic expression. Do NOT copy its key signature or A-sori spelling into your output; the target uses A-koron and K:C _B _E _/A.
7. In ABC, <BT>G4<BT> means a G note with duration 4 units of L:1/16; the 4 is NOT an octave number. Use ABC uppercase note letters for the C4–Bb4 target range, and keep every played pitch within that range.

GUSHEH CONSTRAINTS (JSON):
{
  "id": "daramad_khara_shur",
  "dastgah": "shur_g",
  "name": "Daramad-e Khara",
  "abcKey": "K:C _B _E _/A",
  "aghaz": "G4",
  "shahed": "G4",
  "ist": "G4",
  "secondaryIst": "Ak4",
  "range": { "lowest": "C4", "highest": "Bb4" },
  "variableNotes": ["Ek4"],
  "sampleMotif": "X:1\nT:Goosheh - Shoor Sol\nM:none\nL:1/16\nQ:1/4=80\nK:Gm ^/A\nG4 | F G4 | F G4 | F G _/E F D2 |\nz _/E D _E F D _/E C2 | z4 |\nC D _/E F G4 |\nF G4 |\nC D _/E F G _/A _B4 _/A2 G8 |\n_/A4 |\nF G4 | G4 |]",
  "melodicRules": "Freely improvise fresh phrases inspired by the reference's sustained G anchors, silences, rubato-like rhythmic space and short stepwise runs. Alternate Eb4 and variable Ek4 in the C4-G4 lower tetrachord; build fresh climbs toward Bb4, pause on Ak4, and resolve to G4. Keep the melodic ideas ORIGINAL, not a transcription of the sample."
}""".replace("<BT>", chr(96))

ABC_NOTE = re.compile(
    r"(?P<acc>_/|\^/|__|\^\^|[_^=])?"
    r"(?P<name>[A-Ga-gzZxX])"
    r"(?P<oct>[',]*)"
    r"(?P<length>\d+(?:/\d*)?|/+\d*)?"
)
SIGNATURE = re.compile(r"(_/|\^/|__|\^\^|[_^=])([A-Ga-g])")
CHORD_OR_DECORATION = re.compile(r'"[^"]*"|![^!]*!|\+[^+]*\+|\{[^}]*\}')
BARLINE = re.compile(r"\|:|:\||\|\]|\[\||\|\||\|")
SHUR_NOTES = {"C4", "D4", "Eb4", "Ek4", "F4", "G4", "Ak4", "Bb4"}
ALTERATIONS = {"": "", "=": "", "_": "b", "__": "bb",
               "^": "#", "^^": "##", "_/": "k", "^/": "s"}


def _length(text):
    if not text:
        return Fraction(1)
    if text.startswith("/"):
        slash_count = len(text) - len(text.lstrip("/"))
        denominator = text[slash_count:]
        if denominator:
            if slash_count != 1:
                raise ValueError("Invalid ABC note length.")
            return Fraction(1, int(denominator))
        return Fraction(1, 2 ** slash_count)
    if "/" in text:
        numerator, denominator = text.split("/", 1)
        return Fraction(int(numerator), int(denominator or "2"))
    return Fraction(int(text))


def _pitch(letter, octave_marks, alteration):
    octave = 5 if letter.islower() else 4
    octave += octave_marks.count("'") - octave_marks.count(",")
    suffix = ALTERATIONS.get(alteration, alteration)
    return letter.upper() + suffix + str(octave)


def parse_abc_etude(raw_text, get_frequency):
    """Return {title, abcNotation, bars, totalBeats, notes} or raise ValueError.

    'notes' have pitch, duration in quarter-note beats, frequency, and atBeats
    so rests/phrasing are preserved while the existing frontend still uses
    native Goosh notes. This parser never executes or evaluates model output.
    """
    if not isinstance(raw_text, str) or len(raw_text) > 40000:
        raise ValueError("AI did not return a bounded ABC string.")

    fence = chr(96) * 3
    match = re.search(re.escape(fence) + r"(?:abc|text)?[ \t]*\n(.*?)"
                      + re.escape(fence), raw_text, flags=re.S | re.I)
    abc = match.group(1).strip() if match else raw_text.strip()
    if not abc or len(abc) > 20000:
        raise ValueError("AI returned empty or oversized ABC notation.")

    headers = {}
    music_lines = []
    for line in abc.replace("\r\n", "\n").splitlines():
        line = line.split("%", 1)[0].strip()
        if not line:
            continue
        header = re.match(r"^([A-Za-z]):\s*(.*)$", line)
        if header:
            headers[header.group(1).upper()] = header.group(2).strip()
        else:
            music_lines.append(line)

    key_text = headers.get("K", "")
    if not key_text:
        raise ValueError("ABC is missing the K: key signature.")
    # The supplied prompt explicitly uses these signature alterations.
    key = {}
    for mark, letter in SIGNATURE.findall(key_text):
        if mark not in ALTERATIONS or ALTERATIONS[mark] in ("bb", "##"):
            raise ValueError("Unsupported ABC key alteration.")
        key[letter.upper()] = mark
    if key.get("B") != "_" or key.get("E") != "_" or key.get("A") != "_/":
        raise ValueError("Expected K:C _B _E _/A for Daramad-e Khara.")

    meter = headers.get("M", "4/4").strip()
    free_meter = meter.lower() == "none"
    meter = "4/4" if meter == "C" else "2/2" if meter == "C|" else meter
    try:
        beats_per_bar = None if free_meter else Fraction(meter) * 4
        unit = Fraction(headers.get("L", "1/8")) * 4
    except (ValueError, ZeroDivisionError) as error:
        raise ValueError("Invalid ABC M: or L: header.") from error
    if (not free_meter and (beats_per_bar <= 0 or beats_per_bar > 16)) or unit <= 0 or unit > 4:
        raise ValueError("Unsupported meter or note unit.")

    music = " ".join(music_lines)
    music = CHORD_OR_DECORATION.sub("", music)
    # Strip common dynamic markers and avoid interpreting bracketed chords as notes.
    if re.search(r"\[[A-Ga-g][A-Ga-g]", music):
        raise ValueError("Polyphonic ABC chords are unsupported.")
    bars = [part.strip() for part in BARLINE.split(music) if part.strip()]
    if free_meter:
        if not 4 <= len(bars) <= 24:
            raise ValueError("Expected 4–24 free-meter phrases, received " + str(len(bars)) + ".")
    elif len(bars) != 8:
        raise ValueError("Expected exactly 8 ABC measures, received " + str(len(bars)) + ".")

    title = headers.get("T", "Daramad-e Khara - Shur").strip()[:80]
    if not title:
        title = "Daramad-e Khara - Shur"

    notes = []
    position = Fraction(0)
    for bar_index, bar in enumerate(bars):
        carry = {}
        bar_duration = Fraction(0)
        cursor = 0
        tuplet_remaining = 0
        tuplet_factor = Fraction(1)
        while cursor < len(bar):
            ch = bar[cursor]
            if ch == "(" and cursor + 1 < len(bar) and bar[cursor+1].isdigit():
                # A standard triplet occupies the duration of two notes.
                # Also recognize common duplets and quadruplets.
                n = int(bar[cursor+1])
                if n not in (2, 3, 4) or tuplet_remaining:
                    raise ValueError("Unsupported nested ABC tuplet.")
                tuplet_remaining = n
                tuplet_factor = {2: Fraction(3, 2), 3: Fraction(2, 3),
                                 4: Fraction(3, 4)}[n]
                cursor += 2
                continue
            if ch.isspace() or ch in "().":
                cursor += 1
                continue
            match_note = ABC_NOTE.match(bar, cursor)
            if not match_note:
                raise ValueError("Unsupported ABC token in bar " + str(bar_index + 1)
                                 + ": " + bar[cursor:cursor+12])
            cursor = match_note.end()
            token = match_note.groupdict()
            duration = _length(token["length"]) * unit
            if tuplet_remaining:
                duration *= tuplet_factor
                tuplet_remaining -= 1
            if duration <= 0:
                raise ValueError("ABC note duration must be positive.")

            letter = token["name"]
            if letter not in "zZxX":
                octave_marks = token["oct"]
                octave = (5 if letter.islower() else 4) + octave_marks.count("'") - octave_marks.count(",")
                key_id = (letter.upper(), octave)
                if token["acc"] is not None:
                    carry[key_id] = token["acc"]
                accidental = carry.get(key_id, key.get(letter.upper(), ""))
                pitch = _pitch(letter, octave_marks, accidental)
                if pitch not in SHUR_NOTES:
                    raise ValueError("Pitch outside C4-Bb4 Shur preset: " + pitch)
                notes.append({
                    "pitch": pitch,
                    "duration": float(duration),
                    "frequency": get_frequency(pitch),
                    "atBeats": float(position),
                })
            position += duration
            bar_duration += duration

        if tuplet_remaining:
            raise ValueError("Incomplete ABC tuplet in bar " + str(bar_index + 1))
        if not free_meter and bar_duration != beats_per_bar:
            raise ValueError("Bar " + str(bar_index + 1)
                             + " does not match the declared meter ("
                             + str(float(bar_duration)) + " vs "
                             + str(float(beats_per_bar)) + " beats).")

    if not notes:
        raise ValueError("Generated etude contains no notes.")
    if len(notes) > 256 or position > 256:
        raise ValueError("Generated etude exceeds note or duration limits.")

    return {
        "title": title,
        "abcNotation": abc,
        "bars": len(bars),
        "totalBeats": float(position),
        "notes": notes,
    }
