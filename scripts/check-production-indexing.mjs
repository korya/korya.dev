import { legacyPostRedirects, legacyTagRedirects } from '../src/data/legacy-redirects.mjs';

const SITE = 'https://korya.dev';
const DEFAULT_HOST = process.env.DO_DEFAULT_HOST ?? 'https://korya-dev-e84h7.ondigitalocean.app';

const checks = [
  {
    source: 'https://www.korya.dev/about/',
    target: `${SITE}/about/`,
    label: 'www host',
  },
  {
    source: `${DEFAULT_HOST}/about/`,
    target: `${SITE}/about/`,
    label: 'DigitalOcean default host',
  },
  ...Object.entries({ ...legacyPostRedirects, ...legacyTagRedirects }).flatMap(
    ([source, target]) => {
      const withoutSlash = source.endsWith('/') ? source.slice(0, -1) : source;
      return [source, withoutSlash].map((variant) => ({
        source: new URL(variant, SITE).href,
        target: new URL(target, SITE).href,
        label: variant,
      }));
    }
  ),
  {
    source: `${SITE}/resume/offline`,
    target: `${SITE}/resume/offline.pdf`,
    label: '/resume/offline',
  },
  {
    source: `${SITE}/resume/offline/`,
    target: `${SITE}/resume/offline.pdf`,
    label: '/resume/offline/',
  },
];

let failed = false;

for (const check of checks) {
  const response = await fetch(check.source, { redirect: 'manual' });
  const location = response.headers.get('location');
  const resolvedLocation = location ? new URL(location, check.source).href : null;
  const statusOK = response.status === 301 || response.status === 308;
  const locationOK = resolvedLocation === check.target;

  if (!statusOK || !locationOK) {
    failed = true;
    console.error(
      `FAIL ${check.label}: ${response.status} ${location ?? '(no Location)'}; expected permanent redirect to ${check.target}`
    );
  } else {
    console.log(`PASS ${check.label}: ${response.status} -> ${resolvedLocation}`);
  }
}

if (failed) process.exitCode = 1;
