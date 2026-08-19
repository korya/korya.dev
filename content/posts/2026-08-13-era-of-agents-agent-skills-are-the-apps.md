---
title: 'Era of Agents: Agent Skills Are the Apps'
description: "Agents are becoming the new execution environment — after the OS, the browser, and mobile — and the application layer is moving into agent skills. Instead of writing ad-hoc software, we encode the logic into skills that agents run when needed."
date: 2026-08-13
draft: false
tags: ['agents', 'future', 'tiki-toki']
toc: false
takeaways:
  - 'Agents are becoming an execution environment alongside operating systems, browsers, and mobile platforms.'
  - 'Skills package instructions, code, and tool use into reusable application logic for agents.'
  - 'The same pattern already makes this site’s video post-processing repeatable and shareable.'
videos:
  - youtubeId: 'LGP3P4cr5Xo'
    title: 'Era of Agents: Agent Skills Are the Apps'
    description: 'The application layer is moving into reusable skills that agents load and execute when a task requires them.'
    uploadDate: '2026-08-12T19:29:34-07:00'
    duration: 'PT3M15S'
    thumbnail:
      src: '/images/posts/2026-08-13-era-of-agents-agent-skills-are-the-apps/LGP3P4cr5Xo.jpg'
      alt: 'Video thumbnail for Agent Skills Are the Apps'
      width: 1280
      height: 720
  - youtubeId: '9kJIgLb-OII'
    title: 'Using Claude Code to Post-process Videos'
    description: 'A reusable coding-agent skill turns vertical recordings into horizontal videos, adds subtitles, and handles transcoding.'
    uploadDate: '2026-08-12T20:14:23-07:00'
    duration: 'PT1M22S'
    thumbnail:
      src: '/images/posts/2026-08-13-era-of-agents-agent-skills-are-the-apps/9kJIgLb-OII.jpg'
      alt: 'Video thumbnail for Using Claude Code to Post-process Videos'
      width: 1280
      height: 720
---

<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; margin: var(--space-lg, 2rem) 0;">
  <iframe
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; border-radius: 8px;"
    src="https://www.youtube-nocookie.com/embed/LGP3P4cr5Xo"
    title="era of agents: agent skills are the apps"
    loading="lazy"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen
  ></iframe>
</div>

<details>
<summary>Transcript</summary>

Hey guys! In the era of agents, our personal assistants will be completing tasks on
our behalf. They will explore the internet as needed, query other services, place
orders for us. They can do it either directly, or indirectly — by delegating the
tasks, or sub-tasks, to other agents.

What this essentially means is that the application layer will be moving from
software into agents. Agents will become the new, if you wish, execution
environment. In the 80s and 90s it was the operating system. In the 2000s it was the
browser. Some 10 years ago mobile joined the party. Now it will be the agents.

And what does that mean? It means the application logic will go into agent skills.
Already today you can write agent skills and equip an AI agent with additional logic
needed to complete a task. This logic can contain instructions on how to write a
program to complete the task, how to make API calls, how to draw an image or create
a video. This way we make it repeatable and deliverable to other people.

So think about it: the application layer is moving into agent skills. Not writing
ad-hoc software anymore — putting the logic into agents that will do it when needed,
in the best way it can be done.

Bye-bye!

</details>

## Follow-up: Using skills for video post-processing

A great example of the point above: this very video was post-processed by Claude
Code using an agent skill I wrote - the
[prepare-video skill](https://github.com/korya/korya.dev/blob/a9479ffc722b335b9fd937f93586d6aed05fe12a/.claude/skills/prepare-video/SKILL.md).
It turns a vertical video into a horizontal one by adding padding on the sides, adds subtitles and transcodes the video if needed.

It was pretty simple to create the skill and saves me about 30 minutes on every publishing. Moreover, I don't have to use other video editing apps for such trivial tasks. And hence, no injected logos, no ads, no time wasted on yet another genious UI, and no extra payments. Pure benefit!

<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; margin: var(--space-lg, 2rem) 0;">
  <iframe
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; border-radius: 8px;"
    src="https://www.youtube-nocookie.com/embed/9kJIgLb-OII"
    title="era of agents: using claude code to post-process videos"
    loading="lazy"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen
  ></iframe>
</div>

<details>
<summary>Transcript</summary>

And in fact, this video is post-processed by Claude Code using a skill that I wrote
for it. The skill turns my videos into a horizontal one so I can upload it to
YouTube — adding this padding on the left and right, with the blurred, mirrored
content of the video. And the subtitles that you see here are added by the skill as
well.

So even in the future I don't have to use some software for post-processing my
videos. There is no stupid logo injected into my video, and I don't have to pay five
bucks to do it. I just asked my agent to do it once — told it exactly how I want it
to be done — and then asked the agent to encode it as a skill. And now I can reuse
it.

Moreover, you can go to my GitHub — it's the source code of my personal website —
take the skill, use it as well, and generate a similar video. Amazing.

</details>

## Sources and further reading

- [Anthropic's Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) describes skills as reusable packages of instructions, scripts, and resources.
- [The prepare-video skill used for these posts](https://github.com/korya/korya.dev/blob/a9479ffc722b335b9fd937f93586d6aed05fe12a/.claude/skills/prepare-video/SKILL.md) is a concrete implementation of that pattern.

X-Posted: [LinkedIn](https://www.linkedin.com/posts/kochelorov_in-the-era-of-agents-the-agents-become-the-ugcPost-7493494576427610113-ipV2), [X](https://x.com/korya_dev/status/2087729522611200406)
