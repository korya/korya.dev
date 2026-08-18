export function postHref(slug: string): string {
  return `/posts/${slug}/`;
}

export function tagSlug(tag: string): string {
  return tag
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/&/g, '-and-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function tagHref(tag: string): string {
  return `/tags/${tagSlug(tag)}/`;
}

export function assertUniqueTagSlugs(tags: string[]): void {
  const labelsBySlug = new Map<string, string>();

  for (const tag of tags) {
    const slug = tagSlug(tag);
    if (!slug) throw new Error(`Tag "${tag}" does not produce a usable URL slug`);

    const existing = labelsBySlug.get(slug);
    if (existing && existing !== tag) {
      throw new Error(`Tags "${existing}" and "${tag}" both produce the slug "${slug}"`);
    }
    labelsBySlug.set(slug, tag);
  }
}
