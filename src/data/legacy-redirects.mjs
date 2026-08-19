// Only URLs that were actually published before commit 469fd6c belong here.
// Keep this explicit: deriving historical routes from today's posts creates
// aliases that never existed and turns every new post into a duplicate page.
export const legacyPostRedirects = {
  '/posts/2024-01-13---setup-macbook/': '/posts/2024-01-13-setup-macbook/',
  '/posts/2025-02-05---setup-macbook/': '/posts/2025-02-05-setup-macbook/',
  '/posts/2025-03-04---using-notebooklm/': '/posts/2025-03-04-using-notebooklm/',
  '/posts/2025-10-26---engineering-principles/': '/posts/2025-10-26-engineering-principles/',
  '/posts/2026-05-29---era-of-agents-what-is-coming/': '/posts/2026-05-29-era-of-agents-what-is-coming/',
  '/posts/2026-06-10---setup-macbook/': '/posts/2026-06-10-setup-macbook/',
  '/posts/2026-06-25---era-of-agents/': '/posts/2026-06-25-era-of-agents/',
  '/posts/2026-07-07---era-of-agents-internet-agent-first/': '/posts/2026-07-07-era-of-agents-internet-agent-first/',
};

export const legacyTagRedirects = {
  '/tags/software development/': '/tags/software-development/',
};
