import {
  AppError,
  err,
  ok,
  type EventStatus,
  type Result,
} from '@founders-coffee/core';
import {
  organisationRoleAllows,
  type AuthInstance,
} from '@founders-coffee/auth';
import {
  listOrganisationHackathons,
  listOrganisationMembers,
  listPendingOrganisationInvitations,
  readMyOrganisationBySlug,
  readOrganisationMember,
  type Db,
  type MyOrganisation,
} from '@founders-coffee/db';
import { organisations } from '@founders-coffee/domain';
import { logger } from '@founders-coffee/observability';

import { throughBetterAuth } from './better-auth-call.js';

export type OrganisationReview =
  | { readonly status: 'pending'; readonly appliedAt: Date }
  | { readonly status: 'approved'; readonly approvedAt: Date | null }
  | {
      readonly status: 'rejected';
      readonly reviewedAt: Date | null;
      readonly note: string | null;
    }
  | { readonly status: 'suspended'; readonly reviewedAt: Date | null };

export type OrganisationMemberView = {
  readonly memberId: string;
  readonly name: string;
  readonly role: string;
  readonly joinedAt: Date;
  readonly isYou: boolean;
  readonly canRemove: boolean;
};

export type OrganisationInvitationView = {
  readonly id: string;
  readonly email: string;
  readonly role: string | null;
  readonly expiresAt: Date;
  readonly isExpired: boolean;
};

export type OrganisationHackathonView = {
  readonly id: string;
  readonly title: string;
  readonly cityCode: string;
  readonly startsAt: Date;
  readonly endsAt: Date | null;
  readonly status: EventStatus;
};

export type MyOrganisationPage = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly marketCode: string;
  readonly cityCode: string | null;
  readonly role: string;
  readonly review: OrganisationReview;
  readonly canManage: boolean;
  readonly canCreateHackathon: boolean;
  readonly hackathons: readonly OrganisationHackathonView[];
  readonly members: readonly OrganisationMemberView[];
  readonly invitations: readonly OrganisationInvitationView[];
};

/** Where an organisation stands with the operators, with the date and note its applicant may see. */
const reviewOf = (row: MyOrganisation): OrganisationReview => {
  switch (row.status) {
    case 'pending':
      return { status: 'pending', appliedAt: row.createdAt };
    case 'approved':
      return { status: 'approved', approvedAt: row.reviewedAt };
    case 'rejected':
      return {
        status: 'rejected',
        reviewedAt: row.reviewedAt,
        note: row.reviewNote,
      };
    case 'suspended':
      return { status: 'suspended', reviewedAt: row.reviewedAt };
  }
};

const isProtectedRole = (role: string): boolean =>
  role.split(',').some((name) => name.trim() === 'owner');

/**
 * The page a member sees of their own organisation (B-ORG-09): where its review stands and, for an
 * owner or admin of an approved organisation, its members and the invitations still waiting. Every
 * member of an approved organisation also sees the hackathons it leads, drafts included, and may
 * start one (B-HKN-11).
 *
 * Someone who does not belong to it, or an organisation in a market with hackathons off, answers as
 * not found. An owner cannot be removed, and nobody removes themselves here.
 */
export const myOrganisationResolver = async (
  db: Db,
  input: { readonly userId: string; readonly slug: string },
): Promise<Result<MyOrganisationPage>> => {
  const row = await readMyOrganisationBySlug(db, input);
  if (!row)
    return err(
      new AppError('organisation_not_found', 'Organisation not found'),
    );
  const isActive = organisations.isOrganisationActive(row.status);
  const canManage =
    isActive && organisationRoleAllows(row.role, 'invitation', 'create');
  const canCreateHackathon =
    isActive && organisationRoleAllows(row.role, 'hackathon', 'create');
  const mayRemoveMembers =
    canManage && organisationRoleAllows(row.role, 'member', 'delete');
  const [members, invitations, hackathons] = await Promise.all([
    canManage ? listOrganisationMembers(db, row.id) : [],
    canManage ? listPendingOrganisationInvitations(db, row.id) : [],
    isActive ? listOrganisationHackathons(db, row.id) : [],
  ]);
  const now = Date.now();
  return ok({
    id: row.id,
    name: row.name,
    slug: row.slug,
    marketCode: row.marketCode,
    cityCode: row.cityCode,
    role: row.role,
    review: reviewOf(row),
    canManage,
    canCreateHackathon,
    hackathons,
    members: members.map((member) => {
      const isYou = member.userId === input.userId;
      return {
        memberId: member.memberId,
        name: member.name,
        role: member.role,
        joinedAt: member.joinedAt,
        isYou,
        canRemove: mayRemoveMembers && !isYou && !isProtectedRole(member.role),
      };
    }),
    invitations: invitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      isExpired: invitation.expiresAt.getTime() <= now,
    })),
  });
};

/**
 * Remove a member from an organisation. The middleware has checked `member:delete` in an approved
 * organisation. A member of another organisation answers as not found; the owner and the member
 * asking are refused before Better Auth is asked, so it is asked only what will succeed.
 */
export const removeMemberResolver = async (
  db: Db,
  auth: AuthInstance,
  input: {
    readonly headers: Headers;
    readonly organisationId: string;
    readonly memberId: string;
    readonly userId: string;
  },
): Promise<Result<{ readonly memberId: string }>> => {
  const target = await readOrganisationMember(db, input);
  if (!target)
    return err(
      new AppError('organisation_member_not_found', 'Member not found'),
    );
  if (target.userId === input.userId || isProtectedRole(target.role))
    return err(
      new AppError(
        'organisation_member_protected',
        'This member cannot be removed',
      ),
    );
  const removed = await throughBetterAuth(
    'remove_organisation_member',
    new AppError(
      'organisation_member_remove_failed',
      'The member could not be removed',
    ),
    () =>
      auth.api.removeMember({
        headers: input.headers,
        body: {
          organizationId: input.organisationId,
          memberIdOrEmail: input.memberId,
        },
      }),
  );
  if (!removed.ok) return removed;
  logger.info('organisation.member_removed', {
    organisationId: input.organisationId,
    memberId: input.memberId,
  });
  return ok({ memberId: input.memberId });
};
