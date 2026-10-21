import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { discoveryFailures } from './discovery-contract.mjs';
import { fetchSmoke } from './http.mjs';
import { privateRouteFailures } from './private-contract.mjs';
import { profileFailures } from './profile-contract.mjs';
import { routeEntry } from './route-entry.mjs';
import { classifyPath, COMPANY_PAGES } from './routes.mjs';

const DEFAULT_ORIGIN = 'https://staging.founders.coffee';
const LOCALES = ['ar', 'fr', 'en'];
const PRIVATE_PATHS = [
  '/account',
  '/profile',
  '/preferences',
  '/activity',
  '/algeria/host/create',
];
const MAX_DYNAMIC_ROUTES = 25;
const MAX_UNLISTED_PROFILES = 5;
const DYNAMIC_TYPES = new Set(['city', 'event', 'profile']);
const SITEMAP_SMOKE_QUERY = '?seo_smoke=1';

const argument = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : (process.argv[index + 1] ?? fallback);
};

const origin = argument(
  '--origin',
  process.env.SEO_ORIGIN ?? DEFAULT_ORIGIN,
).replace(/\/$/u, '');
const canonicalOrigin = argument('--canonical-origin', origin).replace(
  /\/$/u,
  '',
);
const reportPath = argument('--output', 'seo-route-report.json');
const sitemapPath = argument('--sitemap-output', 'sitemap.xml');
const requireDynamic = process.argv.includes('--require-dynamic');
const maxDynamicRoutes = Number(
  argument('--max-dynamic', String(MAX_DYNAMIC_ROUTES)),
);

const absoluteUrl = (path) => new URL(path, `${origin}/`).toString();

const linksFromHtml = (html) => {
  const links = new Set();
  for (const match of html.matchAll(/href=["']([^"']+)["']/giu)) {
    const href = match[1];
    if (!href || !href.startsWith('/')) continue;
    const url = new URL(href, `${origin}/`);
    if (url.origin === origin && LOCALES.includes(url.pathname.split('/')[1]))
      links.add(url.pathname);
  }
  return [...links];
};

const fetchResponse = async (path, followRedirects = true) => {
  let current = absoluteUrl(path);
  const redirects = [];
  for (let hop = 0; hop <= 3; hop += 1) {
    const response = await fetchSmoke(current, {
      headers: { accept: 'text/html' },
      redirect: 'manual',
    });
    const location = response.headers.get('location');
    if (
      !followRedirects ||
      !location ||
      response.status < 300 ||
      response.status >= 400
    )
      return { response, body: await response.text(), redirects };
    redirects.push({ status: response.status, location });
    current = new URL(location, current).toString();
  }
  throw new Error(`${path}: redirect chain exceeded three hops`);
};

const fetchStatic = async (path) => {
  const { response, body } = await fetchResponse(path);
  return { response, body };
};

