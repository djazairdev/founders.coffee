import { AppError, err, ok, type Result } from '@founders-coffee/core';
import {
  isAuthRefusal,
  type AuthInstance,
  type AuthSession,
} from '@founders-coffee/auth';
import {
  isOrganisationMemberByEmail,
  readOrganisationInvitation,
  readOrganisationMembership,
  type Db,
  type OrganisationInvitationRecord,
} from '@founders-coffee/db';
import { organisations } from '@founders-coffee/domain';
import { logger, reportError } from '@founders-coffee/observability';

export type InvitableRole = 'admin' | 'member';

export type InvitationSent = {
  readonly invitationId: string;
  readonly expiresAt: Date;
};

export type InvitationAnswered = { readonly organisationId: string };

type Invitee = Pick<AuthSession['user'], 'id' | 'email' | 'emailVerified'>;

const notFound = () =>
  new AppError('organisation_invitation_not_found', 'Invitation not found');

/**
 * Run one Better Auth invitation call, turning a refusal it still makes into our own code.
 *
 * The resolvers refuse every case they can foresee before Better Auth runs, from the rows it would
 * read, so a refusal here is one nobody planned for: it is reported, and the caller learns only that
 * the invitation could not be handled. A failure that is not a refusal is thrown on.
 */
const throughBetterAuth = async <T>(
  operation: string,
  call: () => Promise<T>,
): Promise<Result<T>> => {
  try {
    return ok(await call());
  } catch (error) {
    if (!isAuthRefusal(error)) throw error;
    reportError(error, { operation });
    return err(
      new AppError(
        'organisation_invitation_failed',
        'The invitation could not be handled',
      ),
    );
  }
};

/**
 * Invite someone to an organisation by email, as an admin or a member (B-ORG-05).
 *
 * The middleware has checked `invitation:create`, which owners and admins hold, in an approved
 * organisation. Someone already in it is refused. Inviting an address again sends the email again
 * and restarts its seven days, rather than refusing; the email itself is Better Auth's call to the
 * sender the auth instance was given.
 */
export const inviteMemberResolver = async (
  db: Db,
  auth: AuthInstance,
  input: {
    readonly headers: Headers;
    readonly organisationId: string;
    readonly email: string;
    readonly role: InvitableRole;
  },
): Promise<Result<InvitationSent>> => {
  if (
    await isOrganisationMemberByEmail(db, {
      organisationId: input.organisationId,
      email: input.email,
    })
  )
    return err(
      new AppError(
        'organisation_already_member',
        'This address already belongs to the organisation',
      ),
    );
  const created = await throughBetterAuth('invite_organisation_member', () =>
    auth.api.createInvitation({
      headers: input.headers,
      body: {
        organizationId: input.organisationId,
        email: input.email,
        role: input.role,
        resend: true,
      },
    }),
  );
  if (!created.ok) return created;
  logger.info('organisation.invited', {
    organisationId: input.organisationId,
    invitationId: created.data.id,
    role: input.role,
  });
  return ok({
    invitationId: created.data.id,
    expiresAt: new Date(created.data.expiresAt),
  });
};

/**
 * Why the signed-in member may not answer this invitation, or null when they may.
 *
 * Only its recipient may, so an invitation for another address answers as one that does not exist,
 * the same as a cancelled or answered one: nobody learns of someone else's invitation by its id.
 * Only then are its own states told apart, and the address has to be verified, as the plugin asks.
 */
const recipientRefusal = (
  invitation: OrganisationInvitationRecord | null,
  invitee: Invitee,
): AppError | null => {
  if (
    !invitation ||
    invitation.status !== 'pending' ||
    invitation.email.toLowerCase() !== invitee.email.toLowerCase()
  )
    return notFound();
  if (!invitee.emailVerified)
    return new AppError(
      'organisation_email_unverified',
      'Verify your email address to answer this invitation',
    );
  return null;
};

/**
 * Accept an invitation: the signed-in member joins the organisation with the role it names.
 *
 * Refused when it has expired, when the organisation is no longer approved, and when the member
 * already belongs to it, so Better Auth is asked only to do what will succeed.
 */
export const acceptInvitationResolver = async (
  db: Db,
  auth: AuthInstance,
  input: {
    readonly headers: Headers;
    readonly invitee: Invitee;
    readonly invitationId: string;
  },
): Promise<Result<InvitationAnswered>> => {
  const invitation = await readOrganisationInvitation(db, input.invitationId);
  const refusal = recipientRefusal(invitation, input.invitee);
  if (refusal || !invitation) return err(refusal ?? notFound());
  if (invitation.expiresAt.getTime() <= Date.now())
    return err(
      new AppError('organisation_invitation_expired', 'Invitation expired'),
    );
  if (!organisations.isOrganisationActive(invitation.organisationStatus))
    return err(
      new AppError(
        'organisation_not_approved',
        'This organisation is not approved',
      ),
    );
  if (
    await readOrganisationMembership(db, {
      organisationId: invitation.organisationId,
      userId: input.invitee.id,
    })
  )
    return err(
      new AppError(
        'organisation_already_member',
        'You already belong to this organisation',
      ),
    );
  const accepted = await throughBetterAuth(
    'accept_organisation_invitation',
    () =>
      auth.api.acceptInvitation({
        headers: input.headers,
        body: { invitationId: input.invitationId },
      }),
  );
  if (!accepted.ok) return accepted;
  logger.info('organisation.invitation_accepted', {
    organisationId: invitation.organisationId,
    invitationId: invitation.id,
  });
  return ok({ organisationId: invitation.organisationId });
};

/** Decline an invitation. Its recipient may, even once it has expired; nothing else changes. */
export const rejectInvitationResolver = async (
  db: Db,
  auth: AuthInstance,
  input: {
    readonly headers: Headers;
    readonly invitee: Invitee;
    readonly invitationId: string;
  },
): Promise<Result<InvitationAnswered>> => {
  const invitation = await readOrganisationInvitation(db, input.invitationId);
  const refusal = recipientRefusal(invitation, input.invitee);
  if (refusal || !invitation) return err(refusal ?? notFound());
  const rejected = await throughBetterAuth(
    'reject_organisation_invitation',
    () =>
      auth.api.rejectInvitation({
        headers: input.headers,
        body: { invitationId: input.invitationId },
      }),
  );
  if (!rejected.ok) return rejected;
  logger.info('organisation.invitation_rejected', {
    organisationId: invitation.organisationId,
    invitationId: invitation.id,
  });
  return ok({ organisationId: invitation.organisationId });
};

/**
 * Cancel a pending invitation of this organisation. The middleware has checked `invitation:cancel`
 * in it; an invitation of another organisation, or one already answered, answers as not found.
 */
export const cancelInvitationResolver = async (
  db: Db,
  auth: AuthInstance,
  input: {
    readonly headers: Headers;
    readonly organisationId: string;
    readonly invitationId: string;
  },
): Promise<Result<InvitationAnswered>> => {
  const invitation = await readOrganisationInvitation(db, input.invitationId);
  if (
    !invitation ||
    invitation.organisationId !== input.organisationId ||
    invitation.status !== 'pending'
  )
    return err(notFound());
  const cancelled = await throughBetterAuth(
    'cancel_organisation_invitation',
    () =>
      auth.api.cancelInvitation({
        headers: input.headers,
        body: { invitationId: input.invitationId },
      }),
  );
  if (!cancelled.ok) return cancelled;
  logger.info('organisation.invitation_cancelled', {
    organisationId: invitation.organisationId,
    invitationId: invitation.id,
  });
  return ok({ organisationId: invitation.organisationId });
};
