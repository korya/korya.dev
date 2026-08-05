# Subtitles: style, speech cleanup, and tuning

The look: 3–6 words on screen at a time, heavy white sans with a thick black outline,
the currently-spoken word recoloured amber. Modern, high-contrast, easy to follow —
readable over foliage, sky, or a white shirt.

> **ASS** (Advanced SubStation Alpha) is a subtitle format that, unlike SRT, carries
> styling: fonts, colours, outlines, positions, per-word timing. It's what ffmpeg's
> `subtitles` filter burns in via libass.

## How the karaoke effect is built

Not with ASS `\k` karaoke tags — those only sweep a colour and give poor control.
Instead `make_ass.py` emits **one `Dialogue` event per word**, each showing the whole
line with a `{\c}` override recolouring just the active word. Crisp per-word switching,
full styling freedom, at the cost of a larger file (~38 KB for 3.5 minutes — fine).

## The style

| | vertical | horizontal |
|---|---|---|
| PlayRes | 1080×1920 | 1920×1080 |
| Font size | 78 | 62 |
| Outline / shadow | 6 / 4 | 5 / 3 |
| Margin V (from bottom) | 420 | 90 |
| Margin L/R | 80 | 260 |
| Max words / chars per line | 4 / 24 | 6 / 40 |

**Font: Avenir Next Heavy.** A macOS system font, so no bundling. libass resolves it
via coretext — confirm with `-v info` and look for
`fontselect: (Avenir Next Heavy, ...) -> ... AvenirNext-Heavy`. If it silently falls
back to a lighter face the captions look weedy, and nothing errors.

**Margin V 420 in vertical** keeps captions clear of the Reels/TikTok caption overlay
and button rail. Lower than that and the platform UI covers them.

**Margin L/R 260 in horizontal** gives 1400 px usable — wider than the 608 px video
strip, so captions overhang onto the blurred panels. That is intentional and looks
deliberate. Verified: a 44-character line spans ~1140 px, comfortably inside.

**`WrapStyle: 0`**, not 2. With 2 (no wrapping) an over-long line runs off-screen
instead of wrapping. Grouping should prevent that anyway; this is the safety net.

## HDR: the non-obvious part

libass renders **SDR-referenced RGB**. Burned into an HLG frame, `#FFFFFF` lands at
HLG *peak* (~1000 nits) rather than diffuse white (~100 nits). Tone-mappers desaturate
their top end, so for SDR viewers the amber highlight collapses into the white text and
the karaoke cue vanishes completely.

Verified with `tonemap=hable`: at 100 % the highlight is invisible; at 60 % it survives
clearly. `--tone hlg` scales both colours by 0.60. Use it for **every HDR source**, and
check a tone-mapped still afterwards (`SKILL.md` Step 5, check 4).

Deepening the accent hue instead does *not* fix it — tested `#FF9500` at 88 % white and
the highlight was still weak. Luminance is the lever, not hue.

## Speech cleanup

Verbatim transcription is honest but noisy on screen. `make_ass.py` strips:

- **Phrases**: `you know`, `I mean`, `I don't know`, `kind of`, `sort of`, `blah blah`
- **Words**: `um`, `uh`, `erm`, `basically`, `actually`
- **Comma-fenced discourse markers**: `like,` `well,` `right?` — but *not* `like a
  fiction book` or `well-known`. The comma is what distinguishes filler from content.
- **Stutters**: consecutive repeats (`to, to, to` → `to`), timing merged so the
  surviving word covers the whole span.

Typical yield: ~460 spoken words → ~400 on screen.

### What was deliberately NOT automated

A general false-start rule was implemented and **reverted**. Detecting "word repeated
within two tokens, with a comma" correctly catches stumbles like *"the most, the
simplest"* — but it also silently ate deliberate parallel phrasing like *"your query,
your text, your question"*, deleting real content. No rule distinguishes them.

So per-video false starts are surgical, via `--drop-at <start times>`. Two or three per
video is normal. Get exact times from the whisper JSON:

```
python3 -c "
import json; d=json.load(open('/tmp/pv/audio.json'))
for w in (w for s in d['segments'] for w in s.get('words',[])):
    if 73 <= w['start'] <= 77: print(w['start'], repr(w['word']))"
```

`--keep-at` does the reverse: protects a word from the filler rules. Needed when a
listed phrase is load-bearing — e.g. `kind of` is filler in "you need some kind of…"
but content in "solving this kind of problems".

`--respell wrong=right` fixes mishearings. Whisper mangles proper nouns and
near-homophones (it wrote "contacts" for "context", and "Entropiq" for "Anthropic" in
another video). **Read the printed line list every time** — this is where errors hide,
and they are invisible once burned into pixels.

## Punctuation

Commas and full stops are stripped; `?` and `!` are kept. Original capitalisation is
preserved, so lines often start lowercase mid-sentence. That is standard for this
caption style and looks correct in motion.

## Line grouping

Lines break on whichever comes first: word count, character count, a silence longer
than `GAP_BREAK` (0.45 s), or sentence-ending punctuation. A trailing single-word line
is then folded back into its predecessor when the gap is under 0.4 s — a lone word
hanging on screen for seconds reads as a stumble.

`HOLD_TAIL` (0.30 s) keeps the last word of a line up briefly after it's spoken,
clamped so it never overruns the next line's start.

## Re-running

The `.ass` is fully regenerated each run — **never hand-edit it**, the next run
discards the edits. All tuning is either a CLI flag or a constant at the top of
`make_ass.py`. Re-running needs no re-transcription; the whisper JSON holds every word
timing, so iterating on style costs seconds.