const run = async () => {
  const failures = [];
  const routes = [];
  const robotsResponse = await fetchSmoke(
    new URL('/robots.txt', `${origin}/`),
    {
      redirect: 'manual',
    },
  );
  const robots = await robotsResponse.text();
  if (robotsResponse.status !== 200)
    failures.push(`robots.txt: expected 200, got ${robotsResponse.status}`);
  if (canonicalOrigin === 'https://founders.coffee') {
    if (!robots.includes('Sitemap: https://founders.coffee/sitemap.xml'))
      failures.push('robots.txt: production sitemap reference is missing');
  } else if (!robots.includes('Disallow: /') || robots.includes('Sitemap:')) {
    failures.push(
      'robots.txt: staging must disallow crawling without a sitemap reference',
    );
  }

  const sitemapResponse = await fetchSmoke(
    new URL(`/sitemap.xml${SITEMAP_SMOKE_QUERY}`, `${origin}/`),
    {
      redirect: 'manual',
    },
  );
  const sitemap = await sitemapResponse.text();
  if (sitemapResponse.status !== 200)
    failures.push(`sitemap.xml: expected 200, got ${sitemapResponse.status}`);
  if (
    !(sitemapResponse.headers.get('content-type') ?? '').includes(
      'application/xml',
    )
  )
    failures.push('sitemap.xml: expected application/xml content type');
  if (!sitemap.includes('<urlset'))
    failures.push('sitemap.xml: urlset is missing');
  if (canonicalOrigin !== 'https://founders.coffee' && /<url>/u.test(sitemap))
    failures.push('sitemap.xml: staging sitemap must be empty');
  const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/giu)].map(
    (match) => match[1],
  );
  failures.push(...(await discoveryFailures({ origin, canonicalOrigin })));

  const paths = new Set([
    ...LOCALES.flatMap((locale) => [
      ...COMPANY_PAGES.map((page) => `/${locale}/${page}`),
      `/${locale}/algeria`,
    ]),
  ]);
  let sitemapDynamicCount = 0;
  for (const sitemapUrl of sitemapUrls) {
    try {
      const parsed = new URL(sitemapUrl);
      const type = classifyPath(parsed.pathname);
      if (parsed.origin !== origin || !type) continue;
      if (
        type === 'market' ||
        type === 'company' ||
        (sitemapDynamicCount < maxDynamicRoutes && DYNAMIC_TYPES.has(type))
      ) {
        paths.add(parsed.pathname);
        if (DYNAMIC_TYPES.has(type)) sitemapDynamicCount += 1;
      }
    } catch {
      failures.push(`sitemap.xml: invalid URL ${sitemapUrl}`);
    }
  }
  const discovery = [];
  for (const locale of LOCALES) {
    const path = `/${locale}/algeria`;
    const { response, body } = await fetchStatic(path);
    routes.push(
      routeEntry(path, 'market', response, body, failures, canonicalOrigin),
    );
    discovery.push(...linksFromHtml(body));
  }
  let dynamicCount = 0;
  for (const path of discovery) {
    const type = classifyPath(path);
    if (
      (type === 'market' || type === 'city' || type === 'event') &&
      (type === 'market' || dynamicCount < maxDynamicRoutes)
    ) {
      paths.add(path);
      if (type !== 'market') dynamicCount += 1;
    }
  }
  const profileLinks = new Set(
    discovery.filter((path) => classifyPath(path) === 'profile'),
  );
  for (const path of paths) {
    if (routes.some((route) => route.path === path)) continue;
    const type = classifyPath(path) ?? 'public';
    const { response, body } = await fetchStatic(path);
    routes.push(
      routeEntry(path, type, response, body, failures, canonicalOrigin),
    );
    if (type === 'profile')
      failures.push(
        ...profileFailures({ path, response, body, isInSitemap: true }),
      );
    if (type === 'event')
      for (const link of linksFromHtml(body))
        if (classifyPath(link) === 'profile') profileLinks.add(link);
  }
  const unlistedProfiles = [...profileLinks]
    .filter((path) => !paths.has(path))
    .slice(0, MAX_UNLISTED_PROFILES);
  for (const path of unlistedProfiles) {
    const { response, body } = await fetchResponse(path, false);
    failures.push(
      ...profileFailures({
        path,
        response,
        body,
        canonicalOrigin,
        isInSitemap: false,
      }),
    );
  }
  for (const path of PRIVATE_PATHS) {
    const { response, body } = await fetchResponse(path, false);
    failures.push(...privateRouteFailures({ path, response, body }));
  }
  const coverage = Object.fromEntries(
    ['company', 'market', 'city', 'event', 'profile'].map((type) => [
      type,
      routes.filter((route) => route.type === type).length,
    ]),
  );
  if (requireDynamic && (coverage.city === 0 || coverage.event === 0))
    failures.push(
      `dynamic route coverage missing city=${coverage.city}, event=${coverage.event}`,
    );
  const report = {
    generatedAt: new Date().toISOString(),
    origin,
    indexableExpected: canonicalOrigin === 'https://founders.coffee',
    canonicalOrigin,
    robots: { status: robotsResponse.status, body: robots },
    sitemap: { status: sitemapResponse.status, urlCount: sitemapUrls.length },
    coverage: {
      locales: LOCALES,
      classes: coverage,
      unlistedProfiles: unlistedProfiles.length,
    },
    routes: routes.sort((a, b) => a.path.localeCompare(b.path)),
    discoveredSitemapUrls: sitemapUrls,
    failures,
  };
  await mkdir(dirname(reportPath), { recursive: true });
  await mkdir(dirname(sitemapPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(sitemapPath, sitemap, 'utf8');
  process.stdout.write(
    `${JSON.stringify({ origin, routes: routes.length, failures: failures.length, reportPath, sitemapPath })}\n`,
  );
  if (failures.length > 0) process.exitCode = 1;
};

run().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
