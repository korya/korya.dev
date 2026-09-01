---
title: 'Era of Agents: ads to monetize skills? Not really'
description: "Ads are the second obvious way to monetize an agent skill, and today's LLMs are too steerable to survive them: letting an ad network inject text into your prompt hands a stranger the steering wheel. Three barriers, all of them infrastructure."
date: 2026-09-02
draft: false
tags: ['agents', 'future', 'tiki-toki']
toc: false
takeaways:
  - 'Ads are the second obvious way to charge for an agent skill, after subscriptions.'
  - 'Injecting third-party ad copy into a prompt is prompt injection with extra steps: an innocent word can steer the model, degrade your skill, or let someone act on the user behalf.'
  - 'Curated ad partners help, but the real fixes are infrastructure: less steerable models, and a protocol that lets an agent tell valid content apart from an ad.'
  - 'Until then, ads and agent skills do not mix without contaminating the content.'
videos:
  - youtubeId: 'ePov3BYfv_c'
    title: 'Era of Agents: ads to monetize skills? Not really'
    description: 'Why ad-supported agent skills run straight into prompt injection, and the three barriers standing in the way.'
    uploadDate: '2026-09-01T15:18:07-07:00'
    duration: 'PT3M23S'
    thumbnail:
      src: '/images/posts/2026-09-02-era-of-agents-ads-to-monetize-skills-not-really/ePov3BYfv_c.jpg'
      alt: 'Video thumbnail for Era of Agents: ads to monetize skills'
      width: 1280
      height: 720
---

<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; margin: var(--space-lg, 2rem) 0;">
  <iframe
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; border-radius: 8px;"
    src="https://www.youtube-nocookie.com/embed/ePov3BYfv_c"
    title="era of agents: ads to monetize skills? not really"
    loading="lazy"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen
  ></iframe>
</div>

<details>
<summary>Transcript</summary>

In the era of agents, most consumer apps will become skills. How do you
monetize them? One way is subscriptions — we already discussed that in the
previous video. This time we'll talk about the second way, and it's ads.

There is a problem with ads in an agent. LLMs today are just too steerable.
They're just too naive, and often an innocent word in your own prompt can throw
the model off the wall in a completely different direction, and it will
misbehave — let's call it this way.

And that's a problem, because if you let someone else inject random content into
the agent, they can steer it. They can hack it, take control over it. Or in the
best case, the performance of your skill goes down and users stop using it. In
the worst case, someone can do real harm: act on behalf of the user, move money,
steal credentials, and do a lot of bad stuff. So you don't really want that.

So you have to be super careful and pick your ad platform, your ad partner, one
that will curate the ad content — and then ideally even test it with your prompt
to make sure it does not steer it. That's an infrastructure problem.

The second one is the LLMs themselves. They're too steerable today. It's a huge
problem, and a huge barrier to adoption of LLMs on a large scale. This will
eventually be resolved — I assume all the LLM providers are working on some
solution for that, on the training, or defining some kind of gradations, or
confidence and trust levels for the content the LLMs see.

And there is a third barrier, also at the infrastructure level: not all ads are
easily injectable into the content. Sometimes an ad can be very destructive,
very disrupting. In that case you need some kind of convention, or a protocol,
between the ad provider and the LLM or the agent hosting — saying here is the
valid content, and here is an additional content, an ad. Please show it as well,
but deprioritize it. Or use a different channel for it.

It's very arguable whether the agent platform will allow that. But it's one way
of making ads a possibility without contaminating the content.

</details>

## Sources and further reading

- [OWASP's Top 10 for LLM Applications](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) ranks prompt injection as the top risk for LLM applications, which is the mechanism that makes third-party ad copy inside a prompt dangerous rather than merely annoying.
