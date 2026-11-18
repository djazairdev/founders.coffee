import { and, eq } from 'drizzle-orm';

import type {
  Locale,
  OrganisationInvitationStatus,
  OrganisationStatus,
} from '@founders-coffee/core';

import type { Db } from './db.js';
import { invitation, member, organization, user } from './schema.js';

export type OrganisationInvitationRecord = {
  readonly id: string;
  readonly organisationId: string;
  readonly email: string;
  readonly role: string | null;
  readonly status: OrganisationInvitationStatus;
  readonly expiresAt: Date;
  readonly organisationStatus: OrganisationStatus;
  readonly organisationName: string;
  readonly organisationSlug: string;
  readonly organisationMarketCode: string;
  readonly inviterName: string | null;
};

/**
 * An invitation with its organisation's name, slug, market and review status and its inviter's name, in one
 * read; null when there is none. The inviter is null once their account is gone.
 */
export const readOrganisationInvitation = async (
  db: Db,
  invitationId: string,
): Promise<OrganisationInvitationRecord | null> => {
  const [row] = await db
    .select({
      id: invitation.id,
      organisationId: invitation.organizationId,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      organisationStatus: organization.status,
      organisationName: organization.name,
      organisationSlug: organization.slug,
      organisationMarketCode: organization.marketCode,
      inviterName: user.name,
    })
    .from(invitation)
    .innerJoin(organization, eq(organization.id, invitation.organizationId))
    .leftJoin(user, eq(user.id, invitation.inviterId))
    .where(eq(invitation.id, invitationId))
    .limit(1);
  return row ?? null;
};

/** Whether someone with this address already belongs to the organisation; addresses are kept lowercase. */
export const isOrganisationMemberByEmail = async (
  db: Db,
  input: { readonly organisationId: string; readonly email: string },
): Promise<boolean> => {
  const [row] = await db
    .select({ id: member.id })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(
      and(
        eq(member.organizationId, input.organisationId),
        eq(user.email, input.email.toLowerCase()),
      ),
    )
    .limit(1);
  return row !== undefined;
};

/** The language a member with this address chose, or null when there is none or no such member. */
export const readLocalePrefByEmail = async (
  db: Db,
  email: string,
): Promise<Locale | null> => {
  const [row] = await db
    .select({ localePref: user.localePref })
    .from(user)
    .where(eq(user.email, email.toLowerCase()))
    .limit(1);
  return row?.localePref ?? null;
};
