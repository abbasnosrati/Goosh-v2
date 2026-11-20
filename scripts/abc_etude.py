
"""Parse an ABC-only OpenRouter response into the existing JSON API contract.

This is a deliberately narrow, monophonic ABC subset for the fixed Shur /
Daramad-e Khara experiment, not a replacement for a general ABC parser.
"""

import re
from fractions import Fraction


# Sent to OpenRouter verbatim for the Shur experiment.
# The model returns ABC; this module converts it into
# the existing JSON contract for Goosh.

SHUR_PROMPT = r"""You are a master Persian Classical Music composer.

Generate an original, soulful free-meter etude in Dastgah-e Shur
(Gusheh: Daramad-e Khara) using standard ABC Notation.

Follow the etudeSettings and gushehData provided below.

Compose between 4 and 20 expressive, variable-length phrases at intermediate
difficulty, with natural rubato-like phrasing and no fixed meter.

STRICT RULES:

1. Do NOT copy the sample motif literally. Use its rhythmic feel,
   phrasing, melodic contour, and modal gravity to compose a fresh etude.

2. Output ONLY valid ABC notation inside a code block.
   Do not include explanations or additional text.

3. Use microtonal ABC syntax where needed:
   <BT>_<BT> for flat,
   <BT>^<BT> for sharp,
   <BT>_/<BT> for Koron (quarter-flat),
   <BT>^/<BT> for Sori (quarter-sharp).

4. The target key signature is K:C _B _E _/A.

   Therefore:
   - Plain A represents A Koron (Ak4).
   - Plain B represents B Flat (Bb4).
   - Plain E represents E Flat (Eb4).
   - Explicit _/E represents E Koron (Ek4).

   Use the key signature consistently.
   Alternate Eb4 and Ek4 where musically appropriate.

5. Your original output MUST include these ABC headers:

   X:1
   T:<original etude title>
   M:none
   L:1/16
   Q:1/4=60
   K:C _B _E _/A

   Write between 4 and 20 expressive phrases separated by barlines.
   The phrases may have different durations.

   Under M:none, barlines represent expressive phrase divisions,
   not fixed-length measures.

   Use rests, sustained notes, and varied note durations naturally.

6. Study the reference sample only for its melodic contour,
   phrasing, pauses, and rhythmic expression.

   Compose an ORIGINAL etude, not a transcription.

   Interpret unaltered A, B, and E notes according to
   the target key signature.

7. Keep every played pitch between C4 and C5 inclusive.

   In ABC notation:
   - Uppercase C through B represent octave 4.
   - Lowercase c represents C5.
   - A number after a note represents duration, NOT octave.
   - G4 means pitch G4 lasting four units of L:1/16.
   - Use lowercase c for pitch C5.

8. Respect the melodic identity of Daramad-e Khara.

   - Begin around G4 as the melodic anchor.
   - Use F4-G4 lower-neighbor movements.
   - Explore the lower tetrachord down to C4.
   - Alternate deliberately between Eb4 and Ek4.
   - Develop ascending melodic gestures toward Bb4 or C5.
   - Treat Ak4 as a secondary resting point.
   - Resolve naturally and clearly to G4.

9. Difficulty must remain intermediate.

   Use expressive rhythmic variation, melodic development,
   and tasteful ornamentation without excessive complexity.

10. Preserve the musical character of a free-meter Persian avaz.

    Do not impose uniform 4/4 phrasing.
    Do not make every phrase the same length.
    Do not mechanically repeat the reference motif.


GUSHEH CONSTRAINTS & SETTINGS (JSON):

{
  "etudeSettings": {
    "meter": "none",
    "unitNoteLength": "1/16",
    "tempo": "1/4=60",
    "phraseCountRange": { "min": 4, "max": 20 },
    "difficulty": "intermediate"
  },
  "gushehData": {
    "id": "daramad_khara_shur",
    "dastgah": "shur_g",
    "name": "Daramad-e Khara",
    "abcKey": "K:C _B _E _/A",
    "aghaz": "G4",
    "shahed": "G4",
    "ist": "G4",
    "secondaryIst": "Ak4",
    "forood": "G4",
    "range": {
      "lowest": "C4",
      "highest": "C5"
    },
    "variableNotes": ["Ek4"],
    "sampleMotif": "L:1/16\nQ:1/4=60\nG4 F G4 | F G4 | F G _/E F D2 | z _/E D E F D _/E C2 | z4 | C D _/E F G4 | F G4 | C D _/E F G A B4 A2 G8 | A4 | F G4 G4 |]",
    "melodicRules": "Begin with anchored G4 motifs featuring quick lower-neighbor pickup notes (F4-G4). Descend into the lower tetrachord (G4 down to C4) alternating deliberately between Mi Koron (Ek4) and Mi Flat (Eb4) with brief rests between phrases. Ascend rapidly from C4 through Ek4, F4, G4, and Ak4 up to Bb4 (or touching C5), pause distinctly on La Koron (Ak4) as a secondary stop, and resolve cleanly via F4-G4 onto G4."
  }
}

OUTPUT REQUIREMENT:

Return one complete ABC notation block containing exactly
4 to 20 musical phrases.

The final phrase must resolve to G4.

Do not return JSON.
Do not return Markdown explanations.
Do not include any text outside the ABC code block.

""".replace("<BT>", chr(96))


