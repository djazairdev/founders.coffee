import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import { atMigration, columnNames } from './migrations.fixtures.js';

const member = (suffix: string, name: string) =>
  `usr_portfolio_${name}_${suffix}`;

const insertMember = async (
  id: string,
  professionalLink: string | null,
  isPublished: boolean,
) => {
  await env.PRIOR_DB.batch([
    env.PRIOR_DB.prepare(
      'INSERT INTO user (id, name, email, email_verified, role) VALUES (?, ?, ?, 0, ?)',
    ).bind(id, 'Portfolio Member', `${id}@test.coffee`, 'member'),
    env.PRIOR_DB.prepare(
      'INSERT INTO member_profiles (user_id, professional_link, publish_professional_link) VALUES (?, ?, ?)',
    ).bind(id, professionalLink, isPublished ? 1 : 0),
  ]);
};

const profileRow = (id: string) =>
  env.PRIOR_DB.prepare('SELECT * FROM member_profiles WHERE user_id = ?')
    .bind(id)
    .first<Record<string, unknown>>();

describe('0048 — portfolio fields (real D1)', () => {
  it('adds empty, unpublished portfolio fields and moves the professional link into the links', async () => {
    const { suffix, apply } = await atMigration('0048_portfolio_fields.sql');
    const empty = member(suffix, 'empty');
    const published = member(suffix, 'published');
    const hidden = member(suffix, 'hidden');
    await insertMember(empty, null, false);
    await insertMember(published, 'https://github.com/amina?tab="repos"', true);
    await insertMember(hidden, 'https://amina.dz/work', false);

    await apply();

    expect(await columnNames('member_profiles')).toEqual(
      expect.arrayContaining([
        'skills',
        'links',
        'open_to',
        'publish_skills',
        'publish_links',
        'publish_open_to',
      ]),
    );
    const cleared = { professional_link: null, publish_professional_link: 0 };
    expect(await profileRow(empty)).toMatchObject({
      ...cleared,
      skills: '[]',
      links: '[]',
      open_to: '[]',
      publish_skills: 0,
      publish_links: 0,
      publish_open_to: 0,
    });
    const moved = await profileRow(published);
    expect(moved).toMatchObject({ ...cleared, publish_links: 1 });
    expect(JSON.parse(String(moved?.links))).toEqual([
      'https://github.com/amina?tab="repos"',
    ]);
    const kept = await profileRow(hidden);
    expect(kept).toMatchObject({ ...cleared, publish_links: 0 });
    expect(JSON.parse(String(kept?.links))).toEqual(['https://amina.dz/work']);
  });
});
