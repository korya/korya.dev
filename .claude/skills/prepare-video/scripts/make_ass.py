#!/usr/bin/env python3
"""Turn whisper word-timestamp JSON into karaoke-style ASS captions.

    python3 make_ass.py transcript.json out.ass --layout vertical

Two layouts, because a caption tuned for a 1080x1920 phone frame is the wrong
size and shape for a 1920x1080 YouTube frame. See LAYOUTS below.
"""

import argparse
import json
import re

# --- Look -------------------------------------------------------------------

FONT = "Avenir Next Heavy"   # resolves to AvenirNext-Heavy via coretext

BASE_WHITE = (255, 255, 255)
BASE_ACCENT = (255, 201, 51)   # #FFC933 amber

# libass renders SDR-referenced RGB. Burned into an HLG frame, #FFFFFF lands at
# HLG *peak* (~1000 nits) instead of diffuse white (~100 nits) — and every
# tone-mapper desaturates its top end, so the amber highlight collapses to white
# for any SDR viewer. Verified: at 100% the karaoke cue is invisible after
# tonemap=hable; at 60% it survives. Scale colours down for HDR output.
TONE_SCALE = {"sdr": 1.00, "hlg": 0.60}


def ass_colour(rgb, scale):
    """ASS colours are &HAABBGGRR — reverse of the usual RGB order."""
    r, g, b = (min(255, round(c * scale)) for c in rgb)
    return f"&H00{b:02X}{g:02X}{r:02X}&"

LAYOUTS = {
    # Phone-first: big type, parked high enough to clear Reels/TikTok UI chrome.
    "vertical": {
        "play_w": 1080, "play_h": 1920,
        "font_size": 78, "outline": 6, "shadow": 4,
        "margin_v": 420, "margin_lr": 80,
        "max_words": 4, "max_chars": 24,
    },
    # 16:9: the subject occupies only the centre ~608px strip, so captions may
    # run wider than the strip and sit over the blurred panels. That reads as
    # deliberate. Smaller type: 1080px of height is half the vertical frame.
    "horizontal": {
        "play_w": 1920, "play_h": 1080,
        "font_size": 62, "outline": 5, "shadow": 3,
        "margin_v": 90, "margin_lr": 260,
        "max_words": 6, "max_chars": 40,
    },
}

# --- Speech cleanup ---------------------------------------------------------

# Multi-word filler, matched on the normalised token stream.
FILLER_PHRASES = [
    ("you", "know"),
    ("i", "mean"),
    ("i", "dont", "know"),
    ("kind", "of"),
    ("sort", "of"),
    ("blah", "blah"),
]

# Single tokens dropped wherever they appear.
FILLER_WORDS = {"um", "uh", "erm", "basically", "actually"}

# Discourse markers: filler only in their comma-fenced form.
# "like," is filler; "like a novel" is not.
COMMA_FENCED = {"like", "well", "right", "so"}

GAP_BREAK = 0.45     # silence longer than this starts a new line
HOLD_TAIL = 0.30     # keep a line's last word up this long after it ends


def norm(word):
    return re.sub(r"[^a-z]", "", word.lower())


def load_words(path):
    data = json.load(open(path))
    words = []
    for seg in data["segments"]:
        for w in seg.get("words", []):
            raw = w["word"].strip()
            if raw:
                words.append({"raw": raw, "n": norm(raw),
                              "start": w["start"], "end": w["end"]})
    return words


def strip_fillers(words, drop_at=(), keep_at=(), respell=None):
    """Remove filler. drop_at/keep_at are word start times for per-video overrides.

    Generic false-start detection was tried and rejected: it cannot tell a
    stumble ("the most, the simplest") from deliberate parallel phrasing
    ("your query, your text, your question"), and silently ate the latter.
    Per-video false starts go in drop_at instead.
    """
    drop_at, keep_at = set(drop_at), set(keep_at)
    out, i = [], 0
    while i < len(words):
        w = words[i]

        if w["start"] in drop_at:
            i += 1
            continue
        if w["start"] in keep_at:
            out.append(dict(w))
            i += 1
            continue

        matched = 0
        for phrase in FILLER_PHRASES:
            span = words[i:i + len(phrase)]
            if tuple(x["n"] for x in span) == phrase:
                if any(x["start"] in keep_at for x in span):
                    break
                matched = len(phrase)
                break
        if matched:
            i += matched
            continue

        if w["n"] in FILLER_WORDS:
            i += 1
            continue

        if w["n"] in COMMA_FENCED and re.search(r"[?,]$", w["raw"]):
            i += 1
            continue

        # stutters: "to, to, to" / "homomorphism, homomorphism"
        if out and out[-1]["n"] == w["n"]:
            out[-1]["end"] = w["end"]
            i += 1
            continue

        out.append(dict(w))
        i += 1
    return out


