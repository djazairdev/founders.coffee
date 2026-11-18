import type { Locale } from '@founders-coffee/i18n';

import { buildPageMetadata, canonicalUrl, type CanonicalRoute } from './seo';
import { jsonLdText, type JsonLdObject } from './seo-structured-data';

type OrganisationHeadInput = {
  readonly locale: Locale;
  readonly name: string;
  readonly description: string;
  readonly websiteUrl: string | null;
  readonly marketCode: string;
  readonly route: Extract<CanonicalRoute, { readonly type: 'organisation' }>;
};

/**
 * The schema.org description of an organisation's page: a `ProfilePage`, in the page's language,
 * whose main entity is the `Organization` itself, with its own website as `sameAs` (B-ORG-11).
 */
export const organisationPageJsonLd = (input: {
  readonly name: string;
  readonly description: string;
  readonly websiteUrl: string | null;
  readonly url: string;
  readonly locale: Locale;
}): JsonLdObject => ({
  '@context': 'https://schema.org',
  '@type': 'ProfilePage',
  name: input.name,
  url: input.url,
  inLanguage: input.locale,
  mainEntity: {
    '@type': 'Organization',
    name: input.name,
    description: input.description,
    url: input.url,
    ...(input.websiteUrl ? { sameAs: [input.websiteUrl] } : {}),
  },
});

/** An organisation page's title, description, canonical, alternates and structured data. */
export const organisationPageHead = ({
  locale,
  name,
  description,
  websiteUrl,
  marketCode,
  route,
}: OrganisationHeadInput) => {
  const metadata = buildPageMetadata({
    locale,
    title: name,
    description,
    route,
    marketCode,
  });
  return {
    ...metadata,
    scripts: [
      {
        type: 'application/ld+json',
        children: jsonLdText(
          organisationPageJsonLd({
            name,
            description,
            websiteUrl,
            url: canonicalUrl(route),
            locale,
          }),
        ),
      },
    ],
  };
};
