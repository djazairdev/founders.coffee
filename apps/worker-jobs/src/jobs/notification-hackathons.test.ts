import { beforeEach, describe, expect, it } from 'vitest';

import { type Db, type ScheduledNotification } from '@founders-coffee/db';

import { resolveDestination } from './notification-destination.js';
import {
  MEMBER_ID,
  addPushToken,
  setPreferences,
  setupDb,
} from './notification-sweep.fixtures.js';

const HACKATHON_NOTICE =
  'hackathon_registration_confirmed' as unknown as ScheduledNotification['templateKey'];

describe('the Hackathons category at send time', () => {
  let db: Db;

  beforeEach(async () => {
    db = await setupDb();
    await addPushToken(db, 'device-hackathons');
    await setPreferences(db, { pushEnabled: true });
  });

  it('sends a hackathon notice by push and email while the category is on', async () => {
    const push = await resolveDestination(
      db,
      'push',
      MEMBER_ID,
      HACKATHON_NOTICE,
    );
    const email = await resolveDestination(
      db,
      'email',
      MEMBER_ID,
      HACKATHON_NOTICE,
    );

    expect(push.ok).toBe(true);
    expect(email.ok).toBe(true);
  });

  it('refuses it on every channel once the member turns the category off', async () => {
    await setPreferences(db, { hackathons: false, hackathonsChannels: 0 });

    for (const channel of ['push', 'email'] as const) {
      const result = await resolveDestination(
        db,
        channel,
        MEMBER_ID,
        HACKATHON_NOTICE,
      );
      expect(result).toMatchObject({
        ok: false,
        reason: 'hackathons_off',
        account: true,
      });
    }
  });

  it('keeps to the channels the member chose', async () => {
    await setPreferences(db, { hackathons: true, hackathonsChannels: 4 });

    const push = await resolveDestination(
      db,
      'push',
      MEMBER_ID,
      HACKATHON_NOTICE,
    );
    const email = await resolveDestination(
      db,
      'email',
      MEMBER_ID,
      HACKATHON_NOTICE,
    );

    expect(push).toMatchObject({ ok: false, reason: 'push_disabled' });
    expect(email.ok).toBe(true);
  });

  it('leaves every other notice alone when hackathons are off', async () => {
    await setPreferences(db, { hackathons: false, hackathonsChannels: 0 });

    const reminder = await resolveDestination(
      db,
      'email',
      MEMBER_ID,
      'reminder_24h',
    );

    expect(reminder.ok).toBe(true);
  });
});
