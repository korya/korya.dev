// Content for /about, shared with llms.txt.
//
// The prose lives here rather than inline in about.astro so the page and the
// machine-readable llms.txt render the same words. Duplicating it would let the
// two drift, and the copy an LLM cites would silently become the stale one.

/** A run of prose, optionally linked. Mirrors the shape used in resume.ts. */
export interface Segment {
  text: string;
  href?: string;
}

export const BIO: Segment[][] = [
  [
    { text: "I'm Dmitri. I co-founded " },
    { text: 'FrontSail AI', href: 'https://frontsail.ai/' },
    {
      text:
        ", where we build an agentic operating system that takes the repetitive back-office work off small businesses' hands.",
    },
  ],
  [
    { text: 'Before that I spent a decade at ' },
    { text: 'Planitar', href: 'https://goiguide.com/' },
    {
      text:
        '. I joined as the first engineer and left as R&D director of a 20-person org, then went back to writing code full time so I could build AI agents myself. The longer version is on my ',
    },
    { text: 'resume', href: '/resume' },
    { text: '.' },
  ],
  [
    {
      text:
        'This is my personal blog containing my thoughts and some fragments of thoughts on tech topics.',
    },
  ],
  [
    {
      text:
        'The idea behind this blog is to reflect and structure the information in my head. Writing is one of the best ways to achieve that.',
    },
  ],
  [{ text: 'I will be glad if you find it useful or even better, inspiring.' }],
];

export const CONTACT = [
  { platform: 'Github', label: '@korya', href: 'https://github.com/korya' },
  { platform: 'X/Twitter', label: '@korya_dev', href: 'https://x.com/korya_dev' },
  {
    platform: 'LinkedIn',
    label: 'kochelorov',
    href: 'https://www.linkedin.com/in/kochelorov/',
  },
];
