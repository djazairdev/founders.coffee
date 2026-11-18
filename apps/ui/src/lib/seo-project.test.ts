import { describe, expect, it } from 'vitest';

import { projectPageHead } from './seo-project';

const INPUT = {
  locale: 'fr' as const,
  title: 'Ledger',
  problem: 'A corner shop cannot see who owes it money.',
  websiteUrl: 'https://ledger.example',
  updatedAt: Date.parse('2099-01-02T03:04:05Z'),
  marketCode: 'DZ',
  isSearchIndexable: true,
  members: [{ name: 'Rania', url: 'https://founders.coffee/fr/u/usr_1' }],
  route: {
    type: 'project' as const,
    slug: 'ledger-ab12',
    locale: 'fr' as const,
  },
};

const robotsOf = (head: ReturnType<typeof projectPageHead>) =>
  head.meta.find((tag) => 'name' in tag && tag.name === 'robots');

describe('projectPageHead', () => {
  it('describes the project as a CreativeWork at its own address', () => {
    const head = projectPageHead(INPUT);
    const data = JSON.parse(head.scripts[0]?.children ?? '{}');

    expect(data).toMatchObject({
      '@type': 'CreativeWork',
      name: 'Ledger',
      abstract: INPUT.problem,
      inLanguage: 'fr',
      dateModified: '2099-01-02T03:04:05.000Z',
      sameAs: ['https://ledger.example'],
      author: [{ '@type': 'Person', name: 'Rania' }],
    });
    expect(data.url).toMatch(/\/fr\/p\/ledger-ab12$/u);
    expect(robotsOf(head)).toMatchObject({ content: 'index,follow' });
  });

  it('tells search engines to leave it out until the team turns search on', () => {
    expect(
      robotsOf(projectPageHead({ ...INPUT, isSearchIndexable: false })),
    ).toMatchObject({ content: 'noindex, nofollow' });
  });
});
