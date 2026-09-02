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

# Visible-correction annotation: the misheard word is struck through and the
# correction is drawn above it, centred on the struck word. Centring needs real
# glyph advances, so we measure with the same face libass will use.
MEASURE_TTC = ("/System/Library/Fonts/Avenir Next.ttc", 8)   # index 8 = Heavy
CORRECT_SIZE = 0.72    # of the caption font size
CORRECT_TILT = 4       # degrees; reads as a proofreader's mark, not a 2nd line

# --- Animation ---------------------------------------------------------------
# Events are emitted one-per-word (see build_events), so a line-level effect
# must fire only on the first word-event of a line -- applied per event it would
# re-trigger on every word and strobe the whole line.
# Durations are targets, not guarantees: an effect lives inside a single
# Dialogue event, so it dies the moment the next word starts. Median word event
# is ~340ms but the 10th percentile is ~140ms, so every duration below is
# clamped to its own event (see _budget) -- unclamped, a short line would snap
# from half-faded to full when the next word rendered. Anything under ~150ms is
# 4 frames at 30fps and reads as an instant cut, which is why these are large.
FADE_MS = 300          # line fade-in
EASE_MS = 260          # white -> accent colour ease on the active word
POP_UP, POP_MS = 130, 340  # active-word bounce: up by POP_UP ms, home by POP_MS
POP_PCT = 120          # peak \fscy. VERTICAL ONLY: \fscx would change the
                       # glyph advance and shove the rest of the line sideways.
                       # \fscy still nudges the baseline ~0.5px (line box grows).
RISE_PX, RISE_MS = 28, 300  # line slides up into place
BLUR_START, BLUR_MS = 12, 280
ANIMS = ("fade", "pop", "ease", "rise", "blur")
# Chosen by eye against rendered samples: fade+ease+pop reads as "alive" without
# reading as "animated". rise and blur are real but stay opt-in -- rise is the
# most visible single effect and gets busy over a caption-dense cut.
DEFAULT_ANIM = "fade,ease,pop"


def _budget(ms, event_ms):
    """Clamp an effect to the event that hosts it, so it always completes."""
    return max(1, int(min(ms, event_ms)))


def text_width(text, size, spacing):
    """Advance width in PlayRes px, matching libass's Spacing handling.

    libass sizes fonts VSFilter-style: `fs` is the *cell height*
    (ascent + descent), not the em size PIL uses — Avenir Next Heavy's cell is
    1.37 em, so unscaled PIL advances run ~37% wide and centring lands off the
    word. Scale by fs/cell. Spacing is added per char in ASS px, unscaled.
    """
    from PIL import ImageFont
    key = (MEASURE_TTC, size)
    font = text_width._cache.get(key)
    if font is None:
        font = ImageFont.truetype(MEASURE_TTC[0], size, index=MEASURE_TTC[1])
        text_width._cache[key] = font
    ascent, descent = font.getmetrics()
    return font.getlength(text) * size / (ascent + descent) + spacing * len(text)


text_width._cache = {}

