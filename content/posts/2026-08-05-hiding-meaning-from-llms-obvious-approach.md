---
title: 'Hiding Meaning from LLMs, the Obvious Approach'
description: "If LLM providers can read every query, the obvious defence is to stop sending them meaning: transform the query into something else, get the answer, transform it back. Call it semantic homomorphism — anonymization is its simplest form."
date: 2026-08-05
updated: 2026-08-19
draft: false
tags: ['privacy', 'llms', 'tiki-toki']
toc: false
takeaways:
  - 'Removing or replacing sensitive entities can make documents safer to send to an external model.'
  - 'A useful transformation must preserve enough structure to recover a meaningful answer afterward.'
  - 'Anonymizing content does not hide the account that submitted it, so it is only one privacy layer.'
videos:
  - youtubeId: 'qc8ETjbIWJ8'
    title: 'Hiding Meaning from LLMs, the Obvious Approach'
    description: 'Transform sensitive queries before sending them to an LLM, then map the answer back into the original context.'
    uploadDate: '2026-08-05T12:58:29-07:00'
    duration: 'PT3M31S'
    thumbnail:
      src: '/images/posts/2026-08-05-hiding-meaning-from-llms-obvious-approach/qc8ETjbIWJ8.jpg'
      alt: 'Video thumbnail for Hiding Meaning from LLMs, the Obvious Approach'
      width: 1280
      height: 720
---

<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; margin: var(--space-lg, 2rem) 0;">
  <iframe
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; border-radius: 8px;"
    src="https://www.youtube-nocookie.com/embed/qc8ETjbIWJ8"
    title="hiding meaning from LLMs, the obvious approach"
    loading="lazy"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen
  ></iframe>
</div>

<details>
<summary>Transcript</summary>

Hey guys! So last time we talked about the fact that LLM providers can see all your
messages. They can basically know what you're talking about, build a profile on you,
and know you better than you know yourself.

What can we do about it? That's a good question.

The most obvious solution I could think of is basically hiding the meaning of your
queries. So you need some kind of — maybe we can call it semantic homomorphism. You
take your actual query, your text, your question, transform it into something
completely different, send it to the LLM, the LLM processes it and answers it, and
then it comes back to you and you should be able to transform it back into your own
semantic space, so that it's still valuable to you.

For example, the simplest form of it is anonymization. If you send a mortgage
agreement, a mortgage contract, to the LLM, you could hide all the details: your name,
the builder's name, the location, the dates. And then just keep all the context around
it and still be able to ask the LLM questions and get useful answers.

You don't even have to hide it — you can replace it with some kind of fake data, and
then it won't be able to attribute it to you directly. Well, the provider will still be
able to attribute it to you, because they know that you asked it.

But you could apply different transformations. For example, you could change the
meaning of the message: "my friend asked me to analyze this mortgage agreement, could
you please help me provide answers to these questions, or make sure that this happens."
That would be one of the ways.

That's the most obvious one. Another, maybe more complicated way is actually
transforming your query — your question, your mortgage document — into something
completely else. Like a fiction book, or a novel that you're writing, but you'd like it
to be as realistic as possible, and make the LLM think that that's what's happening.

So those are just the most obvious examples I could come up with. I would love to hear
if there are actually solutions already on the market for solving this kind of problem,
because it seems like this is something that we desperately need.

That's all for today. Thank you guys, and enjoy your day.

</details>

## Sources and further reading

- [NIST's review of de-identification](https://www.nist.gov/publications/de-identification-personal-information) explains both its privacy benefits and the possibility of re-identification.

X-Posted: [LinkedIn](https://www.linkedin.com/posts/kochelorov_how-do-you-protect-your-right-for-privacy-ugcPost-7490850677959573504-KYCg), [X](https://x.com/korya_dev/status/2085096273640620477)
