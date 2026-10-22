import {
  createDb,
  events,
  organization,
  seed,
  user,
} from '@founders-coffee/db';
import {
  createExecutionContext,
  env,
  waitOnExecutionContext,
} from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';

import worker from '../src/server';

const ORIGIN = 'https://founders.coffee';
const productionEnv = {
  ...env,
  APP_ENVIRONMENT: 'production',
  APP_URL: ORIGIN,
};

const PROBE = '</script><i id="fc-probe">x</i>';
const TITLE = `Probe${PROBE}`;
const DESCRIPTION = `A meetup whose words end its script${PROBE}<!--<script>`;
const ORGANISATION_NAME = `Probe club${PROBE}`;
const ORGANISATION_DESCRIPTION = `A club whose words end its script${PROBE}`;
const EVENT_SLUG = 'json-ld-probe-meetup';
const ORGANISATION_SLUG = 'json-ld-probe-club';

const fetchDocument = async (pathname: string): Promise<string> => {
  const context = createExecutionContext();
  const response = await worker.fetch(
    new Request(`${ORIGIN}${pathname}`, { headers: { accept: 'text/html' } }),
    productionEnv,
    context,
  );
  await waitOnExecutionContext(context);
  expect(response.status, pathname).toBe(200);
  return response.text();
};

const jsonLd = (body: string): Record<string, unknown>[] =>
  [
    ...body.matchAll(
      /<script\b(?=[^>]*\btype=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/giu,
    ),
  ].map((match) => JSON.parse(match[1]) as Record<string, unknown>);

const ofType = (
  schemas: readonly Record<string, unknown>[],
  type: string,
): Record<string, unknown> => {
  const schema = schemas.find((candidate) => candidate['@type'] === type);
  expect(schema, `no ${type} JSON-LD`).toBeDefined();
  return schema ?? {};
};

const listedNames = (schema: Record<string, unknown>): string[] => {
  const mainEntity = schema.mainEntity as {
    itemListElement: { name: string }[];
  };
  return mainEntity.itemListElement.map((element) => element.name);
};

const expectNoMarkupFromProbe = (body: string, pathname: string) => {
  expect(body, pathname).toContain('Probe');
  expect(body, pathname).not.toContain('<i id="fc-probe">');
  expect(body, pathname).not.toContain('</script><i');
  expect(body, pathname).not.toContain('<!--<script>');
};

describe('JSON-LD written from what members typed', () => {
  beforeAll(async () => {
    const db = createDb(env.DB);
    await seed(db);
    await db
      .insert(user)
      .values({
        id: 'usr_json_ld_probe',
        name: 'JSON-LD probe host',
        email: 'json-ld-probe@test.coffee',
        role: 'host',
      })
      .onConflictDoNothing()
      .run();
    await db
      .insert(events)
      .values({
        id: 'evt_json_ld_probe',
        hostId: 'usr_json_ld_probe',
        marketCode: 'DZ',
        stateCode: '16',
        cityCode: '556',
        title: TITLE,
        description: DESCRIPTION,
        venue: 'Café des Délices',
        startsAt: new Date('2099-03-15T18:00:00Z'),
        language: 'en',
        slug: EVENT_SLUG,
        status: 'published',
      })
      .onConflictDoNothing()
      .run();
    await db
      .insert(organization)
      .values({
        id: 'org_json_ld_probe',
        name: ORGANISATION_NAME,
        slug: ORGANISATION_SLUG,
        kind: 'club',
        status: 'approved',
        marketCode: 'DZ',
        description: ORGANISATION_DESCRIPTION,
      })
      .onConflictDoNothing()
      .run();
  });

  it("keeps a meetup's title and description inside their scripts", async () => {
    const pathname = `/en/algeria/e/${EVENT_SLUG}`;
    const body = await fetchDocument(pathname);

    expectNoMarkupFromProbe(body, pathname);
    const schemas = jsonLd(body);
    const event = ofType(schemas, 'Event');
    expect(event.name).toBe(TITLE);
    expect(event.description).toBe(DESCRIPTION);
    const trail = ofType(schemas, 'BreadcrumbList') as {
      itemListElement: { name: string }[];
    };
    expect(trail.itemListElement.map((crumb) => crumb.name)).toContain(TITLE);
  });

  it('keeps the meetup inside the city and market listings', async () => {
    for (const pathname of ['/en/algeria/algiers', '/en/algeria']) {
      const body = await fetchDocument(pathname);

      expectNoMarkupFromProbe(body, pathname);
      expect(listedNames(ofType(jsonLd(body), 'CollectionPage'))).toContain(
        TITLE,
      );
    }
  });

  it("keeps an organisation's name and description inside its script", async () => {
    const pathname = `/en/o/${ORGANISATION_SLUG}`;
    const body = await fetchDocument(pathname);

    expectNoMarkupFromProbe(body, pathname);
    const page = ofType(jsonLd(body), 'ProfilePage');
    expect(page.name).toBe(ORGANISATION_NAME);
    expect(page.mainEntity).toMatchObject({
      name: ORGANISATION_NAME,
      description: ORGANISATION_DESCRIPTION,
    });
  });
});