def clean_text(raw, respell):
    """Social-caption punctuation: keep ? and !, drop the rest."""
    t = raw.replace("...", "").strip()
    t = re.sub(r"[.,;:\"“”]+$", "", t).replace(",", "").strip()
    fixed = respell.get(t.lower())
    if fixed:
        t = fixed.capitalize() if t[:1].isupper() else fixed
    return t


def group_lines(words, cfg, respell):
    lines, cur = [], []
    for w in words:
        w = dict(w)
        w["text"] = clean_text(w["raw"], respell)
        if not w["text"]:
            continue
        if cur:
            gap = w["start"] - cur[-1]["end"]
            width = sum(len(x["text"]) + 1 for x in cur) + len(w["text"])
            hard_stop = re.search(r"[.?!]$", cur[-1]["raw"])
            if (gap > GAP_BREAK or len(cur) >= cfg["max_words"]
                    or width > cfg["max_chars"] or hard_stop):
                lines.append(cur)
                cur = []
        cur.append(w)
    if cur:
        lines.append(cur)
    return lines


def merge_orphans(lines, cfg):
    """A lone word hanging on screen for seconds reads as a stumble; fold it back."""
    out = []
    for line in lines:
        if out and len(line) == 1:
            prev = out[-1]
            gap = line[0]["start"] - prev[-1]["end"]
            width = sum(len(x["text"]) + 1 for x in prev) + len(line[0]["text"])
            if (gap < 0.4 and not re.search(r"[.?!]$", prev[-1]["raw"])
                    and len(prev) < cfg["max_words"] + 1
                    and width <= cfg["max_chars"] + 4):
                prev.extend(line)
                continue
        out.append(line)
    return out


def ts(t):
    t = max(t, 0)
    h, rem = divmod(t, 3600)
    m, s = divmod(rem, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


def header(cfg, white):
    return f"""[Script Info]
ScriptType: v4.00+
PlayResX: {cfg['play_w']}
PlayResY: {cfg['play_h']}
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Pop,{FONT},{cfg['font_size']},{white.rstrip('&')},{white.rstrip('&')},&H00000000,&H96000000,0,0,0,0,100,100,1,0,1,{cfg['outline']},{cfg['shadow']},2,{cfg['margin_lr']},{cfg['margin_lr']},{cfg['margin_v']},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


def build_events(lines, white, accent):
    """One Dialogue per word: the whole line, with the active word recoloured."""
    ev = []
    for li, line in enumerate(lines):
        line_end = line[-1]["end"] + HOLD_TAIL
        if li + 1 < len(lines):
            line_end = min(line_end, lines[li + 1][0]["start"])
        line_end = max(line_end, line[-1]["end"])

        for wi, w in enumerate(line):
            start = w["start"]
            end = line[wi + 1]["start"] if wi + 1 < len(line) else line_end
            if end <= start:
                end = start + 0.08
            parts = [
                f"{{\\c{accent}}}{x['text']}{{\\c{white}}}" if k == wi else x["text"]
                for k, x in enumerate(line)
            ]
            ev.append(f"Dialogue: 0,{ts(start)},{ts(end)},Pop,,0,0,0,,{' '.join(parts)}")
    return ev


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("json_in")
    ap.add_argument("ass_out")
    ap.add_argument("--layout", choices=sorted(LAYOUTS), default="vertical")
    ap.add_argument("--tone", choices=sorted(TONE_SCALE), default="sdr",
                    help="hlg = scale colours for HDR output so the highlight "
                         "survives tone-mapping to SDR")
    ap.add_argument("--drop-at", type=float, nargs="*", default=[],
                    help="word start times to force-drop (false starts)")
    ap.add_argument("--keep-at", type=float, nargs="*", default=[],
                    help="word start times to protect from filler rules")
    ap.add_argument("--respell", nargs="*", default=[], metavar="WRONG=RIGHT",
                    help="fix mishearings, e.g. contacts=context")
    args = ap.parse_args()

    cfg = LAYOUTS[args.layout]
    respell = dict(p.split("=", 1) for p in args.respell)
    scale = TONE_SCALE[args.tone]
    white, accent = ass_colour(BASE_WHITE, scale), ass_colour(BASE_ACCENT, scale)

    words = strip_fillers(load_words(args.json_in), args.drop_at, args.keep_at)
    lines = merge_orphans(group_lines(words, cfg, respell), cfg)

    with open(args.ass_out, "w") as f:
        f.write(header(cfg, white))
        f.write("\n".join(build_events(lines, white, accent)) + "\n")

    print(f"{args.layout}/{args.tone}: {len(lines)} lines, {len(words)} words "
          f"-> {args.ass_out}\n")
    for line in lines:
        print(f"  [{line[0]['start']:7.2f}] {' '.join(w['text'] for w in line)}")


if __name__ == "__main__":
    main()
