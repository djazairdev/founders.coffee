import { describe, expect, it } from 'vitest';

import type { SitemapData } from '@founders-coffee/server-fns';

import { emptySitemapXml, sitemapItems, sitemapXml } from './sitemap';

const data: SitemapData = {
  markets: [{ slug: 'algeria' }],
  cities: [{ market: 'algeria', city: 'algiers' }],
  events: [
    {
      market: 'algeria',
      slug: 'coffee-and-code',
      updatedAt: new Date('2026-09-13T08:00:00.000Z'),
    },
  ],
  profiles: [{ userId: 'usr_listed' }],
};

describe('sitemap', () => {
  it('emits localized canonical public paths without duplicates', () => {
    const items = sitemapItems(data);
    const paths = items.map(({ path }) => path);

    expect(paths).toHaveLength(39);
    expect(paths).toContain('/ar/community');
    expect(paths).toContain('/ar/faq');
    expect(paths).toContain('/fr/faq');
    expect(paths).toContain('/fr/community');
    expect(paths).toContain('/ar/algeria');
    expect(paths).toContain('/fr/algeria/algiers');
    expect(paths).toContain('/en/algeria/e/coffee-and-code');
    for (const locale of ['ar', 'fr', 'en'])
      expect(paths).toContain(`/${locale}/u/usr_listed`);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('renders escaped absolute XML locations and event last-modified values', () => {
    const xml = sitemapXml('https://founders.coffee/', sitemapItems(data));

    expect(xml).toContain(
      '<loc>https://founders.coffee/en/algeria/e/coffee-and-code</loc>',
    );
    expect(xml).toContain('<lastmod>2026-09-13T08:00:00.000Z</lastmod>');
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/u);
    expect(xml).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    );
  });

  it('lists a profile its member chose to show in search engines, with no last-modified date', () => {
    const xml = sitemapXml('https://founders.coffee', sitemapItems(data));

    expect(xml).toContain(
      '<url><loc>https://founders.coffee/ar/u/usr_listed</loc></url>',
    );
    expect(
      sitemapItems({ ...data, profiles: [] }).some(({ path }) =>
        path.includes('/u/'),
      ),
    ).toBe(false);
  });

  it('returns an empty valid sitemap for non-production origins', () => {
    expect(emptySitemapXml('https://staging.founders.coffee')).toBe(
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\n</urlset>',
    );
  });
});