LAYOUTS = {
    # Phone-first: big type, parked high enough to clear the caption overlay and
    # button rail that Shorts puts over the lower frame. LinkedIn's feed chrome is
    # lighter, so a Shorts-safe margin is safe there too.
    "vertical": {
        "play_w": 1080, "play_h": 1920,
        "font_size": 152, "outline": 12, "shadow": 7,
        "margin_v": 420, "margin_lr": 40,
        "max_words": 4, "max_chars": 10,
    },
    # 16:9: the subject occupies only the centre ~608px strip, so captions may
    # run wider than the strip and sit over the blurred panels. That reads as
    # deliberate. Smaller type: 1080px of height is half the vertical frame.
    "horizontal": {
        "play_w": 1920, "play_h": 1080,
        "font_size": 122, "outline": 9, "shadow": 6,
        "margin_v": 90, "margin_lr": 120,
        "max_words": 6, "max_chars": 30,
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

SPACING = 1          # ASS letter spacing; text_width must match the style
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
    # Match on 2dp, not exact floats. Whisper emits values like
    # 206.82000000000002, so an exact `in` test silently misses the word the
    # caller asked to drop -- and a silent miss looks like the flag was ignored.
    drop_at = {round(t, 2) for t in drop_at}
    keep_at = {round(t, 2) for t in keep_at}
    out, i = [], 0
    while i < len(words):
        w = words[i]
        at = round(w["start"], 2)

        if at in drop_at:
            i += 1
            continue
        if at in keep_at:
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


def group_lines(words, cfg, respell, corrections=None):
    lines, cur = [], []
    for w in words:
        w = dict(w)
        w["text"] = clean_text(w["raw"], respell)
        w["correct"] = (corrections or {}).get(w["start"])
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
Style: Pop,{FONT},{cfg['font_size']},{white.rstrip('&')},{white.rstrip('&')},&H00000000,&H96000000,0,0,0,0,100,100,{SPACING},0,1,{cfg['outline']},{cfg['shadow']},2,{cfg['margin_lr']},{cfg['margin_lr']},{cfg['margin_v']},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


def correction_pos(line, ci, cfg):
    """Centre of the struck word, and a y one line above it, in PlayRes px.

    The style is bottom-centre with equal L/R margins, so the line is centred on
    play_w regardless of its width — measure the line, the run before the word,
    and the word itself, then walk in from the left edge of the line box.
    """
    size, spacing = cfg["font_size"], SPACING
    texts = [w["text"] for w in line]
    line_w = text_width(" ".join(texts), size, spacing)
    prefix_w = text_width(" ".join(texts[:ci]) + " ", size, spacing) if ci else 0
    word_w = text_width(texts[ci], size, spacing)

    x = cfg["play_w"] / 2 - line_w / 2 + prefix_w + word_w / 2
    # Caption cell spans fs px up from the bottom margin; park the correction's
    # midline just above that so it kisses the ascenders without covering them.
    y = cfg["play_h"] - cfg["margin_v"] - size - CORRECT_SIZE * size * 0.45
    return round(x), round(y)


def build_events(lines, white, accent, cfg, anim=(), pop_pct=POP_PCT):
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
            ev_ms = (end - start) * 1000
            parts = []
            for k, x in enumerate(line):
                t = x["text"]
                # The strike lands only once the word has been said, so the
                # correction reads as a live retraction rather than a footnote.
                if x["correct"] and k <= wi:
                    t = f"{{\\s1}}{t}{{\\s0}}"
                if k == wi:
                    on = (f"\\c{white}\\t(0,{_budget(EASE_MS, ev_ms)},"
                          f"\\c{accent})" if "ease" in anim
                          else f"\\c{accent}")
                    off = f"\\c{white}"
                    if "pop" in anim:
                        # Scale the whole bounce so it lands home in time.
                        f = min(1.0, ev_ms / POP_MS)
                        up, home = max(1, int(POP_UP * f)), _budget(POP_MS, ev_ms)
                        on += (f"\\fscy100\\t(0,{up},\\fscy{pop_pct})"
                               f"\\t({up},{home},\\fscy100)")
                        off += "\\fscy100"
                    t = f"{{{on}}}{t}{{{off}}}"
                parts.append(t)
            pre = ""
            if wi == 0:
                if "fade" in anim:
                    pre += f"\\fad({_budget(FADE_MS, ev_ms)},0)"
                if "blur" in anim:
                    pre += (f"\\blur{BLUR_START}"
                            f"\\t(0,{_budget(BLUR_MS, ev_ms)},\\blur0)")
                if "rise" in anim:
                    cx, cy = cfg["play_w"] // 2, cfg["play_h"] - cfg["margin_v"]
                    pre += (f"\\move({cx},{cy + RISE_PX},{cx},{cy},"
                            f"0,{_budget(RISE_MS, ev_ms)})")
            elif "rise" in anim:
                cx, cy = cfg["play_w"] // 2, cfg["play_h"] - cfg["margin_v"]
                pre += f"\\pos({cx},{cy})"
            body = (f"{{{pre}}}" if pre else "") + " ".join(parts)
            ev.append(f"Dialogue: 0,{ts(start)},{ts(end)},Pop,,0,0,0,,{body}")

        for ci, w in enumerate(line):
            if not w["correct"]:
                continue
            x, y = correction_pos(line, ci, cfg)
            size = round(cfg["font_size"] * CORRECT_SIZE)
            ev.append(
                f"Dialogue: 1,{ts(w['start'])},{ts(line_end)},Pop,,0,0,0,,"
                f"{{\\an5\\pos({x},{y})\\fs{size}\\frz{CORRECT_TILT}"
                f"\\c{accent}}}{w['correct']}")
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
    ap.add_argument("--correct-at", nargs="*", default=[], metavar="TIME=WORD",
                    help="strike the word at TIME and write WORD above it, "
                         "e.g. 104.22=Bitcoin")
    ap.add_argument("--anim", default=DEFAULT_ANIM,
                    help="comma-separated: " + ",".join(ANIMS) +
                         f" (default: {DEFAULT_ANIM}; 'none' = static)")
    ap.add_argument("--pop-pct", type=int, default=POP_PCT,
                    help=f"peak vertical scale for the pop bounce "
                         f"(default {POP_PCT})")
    args = ap.parse_args()

    anim = tuple(a for a in args.anim.split(",") if a and a != "none")
    bad = [a for a in anim if a not in ANIMS]
    if bad:
        raise SystemExit(f"unknown --anim: {bad}; choose from {list(ANIMS)}")

    cfg = LAYOUTS[args.layout]
    respell = dict(p.split("=", 1) for p in args.respell)
    corrections = {float(k): v for k, v in
                   (p.split("=", 1) for p in args.correct_at)}
    scale = TONE_SCALE[args.tone]
    white, accent = ass_colour(BASE_WHITE, scale), ass_colour(BASE_ACCENT, scale)

    words = strip_fillers(load_words(args.json_in), args.drop_at, args.keep_at)
    lines = merge_orphans(group_lines(words, cfg, respell, corrections), cfg)

    seen = {w["start"] for line in lines for w in line if w["correct"]}
    missing = sorted(set(corrections) - seen)
    if missing:
        raise SystemExit(f"--correct-at times not found in output: {missing}")

    with open(args.ass_out, "w") as f:
        f.write(header(cfg, white))
        f.write("\n".join(build_events(lines, white, accent, cfg, anim,
                                        args.pop_pct)) + "\n")

    print(f"{args.layout}/{args.tone}: {len(lines)} lines, {len(words)} words "
          f"-> {args.ass_out}\n")
    for line in lines:
        text = ' '.join(f"[{w['text']} -> {w['correct']}]" if w['correct']
                        else w['text'] for w in line)
        print(f"  [{line[0]['start']:7.2f}] {text}")


if __name__ == "__main__":
    main()
