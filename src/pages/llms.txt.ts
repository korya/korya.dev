import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { SITE_CONFIG } from '../config';
import { BIO, CONTACT } from '../data/about';
import {
  ALONGSIDE,
  EDUCATION,
  PRACTICES,
  PROFILE,
  ROLES,
  TOOLBELT,
} from '../data/resume';

/** Flatten a Segment[] paragraph to plain prose, dropping the link markup.
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
      const description = post.data.description ? `: ${post.data.description}` : '';
      return `- [${post.data.title}](${SITE_CONFIG.SITE_URL}/posts/${post.slug}/)${description}`;
    })
    .join('\n');

  const bio = BIO.map((paragraph) => flatten(paragraph)).join('\n\n');

  const contact = CONTACT.map(
    (link) => `- ${link.platform}: [${link.label}](${link.href})`
  ).join('\n');

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

${bio}

### Contact

${contact}

## ${PROFILE.name}

${PROFILE.currentRole.title} at [${PROFILE.currentRole.company}](${PROFILE.currentRole.href}). ${PROFILE.location}.

${PROFILE.headline} ${PROFILE.headlineAccent}

${PROFILE.doctrine}

Full resume: ${SITE_CONFIG.SITE_URL}/resume

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
- [About](${SITE_CONFIG.SITE_URL}/about)
- [Resume](${SITE_CONFIG.SITE_URL}/resume)
- [RSS Feed](${SITE_CONFIG.SITE_URL}/rss.xml)
`;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
