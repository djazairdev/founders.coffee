import { and, asc, desc, eq, sql } from 'drizzle-orm';

import type { Db } from './db.js';
import { invitation, member, user } from './schema.js';

export type OrganisationMemberRow = {
  readonly memberId: string;
  readonly userId: string;
  readonly name: string;
  readonly role: string;
  readonly joinedAt: Date;
};

export type PendingInvitationRow = {
  readonly id: string;
  readonly email: string;
  readonly role: string | null;
  readonly expiresAt: Date;
  readonly createdAt: Date;
};

/** An organisation's members with their names and roles (B-ORG-09): the owner, then the rest as they joined. */
export const listOrganisationMembers = (
  db: Db,
  organisationId: string,
): Promise<OrganisationMemberRow[]> =>
  db
    .select({
      memberId: member.id,
      userId: member.userId,
      name: user.name,
      role: member.role,
      joinedAt: member.createdAt,
    })
    .from(member)
    .innerJoin(user, eq(user.id, member.userId))
    .where(eq(member.organizationId, organisationId))
    .orderBy(
      sql`${member.role} = 'owner' DESC`,
      asc(member.createdAt),
      asc(member.id),
    );

/**
 * An organisation's invitations still waiting for an answer, newest first (B-ORG-09). One past its
 * expiry stays pending in the table, so the caller tells it apart by `expiresAt`.
 */
export const listPendingOrganisationInvitations = (
  db: Db,
  organisationId: string,
): Promise<PendingInvitationRow[]> =>
  db
    .select({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    })
    .from(invitation)
    .where(
      and(
        eq(invitation.organizationId, organisationId),
        eq(invitation.status, 'pending'),
      ),
    )
    .orderBy(desc(invitation.createdAt), desc(invitation.id));

/** One member of an organisation by its member id, or null when it is not one of this organisation's. */
export const readOrganisationMember = async (
  db: Db,
  input: { readonly organisationId: string; readonly memberId: string },
): Promise<{ readonly userId: string; readonly role: string } | null> => {
  const [row] = await db
    .select({ userId: member.userId, role: member.role })
    .from(member)
    .where(
      and(
        eq(member.id, input.memberId),
        eq(member.organizationId, input.organisationId),
      ),
    )
    .limit(1);
  return row ?? null;
};
