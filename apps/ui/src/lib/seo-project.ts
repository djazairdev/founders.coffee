import type { Locale } from '@founders-coffee/i18n';

import { NO_INDEX_VALUE } from './indexation';
import { buildPageMetadata, canonicalUrl, type CanonicalRoute } from './seo';
import { jsonLdText, type JsonLdObject } from './seo-structured-data';

type ProjectHeadInput = {
  readonly locale: Locale;
  readonly title: string;
  readonly problem: string;
  readonly websiteUrl: string | null;
  readonly updatedAt: number;
  readonly marketCode: string;
  readonly isSearchIndexable: boolean;
  readonly members: readonly {
    readonly name: string;
    readonly url: string;
  }[];
  readonly route: Extract<CanonicalRoute, { readonly type: 'project' }>;
};

/**
 * The schema.org description of a project's page: a `CreativeWork` in the page's language, with the
 * members it lists as its authors and the project's own website as `sameAs` (B-PRJ-03).
 */
export const projectPageJsonLd = (input: {
  readonly title: string;
  readonly problem: string;
  readonly websiteUrl: string | null;
  readonly updatedAt: number;
  readonly url: string;
  readonly locale: Locale;
  readonly members: readonly {
    readonly name: string;
    readonly url: string;
  }[];
}): JsonLdObject => ({
  '@context': 'https://schema.org',
  '@type': 'CreativeWork',
  name: input.title,
  abstract: input.problem,
  url: input.url,
  inLanguage: input.locale,
  dateModified: new Date(input.updatedAt).toISOString(),
  ...(input.websiteUrl ? { sameAs: [input.websiteUrl] } : {}),
  ...(input.members.length > 0
    ? {
        author: input.members.map(({ name, url }) => ({
          '@type': 'Person',
          name,
          url,
        })),
      }
    : {}),
});

/**
 * A project page's title, description, canonical, alternates and structured data. Search engines are
 * told to leave it out until the team turns the search switch on.
 */
export const projectPageHead = ({
  locale,
  title,
  problem,
  websiteUrl,
  updatedAt,
  marketCode,
  isSearchIndexable,
  members,
  route,
}: ProjectHeadInput) => ({
  ...buildPageMetadata({
    locale,
    title,
    description: problem,
    route,
    marketCode,
    robots: isSearchIndexable ? 'index,follow' : NO_INDEX_VALUE,
  }),
  scripts: [
    {
      type: 'application/ld+json',
      children: jsonLdText(
        projectPageJsonLd({
          title,
          problem,
          websiteUrl,
          updatedAt,
          url: canonicalUrl(route),
          locale,
          members,
        }),
      ),
    },
  ],
});
