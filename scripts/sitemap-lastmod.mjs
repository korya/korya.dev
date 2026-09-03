import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { tagSlug } from '../src/lib/urls.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPOSITORY_URL = 'https://github.com/korya/korya.dev';
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

// These files affect visible text, links, or metadata on every BaseLayout page.
// Presentation-only CSS and client-side conveniences deliberately stay out: Google
// defines lastmod as the last significant change, not the last changed byte.
const BASE_LAYOUT_DEPENDENCIES = [
  'src/layouts/BaseLayout.astro',
  'src/components/BaseHead.astro',
  'src/components/FontStylesheet.astro',
  'src/components/Header.astro',
  'src/components/Footer.astro',
  'src/config.ts',
  'src/lib/content.ts',
];

const POST_COLLECTION_DEPENDENCIES = [
  'src/content/config.ts',
  'src/lib/urls.ts',
];

function unique(paths) {
  return [...new Set(paths)].sort();
}

function repoPath(root, absolutePath) {
  return relative(root, absolutePath).split(sep).join('/');
}

function parsePost(root, name) {
  const sourcePath = `content/posts/${name}`;
  const source = readFileSync(join(root, sourcePath), 'utf8');
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error(`Post has no YAML frontmatter: ${sourcePath}`);

  const data = yaml.load(match[1]);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`Post frontmatter is not an object: ${sourcePath}`);
  }

  const date = data.date instanceof Date ? data.date : new Date(data.date);
  if (Number.isNaN(date.valueOf())) throw new Error(`Post has an invalid date: ${sourcePath}`);

  return {
    source,
    sourcePath,
    slug: basename(name, '.md'),
    draft: data.draft === true,
    date,
    title: String(data.title ?? ''),
    description: String(data.description ?? ''),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    videos: Array.isArray(data.videos) ? data.videos : [],
  };
}

export function loadPublishedPosts(root = ROOT) {
  const postsDirectory = join(root, 'content/posts');
  return readdirSync(postsDirectory)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => parsePost(root, name))
    .filter((post) => !post.draft)
    .sort((a, b) => b.date.valueOf() - a.date.valueOf());
}

function localImageDependencies(root, source) {
  const publicRoot = resolve(root, 'public');
  const dependencies = [];

  for (const match of source.matchAll(/\/images\/[A-Za-z0-9._~%/-]+/g)) {
    let pathname;
    try {
      pathname = decodeURIComponent(match[0]);
    } catch {
      throw new Error(`Invalid encoded local image path: ${match[0]}`);
    }

    const absolutePath = resolve(publicRoot, `.${pathname}`);
    if (absolutePath !== publicRoot && !absolutePath.startsWith(`${publicRoot}${sep}`)) {
      throw new Error(`Local image path escapes public/: ${pathname}`);
    }
    if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
      throw new Error(`Referenced local image does not exist: ${pathname}`);
    }
    dependencies.push(repoPath(root, absolutePath));
  }

  return unique(dependencies);
}

