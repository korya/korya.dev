---
name: create-video-post
description: Create a new video blog post in this repo from a YouTube video — scaffolds the dated markdown file, embeds the video, and fills in a cleaned transcript. Use when asked to "add/create a new video post", "/create-video-post", or to publish a talking-head video to the blog.
---

# Create Video Post

Scaffold a new video post under `content/posts/`, matching the existing "Era of
Agents" video posts. The post embeds a YouTube video and includes a cleaned-up
transcript in a collapsible block. The heavy lifting is transcription: pull it,
clean it into Dmitri's prose voice, and cross-validate against the local video
file when one is available.

## Step 1 — Collect inputs

Ask the user (plain message, then wait for the reply — these are free-text, not
multiple choice) for:

- **title** (required)
- **YouTube link** (required) — extract the 11-char video ID from it (`youtu.be/<ID>`
  or `watch?v=<ID>`). Collect additional links too when the post contains a
  follow-up video; their order must match the iframes in the article.
- **LinkedIn post URL** (optional)
- **X post URL** (optional)
- **local path to the video file** (optional) — used to cross-validate the
  transcript with a local, higher-accuracy transcription

The post is dated **today** (`date +%Y-%m-%d`). Don't ask for the date.

## Step 2 — Get the transcript

**First look for a sidecar.** `prepare-video` writes one beside the source video, and it
carries the transcript plus every correction the user already approved. Using it avoids
transcribing the same audio a second time with a second model, and avoids re-deciding
from memory what was already decided.

```
# strip _captioned / _16x9 first, so pointing at a render also finds it
ls '<video dir>'/<stem>.captions.json '<video dir>'/<stem>.words.json
```

Found → read `spoken_text` (the reading to write the post transcript from) and
`corrections`. **Do not re-transcribe.**

Not found → transcribe locally, with the **same model `prepare-video` uses**, so the
project has one transcriber rather than two that disagree:

```
ffmpeg -y -i '<video>' -ar 16000 -ac 1 -c:a pcm_s16le /tmp/ytpost/audio.wav
uvx --from mlx-whisper mlx_whisper --model mlx-community/whisper-large-v3-turbo \
  --output-format json --output-dir /tmp/ytpost --word-timestamps True \
  --language en /tmp/ytpost/audio.wav
```

**Then always fetch YouTube's captions**, sidecar or not. They are a second, independent
transcription of the same audio, and the only cross-check available on a published video:

```
uvx yt-dlp --write-auto-subs --sub-langs en --skip-download \
  --sub-format vtt -o '/tmp/ytpost/%(id)s.%(ext)s' '<YouTube URL>'
```

### Compare them, and report what you find

```
python3 <skill>/scripts/check_captions.py '<stem>.captions.json' /tmp/ytpost/<ID>.en.vtt
```

It aligns the two and prints only what is not already explained: filler the captions
strip by design and corrections made on purpose are excused, so what remains is a real
disagreement about what was said.

**Never silently resolve one.** Preferring the better-sounding wording is how a post ends
up on the site disagreeing with the video above it, with nobody told. Put each
unexplained item to the user with the two options, and record the choice in your summary:

- **the video is wrong** → re-render via `prepare-video`, re-upload, then write the post
- **YouTube is wrong** → write the post from the video, and say so

**Parse the VTT with the script, never by eye.** YouTube's auto-captions are *rolling*:
each cue repeats the tail of the previous one, so a naive de-duplication silently splices
two half-lines into a sentence nobody said. That has already produced a confident,
wrong "the video says X" claim in this project. The script handles it; ad-hoc `grep`
does not.

If there is no local video and no sidecar, clean YouTube's captions and say in your
summary that the transcript has only one source.

## Step 3 — Clean the transcript

Turn raw spoken words into readable prose in Dmitri's voice:
- First person, casual, keep the "Hey guys" / "See you guys" bookends if present.
- Remove disfluencies, false starts, and spoken repetition. Keep the meaning and
  the personality. Don't over-polish it into a press release.
- Fix obvious transcription errors (proper nouns, model names, garbled numbers).
  If a spoken fact seems off (e.g. "three years ago" for a ~30-year-old thing),
  render it coherently and flag it to the user in your summary at the end.
- **Never "fix" a word Step 2 settled.** The transcript has to match the video; a
  disagreement already had a decision made about it, and quietly overruling that here
  puts the site and the video back out of step.

