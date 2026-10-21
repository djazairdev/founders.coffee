import { env } from 'cloudflare:workers';

import { ok, type Result } from '@founders-coffee/core';
import { createAuth } from '@founders-coffee/auth';
import {
  createDb,
  eq,
  invitation,
  member,
  organization,
  seed,
  user,
  type Db,
} from '@founders-coffee/db';
import type { EmailProvider, SendEmailInput } from '@founders-coffee/email';

import { signedInMember } from '../profile/contact.fixtures.js';
import { createInvitationSender } from './invitation-email.js';
import {
  acceptInvitationResolver,
  inviteMemberResolver,
} from './invitations.js';

export const DAY_MS = 86_400_000;
export const sent: SendEmailInput[] = [];

export const recordingProvider: EmailProvider = {
  name: 'recording',
  send: async (input) => {
    sent.push(input);
    return ok({ messageId: `msg_${sent.length}` });
  },
};

export type Member = Awaited<ReturnType<typeof signedInMember>>;

export type Testbed = {
  readonly db: Db;
  readonly owner: Member;
  readonly organisationId: string;
};

let sequence = 0;

export const authWith = (
  db: Db,
  provider: EmailProvider | null = recordingProvider,
) =>
  createAuth(
    {
      DB: env.DB,
      BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
      APP_URL: env.APP_URL,
      TURNSTILE_DISABLED: 'true',
    },
    { sendInvitationEmail: createInvitationSender(db, provider) },
  ).auth;

export const approvedOrganisation = async (db: Db, ownerId: string) => {
  sequence += 1;
  const id = `org_${String(sequence).padStart(32, '0')}`;
  await db.insert(organization).values({
    id,
    name: `Code Club ${sequence}`,
    slug: `code-club-invitations-${sequence}`,
    kind: 'club',
    status: 'approved',
    marketCode: 'DZ',
    description: 'Weekly coding evenings for students in Algiers.',
  });
  await db.insert(member).values({
    id: `mem_${String(sequence).padStart(32, '0')}`,
    organizationId: id,
    userId: ownerId,
    role: 'owner',
  });
  return id;
};

/** A seeded database with a signed-in owner of a new approved organisation, and no email sent. */
export const freshTestbed = async (): Promise<Testbed> => {
  const db = createDb(env.DB);
  await seed(db);
  sent.length = 0;
  const owner = await signedInMember();
  return {
    db,
    owner,
    organisationId: await approvedOrganisation(db, owner.userId),
  };
};

export const invite = (
  bed: Testbed,
  email: string,
  role: 'admin' | 'member' = 'member',
  provider?: EmailProvider | null,
) =>
  inviteMemberResolver(bed.db, authWith(bed.db, provider), {
    headers: bed.owner.headers,
    organisationId: bed.organisationId,
    email,
    role,
  });

export const invited = async (
  bed: Testbed,
  email: string,
  role: 'admin' | 'member' = 'member',
) => {
  const result = await invite(bed, email, role);
  if (!result.ok) throw result.error;
  return result.data.invitationId;
};

const invitee = async (db: Db, person: Member) => {
  const [row] = await db.select().from(user).where(eq(user.id, person.userId));
  if (!row) throw new Error('no such member');
  return { id: row.id, email: row.email, emailVerified: row.emailVerified };
};

export const answer = async (
  bed: Testbed,
  resolver: typeof acceptInvitationResolver,
  person: Member,
  invitationId: string,
) =>
  resolver(bed.db, authWith(bed.db), {
    headers: person.headers,
    invitee: await invitee(bed.db, person),
    invitationId,
  });

export const codeOf = <T>(result: Result<T>) =>
  result.ok ? null : result.error.code;

export const statusOf = async (db: Db, invitationId: string) => {
  const [row] = await db
    .select({ status: invitation.status })
    .from(invitation)
    .where(eq(invitation.id, invitationId));
  return row?.status;
};

export const roleIn = async (db: Db, userId: string) => {
  const [row] = await db
    .select({ role: member.role })
    .from(member)
    .where(eq(member.userId, userId));
  return row?.role ?? null;
};

export { signedInMember };
