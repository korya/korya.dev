import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { SITE_CONFIG } from '../config';

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

  const content = `# ${SITE_CONFIG.SITE_TITLE}

> ${SITE_CONFIG.SITE_DESCRIPTION}

## About

- [About the Author](${SITE_CONFIG.AUTHOR.url})

## Blog Posts

${postsList}

## Navigation

- [All Posts](${SITE_CONFIG.SITE_URL}/)
- [RSS Feed](${SITE_CONFIG.SITE_URL}/rss.xml)
`;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
