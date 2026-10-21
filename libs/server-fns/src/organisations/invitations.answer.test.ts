import { beforeEach, describe, expect, it } from 'vitest';

import { eq, invitation, organization, user } from '@founders-coffee/db';

import {
  acceptInvitationResolver,
  cancelInvitationResolver,
  rejectInvitationResolver,
} from './invitations.js';
import {
  answer,
  approvedOrganisation,
  authWith,
  codeOf,
  DAY_MS,
  freshTestbed,
  invited,
  roleIn,
  signedInMember,
  statusOf,
  type Testbed,
} from './invitations.fixtures.js';

let bed: Testbed;

describe('answering organisation invitations (B-ORG-05, real D1)', () => {
  beforeEach(async () => {
    bed = await freshTestbed();
  });

  it('lets its recipient accept, joining with the role it names', async () => {
    const someone = await signedInMember();
    const id = await invited(bed, someone.email, 'admin');

    const accepted = await answer(bed, acceptInvitationResolver, someone, id);

    expect(accepted).toEqual({
      ok: true,
      data: { organisationId: bed.organisationId },
    });
    expect(await statusOf(bed.db, id)).toBe('accepted');
    expect(await roleIn(bed.db, someone.userId)).toBe('admin');
    expect(
      codeOf(await answer(bed, acceptInvitationResolver, someone, id)),
    ).toBe('organisation_invitation_not_found');
  });

  it('answers anyone else as if the invitation did not exist', async () => {
    const someone = await signedInMember();
    const stranger = await signedInMember();
    const id = await invited(bed, someone.email);

    expect(
      codeOf(await answer(bed, acceptInvitationResolver, stranger, id)),
    ).toBe('organisation_invitation_not_found');
    expect(
      codeOf(await answer(bed, rejectInvitationResolver, stranger, id)),
    ).toBe('organisation_invitation_not_found');
    expect(
      codeOf(
        await answer(bed, acceptInvitationResolver, someone, 'inv_missing'),
      ),
    ).toBe('organisation_invitation_not_found');
    expect(await statusOf(bed.db, id)).toBe('pending');
  });

  it('refuses an expired invitation, an unverified address and an organisation no longer approved', async () => {
    const someone = await signedInMember();
    const id = await invited(bed, someone.email);

    await bed.db
      .update(invitation)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(invitation.id, id));
    expect(
      codeOf(await answer(bed, acceptInvitationResolver, someone, id)),
    ).toBe('organisation_invitation_expired');

    await bed.db
      .update(invitation)
      .set({ expiresAt: new Date(Date.now() + DAY_MS) })
      .where(eq(invitation.id, id));
    await bed.db
      .update(organization)
      .set({ status: 'suspended' })
      .where(eq(organization.id, bed.organisationId));
    expect(
      codeOf(await answer(bed, acceptInvitationResolver, someone, id)),
    ).toBe('organisation_not_approved');

    await bed.db
      .update(user)
      .set({ emailVerified: false })
      .where(eq(user.id, someone.userId));
    expect(
      codeOf(await answer(bed, acceptInvitationResolver, someone, id)),
    ).toBe('organisation_email_unverified');
    expect(await roleIn(bed.db, someone.userId)).toBeNull();
  });

  it('lets its recipient decline, even once it has expired, without joining', async () => {
    const someone = await signedInMember();
    const id = await invited(bed, someone.email);
    await bed.db
      .update(invitation)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(invitation.id, id));

    expect(await answer(bed, rejectInvitationResolver, someone, id)).toEqual({
      ok: true,
      data: { organisationId: bed.organisationId },
    });
    expect(await statusOf(bed.db, id)).toBe('rejected');
    expect(await roleIn(bed.db, someone.userId)).toBeNull();
  });

  it('lets an owner cancel a pending invitation of their own organisation only', async () => {
    const someone = await signedInMember();
    const id = await invited(bed, someone.email);
    const elsewhere = await approvedOrganisation(bed.db, bed.owner.userId);

    expect(
      codeOf(
        await cancelInvitationResolver(bed.db, authWith(bed.db), {
          headers: bed.owner.headers,
          organisationId: elsewhere,
          invitationId: id,
        }),
      ),
    ).toBe('organisation_invitation_not_found');
    expect(
      await cancelInvitationResolver(bed.db, authWith(bed.db), {
        headers: bed.owner.headers,
        organisationId: bed.organisationId,
        invitationId: id,
      }),
    ).toEqual({ ok: true, data: { organisationId: bed.organisationId } });
    expect(await statusOf(bed.db, id)).toBe('canceled');
    expect(
      codeOf(await answer(bed, acceptInvitationResolver, someone, id)),
    ).toBe('organisation_invitation_not_found');
  });
});
