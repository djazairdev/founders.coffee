import { AppError, err, ok, type Result } from '@founders-coffee/core';
import type { AuthSession } from '@founders-coffee/auth';
import {
  readOrganisationInvitation,
  readOrganisationMembership,
  type Db,
  type OrganisationInvitationRecord,
} from '@founders-coffee/db';
import { organisations } from '@founders-coffee/domain';

export type InvitationState =
  | 'pending'
  | 'expired'
  | 'cancelled'
  | 'accepted'
  | 'declined'
  | 'unavailable'
  | 'already_member';

export type InvitationPage = {
  readonly id: string;
  readonly organisationName: string;
  readonly organisationSlug: string;
  readonly marketCode: string;
  readonly role: 'admin' | 'member';
  readonly inviterName: string | null;
  readonly expiresAt: Date;
  readonly state: InvitationState;
  readonly isEmailVerified: boolean;
};

type Invitee = Pick<AuthSession['user'], 'id' | 'email' | 'emailVerified'>;

/** Where an invitation addressed to this member stands, from what they could do with it. */
const stateOf = async (
  db: Db,
  invitation: OrganisationInvitationRecord,
  inviteeId: string,
): Promise<InvitationState> => {
  if (invitation.status === 'canceled') return 'cancelled';
  if (invitation.status === 'accepted') return 'accepted';
  if (invitation.status === 'rejected') return 'declined';
  if (invitation.expiresAt.getTime() <= Date.now()) return 'expired';
  if (!organisations.isOrganisationActive(invitation.organisationStatus))
    return 'unavailable';
  const membership = await readOrganisationMembership(db, {
    organisationId: invitation.organisationId,
    userId: inviteeId,
  });
  return membership ? 'already_member' : 'pending';
};

/**
 * The page a member reaches from an invitation email (B-ORG-10): which organisation invited them,
 * as what and by whom, and whether they can still answer.
 *
 * Only its recipient sees it. An invitation for another address answers as not found, the same as
 * one that does not exist, so nobody learns of someone else's invitation by its id; its recipient,
 * though, is told when it was cancelled, answered or has expired.
 */
export const invitationPageResolver = async (
  db: Db,
  input: { readonly invitee: Invitee; readonly invitationId: string },
): Promise<Result<InvitationPage>> => {
  const invitation = await readOrganisationInvitation(db, input.invitationId);
  if (
    !invitation ||
    invitation.email.toLowerCase() !== input.invitee.email.toLowerCase()
  )
    return err(
      new AppError('organisation_invitation_not_found', 'Invitation not found'),
    );
  return ok({
    id: invitation.id,
    organisationName: invitation.organisationName,
    organisationSlug: invitation.organisationSlug,
    marketCode: invitation.organisationMarketCode,
    role: invitation.role === 'admin' ? 'admin' : 'member',
    inviterName: invitation.inviterName,
    expiresAt: invitation.expiresAt,
    state: await stateOf(db, invitation, input.invitee.id),
    isEmailVerified: input.invitee.emailVerified,
  });
};
