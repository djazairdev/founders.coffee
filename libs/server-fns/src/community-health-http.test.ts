import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { createDb, eq, markets, seed } from '@founders-coffee/db';
import { handleCommunityHealthRequest } from './community-health-http.js';
const request = new Request(
  'https://admin.founders.coffee/api/community-health?market=DZ&from=2026-01-01T00:00:00Z&to=2026-02-01T00:00:00Z&asOf=2026-03-01T00:00:00Z',
);
describe('protected community report', () => {
  it('rejects non-operators and invalid windows', async () => {
    expect(
      (await handleCommunityHealthRequest(request, env.DB, 'member')).status,
    ).toBe(403);
    expect(
      (
        await handleCommunityHealthRequest(
          new Request(
            'https://admin.founders.coffee/api/community-health?market=DZ',
          ),
          env.DB,
          'admin',
        )
      ).status,
    ).toBe(400);
  });
  it('reports an unavailable operations feature instead of misleading zero retention', async () => {
    const db = createDb(env.DB);
    await seed(db);
    await db
      .update(markets)
      .set({ featureFlags: { communityOperations: false } })
      .where(eq(markets.code, 'DZ'));
    const response = await handleCommunityHealthRequest(
      request,
      env.DB,
      'admin',
    );
    expect(await response.json()).toMatchObject({ available: false });
  });
  it('reports null rates on enabled but empty evidence', async () => {
    const db = createDb(env.DB);
    await seed(db);
    await db
      .update(markets)
      .set({ featureFlags: { communityOperations: true } })
      .where(eq(markets.code, 'DZ'));
    const response = await handleCommunityHealthRequest(
      request,
      env.DB,
      'moderator',
    );
    expect(await response.json()).toMatchObject({
      available: true,
      hostRetention60d: { numerator: 0, denominator: 0, value: null },
    });
  });
  it('rejects an unknown operator rather than claiming every host is independent', async () => {
    const withOperator = new Request(
      `${request.url}&operatorHostId=nonexistent_operator`,
    );
    expect(
      (await handleCommunityHealthRequest(withOperator, env.DB, 'admin'))
        .status,
    ).toBe(400);
  });
});
