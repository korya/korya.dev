---
title: 'Era of Agents: subscription for your skills; no, not that fast'
description: "Subscriptions are the obvious way to monetize an agent skill, and they break immediately: a skill is just a prompt, so the paid version ships your secret sauce to the first customer who reads it. The fix has to come from the agent platforms."
date: 2026-09-01
draft: false
tags: ['agents', 'future', 'tiki-toki']
toc: false
takeaways:
  - 'If consumer apps become agent skills, the obvious monetization model is a free tier plus a paid subscription.'
  - 'That breaks on contact: a skill is a prompt the agent loads on demand, so a paying user can simply read it and copy it.'
  - 'Splitting the skill and hiding the valuable part behind your own API works today, but it puts every skill developer back in the business of running a server.'
  - 'Skills need the same move web apps already made — toward serverless — which makes this a problem only the agent platforms can solve.'
videos:
  - youtubeId: 'hEqKIy03LEQ'
    title: 'Era of Agents: subscription for your skills; no, not that fast'
    description: 'Why subscription pricing does not survive contact with agent skills, and why the fix belongs at the infrastructure layer.'
    uploadDate: '2026-09-01T14:22:49-07:00'
    duration: 'PT3M36S'
    thumbnail:
      src: '/images/posts/2026-09-01-era-of-agents-subscription-for-your-skills-no-not-that-fast/hEqKIy03LEQ.jpg'
      alt: 'Video thumbnail for Era of Agents: subscription for your skills'
      width: 1280
      height: 720
---

<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; margin: var(--space-lg, 2rem) 0;">
  <iframe
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; border-radius: 8px;"
    src="https://www.youtube-nocookie.com/embed/hEqKIy03LEQ"
    title="era of agents: subscription for your skills; no, not that fast"
    loading="lazy"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen
  ></iframe>
</div>

<details>
<summary>Transcript</summary>

Hey guys! In the era of agents, most consumer apps will become skills — agent
skills. And as a developer of such a skill, such a consumer app, how can you
monetize? That's the question. How can you monetize?

Simple, right? The most obvious solution: subscriptions. It's probably the
oldest model. You have a free version, to let people taste your solution a
little bit. And second, the paid version.

But there is a problem with the paid version, because a skill is essentially
just a prompt that an agent or an LLM can load on demand whenever it needs it.
And the problem with the prompt is that everything is visible. Everything is
visible. As soon as you get someone's skill, you can look into it, you can
duplicate it. That's a disaster for any business, because the recipe of your
secret sauce can leak as easily as giving it to the first user — and you're
done. And maybe that user doesn't want to do it, but there will be some bad
agent, or another bad skill, that will just spy on anything they have and send
it out.

So what can we do about it? Today the main solution is to split your skill:
hide the secret sauce behind some API, on a server that never leaks and never
gets exposed, and then design the skill itself so that it makes these API
calls. It works, but it's not scalable.

Skills will have to go through the same evolution the web applications went
through. They will have to be serverless. Maintaining a server is not scalable.

And then the question is, how can we do it? That's a really interesting
question — but it makes it obvious that the solution is at the infrastructure
level. The agent providers, the people who host and run these agents for you —
it could be the vendor of the agent, or just the platform where it's running —
have to provide some ability for you to say: here's my secret sauce, never
expose it to anyone. And then they could deploy it automatically and hide it on
the server without exposing it. Maybe they can obfuscate it, such that it won't
leak into an LLM. Maybe they can encrypt it, or do some other interesting
transformation.

But there's a barrier right now, and this barrier requires skills not to leak —
or at least part of the skill, some part of the skill logic, to remain secret
and not get exposed. And that's a problem that can be solved only at the
infrastructure level. So there's one barrier, and it will be solved by the
agent platforms.

Here's my thoughts. Enjoy your day.

</details>

## Sources and further reading

- [Anthropic's Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) describes a skill as a folder of instructions and resources that an agent loads when a task calls for it — which is exactly why its contents are readable by whoever has it.

X-Posted: [LinkedIn](https://www.linkedin.com/posts/kochelorov_one-way-to-monetize-an-agent-skill-is-subscription-ugcPost-7500663894206681088-nxIE), [X](https://x.com/korya_dev/status/2094899012973343190)
