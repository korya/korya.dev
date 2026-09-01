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
| Font size | 152 | 122 |
| Outline / shadow | 12 / 7 | 9 / 6 |
| Margin V (from bottom) | 420 | 90 |
| Margin L/R | 40 | 120 |
| Max words / chars per line | 4 / 10 | 6 / 30 |

**Font: Avenir Next Heavy.** A macOS system font, so no bundling. libass resolves it
via coretext — confirm with `-v info` and look for
`fontselect: (Avenir Next Heavy, ...) -> ... AvenirNext-Heavy`. If it silently falls
back to a lighter face the captions look weedy, and nothing errors.

**Margin V 420 in vertical** keeps captions clear of the Reels/TikTok caption overlay
and button rail. Lower than that and the platform UI covers them.

**Margin L/R 120 in horizontal** gives 1680 px usable — far wider than the 608 px video
strip, so captions overhang onto the blurred panels. That is intentional and looks
deliberate. Verified: at font 122 the widest line spans 1632 px, inside 1680.

**Deliberately large type.** These sizes were settled by rendering and eyeballing, not
derived: captions are read on a phone, at arm's length, usually while scrolling. If a
size looks too big in a desktop preview it is probably right. Do not shrink them back
toward "tasteful" without being asked.

**Font size, `max_chars` and `margin_lr` are one setting in three parts.** Vertical has
only 1080 px of width, so type size and characters-per-line trade against each other
directly — you cannot change one alone. Worked example, the 101 → 152 step:

| | usable | max_chars | widest line | lines |
|---|---|---|---|---|
| 101, margin 60 | 960 | 18 | 938 | 153 |
| 152, margin 60, chars unchanged | 960 | 18 | 1399 — **60 lines overflow** | 153 |
| 152, margin 40, chars 10 | 976 | 10 | 944 | 245 |

**Budget the outline, not just the advance.** `text_width` returns the glyph advance;
the outline bleeds `outline` px past it on each side. At 152 that is 12 px a side, and
ignoring it puts a line that "fits" at 982/1000 actually over the edge.

**The failure mode is silent.** `WrapStyle: 0` wraps an over-long line to two lines
rather than erroring — which breaks the single-line karaoke rhythm and shoves captions
upward, and you only find out on screen. **Re-measure every line with `text_width`
before rendering whenever you touch a size.**

**Cadence is the real cost.** Vertical went 153 → 245 lines: a line every 0.88 s, and at
10 chars most lines hold one or two words. That makes the per-word amber highlight
nearly a one-word-at-a-time flasher rather than a sweep across a phrase. Accepted
deliberately here — but if someone asks for the big type *and* the karaoke sweep back,
the lever is the frame, not the font. Horizontal has 1680 px and absorbed the same +50 %
for six extra lines (91 → 97), so it keeps the sweep.

**`WrapStyle: 0`**, not 2. With 2 (no wrapping) an over-long line runs off-screen
instead of wrapping. Grouping should prevent that anyway; this is the safety net.

## Animation

Default `--anim fade,ease,pop` (`--anim none` for static):

| | What | Target | Amplitude |
|---|---|---|---|
| `fade` | line fade-in | 300 ms | — |
| `ease` | white → amber on the active word | 260 ms | fixed by the palette |
| `pop` | active word `\fscy` bounce | 340 ms | 120 % (`--pop-pct`) |
| `rise` | line slides up into place | 300 ms | 28 px |
| `blur` | focus-in | 280 ms | `\blur` 12 → 0 |

`rise` and `blur` work but stay opt-in: `rise` is the most visible single effect and
turns busy over a caption-dense cut.

**Three things here are easy to get wrong.**

**1. A line-level effect must fire only on the first word-event of a line.** Events are
one-per-word, so `\fad` applied to every event re-triggers on every word and strobes the
whole line. `fade`, `blur` and `rise` are gated on `wi == 0`; `rise` also needs an
explicit `\pos` on the remaining events, or they snap back to margin positioning.

**2. Every duration is clamped to its own event** (`_budget`). An effect cannot outlive
the Dialogue event hosting it — it dies the moment the next word starts. The median word
event is ~340 ms but the 10th percentile is ~140 ms, so an unclamped 300 ms fade leaves
short lines jumping from half-faded to full. The `pop` bounce scales both legs so it
still lands home.

**3. Durations must be large.** Sub-100 ms is 2–3 frames at 30 fps and reads as a cut,
not as motion. The first version used 70–120 ms and was invisible on playback even
though it was provably rendering. Verify by differencing frames against an `--anim none`
render, not by eye:

```
ffmpeg -ss <t> -i clip.mp4 -t 0.5 -vf "crop=1080:300:0:1300,scale=540:-2" seq/%02d.png
```

Count frames scoring above the ~0.5 mean-|diff| noise floor. Under ~6 live frames, it
will not be noticed. `ease` peaks at only ~1.9 no matter the duration — its amplitude is
capped by the luma distance between white and amber, so it is felt rather than seen.

**`pop` must be `\fscy`, never `\fscx` or `\fsc`.** `\fscx` scales the glyph advance,
so popping a mid-line word shoves the rest of the line sideways and back on every word.
`\fscy` grows the word upward off the baseline with no horizontal reflow — verified by
offset-sweeping a rendered frame against the static one (minimum at dx=0). It is not
completely free: the taller line box nudges the bottom-anchored baseline of trailing
words by under a pixel at 120 %. Invisible in motion, but it is why trailing pixels
differ at all if you go measuring.

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

60 % is not a compromise, it is the correct value: in HLG, diffuse white sits near 60 %
of the signal range, so `--tone hlg` captions render at normal white on an HDR display
while 100 % ones would glare at peak brightness. The only place the difference shows is
a tone-mapped SDR view, where full-range captions burned into an already-flattened frame
look slightly more vivid. That is not a reason to flatten the master — see the quality
policy in `SKILL.md`.

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
