import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import { atMigration } from './migrations.fixtures.js';
import { PLATFORM_ORGANISATION } from './seed.js';

const platformRow = () =>
  env.PRIOR_DB.prepare(
    `SELECT id, name, slug, kind, status, market_code, city_code, description, website_url
     FROM organization WHERE slug = 'founders-coffee'`,
  ).all();

describe('0051 — the platform organisation (real D1)', () => {
  it('inserts the approved platform organisation the seed declares, once', async () => {
    const { apply } = await atMigration('0051_platform_organisation.sql');

    await apply();

    expect((await platformRow()).results).toEqual([
      {
        id: PLATFORM_ORGANISATION.id,
        name: PLATFORM_ORGANISATION.name,
        slug: PLATFORM_ORGANISATION.slug,
        kind: 'platform',
        status: 'approved',
        market_code: 'DZ',
        city_code: null,
        description: PLATFORM_ORGANISATION.description,
        website_url: PLATFORM_ORGANISATION.websiteUrl,
      },
    ]);
  });

  it('yields to the row already there when it runs again', async () => {
    await env.PRIOR_DB.prepare(
      "UPDATE organization SET description = 'Edited by an operator.' WHERE id = ?",
    )
      .bind(PLATFORM_ORGANISATION.id)
      .run();
    const sql = env.TEST_MIGRATIONS.find(
      (migration) => migration.name === '0051_platform_organisation.sql',
    )?.queries;
    expect(sql?.length).toBeGreaterThan(0);
    for (const query of sql ?? []) await env.PRIOR_DB.prepare(query).run();

    const { results } = await platformRow();
    expect(results).toHaveLength(1);
    expect(results[0]?.description).toBe('Edited by an operator.');
  });
});
