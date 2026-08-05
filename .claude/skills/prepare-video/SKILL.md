---
name: prepare-video
description: Turn a raw portrait talking-head recording into a publishable file with burned-in karaoke subtitles — either a vertical cut for Shorts/Reels/TikTok, or a true 16:9 landscape cut with blur-filled side panels for YouTube proper. Use when asked to "prepare a video", "add subtitles/captions", "burn in subtitles", "widen a video", "make this 16:9", or "stop YouTube making this a Short".
---

# Prepare Video

Take an iPhone portrait recording and produce a finished upload. Two modes, one
shared subtitle style. Everything runs locally — no upload, no third-party service.

Pipeline position: shoot → **prepare-video** → upload to YouTube → `create-video-post`
→ `compose-youtube-description`.

| Mode | Output | Destination |
|---|---|---|
| **vertical** | 1080×1920 + captions | LinkedIn (and YouTube Shorts, a future target) |
| **horizontal** | 1920×1080 blur-fill + captions | YouTube (won't be classed a Short) |

Both modes can be produced from the same source. If the user hasn't said which,
ask — don't assume, and don't render both speculatively (each is a full encode).

## The quality policy — read before choosing any encoder setting

**Ship the highest-quality master and let the platform transcode.** Every
destination re-encodes on upload. The better the file their transcoder receives, the
better the result viewers get, and file size is cheap by comparison.

Two rules follow, and they override any per-platform "recommended settings" list:

**Never pre-degrade for a platform's current limitations.** LinkedIn converts
everything to sRGB today, which tempts you to tone-map HDR→SDR before uploading.
Don't. When LinkedIn's standards improve, an already-flattened file cannot benefit,
and a correct master needs no re-render. The same logic rejects dropping 60 fps to
LinkedIn's "recommended" 30, or transcoding HEVC to H.264: those are
recommendations, not requirements — LinkedIn accepts HDR, HEVC and 60 fps uploads
and always has.

**Never transform a previous output.** Always start from the original camera file,
and do multi-step work in a single ffmpeg pass. Chained encodes stack generation
loss. Audio is stream-copied (`-c:a copy`) throughout — it needs no second
generation.

Consequence: **both modes stay HLG HDR.** The SDR path exists only for a destination
that outright rejects HDR; see *Flattening to SDR* below.

## Step 0 — Prerequisites, checked before anything else

**Subtitles require `ffmpeg-full`.** The `ffmpeg` on PATH is Homebrew's slim build:
no libass, no freetype, no `subtitles` / `ass` / `drawtext` / `zscale` filters. It
will fail with `No option name near '...'`, which does not look like a missing-codec
error and will waste your time.

```
ls /opt/homebrew/opt/ffmpeg-full/bin/ffmpeg || brew install ffmpeg-full
```

Use that absolute path for **every** ffmpeg call in this skill. It is keg-only, so it
never shadows the slim build. Set `FF=/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg` once.

## Step 1 — Probe the source

```
ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height,codec_name,pix_fmt,r_frame_rate \
  -show_entries stream=color_space,color_transfer,color_primaries \
  -show_entries stream_side_data=rotation -of json '<video>'
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 '<video>'
```

Three things decide the commands below:

**Rotation.** iPhone portrait is stored as a landscape 1920×1080 frame plus a
`Display Matrix` with `rotation: -90`. `width`/`height` alone lie. Filters auto-apply
the rotation, so the filter chain sees 1080×1920 — confirm the flag exists, because a
genuinely-landscape source needs different handling.

**Colour.** `color_transfer=arib-std-b67` (HLG) or `smpte2084` (PQ) with
`color_primaries=bt2020` means HDR. This changes both the encoder flags *and* the
subtitle colours — see Step 3. A `DOVI configuration record` means Dolby Vision; its
RPU layer **cannot survive an ffmpeg re-encode**. For profile 8.4 the base layer is
plain HLG so nothing visible is lost — say so rather than letting the user find out.

**Extra streams.** iPhone files carry a second (spatial) audio track and several data
streams. **Never use `-map 0`** — it drags in unmappable data streams and fails. Map
explicitly: `-map "[v]" -map 0:a:0`.

For horizontal mode, also check duration: YouTube classes an upload as a Short only if
it is vertical/square **and** ≤ 3 minutes. Over 180 s, widening is unnecessary for that
reason — say so and ask whether the user wants it anyway for aesthetics.

The same threshold cuts the other way in vertical mode: a cut longer than 3 minutes
cannot become a Short, so it is a LinkedIn-only deliverable. Worth mentioning, since
Shorts is a stated future target. LinkedIn's own feed limit is 10 minutes.

## Step 2 — Transcribe

Word-level timestamps are required; the karaoke highlight is built from them.

```
$FF -y -v error -i '<video>' -map 0:a:0 -ac 1 -ar 16000 -c:a pcm_s16le /tmp/pv/audio.wav
uvx --from mlx-whisper mlx_whisper --model mlx-community/whisper-large-v3-turbo \
    --output-format json --output-dir /tmp/pv --word-timestamps True \
    --language en --verbose False /tmp/pv/audio.wav
```

Extract audio first — feeding whisper a 400 MB video wastes minutes for identical
output. First run downloads ~1.5 GB of model; later runs are seconds.

## Step 3 — Generate the subtitle file

```
python3 <skill>/scripts/make_ass.py /tmp/pv/audio.json out.ass \
    --layout vertical|horizontal --tone sdr|hlg
```

- `--layout` sets frame size, font size, margins and words-per-line. A caption tuned
  for a phone is the wrong size for a 16:9 frame; never reuse one file for both.
- `--tone hlg` for **any HDR source** — which, under the quality policy, is every
  deliverable from an iPhone recording. Non-negotiable, and the reason is unobvious:
  libass renders SDR-referenced RGB, so `#FFFFFF` burned into an HLG frame lands at
  HLG *peak* rather than diffuse white. Every tone-mapper desaturates its top end, so
  for SDR viewers — most of YouTube — the amber highlight collapses into the white
  text and the karaoke cue disappears entirely. `--tone hlg` scales colours to 60%,
  which is verified to survive `tonemap=hable`.

**Always read the printed line list before rendering.** It shows the cleaned text, and
filler-stripping is the part most likely to need per-video correction. Fix mishearings
and false starts with `--respell wrong=right`, `--drop-at <times>`, `--keep-at <times>`
rather than editing the `.ass` by hand — the `.ass` is regenerated, hand edits are lost.

Full detail on the style, the filler policy and the tuning knobs:
**`reference/subtitles.md`** — read it before changing any caption look.

## Step 4 — Render

### Vertical

```
$FF -y -v error -stats -i '<in>' -vf "subtitles=out.ass" \
  -map 0:v:0 -map 0:a:0 -map_metadata 0 \
  -c:v hevc_videotoolbox -b:v 30M -tag:v hvc1 -pix_fmt p010le \
  -color_primaries bt2020 -color_trc arib-std-b67 -colorspace bt2020nc \
  -c:a copy -movflags +faststart '<name>_captioned.mp4'
```

### Horizontal — widen and subtitle in ONE pass

Never render the widen and the burn-in as two encodes: that is a needless second
generation of loss. And never subtitle *before* widening — the captions would be
scaled down into the 608 px centre strip and become unreadable.

```
$FF -y -v error -stats -i '<in>' -filter_complex "
[0:v]split=2[bg][fg];
[bg]scale=240:-2,crop=240:135,gblur=sigma=22,eq=brightness=-0.06:saturation=0.85,scale=1920:1080[bgb];
[fg]scale=-2:1080[fgs];
[bgb][fgs]overlay=(W-w)/2:0,subtitles=out.ass[v]" \
  -map "[v]" -map 0:a:0 -map_metadata 0 \
  -c:v hevc_videotoolbox -b:v 24M -tag:v hvc1 -pix_fmt p010le \
  -color_primaries bt2020 -color_trc arib-std-b67 -colorspace bt2020nc \
  -c:a copy -movflags +faststart '<name>_16x9.mp4'
```

Blur **small, then upscale**: `scale=240` → `gblur` → `scale=1920` is an order of
magnitude faster than blurring at full resolution and looks smoother. At 240 px wide,
`sigma=22` renders a face unrecognisable; `sigma=14` leaves distracting brown blobs.
Err high. Alternative background treatments (colour wash, inset card) and the geometry
maths live in **`reference/widen-16x9.md`** — variant A above is the chosen default,
so don't offer a menu unless asked.

**Bitrates differ by mode on purpose.** Vertical carries full-frame detail at
1080×1920, so it gets 30M. Horizontal spends most of its frame on a heavy blur that
costs almost nothing to encode — only the 608 px strip holds real detail — so 24M
buys the same visible quality.

If the source is genuinely **SDR**: drop the three colour flags and `-pix_fmt
p010le`, and generate captions with `--tone sdr`.

### Flattening to SDR — the exception, not the default

Only when a destination outright rejects HDR. Tone-map **before** the `subtitles`
filter, so captions are authored in the space they're displayed in and need no
luminance compromise:

```
zscale=t=linear:npl=100,tonemap=hable,zscale=t=bt709:m=bt709:p=bt709:r=tv,format=yuv420p,subtitles=out.ass
```

Pair it with `--tone sdr` and an H.264 encoder (`-c:v libx264 -preset slow -crf 18`).
Note `p=bt709` — omitting it converts the transfer and matrix but leaves the
*primaries* tagged `bt2020`, producing a file whose colour tags contradict each
other. `ffprobe` catches this; the eye may not until it's on someone else's screen.

Write output **next to the source**. Never overwrite the original.
`hevc_videotoolbox` is hardware-accelerated — a 3.5-minute render takes well under a
minute, so there is no reason to background it.

## Step 5 — Verify, then report

```
ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height,pix_fmt,color_space,color_transfer,color_primaries \
  -show_entries stream_side_data=rotation -of default=noprint_wrappers=1 '<out>'
```

Four checks that actually matter:

1. **No `rotation` entry.** A 1920×1080 file *with* a rotation flag still renders
   portrait, and YouTube would Short it anyway.
2. **`pix_fmt` is `yuv420p10le`** for an HDR source. If it came out `yuv420p`, the
   colour tags survived but the pixels were crushed to 8-bit — banding in skies and
   blur gradients. Re-encode; don't ship it.
3. **Extract a late-timestamp still and `Read` it.** Confirm captions still line up and
   the composite holds after the subject has moved, not just at one lucky moment.
4. For HDR, extract a **tone-mapped** still too — that is what most viewers see:
   ```
   $FF -y -v error -i '<out>' -ss <t> -frames:v 1 \
     -vf "zscale=t=linear:npl=100,tonemap=hable,zscale=t=bt709:m=bt709:r=tv,format=yuv420p,scale=900:-2" tm.png
   ```
   The highlighted word must still read as amber. If it looks white, `--tone` was wrong.

Report as a source → output table (geometry, codec/colour, audio, duration) and state
plainly what was dropped: Dolby Vision RPU, the spatial audio track, data streams.

## Gotchas

- **`scale=-1` is a trap.** It can produce an odd dimension, which 4:2:0 rejects, and
  the failure prints only "No filtered frames for output stream". Always `-2`.
- **`-copyts` on a sample file shifts its PTS.** A 6-second sample cut from t=42 has
  `start_time=42`, so seeking it later with `-ss 2` finds nothing. Seek relative to
  `start_time`, or omit `-copyts` when the sample is only for eyeballing.
- **zsh does not word-split unquoted variables.** `CMD="-ss 18 -t 6"; ffmpeg $CMD`
  passes one bogus argument. Use an array (`ENC=(...)`, `"${ENC[@]}"`) or inline.
- **`gblur` sigma is relative to resolution** — a sigma tuned at 240 px is ~8× stronger
  than the same value at 1920 px. Re-tune if you change the pre-blur scale.
- **Don't reach for generative outpainting.** Firefly/Runway can invent scenery for the
  side panels, but it's slow, paid, and for a tight talking-head a strong blur reads
  just as intentional. Mention it only if the user asks for literal frame extension.

## Follow-up

Once uploaded to YouTube, offer to run `create-video-post` to scaffold the blog post.
