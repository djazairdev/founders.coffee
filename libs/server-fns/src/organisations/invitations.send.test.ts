import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';

import { AppError, err } from '@founders-coffee/core';
import { eq, invitation, user } from '@founders-coffee/db';
import type { EmailProvider } from '@founders-coffee/email';
import { setLogger, type LogEntry } from '@founders-coffee/observability';
import { createServerLogger } from '@founders-coffee/observability/server';

import {
  codeOf,
  DAY_MS,
  freshTestbed,
  invite,
  invited,
  sent,
  signedInMember,
  statusOf,
  type Testbed,
} from './invitations.fixtures.js';

const entries: LogEntry[] = [];
let bed: Testbed;

describe('sending organisation invitations (B-ORG-05, real D1)', () => {
  beforeEach(async () => {
    entries.length = 0;
    setLogger(
      createServerLogger({
        level: 'debug',
        transport: (entry) => {
          entries.push(entry);
        },
      }),
    );
    bed = await freshTestbed();
  });

  it('invites an address for seven days and emails it a link, in the market language', async () => {
    const before = Date.now();
    const result = await invite(bed, 'newcomer@invite.test');
    if (!result.ok) throw result.error;

    const expiry = result.data.expiresAt.getTime() - before;
    expect(expiry).toBeGreaterThan(7 * DAY_MS - 60_000);
    expect(expiry).toBeLessThanOrEqual(7 * DAY_MS + 60_000);
    expect(await statusOf(bed.db, result.data.invitationId)).toBe('pending');
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe('newcomer@invite.test');
    expect(sent[0]?.subject).toContain('Code Club');
    expect(sent[0]?.html).toContain('dir="rtl"');
    expect(sent[0]?.html).toContain(
      `${env.APP_URL}/ar/o/invitations/${result.data.invitationId}`,
    );
  });

  it('writes to a member in the language they chose, and names the admin role', async () => {
    const someone = await signedInMember();
    await bed.db
      .update(user)
      .set({ localePref: 'fr' })
      .where(eq(user.id, someone.userId));

    const id = await invited(bed, someone.email, 'admin');

    expect(sent[0]?.subject).toMatch(
      /^Rejoignez Code Club \d+ sur Founders Coffee$/,
    );
    expect(sent[0]?.text).toContain('avec un rôle d’administration');
    expect(sent[0]?.html).toContain(`/fr/o/invitations/${id}`);
  });

  it('sends a pending invitation again, with fresh days, instead of refusing it', async () => {
    const first = await invited(bed, 'twice@invite.test');
    await bed.db
      .update(invitation)
      .set({ expiresAt: new Date(Date.now() + DAY_MS) })
      .where(eq(invitation.id, first));

    const again = await invite(bed, 'twice@invite.test');
    if (!again.ok) throw again.error;

    expect(again.data.invitationId).toBe(first);
    expect(again.data.expiresAt.getTime()).toBeGreaterThan(
      Date.now() + 6 * DAY_MS,
    );
    expect(sent).toHaveLength(2);
  });

  it('refuses an address already in the organisation, and sends nothing', async () => {
    expect(codeOf(await invite(bed, bed.owner.email))).toBe(
      'organisation_already_member',
    );
    expect(sent).toEqual([]);
  });

  it('writes the invitation, logs that it was not sent, and never the address, without a provider', async () => {
    const result = await invite(bed, 'unbound@invite.test', 'member', null);
    if (!result.ok) throw result.error;

    expect(await statusOf(bed.db, result.data.invitationId)).toBe('pending');
    expect(
      entries.find(
        (entry) => entry.msg === 'organisation_invitation_email_unbound',
      ),
    ).toMatchObject({ invitationId: result.data.invitationId });
    expect(JSON.stringify(entries)).not.toContain('unbound@invite.test');
  });

  it('keeps the invitation and logs the failure when the email cannot be sent', async () => {
    const failing: EmailProvider = {
      name: 'failing',
      send: async () =>
        err(new AppError('email_rate_limited', 'Email send failed')),
    };

    const result = await invite(bed, 'bounced@invite.test', 'member', failing);
    if (!result.ok) throw result.error;

    expect(await statusOf(bed.db, result.data.invitationId)).toBe('pending');
    expect(
      entries.find(
        (entry) => entry.msg === 'organisation_invitation_email_failed',
      ),
    ).toMatchObject({
      invitationId: result.data.invitationId,
      code: 'email_rate_limited',
    });
  });
});