ABC_NOTE = re.compile(
    r"(?P<acc>_/|\^/|__|\^\^|[_^=])?"
    r"(?P<name>[A-Ga-gzZxX])"
    r"(?P<oct>[',]*)"
    r"(?P<length>\d+(?:/\d*)?|/+\d*)?"
)

SIGNATURE = re.compile(
    r"(_/|\^/|__|\^\^|[_^=])([A-Ga-g])"
)

CHORD_OR_DECORATION = re.compile(
    r'"[^"]*"|![^!]*!|\+[^+]*\+|\{[^}]*\}'
)

BARLINE = re.compile(
    r"\|:|:\||\|\]|\[\||\|\||\|"
)


# Allowed pitches for the Shur / Daramad-e Khara experiment.
# Updated upper range: C5 instead of Bb4.

SHUR_NOTES = {
    "C4",
    "D4",
    "Eb4",
    "Ek4",
    "F4",
    "G4",
    "Ak4",
    "Bb4",
    "C5",
}


ALTERATIONS = {
    "": "",
    "=": "",
    "_": "b",
    "__": "bb",
    "^": "#",
    "^^": "##",
    "_/": "k",
    "^/": "s",
}


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
        return Fraction(
            int(numerator),
            int(denominator or "2")
        )

    return Fraction(int(text))


def _pitch(letter, octave_marks, alteration):
    octave = 5 if letter.islower() else 4

    octave += (
        octave_marks.count("'")
        - octave_marks.count(",")
    )

    suffix = ALTERATIONS.get(alteration, alteration)

    return letter.upper() + suffix + str(octave)