function relatedPosts(posts, post) {
  return posts
    .filter((candidate) => candidate.slug !== post.slug)
    .map((candidate) => ({
      candidate,
      score: candidate.tags.filter((tag) => post.tags.includes(tag)).length,
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.candidate.date.valueOf() - a.candidate.date.valueOf())
    .slice(0, 3)
    .map(({ candidate }) => candidate);
}

function normalizePathname(pathname) {
  if (pathname === '/') return pathname;
  return pathname.endsWith('/') ? pathname : `${pathname}/`;
}

/**
 * Build the explicit page-to-source graph used by sitemap serialization and tests.
 * Unknown future page types intentionally have no fallback: their build must explain
 * what constitutes a significant change before they can publish a lastmod value.
 */
export function createRouteDependencyMap({ root = ROOT, posts = loadPublishedPosts(root) } = {}) {
  const routes = new Map();
  const allPostSources = posts.map((post) => post.sourcePath);
  const withBaseLayout = (...paths) => unique([...BASE_LAYOUT_DEPENDENCIES, ...paths]);

  routes.set('/', withBaseLayout(
    'src/pages/index.astro',
    'src/components/PostCard.astro',
    'src/components/PostFilter.astro',
    'src/components/PostTypeIcon.astro',
    'src/components/JsonLd.astro',
    'public/images/social/site.jpg',
    ...POST_COLLECTION_DEPENDENCIES,
    ...allPostSources,
  ));

  routes.set('/about/', withBaseLayout(
    'src/pages/about.astro',
    'src/components/interactive/Figure.astro',
    'src/data/resume.ts',
    'public/profile.png',
    'public/images/social/site.jpg',
  ));

  // /resume has a standalone print-oriented document shell and does not use BaseLayout.
  routes.set('/resume/', unique([
    'src/pages/resume.astro',
    'src/components/BaseHead.astro',
    'src/components/FontStylesheet.astro',
    'src/config.ts',
    'src/data/resume.ts',
    'src/lib/content.ts',
    'public/resume-prod-qr-code.png',
    'public/images/social/site.jpg',
  ]));

  routes.set('/tags/', withBaseLayout(
    'src/pages/tags/index.astro',
    'src/data/tags.ts',
    'public/images/social/site.jpg',
    ...POST_COLLECTION_DEPENDENCIES,
    ...allPostSources,
  ));

  const tagsBySlug = new Map();
  for (const post of posts) {
    for (const tag of post.tags) {
      const slug = tagSlug(tag);
      if (!slug) throw new Error(`Tag does not produce a usable URL slug: ${tag}`);
      const existing = tagsBySlug.get(slug);
      if (existing && existing.tag !== tag) {
        throw new Error(`Tags "${existing.tag}" and "${tag}" both produce the slug "${slug}"`);
      }
      if (existing) existing.posts.push(post);
      else tagsBySlug.set(slug, { tag, posts: [post] });
    }
  }

  for (const [slug, tag] of tagsBySlug) {
    routes.set(`/tags/${slug}/`, withBaseLayout(
      'src/pages/tags/[tag].astro',
      'src/components/PostCard.astro',
      'src/components/PostTypeIcon.astro',
      'src/data/tags.ts',
      'public/images/social/site.jpg',
      ...POST_COLLECTION_DEPENDENCIES,
      ...tag.posts.map((post) => post.sourcePath),
    ));
  }

  for (const [index, post] of posts.entries()) {
    const linkedPosts = unique([
      posts[index - 1]?.sourcePath,
      posts[index + 1]?.sourcePath,
      ...relatedPosts(posts, post).map((candidate) => candidate.sourcePath),
    ].filter(Boolean));

    routes.set(`/posts/${post.slug}/`, withBaseLayout(
      'src/pages/posts/[...slug].astro',
      'src/components/TableOfContents.astro',
      'src/components/Comments.astro',
      'src/components/PostNavigation.astro',
      'src/components/RelatedPosts.astro',
      'src/components/PostCard.astro',
      'src/components/PostTypeIcon.astro',
      'src/components/JsonLd.astro',
      ...POST_COLLECTION_DEPENDENCIES,
      post.sourcePath,
      ...localImageDependencies(root, post.source),
      ...linkedPosts,
    ));
  }

  return routes;
}

function runGit(cwd, args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function tryGit(cwd, args) {
  try {
    return runGit(cwd, args);
  } catch {
    return null;
  }
}

function resolveCommit(cwd, revision) {
  return tryGit(cwd, ['rev-parse', '--verify', `${revision}^{commit}`]);
}

function cloneHistory(repositoryUrl, commit) {
  const historyDirectory = mkdtempSync(join(tmpdir(), 'korya-sitemap-history-'));
  try {
    execFileSync('git', [
      'clone',
      '--bare',
      '--filter=blob:none',
      '--quiet',
      repositoryUrl,
      historyDirectory,
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    let resolvedCommit = resolveCommit(historyDirectory, commit);
    if (!resolvedCommit) {
      try {
        runGit(historyDirectory, ['fetch', '--quiet', repositoryUrl, commit]);
      } catch {
        // The actionable error below includes the requested commit and repository.
      }
      resolvedCommit = resolveCommit(historyDirectory, commit);
    }
    if (!resolvedCommit) {
      throw new Error(`Commit ${commit} is not available from ${repositoryUrl}`);
    }
    return { historyDirectory, commit: resolvedCommit };
  } catch (error) {
    rmSync(historyDirectory, { recursive: true, force: true });
    throw error;
  }
}

function dirtyPaths(root) {
  // Do not trim this output: the leading space in porcelain's XY status column
  // is meaningful (for example, " M" means modified in the working tree).
  const output = execFileSync(
    'git',
    ['status', '--porcelain=v1', '-z', '--untracked-files=all'],
    {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  if (!output) return new Set();

  const records = output.split('\0');
  const paths = new Set();
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (!record) continue;
    const status = record.slice(0, 2);
    paths.add(record.slice(3));
    if (status.includes('R') || status.includes('C')) {
      const sourcePath = records[index + 1];
      if (sourcePath) paths.add(sourcePath);
      index += 1;
    }
  }
  return paths;
}

function validateDependency(path) {
  if (!path || isAbsolute(path) || path.split('/').includes('..')) {
    throw new Error(`Invalid sitemap dependency path: ${path}`);
  }
  return path.split(sep).join('/');
}

export function createGitTimestampResolver({
  root = ROOT,
  sourceCommit = process.env.SOURCE_COMMIT,
  repositoryUrl = REPOSITORY_URL,
  allowDirty = !process.env.CI && !sourceCommit,
  now = () => new Date(),
} = {}) {
  const suppliedCommit = sourceCommit?.trim();
  if (suppliedCommit && !/^[0-9a-f]{7,64}$/i.test(suppliedCommit)) {
    throw new Error('SOURCE_COMMIT must be a hexadecimal Git commit ID');
  }

  const isWorkTree = tryGit(root, ['rev-parse', '--is-inside-work-tree']) === 'true';
  const headCommit = isWorkTree ? resolveCommit(root, 'HEAD') : null;
  let targetCommit = suppliedCommit
    ? (isWorkTree ? resolveCommit(root, suppliedCommit) : suppliedCommit)
    : headCommit;

  if (!targetCommit) {
    throw new Error(
      'Cannot calculate sitemap lastmod without Git history. Configure '
      + 'SOURCE_COMMIT=${_self.COMMIT_HASH} in DigitalOcean.',
    );
  }
  if (suppliedCommit && headCommit && targetCommit !== headCommit) {
    throw new Error(`SOURCE_COMMIT ${targetCommit} does not match checked-out HEAD ${headCommit}`);
  }

  let historyDirectory = isWorkTree ? root : null;
  let temporaryHistoryDirectory = null;
  if (historyDirectory && tryGit(root, ['rev-parse', '--is-shallow-repository']) === 'true') {
    try {
      runGit(root, ['fetch', '--unshallow', '--quiet', 'origin']);
    } catch {
      historyDirectory = null;
    }
  }
  if (historyDirectory && (
    tryGit(root, ['rev-parse', '--is-shallow-repository']) === 'true'
    || !resolveCommit(root, targetCommit)
  )) {
    historyDirectory = null;
  }

  if (!historyDirectory) {
    const clone = cloneHistory(repositoryUrl, targetCommit);
    historyDirectory = clone.historyDirectory;
    temporaryHistoryDirectory = clone.historyDirectory;
    targetCommit = clone.commit;
  }

  const workTreePaths = isWorkTree && historyDirectory === root ? dirtyPaths(root) : new Set();
  const cache = new Map();
  const cleanUp = () => {
    if (temporaryHistoryDirectory) {
      rmSync(temporaryHistoryDirectory, { recursive: true, force: true });
      temporaryHistoryDirectory = null;
    }
  };
  process.once('exit', cleanUp);

  return {
    commit: targetCommit,
    lastModified(dependencies) {
      const paths = unique(dependencies.map(validateDependency));
      const cacheKey = paths.join('\0');
      if (cache.has(cacheKey)) return cache.get(cacheKey);

      const commitDate = runGit(historyDirectory, [
        'log',
        targetCommit,
        '-1',
        '--format=%cI',
        '--',
        ...paths.map((path) => `:(literal)${path}`),
      ]);
      if (!commitDate) {
        throw new Error(`No Git timestamp found for sitemap dependencies: ${paths.join(', ')}`);
      }

      let latest = new Date(commitDate).valueOf();
      if (Number.isNaN(latest)) throw new Error(`Git returned an invalid commit date: ${commitDate}`);

      const dirtyDependencies = paths.filter((path) => workTreePaths.has(path));
      if (dirtyDependencies.length > 0 && !allowDirty) {
        throw new Error(
          `Sitemap dependencies are dirty in a commit-pinned build: ${dirtyDependencies.join(', ')}`,
        );
      }
      for (const path of dirtyDependencies) {
        const absolutePath = join(root, path);
        const modified = existsSync(absolutePath) ? statSync(absolutePath).mtimeMs : now().valueOf();
        latest = Math.max(latest, modified);
      }

      const currentTime = now().valueOf();
      if (latest > currentTime + FUTURE_TOLERANCE_MS) {
        throw new Error(`Sitemap lastmod is in the future: ${new Date(latest).toISOString()}`);
      }

      const result = new Date(latest).toISOString();
      cache.set(cacheKey, result);
      return result;
    },
    dispose() {
      process.removeListener('exit', cleanUp);
      cleanUp();
    },
  };
}

export function createSitemapSerializer(options = {}) {
  const root = options.root ?? ROOT;
  const routeDependencies = options.routeDependencies ?? createRouteDependencyMap({ root });
  const timestamps = createGitTimestampResolver({ ...options, root });
  const lastModifiedByRoute = new Map();

  // Resolve every timestamp while Astro loads its config. The sitemap integration
  // catches errors from serialize callbacks, which would otherwise turn a missing
  // history failure into a successful build with no sitemap.
  try {
    for (const [route, dependencies] of routeDependencies) {
      lastModifiedByRoute.set(route, timestamps.lastModified(dependencies));
    }
  } finally {
    timestamps.dispose();
  }

  return (item) => {
    const pathname = normalizePathname(new URL(item.url).pathname);
    if (!lastModifiedByRoute.has(pathname)) {
      throw new Error(`No sitemap lastmod dependency mapping for ${pathname}`);
    }

    item.lastmod = lastModifiedByRoute.get(pathname);
    return item;
  };
}
