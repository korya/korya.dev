# Widening: background treatments and geometry

`SKILL.md` renders **variant A (classic blur fill)** by default. Dmitri has already
chosen it — don't present a menu. The alternatives below exist for when he explicitly
asks for a different look, or when a shot is framed oddly enough that you doubt A holds.

If you do try a different variant, render a **6-second sample** first
(`-ss 18 -t 6`), send it with `SendUserFile`, and `Read` a still yourself before
committing to a full render.

Reusable encoder settings for samples (zsh array — see the Gotchas in `SKILL.md`):

```zsh
ENC=(-c:v hevc_videotoolbox -b:v 12M -tag:v hvc1 \
     -color_primaries bt2020 -color_trc arib-std-b67 -colorspace bt2020nc \
     -c:a aac -b:a 192k)
```

Each filter below ends at `[v]`, so the `,subtitles=out.ass` step and the `-map "[v]"`
from `SKILL.md` Step 4 attach unchanged. Append `subtitles` **after** the `overlay`,
so captions land on the finished 1920×1080 composite rather than on the portrait strip.

## Variant A — classic blur fill — THE DEFAULT

Video at full 1080 height, sides filled with a heavily blurred zoom of itself. The
familiar Instagram look; the panels drift gently as the subject moves.

```
[0:v]split=2[bg][fg];
[bg]scale=240:-2,crop=240:135,gblur=sigma=22,eq=brightness=-0.06:saturation=0.85,scale=1920:1080[bgb];
[fg]scale=-2:1080[fgs];
[bgb][fgs]overlay=(W-w)/2:0[v]
```

## Variant C — soft colour wash (only on request)

Near-solid colour that drifts with the scene. Calmest, least distracting.

```
[0:v]split=2[bg][fg];
[bg]scale=24:14,gblur=sigma=6,eq=brightness=-0.08:saturation=0.6,scale=1920:1080:flags=bicubic,gblur=sigma=60[bgb];
[fg]scale=-2:1080[fgs];
[bgb][fgs]overlay=(W-w)/2:0,drawbox=x=655:y=0:w=610:h=1080:color=white@0.20:t=2[v]
```

The trailing `gblur=sigma=60` **after** the upscale is mandatory. Upscaling a tiny grid
alone (even bicubic) leaves visible hard quadrant bands.

## Variant D — inset card with drop shadow (only on request)

Most "produced" look: the portrait inset to 1000 px tall, floating on a dimmed blur.

```
[0:v]split=2[bg][fg];
[bg]scale=240:-2,crop=240:135,gblur=sigma=20,eq=brightness=-0.20:saturation=0.35,scale=1920:1080,
    drawbox=x=663:y=30:w=594:h=1020:color=black@0.6:t=fill,gblur=sigma=24[bgb];
[fg]scale=-2:1000[fgs];
[bgb][fgs]overlay=679:40,drawbox=x=678:y=39:w=564:h=1002:color=white@0.18:t=2[v]
```

The shadow is faked without any alpha channel: draw a filled dark box on the already-
blurred background, blur again so its edges go soft, then overlay the foreground on
top. This keeps everything in 10-bit YUV — an `rgba` round-trip for real alpha
compositing would silently crush HDR to 8-bit.

With variant D the captions from `SKILL.md` (margin_lr 260 → 1400 px usable) are wider
than the 562 px inset card. That reads fine, but check a still: the caption crosses the
card's lower border, and if the border line is bright it can clash with the outline.

## Geometry, for any inset height H

Width `W = H × 9/16` rounded to the nearest even number (what `-2` does),
`x = (1920 − W)/2`, `y = (1080 − H)/2`.

| H | W | x | y |
|---|---|---|---|
| 1080 | 608 | 656 | 0 |
| 1000 | 562 | 679 | 40 |

The 0.08 % horizontal stretch from rounding to even is imperceptible; don't
over-engineer it.

## HDR → SDR, if ever asked to flatten

`ffmpeg-full` **does** have `zscale` (the slim PATH build does not — an older note
claiming ffmpeg lacks it is out of date):

```
zscale=t=linear:npl=100,tonemap=hable,zscale=t=bt709:m=bt709:r=tv,format=yuv420p
```

If you flatten to SDR, regenerate the subtitles with `--tone sdr` — the 60 % HLG
colours would come out muddy grey in an SDR file.
