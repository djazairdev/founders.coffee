import { describe, expect, it } from 'vitest';

import { inspectGeoDocument } from './geo-contract.mjs';

const document = ({ name, url }) => `
  <html lang="en">
    <head>
      <script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name,
        url,
        inLanguage: 'en',
      })}</script>
    </head>
    <body><h1>${name}</h1><h2>Details</h2></body>
  </html>
`;

describe('GEO visible text', () => {
  it('does not count script text as visible when an end tag has whitespace', () => {
    const url = 'https://founders.coffee/en/algeria';
    const body = document({ name: 'Hidden name', url })
      .replace('<h1>Hidden name</h1>', '<h1>Visible name</h1>')
      .replace('</body>', '<script>Hidden name</script ></body>');

    expect(
      inspectGeoDocument({
        path: '/en/algeria',
        type: 'market',
        body,
        canonical: url,
      }),
    ).toContain('CollectionPage name is not visible in the document');
  });

  it('decodes HTML entities in one pass when checking visible names', () => {
    const url = 'https://founders.coffee/en/algeria';
    const name = 'Builders &quot;literal&quot;';
    const body = document({ name, url }).replace(
      `<h1>${name}</h1>`,
      '<h1>Builders &amp;quot;literal&amp;quot;</h1>',
    );

    expect(
      inspectGeoDocument({
        path: '/en/algeria',
        type: 'market',
        body,
        canonical: url,
      }),
    ).toEqual([]);
  });
});
