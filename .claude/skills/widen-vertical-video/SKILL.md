---
name: widen-vertical-video
description: Convert a vertical/portrait video into a true 16:9 landscape file so YouTube won't classify it as a Short — fills the empty sides with a blurred or colour-washed background instead of plain black bars. Use when asked to "widen a video", "make this video horizontal/16:9", "stop YouTube making this a Short", or before uploading a portrait talking-head recording.
---

# Widen Vertical Video

Take a portrait recording (typically a 1080×1920 iPhone selfie video) and produce a
genuine 1920×1080 file whose empty side panels look deliberate rather than padded.
Runs entirely on local `ffmpeg` — no upload, no third-party service.

The pipeline position: shoot → **widen** → upload to YouTube → `create-video-post`
→ `compose-youtube-description`.

## Step 0 — Check whether the work is even needed

YouTube classifies an upload as a Short only if it is **vertical or square** *and*
**≤ 3 minutes** long. Both conditions. So:

```
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 '<video>'
```

If the duration exceeds 180 s, **say so and stop** — the video cannot become a Short
no matter its aspect ratio, and re-encoding would only cost quality. Ask whether the
user wants the widening anyway for aesthetic reasons before proceeding.

## Step 1 — Probe the source properly

```
ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height,codec_name,pix_fmt,r_frame_rate,bit_rate \
  -show_entries stream=color_space,color_transfer,color_primaries \
  -show_entries stream_side_data=rotation -of json '<video>'
ffprobe -v error -show_entries stream=index,codec_type,codec_name -of csv=p=0 '<video>'
```

Three things to establish, each of which changes the command:

**Rotation.** iPhone portrait video is stored as a **landscape 1920×1080 frame plus a
`Display Matrix` side-data flag with `rotation: -90`**. `width`/`height` alone will
lie to you. Filters auto-apply the rotation, so `scale=-2:1080` on such a source
correctly yields a 608×1080 portrait image — but you must confirm the flag exists,
because a genuinely-landscape 1920×1080 source needs no work at all.

**Colour.** Look for `color_transfer=arib-std-b67` (HLG) or `smpte2084` (PQ) plus
`color_primaries=bt2020` — that's HDR, and the tags must be carried to the output
explicitly or the result plays washed-out and grey. A `DOVI configuration record`
side-data entry means Dolby Vision; **the DV metadata layer (RPU) cannot survive an
ffmpeg re-encode.** For profile 8.4 the base layer is plain HLG, so nothing visible
is lost — mention this to the user rather than letting them discover it.

**Extra streams.** iPhone files carry a second (spatial) audio track and several data
streams. **Never use `-map 0`** — it drags in unmappable data streams and fails. Map
explicitly: `-map "[v]" -map 0:a:0`.

## Step 2 — Use variant A

**Dmitri has already chosen: variant A, classic blur fill, in HLG HDR. Don't ask, don't
offer a menu — just render it.** Go straight to Step 3.

The other two variants are documented below only for the case where the user explicitly
asks for a different look. If they do, or if a shot is framed oddly enough that you doubt
A will hold, render a **6-second sample** (`-ss 18 -t 6`), send it with `SendUserFile`,
and `Read` a still to check it yourself before committing to the full render.

Reusable encoder settings for samples (zsh array — see Gotchas):

```zsh
ENC=(-c:v hevc_videotoolbox -b:v 12M -tag:v hvc1 \
     -color_primaries bt2020 -color_trc arib-std-b67 -colorspace bt2020nc \
     -c:a aac -b:a 192k)
```

### Variant A — classic blur fill — **THE DEFAULT**

Video at full 1080 height, sides filled with a heavily blurred zoom of itself. The
familiar Instagram look; the panels drift gently as the subject moves. This is the
chosen treatment — use it unless told otherwise.

```
[0:v]split=2[bg][fg];
[bg]scale=240:-2,crop=240:135,gblur=sigma=22,eq=brightness=-0.06:saturation=0.85,scale=1920:1080[bgb];
[fg]scale=-2:1080[fgs];
[bgb][fgs]overlay=(W-w)/2:0[v]
```

Blur **small, then upscale** — `scale=240` → `gblur` → `scale=1920` is an order of
magnitude faster than blurring at full resolution and looks smoother. Sigma matters:
at 240 px wide, `sigma=22` renders a face unrecognisable; `sigma=14` leaves
distracting brown blobs. Err high.

### Variant C — soft colour wash (only on request)

Near-solid colour that drifts with the scene. Calmest, least distracting.

