import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import { atMigration, priorHost } from './migrations.fixtures.js';

describe('0045 — the hackathons notification category (real D1)', () => {
  it('turns hackathon notices on, by push and email, and leaves every other choice alone', async () => {
    const { apply } = await atMigration('0045_hackathon_notifications.sql');
    await env.PRIOR_DB.prepare(
      `INSERT INTO account_preferences
         (user_id, event_updates, event_updates_channels, meetup_chat, meetup_chat_channels,
          follow_up_prompts, follow_up_prompts_channels, revision)
       VALUES (?, 0, 0, 0, 0, 1, 4, 7)`,
    )
      .bind(priorHost.id)
      .run();

    await apply();

    expect(
      await env.PRIOR_DB.prepare(
        `SELECT event_updates, event_updates_channels, meetup_chat, meetup_chat_channels,
                follow_up_prompts, follow_up_prompts_channels, hackathons, hackathons_channels,
                revision
           FROM account_preferences WHERE user_id = ?`,
      )
        .bind(priorHost.id)
        .first(),
    ).toEqual({
      event_updates: 0,
      event_updates_channels: 0,
      meetup_chat: 0,
      meetup_chat_channels: 0,
      follow_up_prompts: 1,
      follow_up_prompts_channels: 4,
      hackathons: 1,
      hackathons_channels: 5,
      revision: 7,
    });
  });
});
