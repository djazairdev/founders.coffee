import { profile_meta_description, type Locale } from '@founders-coffee/i18n';

import { INDEX_VALUE, NO_INDEX_VALUE } from './indexation';
import { buildPageMetadata, buildPageTitle, canonicalUrl } from './seo';
import { jsonLdText, type JsonLdObject } from './seo-structured-data';

export type IndexableProfile = {
  readonly userId: string;
  readonly displayName: string;
  readonly headline: string | null;
  readonly introduction: string | null;
  readonly links: readonly { readonly url: string }[];
  readonly indexable: boolean;
};

/** The `X-Robots-Tag` a profile page answers with: listed only when its member turned that on. */
export const profileRobots = (profile: IndexableProfile | undefined): string =>
  profile?.indexable ? INDEX_VALUE : NO_INDEX_VALUE;

/**
 * The schema.org `ProfilePage` for a listed profile, its `Person` holding what the member published.
 *
 * The profile reaches here as the public projection, which has already dropped every field the
 * member kept to themselves, so the links in `sameAs` are the ones shown on the page.
 */
export const profilePageJsonLd = (
  profile: IndexableProfile,
  locale: Locale,
  url: string,
  description: string,
): JsonLdObject => ({
  '@context': 'https://schema.org',
  '@type': 'ProfilePage',
  name: profile.displayName,
  description,
  url,
  inLanguage: locale,
  mainEntity: {
    '@type': 'Person',
    name: profile.displayName,
    url,
    ...(profile.headline ? { description: profile.headline } : {}),
    ...(profile.links.length > 0
      ? { sameAs: profile.links.map((link) => link.url) }
      : {}),
  },
});

/**
 * A profile page's head: a bare title and `noindex` unless its member chose to be listed, and then
 * a canonical, the other languages and the `ProfilePage` JSON-LD.
 */
export const profilePageHead = (
  locale: Locale,
  fallbackTitle: string,
  profile: IndexableProfile | undefined,
) => {
  if (!profile?.indexable)
    return {
      meta: [
        { title: buildPageTitle(profile?.displayName ?? fallbackTitle) },
        { name: 'robots', content: NO_INDEX_VALUE },
      ],
    };
  const route = { type: 'profile', userId: profile.userId, locale } as const;
  const description =
    profile.headline ??
    profile.introduction ??
    profile_meta_description({ name: profile.displayName }, { locale });
  const metadata = buildPageMetadata({
    locale,
    title: profile.displayName,
    description,
    route,
  });
  return {
    ...metadata,
    scripts: [
      {
        type: 'application/ld+json',
        children: jsonLdText(
          profilePageJsonLd(profile, locale, canonicalUrl(route), description),
        ),
      },
    ],
  };
};