```
[0:v]split=2[bg][fg];
[bg]scale=24:14,gblur=sigma=6,eq=brightness=-0.08:saturation=0.6,scale=1920:1080:flags=bicubic,gblur=sigma=60[bgb];
[fg]scale=-2:1080[fgs];
[bgb][fgs]overlay=(W-w)/2:0,drawbox=x=655:y=0:w=610:h=1080:color=white@0.20:t=2[v]
```

The trailing `gblur=sigma=60` **after** the upscale is mandatory. Upscaling a tiny
grid alone (even bicubic) leaves visible hard quadrant bands.

### Variant D — inset card with drop shadow (only on request)

Most "produced" look: the portrait inset to 1000 px tall, floating on a dimmed blur.

```
[0:v]split=2[bg][fg];
[bg]scale=240:-2,crop=240:135,gblur=sigma=20,eq=brightness=-0.20:saturation=0.35,scale=1920:1080,
    drawbox=x=663:y=30:w=594:h=1020:color=black@0.6:t=fill,gblur=sigma=24[bgb];
[fg]scale=-2:1000[fgs];
[bgb][fgs]overlay=679:40,drawbox=x=678:y=39:w=564:h=1002:color=white@0.18:t=2[v]
```

The shadow is faked without any alpha channel: draw a filled dark box on the already-
blurred background, then blur again so its edges go soft, then overlay the foreground
on top. This keeps everything in 10-bit YUV — an `rgba` round-trip for real alpha
compositing would silently crush HDR to 8-bit.

**Geometry, recomputed for any inset height H:** width `W = H × 9/16` rounded to the
nearest even number (what `-2` does), `x = (1920 − W)/2`, `y = (1080 − H)/2`.
For H=1080 → 607.5 → 608×1080 at x=656.
For H=1000 → 562×1000 at x=679, y=40. The 0.08 % horizontal stretch from rounding to
even is imperceptible; don't over-engineer it.

## Step 3 — Render the full file

Same filter as the approved sample, with:

- `-b:v 20M` — generous, since only a ~608 px-wide strip carries real detail.
- `-pix_fmt p010le` for 10-bit HDR sources.
- `-c:a copy` — the audio needs no second generation.
- `-map_metadata 0` to keep `creation_time`.
- `-movflags +faststart` so the YouTube upload streams immediately.

```
ffmpeg -y -v error -stats -i '<in>' -filter_complex "<approved filter>" \
  -map "[v]" -map 0:a:0 -map_metadata 0 \
  -c:v hevc_videotoolbox -b:v 20M -tag:v hvc1 -pix_fmt p010le \
  -color_primaries bt2020 -color_trc arib-std-b67 -colorspace bt2020nc \
  -c:a copy -movflags +faststart '<in-basename>_16x9.mp4'
```

Write the output **next to the source** as `<name>_16x9.mp4`. Never overwrite the
original. `hevc_videotoolbox` is hardware-accelerated: a 3-minute 1080p render takes
~13 seconds, so there is no reason to background it.

For an **SDR** source, drop the three colour flags and `-pix_fmt p010le`.
If the user explicitly asks to flatten HDR → SDR, note that **this homebrew ffmpeg
has no `zscale` filter**, so the usual `zscale,tonemap,zscale` chain fails; use
`tonemap` with `format` conversions, or hand it to a dedicated tool.

## Step 4 — Verify, then report

```
ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height,pix_fmt,color_space,color_transfer,color_primaries,duration \
  -show_entries stream_side_data=rotation -of default=noprint_wrappers=1 '<out>'
```

The verification that actually matters: **the output must have no `rotation` entry.**
A 1920×1080 file *with* a rotation flag still renders portrait, and YouTube would
short it anyway. Also extract a late-timestamp still and `Read` it — confirm the
composite holds up after the subject has moved, not just at the sample moment.

Then report to the user as a source → output table (geometry, codec/colour, audio,
duration), and state plainly what was dropped: Dolby Vision RPU, the spatial audio
track, any extra data streams.

## Gotchas

- **zsh does not word-split unquoted variables.** `CMD="-ss 18 -t 6"; ffmpeg $CMD` passes
  one bogus argument. Use an array (`ENC=(...)`, `"${ENC[@]}"`) or inline the flags.
- **`gblur` sigma is relative to resolution.** A sigma tuned at 240 px wide is ~8× stronger
  than the same sigma at 1920 px. Re-tune if you change the pre-blur scale.
- **`scale=-2:N`** keeps dimensions even, which H.264/HEVC 4:2:0 requires. Never use `-1`.
- **Don't reach for generative outpainting.** Firefly/Runway can invent real scenery for the
  side panels, but it's slow, paid, and for a tight talking-head shot a strong blur reads
  just as intentional. Mention it only if the user asks for literal frame extension.

## Follow-up

Once the widened file is uploaded to YouTube, offer to run `create-video-post` to
scaffold the blog post for it.

