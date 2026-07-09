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
  or `watch?v=<ID>`)
- **LinkedIn post URL** (optional)
- **X post URL** (optional)
- **local path to the video file** (optional) — used to cross-validate the
  transcript with a local, higher-accuracy transcription

The post is dated **today** (`date +%Y-%m-%d`). Don't ask for the date.

## Step 2 — Get the transcript

Two sources. Use whichever are available and reconcile them.

1. **YouTube captions** (always try first):
   ```
   uvx yt-dlp --write-auto-subs --sub-langs en --skip-download \
     --sub-format vtt -o '/tmp/ytpost/%(id)s.%(ext)s' '<YouTube URL>'
   ```
   Then read the `.vtt` and strip timestamps/markup down to plain text.

2. **Local whisper** (only if the user gave a local video path) — more accurate,
   and the source of truth for cross-validation:
   ```
   ffmpeg -y -i '<video>' -ar 16000 -ac 1 -c:a pcm_s16le /tmp/ytpost/audio.wav
   uvx --from mlx-whisper mlx_whisper --model mlx-community/whisper-large-v3-mlx \
     --output-format txt --output-dir /tmp/ytpost /tmp/ytpost/audio.wav
   ```
   Run this in the background — the model download + transcription takes a couple
   minutes.

**Cross-validate.** If both exist, prefer the local whisper text (cleaner), but
use YouTube's captions to catch mishearings — proper nouns especially. Whisper
tends to mangle brand/model names (e.g. it wrote "Entropiq" for "Anthropic"). Fix
those against what makes sense in context. If only YouTube captions exist, clean
those. If neither tool works, tell the user and ask them to paste a transcript.

## Step 3 — Clean the transcript

Turn raw spoken words into readable prose in Dmitri's voice, matching the existing
video posts:
- First person, casual, keep the "Hey guys" / "See you guys" bookends if present.
- Remove disfluencies, false starts, and spoken repetition. Keep the meaning and
  the personality. Don't over-polish it into a press release.
- Fix obvious transcription errors (proper nouns, model names, garbled numbers).
  If a spoken fact seems off (e.g. "three years ago" for a ~30-year-old thing),
  render it coherently and flag it to the user in your summary at the end.

## Step 4 — Get the video length

```
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 '<video-or-audio>'
```
No local file? Read the duration off the YouTube page. Format as `M:SS` for the
`videoLength` frontmatter field.

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
videoLength: '<M:SS>'
---

<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; margin: var(--space-lg, 2rem) 0;">
  <iframe
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; border-radius: 8px;"
    src="https://www.youtube-nocookie.com/embed/<ID>"
    title="<title, lowercased>"
    loading="lazy"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen
  ></iframe>
</div>

<details>
<summary>Transcript</summary>

<cleaned transcript prose>

</details>

X-Posted: [LinkedIn](<url>), [X](<url>)
```

Notes on the template:
- `tags`: **always include `tiki-toki`** — it's what groups these video posts. The
  series default is `['agents', 'future', 'tiki-toki']`; the other tags can change
  with the topic, but `tiki-toki` stays.
- `videoLength`: always set it (from Step 4). It's what makes the post render as a
  video (watch time instead of reading time).
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