def parse_abc_etude(raw_text, get_frequency):
    """Return {title, abcNotation, bars, totalBeats, notes} or raise ValueError.

    Notes have:
    - pitch
    - duration in quarter-note beats
    - frequency
    - atBeats

    Rests and phrasing are preserved while the frontend
    continues to use native Goosh notes.

    This parser never executes or evaluates model output.
    """

    if not isinstance(raw_text, str) or len(raw_text) > 40000:
        raise ValueError(
            "AI did not return a bounded ABC string."
        )

    fence = chr(96) * 3

    match = re.search(
        re.escape(fence)
        + r"(?:abc|text)?[ \t]*\n(.*?)"
        + re.escape(fence),
        raw_text,
        flags=re.S | re.I
    )

    abc = (
        match.group(1).strip()
        if match
        else raw_text.strip()
    )

    if not abc or len(abc) > 20000:
        raise ValueError(
            "AI returned empty or oversized ABC notation."
        )

    headers = {}
    music_lines = []

    for line in abc.replace("\r\n", "\n").splitlines():
        line = line.split("%", 1)[0].strip()

        if not line:
            continue

        header = re.match(
            r"^([A-Za-z]):\s*(.*)$",
            line
        )

        if header:
            headers[header.group(1).upper()] = (
                header.group(2).strip()
            )
        else:
            music_lines.append(line)

    key_text = headers.get("K", "")

    if not key_text:
        raise ValueError(
            "ABC is missing the K: key signature."
        )

    # The supplied prompt explicitly uses these
    # signature alterations.

    key = {}

    for mark, letter in SIGNATURE.findall(key_text):
        if (
            mark not in ALTERATIONS
            or ALTERATIONS[mark] in ("bb", "##")
        ):
            raise ValueError(
                "Unsupported ABC key alteration."
            )

        key[letter.upper()] = mark

    if (
        key.get("B") != "_"
        or key.get("E") != "_"
        or key.get("A") != "_/"
    ):
        raise ValueError(
            "Expected K:C _B _E _/A "
            "for Daramad-e Khara."
        )

    meter = headers.get("M", "4/4").strip()

    free_meter = meter.lower() == "none"

    meter = (
        "4/4" if meter == "C"
        else "2/2" if meter == "C|"
        else meter
    )

    try:
        beats_per_bar = (
            None
            if free_meter
            else Fraction(meter) * 4
        )

        unit = (
            Fraction(headers.get("L", "1/8")) * 4
        )

    except (ValueError, ZeroDivisionError) as error:
        raise ValueError(
            "Invalid ABC M: or L: header."
        ) from error

    if (
        (
            not free_meter
            and (
                beats_per_bar <= 0
                or beats_per_bar > 16
            )
        )
        or unit <= 0
        or unit > 4
    ):
        raise ValueError(
            "Unsupported meter or note unit."
        )

    music = " ".join(music_lines)

    music = CHORD_OR_DECORATION.sub(
        "",
        music
    )

    # Strip common dynamic markers and avoid
    # interpreting bracketed chords as notes.

    if re.search(r"\[[A-Ga-g][A-Ga-g]", music):
        raise ValueError(
            "Polyphonic ABC chords are unsupported."
        )

    bars = [
        part.strip()
        for part in BARLINE.split(music)
        if part.strip()
    ]

    # Updated phrase count for the Shur experiment.

    if free_meter:
        # A creative phrase-count RANGE is not a fixed number of bars.
        # M:none groups may have unequal durations, including rests.
        if not 4 <= len(bars) <= 20:
            raise ValueError(
                "Expected 4–20 free-meter phrases, "
                "received " + str(len(bars)) + "."
            )

    elif len(bars) != 8:
        raise ValueError(
            "Expected exactly 8 ABC measures, "
            "received " + str(len(bars)) + "."
        )

    title = headers.get(
        "T",
        "Daramad-e Khara - Shur"
    ).strip()[:80]

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

            if (
                ch == "("
                and cursor + 1 < len(bar)
                and bar[cursor + 1].isdigit()
            ):
                # Standard triplet occupies the duration
                # of two notes.
                # Also recognize common duplets and
                # quadruplets.

                n = int(bar[cursor + 1])

                if n not in (2, 3, 4) or tuplet_remaining:
                    raise ValueError(
                        "Unsupported nested ABC tuplet."
                    )

                tuplet_remaining = n

                tuplet_factor = {
                    2: Fraction(3, 2),
                    3: Fraction(2, 3),
                    4: Fraction(3, 4),
                }[n]

                cursor += 2
                continue

            if ch.isspace() or ch in "().":
                cursor += 1
                continue

            match_note = ABC_NOTE.match(
                bar,
                cursor
            )

            if not match_note:
                raise ValueError(
                    "Unsupported ABC token in bar "
                    + str(bar_index + 1)
                    + ": "
                    + bar[cursor:cursor + 12]
                )

            cursor = match_note.end()
            token = match_note.groupdict()

            duration = (
                _length(token["length"]) * unit
            )

            if tuplet_remaining:
                duration *= tuplet_factor
                tuplet_remaining -= 1

            if duration <= 0:
                raise ValueError(
                    "ABC note duration must be positive."
                )

            letter = token["name"]

            if letter not in "zZxX":
                octave_marks = token["oct"]

                octave = (
                    (5 if letter.islower() else 4)
                    + octave_marks.count("'")
                    - octave_marks.count(",")
                )

                key_id = (
                    letter.upper(),
                    octave
                )

                if token["acc"] is not None:
                    carry[key_id] = token["acc"]

                accidental = carry.get(
                    key_id,
                    key.get(letter.upper(), "")
                )

                pitch = _pitch(
                    letter,
                    octave_marks,
                    accidental
                )

                if pitch not in SHUR_NOTES:
                    raise ValueError(
                        "Pitch outside C4-C5 Shur preset: "
                        + pitch
                    )

                notes.append({
                    "pitch": pitch,
                    "duration": float(duration),
                    "frequency": get_frequency(pitch),
                    "atBeats": float(position),
                })

            position += duration
            bar_duration += duration

        if tuplet_remaining:
            raise ValueError(
                "Incomplete ABC tuplet in bar "
                + str(bar_index + 1)
            )

        if (
            not free_meter
            and bar_duration != beats_per_bar
        ):
            raise ValueError(
                "Bar "
                + str(bar_index + 1)
                + " does not match the declared meter ("
                + str(float(bar_duration))
                + " vs "
                + str(float(beats_per_bar))
                + " beats)."
            )

    if not notes:
        raise ValueError(
            "Generated etude contains no notes."
        )

    if len(notes) > 256 or position > 256:
        raise ValueError(
            "Generated etude exceeds note "
            "or duration limits."
        )

    return {
        "title": title,
        "abcNotation": abc,
        "bars": len(bars),
        "totalBeats": float(position),
        "notes": notes,
    }
