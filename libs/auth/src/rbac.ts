import { createAccessControl } from 'better-auth/plugins/access';
import { adminAc, defaultStatements } from 'better-auth/plugins/admin/access';

import type { UserRole } from '@founders-coffee/core';

const statements = {
  ...defaultStatements,
  event: ['create', 'read'],
  rsvp: ['create', 'read', 'update'],
  chat: ['read', 'write'],
  sponsorship: ['read'],
  profile: ['read', 'update'],
  push: ['manage'],
  operations: ['read'],
  metrics: ['read'],
  hackathon: ['read', 'register'],
  team: ['create', 'join'],
  submission: ['create'],
  judging: ['score'],
  hackathon_report: ['create'],
  organisation: ['apply'],
  moderation: ['event', 'user', 'organisation', 'hackathon', 'submission'],
  closeout: ['override'],
  host_trust: ['update'],
  audit: ['read'],
} as const;

const PARTICIPANT = {
  hackathon: ['read', 'register'],
  team: ['create', 'join'],
  submission: ['create'],
  judging: ['score'],
  hackathon_report: ['create'],
  organisation: ['apply'],
} as const;

const OPERATOR = {
  operations: ['read'],
  metrics: ['read'],
  moderation: ['event', 'user', 'organisation', 'hackathon', 'submission'],
  host_trust: ['update'],
  audit: ['read'],
} as const;

export const ac = createAccessControl(statements);

export const roles = {
  member: ac.newRole({
    event: ['create', 'read'],
    rsvp: ['create', 'read', 'update'],
    chat: ['read', 'write'],
    sponsorship: ['read'],
    profile: ['read', 'update'],
    push: ['manage'],
    ...PARTICIPANT,
  }),
  host: ac.newRole({
    event: ['create', 'read'],
    rsvp: ['create', 'read', 'update'],
    chat: ['read', 'write'],
    sponsorship: ['read'],
    profile: ['read', 'update'],
    push: ['manage'],
    ...PARTICIPANT,
  }),
  sponsor_contact: ac.newRole({
    event: ['read'],
    rsvp: ['read'],
    hackathon: ['read'],
    sponsorship: ['read'],
    profile: ['read', 'update'],
    push: ['manage'],
  }),
  moderator: ac.newRole({
    event: ['create', 'read'],
    rsvp: ['create', 'read', 'update'],
    chat: ['read', 'write'],
    sponsorship: ['read'],
    profile: ['read', 'update'],
    push: ['manage'],
    ...PARTICIPANT,
    ...OPERATOR,
  }),
  admin: ac.newRole({
    ...adminAc.statements,
    event: ['create', 'read'],
    rsvp: ['create', 'read', 'update'],
    chat: ['read', 'write'],
    sponsorship: ['read'],
    profile: ['read', 'update'],
    push: ['manage'],
    ...PARTICIPANT,
    ...OPERATOR,
    closeout: ['override'],
  }),
} as const;

export type Role = UserRole;

export const ADMIN_APP_PERMISSION = { operations: ['read'] } as const;

/**
 * Whether this role may take this action, asked of the central table and nowhere else.
 *
 * AGENTS.md §10 forbids ad hoc role comparisons in components and server functions, and the reason is the
 * one every access bug has in common: a comparison written twice drifts once. `role === 'admin'`
 * scattered through a codebase is a policy nobody can read in one place and nobody can change in
 * one place.
 *
 * An unknown role is refused rather than treated as absent. A row whose `role` column holds
 * something this build does not define is a database that has moved ahead of the code, and the safe
 * reading of that is no. The membership test is `Object.hasOwn` and not `in`, because `in` walks the
 * prototype chain: `'constructor'` is a string that passes it, and the object it then reaches is not
 * a role.
 *
 * The operations split is a product decision, recorded here because it is not obvious: a moderator
 * reads operations and metrics, moderates events and users, sets host trust, and reads the audit
 * trail. Only an admin may override a closeout — that rewrites the record of whether a gathering
 * happened, which is the evidence every other number is derived from.
 *
 * The hackathon grants say only what a signed-in member may try: read and register for a hackathon,
 * create or join a team, submit, score, report, and apply for an organisation. Who owns what (the organiser of this hackathon, the
 * captain of this team, a judge invited to it) is decided by the resolvers and by
 * `requireOrganisationPermission`, never by a role. A moderator's `organisation`, `hackathon` and
 * `submission` moderation, like every other moderation action, is withheld from members.
 */
export const roleAllows = (
  role: string | null | undefined,
  permission: Parameters<(typeof roles)['admin']['authorize']>[0],
): boolean => {
  if (!role || !Object.hasOwn(roles, role)) return false;
  return roles[role as Role].authorize(permission).success;
};
