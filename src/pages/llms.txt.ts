import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { SITE_CONFIG } from '../config';
import { serializePostDate } from '../lib/dates';
import {
  ALONGSIDE,
  EDUCATION,
  PRACTICES,
  PROFILE,
  ROLES,
  TOOLBELT,
} from '../data/resume';

/** Copied by hand from /about, which holds the same words as markup. Keep the two
 *  in step: see AGENTS.md. The resume sections below need no such care, since they
 *  read the same src/data/resume.ts that /resume renders from. */
const ABOUT = `I'm Dmitri. I co-founded FrontSail AI, where we build an agentic operating system that takes the repetitive back-office work off small businesses' hands.

Alongside that I run Cosmic Lift (https://cosmic-lift.com/), my consulting practice. Fractional CTO work, training, and product architecture and development for companies going AI-first, or making what they already have AI-ready.

Before that I spent a decade at Planitar. I joined as the first engineer and left as R&D director of a 20-person org, then went back to writing code full time so I could build AI agents myself. The longer version is on my resume.

This is my personal blog containing my thoughts and some fragments of thoughts on tech topics.

The idea behind this blog is to reflect and structure the information in my head. Writing is one of the best ways to achieve that.

I will be glad if you find it useful or even better, inspiring.

### Contact

- Consulting: [Cosmic Lift](https://cosmic-lift.com/)
- Github: [@korya](https://github.com/korya)
- X/Twitter: [@korya_dev](https://x.com/korya_dev)
- LinkedIn: [kochelorov](https://www.linkedin.com/in/kochelorov/)`;

/** Flatten a resume Segment[] blurb to plain prose, dropping the link markup.
 *  llms.txt is read for the facts, not for navigation, so inline anchors would
 *  only add noise around the words that carry the meaning. */
const flatten = (segments: readonly { text: string }[]) =>
  segments
    .map((segment) => segment.text)
    .join('')
    .trim();

export async function GET(context: APIContext) {
  const posts = (await getCollection('posts'))
    .filter((post) => !post.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  const postsList = posts
    .map((post) => {
      const updated = post.data.updated
        ? `, updated ${serializePostDate(post.data.updated)}`
        : '';
      const dates = ` — Published ${serializePostDate(post.data.date)}${updated}`;
      const description = post.data.description ? `: ${post.data.description}` : '';
      return `- [${post.data.title}](${SITE_CONFIG.SITE_URL}/posts/${post.slug}/)${dates}${description}`;
    })
    .join('\n');

  // Each role becomes a heading plus its bullets. The bullets already carry the
  // stack and the outcomes, so nothing else needs restating around them.
  const experience = ROLES.map((role) => {
    const bullets = role.bullets.map((bullet) => `- ${bullet.text}`).join('\n');
    return [
      `### ${role.title}, ${role.company} (${role.period})`,
      '',
      flatten(role.blurb),
      '',
      bullets,
    ].join('\n');
  }).join('\n\n');

  const toolbelt = TOOLBELT.groups
    .map((group) => `- ${group.label}: ${group.items}`)
    .join('\n');

  const practices = PRACTICES.items.map((item) => `- ${item}`).join('\n');

  const content = `# ${SITE_CONFIG.SITE_TITLE}

> ${SITE_CONFIG.SITE_DESCRIPTION}

## About

${ABOUT}

## ${PROFILE.name}

${PROFILE.currentRole.title} at [${PROFILE.currentRole.company}](${PROFILE.currentRole.href}). ${PROFILE.location}.

${PROFILE.headline} ${PROFILE.headlineAccent}

${PROFILE.doctrine}

Full resume: ${SITE_CONFIG.SITE_URL}/resume/

## Experience

${experience}

### ${ALONGSIDE.name} (${ALONGSIDE.period})

${ALONGSIDE.description} See [${ALONGSIDE.name}](${ALONGSIDE.href}).

## Tools

${toolbelt}

## How I work

${practices}

## Education

${EDUCATION.degree}, [${EDUCATION.school}](${EDUCATION.schoolHref}), ${EDUCATION.location}, ${EDUCATION.period}.

## Blog Posts

${postsList}

## Navigation

- [All Posts](${SITE_CONFIG.SITE_URL}/)
- [About](${SITE_CONFIG.SITE_URL}/about/)
- [Resume](${SITE_CONFIG.SITE_URL}/resume/)
- [RSS Feed](${SITE_CONFIG.SITE_URL}/rss.xml)
`;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
