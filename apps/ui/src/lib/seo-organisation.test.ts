import { describe, expect, it } from 'vitest';

import type { Locale } from '@founders-coffee/i18n';
import { runWithContext } from '@founders-coffee/observability/context';

import { canonicalPath } from './seo';
import { organisationPageHead } from './seo-organisation';

const ORIGIN = 'https://founders.coffee';

const head = (
  locale: Locale,
  changes: { description?: string; websiteUrl?: string | null } = {},
) =>
  runWithContext({ siteOrigin: ORIGIN }, () =>
    organisationPageHead({
      locale,
      name: 'Code Club',
      description: 'Weekly coding evenings for students in Algiers.',
      websiteUrl: 'https://codeclub.example.org',
      marketCode: 'DZ',
      route: { type: 'organisation', slug: 'code-club', locale },
      ...changes,
    }),
  );

const structured = (page: ReturnType<typeof head>) =>
  JSON.parse(page.scripts[0]?.children ?? 'null') as Record<string, unknown>;

describe("an organisation page's head (B-ORG-11)", () => {
  it('lives at /{locale}/o/{slug}', () => {
    expect(canonicalPath({ type: 'organisation', slug: 'code-club' })).toBe(
      '/o/code-club',
    );
    expect(
      canonicalPath({ type: 'organisation', slug: 'code-club', locale: 'ar' }),
    ).toBe('/ar/o/code-club');
  });

  it.each(['ar', 'fr', 'en'] as const)(
    'is canonical to itself in %s, with every language beside it, and indexable',
    (locale) => {
      const page = head(locale);

      expect(page.links[0]).toEqual({
        rel: 'canonical',
        href: `${ORIGIN}/${locale}/o/code-club`,
      });
      expect(
        page.links.flatMap((link) =>
          'hrefLang' in link ? [[link.hrefLang, link.href]] : [],
        ),
      ).toEqual([
        ['ar', `${ORIGIN}/ar/o/code-club`],
        ['en', `${ORIGIN}/en/o/code-club`],
        ['fr', `${ORIGIN}/fr/o/code-club`],
        ['x-default', `${ORIGIN}/ar/o/code-club`],
      ]);
      expect(page.meta).toContainEqual({
        name: 'robots',
        content: 'index,follow',
      });
      expect(page.meta).toContainEqual({
        title: 'Founders Coffee - Code Club',
      });
    },
  );

  it('describes a profile page whose main entity is the organisation', () => {
    expect(structured(head('fr'))).toEqual({
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      name: 'Code Club',
      url: `${ORIGIN}/fr/o/code-club`,
      inLanguage: 'fr',
      mainEntity: {
        '@type': 'Organization',
        name: 'Code Club',
        description: 'Weekly coding evenings for students in Algiers.',
        url: `${ORIGIN}/fr/o/code-club`,
        sameAs: ['https://codeclub.example.org'],
      },
    });
    expect(
      structured(head('en', { websiteUrl: null })).mainEntity,
    ).not.toHaveProperty('sameAs');
  });

  it('keeps text from closing its script element', () => {
    const page = head('en', {
      description: 'Evenings </script><script>alert(1)</script> for builders.',
    });

    expect(page.scripts[0]?.children).not.toContain('</script>');
    expect(
      (structured(page).mainEntity as { description: string }).description,
    ).toBe('Evenings </script><script>alert(1)</script> for builders.');
  });
});