**Do not calibrate voice against the other posts in `content/posts/`.** Every one of
them carries a Claude co-author trailer, so matching them teaches the assistant's habits
back to itself: that is what produced a draft full of em dashes and "it isn't X, it's Y"
that had to be rewritten. The genuine samples of how Dmitri writes and talks are the
transcript in front of you and his own LinkedIn copy for the video: short declaratives,
plain words, repetition for rhythm, sentences opening with "And", no em dashes.

## Step 4 — Get structured video metadata and the thumbnail

```
uvx yt-dlp --skip-download --dump-single-json '<YouTube URL>'
```

For each video, record the returned ID, title, duration in seconds, and upload
timestamp. Convert the duration to ISO 8601 (`225` seconds → `PT3M45S`) and the
timestamp to an ISO datetime (`new Date(timestamp * 1000).toISOString()`). Never
substitute the blog publication date for the upload timestamp.

Download a local 16:9 thumbnail to
`public/images/posts/<slug>/<youtube-id>.jpg`. Try
`https://i.ytimg.com/vi/<ID>/maxresdefault.jpg` first, verify it is a real image
at least 1200 pixels wide, and fall back to the best thumbnail URL reported by
`yt-dlp`. Record its actual width and height in frontmatter.

## Step 5 — Write the post

Filename: `content/posts/YYYY-MM-DD-<kebab-title>.md`. The slug is the title
kebab-cased with punctuation and leading filler ("The", "A") dropped, e.g.
"Era of Agents: The Rise of Open Weights LLMs" →
`2026-07-09-era-of-agents-rise-of-open-weights-llms`.

Template (copy exactly, fill the `<...>` placeholders):

```markdown
---
title: '<Title>'
description: "<1-2 sentence inverted-pyramid summary of the video>"
date: <YYYY-MM-DD>
draft: false
tags: ['agents', 'future', 'tiki-toki']
toc: false
takeaways:
  - '<standalone point one>'
  - '<standalone point two>'
  - '<optional point three>'
videos:
  - youtubeId: '<ID>'
    title: '<video title>'
    description: '<concise description of this video>'
    uploadDate: '<ISO timestamp>'
    duration: '<ISO 8601 duration>'
    thumbnail:
      src: '/images/posts/<slug>/<ID>.jpg'
      alt: '<descriptive thumbnail alt text>'
      width: 1280
      height: 720
---

<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; margin: var(--space-lg, 2rem) 0;">
  <iframe
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; border-radius: 8px;"
    src="https://www.youtube-nocookie.com/embed/<ID>"
    title="<video title>"
    loading="lazy"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen
  ></iframe>
</div>

<details>
<summary>Transcript</summary>

<cleaned transcript prose>

</details>

## Sources and further reading

- [<primary-source title>](<url>) <why this source supports the factual claim>.

X-Posted: [LinkedIn](<url>), [X](<url>)
```

Notes on the template:
- `tags`: **always include `tiki-toki`** — it's what groups these video posts. The
  series default is `['agents', 'future', 'tiki-toki']`; the other tags can change
  with the topic, but `tiki-toki` stays.
- `takeaways`: include two to five concise points that can stand alone outside
  the transcript. They render visibly near the top of the post.
- `videos`: include one record per iframe, in the same order. The first video
  controls the watch time and social image. Every record needs its real YouTube
  upload timestamp, ISO duration, and committed local thumbnail.
- `Sources and further reading`: cite primary sources for material factual claims.
  Omit the section for a purely personal/opinion post rather than padding it with
  weak citations.
- `X-Posted:` line: include only the links the user gave. Strip tracking query
  params (`?utm_...`, `?s=20`) from the URLs. If neither LinkedIn nor X was
  provided, omit the line entirely.

## Step 6 — Review, then commit

1. Clean up temp files (`/tmp/ytpost`).
2. Show the user a short summary: the new file path, and any judgment calls you
   made (transcription fixes, a flagged misspeak, tag choices). **Let them review
   before committing.**
3. When they approve, commit on the current feature branch (create one off `master`
   first if we're on `master`):
   ```
   git add content/posts/<file>
   git commit -m "feat: Publish the <short-name> post"
   ```
   Follow the repo's commit conventions (including the `Co-Authored-By` trailer).
   Push / open a PR only if the user asks.

## Follow-up

After the post is live, offer to run the `compose-youtube-description` skill to
generate the video's YouTube description.
