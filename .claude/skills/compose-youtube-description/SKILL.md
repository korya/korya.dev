---
name: compose-youtube-description
description: Compose a YouTube video description for a video blog post in this repo — a short first-person summary plus links to the blog post, LinkedIn, and X. Use when asked to "write/generate a YouTube description" for one or more posts under content/posts/, or after publishing a video post.
---

# Compose YouTube Description

Generate the text that goes in the description box of a video's YouTube page. One
description per video post. Each has a brief summary written in Dmitri's voice,
followed by links to the blog post, the LinkedIn cross-post, and the X cross-post.

## Scope: which posts

If the skill is invoked with arguments identifying a post (a title, slug, file path,
or YouTube ID), skip the question below and just generate the description for that
post (or posts, if several are named).

If invoked with **no arguments**, ask the user which posts to cover before doing
anything else. Use the `AskUserQuestion` tool with these options:
- **Most recent** — only the newest video post.
- **Last 3** — the three newest video posts.
- **All** — every video post in the repo.

Order video posts by the frontmatter `date` (newest first) to resolve "recent".

## What counts as a video post

A markdown file under `content/posts/` whose frontmatter has a `videoLength` field
and whose body embeds a YouTube iframe (`youtube-nocookie.com/embed/<ID>`). The
`<ID>` in that iframe is the video's YouTube ID.

## Steps

1. **Read the post.** Grab from the frontmatter/body:
   - The YouTube ID (from the iframe `src`).
   - The `<details><summary>Transcript</summary>` block — this is your source for the summary.
   - The `X-Posted:` footer line (usually the last line). It contains the LinkedIn
     and/or X links, e.g. `X-Posted: [LinkedIn](url), [X](url)`.

2. **Build the blog URL.** URLs are `https://korya.dev/posts/<slug>/` where `<slug>`
   is the filename without the `.md` extension. Site URL lives in `src/config.ts`
   (`SITE_URL`). Example: `content/posts/2026-07-09-era-of-agents-rise-of-open-weights-llms.md`
   → `https://korya.dev/posts/2026-07-09-era-of-agents-rise-of-open-weights-llms/`.

3. **Write the summary.** 3–5 sentences drawn from the transcript. First person,
   casual, the way Dmitri actually talks in the video. It should make someone want
   to watch, not read like a press release.

4. **Append the links**, each on its own line, plain text labels (no emojis):
   ```
   Blog post: <url>
   LinkedIn: <url>
   X: <url>
   ```
   If a link is missing, write `N/A` for that line. Never invent a URL.

5. **Humanize the summary.** Run it through the same rules as the `humanizer` skill.
   The non-negotiables that bite this kind of blurb:
   - No em dashes or en dashes (`—` / `–`). Use periods, commas, or parentheses.
   - No rule-of-three lists ("finds it, presents it, books it").
   - No promo inflation ("huge opening", "tectonic shift", "keeps me up at night").
   - Vary sentence length. Let a short one sit next to a long one.

## Output format

For each post, output a header line with the title and YouTube ID, then a fenced
code block the user can copy straight into YouTube:

```
Everyone keeps asking me about the agent hype, so here's my take: ...
[3-5 sentences]

Blog post: https://korya.dev/posts/<slug>/
LinkedIn: <url or N/A>
X: <url or N/A>
```

## Notes

- If the post isn't merged/deployed yet, flag that the blog URL will 404 until it is.
- Transcripts may already be cleaned prose; the video's spoken words can differ
  slightly. The transcript is the right source for the gist.
