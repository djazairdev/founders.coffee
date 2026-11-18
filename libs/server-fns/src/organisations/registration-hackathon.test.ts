import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { eq, events, organization } from '@founders-coffee/db';
import { hackathons, organisations } from '@founders-coffee/domain';

import { setupDb, TEST_HOST_ID } from '../events/resolver.fixtures.js';
import { createHackathonDraftResolver } from '../hackathons/draft.js';
import { applyForOrganisationResolver } from './resolver.js';
import { myOrganisationResolver } from './roster.js';

describe('registering an organiser and starting a hackathon (real D1)', () => {
  it('allows immediate drafting without publishing the hackathon or bypassing suspension', async () => {
    const db = await setupDb();
    await db.run(
      sql`UPDATE markets SET feature_flags = json_set(feature_flags, '$.hackathons', json('true')) WHERE code = 'DZ'`,
    );
    const registered = await applyForOrganisationResolver(
      db,
      TEST_HOST_ID,
      organisations.organisationApplicationSchema.parse({
        name: 'New Student Builders',
        kind: 'club',
        description:
          'Students building practical software together in Algeria.',
      }),
    );
    if (!registered.ok) throw registered.error;
    const roster = await myOrganisationResolver(db, {
      userId: TEST_HOST_ID,
      slug: registered.data.slug,
    });
    expect(roster.ok && roster.data.canCreateHackathon).toBe(true);
    const startsAt = Date.now() + 30 * 86_400_000;
    const created = await createHackathonDraftResolver(db, null, {
      hostId: TEST_HOST_ID,
      organisationId: registered.data.id,
      basics: hackathons.hackathonBasicsSchema.parse({
        marketCode: 'DZ',
        cityCode: '1',
        format: 'online',
        title: 'New Builders Hackathon',
        description: 'Build something useful with students across Algeria.',
        meetingUrl: 'https://meet.example.org/builders',
        startsAt,
        endsAt: startsAt + 86_400_000,
        languages: ['ar'],
        tags: ['engineering'],
        hackathonFields: ['software_development'],
        hackathonTypeTags: ['open_source'],
      }),
    });
    if (!created.ok) throw created.error;
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, created.data.eventId));
    expect(event?.status).toBe('draft');
    await db
      .update(organization)
      .set({ status: 'suspended' })
      .where(eq(organization.id, registered.data.id));
    const suspended = await myOrganisationResolver(db, {
      userId: TEST_HOST_ID,
      slug: registered.data.slug,
    });
    expect(suspended.ok && suspended.data.canCreateHackathon).toBe(false);
  });
});
