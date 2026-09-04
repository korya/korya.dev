import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test, expect } from '@playwright/test';
import {
  createGitTimestampResolver,
  createRouteDependencyMap,
  createSitemapSerializer,
  loadPublishedPosts,
} from '../scripts/sitemap-lastmod.mjs';

const ROOT = process.cwd();

function git(cwd: string, args: string[], dates?: { author: string; committer: string }) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: dates
      ? {
          ...process.env,
          GIT_AUTHOR_DATE: dates.author,
          GIT_COMMITTER_DATE: dates.committer,
        }
      : process.env,
  }).trim();
}

test.describe('sitemap lastmod dependencies', () => {
  test('maps every built URL and excludes drafts', () => {
    const sitemap = readFileSync(join(ROOT, 'dist/sitemap-0.xml'), 'utf8');
    const paths = [...sitemap.matchAll(/<loc>https:\/\/korya\.dev([^<]*)<\/loc>/g)]
      .map((match) => match[1]);
    const routeDependencies = createRouteDependencyMap();

    expect(paths.length).toBeGreaterThan(0);
    expect([...routeDependencies.keys()].sort()).toEqual(paths.sort());

    const everyDependency = [...routeDependencies.values()].flat();
    expect(everyDependency).not.toContain(
      'content/posts/2025-08-19-asking-llm-to-reflect-on-its-system-prompt.md'
    );
    expect(everyDependency).not.toContain('content/posts/2026-06-25 - semantic-rebase.md');
  });

  test('uses only posts with the matching tag for a tag hub', () => {
    const posts = loadPublishedPosts();
    const dependencies = createRouteDependencyMap({ posts }).get('/tags/agents/');
    const expected = posts
      .filter((post) => post.tags.includes('agents'))
      .map((post) => post.sourcePath)
      .sort();
    const actual = dependencies
      ?.filter((dependency) => dependency.startsWith('content/posts/'))
      .sort();

    expect(actual).toEqual(expected);
  });

  test('tracks a post social image as a Git dependency', () => {
    const dependencies = createRouteDependencyMap().get(
      '/posts/2026-09-02-era-of-agents-ads-to-monetize-skills-not-really/'
    );
    expect(dependencies).toContain(
      'public/images/posts/2026-09-02-era-of-agents-ads-to-monetize-skills-not-really/ePov3BYfv_c.jpg'
    );
  });

  test('tracks date rendering only on routes that display post dates', () => {
    const routes = createRouteDependencyMap();
    const dateDependency = 'src/lib/dates.ts';

    for (const route of ['/', '/tags/agents/', '/posts/2026-06-25-era-of-agents/']) {
      expect(routes.get(route), route).toContain(dateDependency);
    }
    for (const route of ['/about/', '/resume/', '/tags/']) {
      expect(routes.get(route), route).not.toContain(dateDependency);
    }
  });
});

