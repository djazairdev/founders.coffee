import { beforeEach, describe, expect, it } from 'vitest';

import {
  eq,
  invitation,
  member,
  organization,
  user,
} from '@founders-coffee/db';

import {
  answer,
  codeOf,
  DAY_MS,
  freshTestbed,
  invited,
  signedInMember,
  type Member,
  type Testbed,
} from './invitations.fixtures.js';
import { invitationPageResolver } from './invitation-page.js';
import {
  acceptInvitationResolver,
  rejectInvitationResolver,
} from './invitations.js';

let bed: Testbed;

const inviteeOf = async (person: Member) => {
  const [row] = await bed.db
    .select()
    .from(user)
    .where(eq(user.id, person.userId));
  if (!row) throw new Error('no such member');
  return { id: row.id, email: row.email, emailVerified: row.emailVerified };
};

const pageFor = async (person: Member, invitationId: string) =>
  invitationPageResolver(bed.db, {
    invitee: await inviteeOf(person),
    invitationId,
  });

const stateFor = async (person: Member, invitationId: string) => {
  const result = await pageFor(person, invitationId);
  if (!result.ok) throw result.error;
  return result.data.state;
};

const setInvitation = (
  invitationId: string,
  changes: Partial<typeof invitation.$inferInsert>,
) =>
  bed.db.update(invitation).set(changes).where(eq(invitation.id, invitationId));

describe('the invitation page (B-ORG-10, real D1)', () => {
  beforeEach(async () => {
    bed = await freshTestbed();
  });

  it('shows its recipient the organisation, the role and who invited them', async () => {
    const recipient = await signedInMember();
    const invitationId = await invited(bed, recipient.email, 'admin');
    const [organisation] = await bed.db
      .select()
      .from(organization)
      .where(eq(organization.id, bed.organisationId));
    const [owner] = await bed.db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, bed.owner.userId));

    const result = await pageFor(recipient, invitationId);

    expect(result).toEqual({
      ok: true,
      data: {
        id: invitationId,
        organisationName: organisation?.name,
        organisationSlug: organisation?.slug,
        marketCode: 'DZ',
        role: 'admin',
        inviterName: owner?.name,
        expiresAt: expect.any(Date),
        state: 'pending',
        isEmailVerified: true,
      },
    });
  });

  it('answers as not found to anyone else, and to an id that does not exist', async () => {
    const recipient = await signedInMember();
    const stranger = await signedInMember();
    const invitationId = await invited(bed, recipient.email);

    expect(codeOf(await pageFor(stranger, invitationId))).toBe(
      'organisation_invitation_not_found',
    );
    expect(codeOf(await pageFor(bed.owner, invitationId))).toBe(
      'organisation_invitation_not_found',
    );
    expect(codeOf(await pageFor(recipient, 'inv_missing'))).toBe(
      'organisation_invitation_not_found',
    );
  });

  it('tells its recipient when it expired or was cancelled', async () => {
    const recipient = await signedInMember();
    const invitationId = await invited(bed, recipient.email);

    await setInvitation(invitationId, {
      expiresAt: new Date(Date.now() - DAY_MS),
    });
    expect(await stateFor(recipient, invitationId)).toBe('expired');

    await setInvitation(invitationId, { status: 'canceled' });
    expect(await stateFor(recipient, invitationId)).toBe('cancelled');
  });

  it('remembers an answer, accepted or declined', async () => {
    const joining = await signedInMember();
    const declining = await signedInMember();
    const accepted = await invited(bed, joining.email);
    const declined = await invited(bed, declining.email);

    expect(
      (await answer(bed, acceptInvitationResolver, joining, accepted)).ok,
    ).toBe(true);
    expect(
      (await answer(bed, rejectInvitationResolver, declining, declined)).ok,
    ).toBe(true);

    expect(await stateFor(joining, accepted)).toBe('accepted');
    expect(await stateFor(declining, declined)).toBe('declined');
  });

  it('says when the organisation cannot take members, or the recipient already belongs', async () => {
    const recipient = await signedInMember();
    const invitationId = await invited(bed, recipient.email);

    await bed.db
      .update(organization)
      .set({ status: 'suspended' })
      .where(eq(organization.id, bed.organisationId));
    expect(await stateFor(recipient, invitationId)).toBe('unavailable');

    await bed.db
      .update(organization)
      .set({ status: 'approved' })
      .where(eq(organization.id, bed.organisationId));
    await bed.db.insert(member).values({
      id: `mem_${'b'.repeat(32)}`,
      organizationId: bed.organisationId,
      userId: recipient.userId,
      role: 'member',
    });
    expect(await stateFor(recipient, invitationId)).toBe('already_member');
  });

  it('says when the recipient still has to verify their address', async () => {
    const recipient = await signedInMember();
    const invitationId = await invited(bed, recipient.email);
    await bed.db
      .update(user)
      .set({ emailVerified: false })
      .where(eq(user.id, recipient.userId));

    const result = await pageFor(recipient, invitationId);

    expect(result.ok && result.data.isEmailVerified).toBe(false);
    expect(result.ok && result.data.state).toBe('pending');
  });
});