test.describe('Git timestamp resolution', () => {
  test('deepens a shallow clone before reading an old file timestamp', () => {
    const temporaryRoot = mkdtempSync(join(tmpdir(), 'sitemap-lastmod-test-'));
    const repository = join(temporaryRoot, 'repository');
    const shallow = join(temporaryRoot, 'shallow');

    try {
      git(temporaryRoot, ['init', '--quiet', '--initial-branch=master', repository]);
      writeFileSync(join(repository, 'old.txt'), 'old\n');
      git(repository, ['add', 'old.txt']);
      git(
        repository,
        ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', '-c', 'commit.gpgSign=false', 'commit', '--quiet', '-m', 'old'],
        { author: '2020-01-02T03:04:05Z', committer: '2020-01-02T03:04:05Z' }
      );

      writeFileSync(join(repository, 'new.txt'), 'new\n');
      git(repository, ['add', 'new.txt']);
      git(
        repository,
        ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', '-c', 'commit.gpgSign=false', 'commit', '--quiet', '-m', 'new'],
        { author: '2021-02-03T04:05:06Z', committer: '2021-02-03T04:05:06Z' }
      );

      git(temporaryRoot, [
        'clone',
        '--quiet',
        '--depth=1',
        '--branch=master',
        pathToFileURL(repository).href,
        shallow,
      ]);
      expect(git(shallow, ['rev-parse', '--is-shallow-repository'])).toBe('true');

      const resolver = createGitTimestampResolver({
        root: shallow,
        repositoryUrl: pathToFileURL(repository).href,
        allowDirty: false,
        now: () => new Date('2030-01-01T00:00:00Z'),
      });
      try {
        expect(git(shallow, ['rev-parse', '--is-shallow-repository'])).toBe('false');
        expect(resolver.lastModified(['old.txt'])).toBe('2020-01-02T03:04:05.000Z');
      } finally {
        resolver.dispose();
      }
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  test('uses a pinned commit when the source directory has no Git metadata', () => {
    const temporaryRoot = mkdtempSync(join(tmpdir(), 'sitemap-lastmod-clone-test-'));
    const repository = join(temporaryRoot, 'repository');
    const source = join(temporaryRoot, 'source');

    try {
      git(temporaryRoot, ['init', '--quiet', '--initial-branch=master', repository]);
      writeFileSync(join(repository, 'page.txt'), 'page\n');
      git(repository, ['add', 'page.txt']);
      git(
        repository,
        ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', '-c', 'commit.gpgSign=false', 'commit', '--quiet', '-m', 'page'],
        { author: '2022-03-04T05:06:07Z', committer: '2022-03-04T05:06:07Z' }
      );
      const commit = git(repository, ['rev-parse', 'HEAD']);
      mkdirSync(source);

      const resolver = createGitTimestampResolver({
        root: source,
        sourceCommit: commit,
        repositoryUrl: pathToFileURL(repository).href,
        allowDirty: false,
        now: () => new Date('2030-01-01T00:00:00Z'),
      });
      try {
        expect(resolver.lastModified(['page.txt'])).toBe('2022-03-04T05:06:07.000Z');
      } finally {
        resolver.dispose();
      }
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  test('uses file mtime for an uncommitted local change', () => {
    const temporaryRoot = mkdtempSync(join(tmpdir(), 'sitemap-lastmod-dirty-test-'));
    try {
      git(temporaryRoot, ['init', '--quiet', '--initial-branch=master']);
      const file = join(temporaryRoot, 'page.txt');
      writeFileSync(file, 'committed\n');
      git(temporaryRoot, ['add', 'page.txt']);
      git(
        temporaryRoot,
        ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', '-c', 'commit.gpgSign=false', 'commit', '--quiet', '-m', 'page'],
        { author: '2020-01-02T03:04:05Z', committer: '2020-01-02T03:04:05Z' }
      );

      writeFileSync(file, 'working tree\n');
      const localEdit = new Date('2024-05-06T07:08:09Z');
      utimesSync(file, localEdit, localEdit);

      const resolver = createGitTimestampResolver({
        root: temporaryRoot,
        allowDirty: true,
        now: () => new Date('2030-01-01T00:00:00Z'),
      });
      try {
        expect(resolver.lastModified(['page.txt'])).toBe(localEdit.toISOString());
      } finally {
        resolver.dispose();
      }
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  test('fails without a repository or a deployment commit', () => {
    const temporaryRoot = mkdtempSync(join(tmpdir(), 'sitemap-lastmod-missing-test-'));
    try {
      expect(() => createGitTimestampResolver({ root: temporaryRoot, sourceCommit: '' }))
        .toThrow(/SOURCE_COMMIT/);
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  test('fails before Astro invokes the serializer when history is unavailable', () => {
    const temporaryRoot = mkdtempSync(join(tmpdir(), 'sitemap-lastmod-eager-test-'));
    try {
      expect(() => createSitemapSerializer({
        root: temporaryRoot,
        routeDependencies: new Map([['/', ['page.txt']]]),
        sourceCommit: '',
      })).toThrow(/SOURCE_COMMIT/);
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });
});
