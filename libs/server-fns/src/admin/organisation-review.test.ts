import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';

import { AppError, err, ok } from '@founders-coffee/core';
import {
  createDb,
  eq,
  getOrganisation,
  listAuditForTarget,
  member,
  organization,
  seed,
  user,
  type Db,
} from '@founders-coffee/db';
import { organisations } from '@founders-coffee/domain';
import type { EmailProvider, SendEmailInput } from '@founders-coffee/email';
import { setLogger, type LogEntry } from '@founders-coffee/observability';
import { createServerLogger } from '@founders-coffee/observability/server';

import { createDecisionNotice } from './organisation-decision-email.js';
import {
  decideOrganisationResolver,
  listOrganisationReviewQueueResolver,
} from './organisation-review.js';

const OPERATOR = 'usr_review_operator';
const sent: SendEmailInput[] = [];
const entries: LogEntry[] = [];
let sequence = 0;
let db: Db;

const recording: EmailProvider = {
  name: 'recording',
  send: async (input) => {
    sent.push(input);
    return ok({ messageId: `msg_${sent.length}` });
  },
};

const failing: EmailProvider = {
  name: 'failing',
  send: async () =>
    err(new AppError('email_rate_limited', 'Email send failed')),
};

const application = async (
  status: 'pending' | 'approved' | 'suspended' = 'pending',
) => {
  sequence += 1;
  const suffix = `${Date.now()}${sequence}`.padStart(32, '0').slice(-32);
  const organisationId = `org_${suffix}`;
  const ownerId = `usr_${suffix}`;
  await db.insert(user).values({
    id: ownerId,
    name: `Owner ${sequence}`,
    email: `owner-${suffix}@review.test`,
    emailVerified: true,
    localePref: 'ar',
  });
  await db.insert(organization).values({
    id: organisationId,
    name: `Oran Makers ${sequence}`,
    slug: `oran-makers-${suffix}`,
    kind: 'club',
    status,
    marketCode: 'DZ',
    description: 'Builders meeting every month in Oran.',
  });
  await db.insert(member).values({
    id: `mem_${suffix}`,
    organizationId: organisationId,
    userId: ownerId,
    role: 'owner',
  });
  return { organisationId, ownerEmail: `owner-${suffix}@review.test` };
};

const decide = (
  organisationId: string,
  decision: unknown,
  provider: EmailProvider | null = recording,
) =>
  decideOrganisationResolver(db, createDecisionNotice(provider), {
    organisationId,
    decision: organisations.organisationDecisionSchema.parse(decision),
    actorUserId: OPERATOR,
    accessSubject: 'access-subject-review',
  });

const trail = (organisationId: string) =>
  listAuditForTarget(db, {
    targetType: 'organisation',
    targetId: organisationId,
    limit: 10,
  });

describe('reviewing organisation applications (B-ORG-06, real D1)', () => {
  beforeEach(async () => {
    db = createDb(env.DB);
    await seed(db);
    await db
      .insert(user)
      .values({
        id: OPERATOR,
        name: 'Operator',
        email: 'operator@review.test',
        emailVerified: true,
        role: 'admin',
      })
      .onConflictDoNothing();
    sent.length = 0;
    entries.length = 0;
    setLogger(
      createServerLogger({
        level: 'debug',
        transport: (entry) => {
          entries.push(entry);
        },
      }),
    );
  });

  it('queues a pending application with its details and owner', async () => {
    const { organisationId } = await application();

    const queue = await listOrganisationReviewQueueResolver(db, 'pending', 0);
    if (!queue.ok) throw queue.error;

    expect(
      queue.data.items.find((item) => item.id === organisationId),
    ).toMatchObject({
      kind: 'club',
      marketCode: 'DZ',
      description: 'Builders meeting every month in Oran.',
      ownerName: expect.stringMatching(/^Owner \d+$/),
      reviewNote: null,
    });
  });

  it('approves, audits with the Access subject, and emails the owner in their language', async () => {
    const { organisationId, ownerEmail } = await application();

    const result = await decide(organisationId, { decision: 'approve' });
    if (!result.ok) throw result.error;

    expect(result.data.status).toBe('approved');
    expect((await getOrganisation(db, organisationId))?.status).toBe(
      'approved',
    );
    expect(await trail(organisationId)).toEqual([
      expect.objectContaining({
        action: 'approved',
        actorUserId: OPERATOR,
        accessSubject: 'access-subject-review',
      }),
    ]);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe(ownerEmail);
    expect(sent[0]?.text).toMatch(/[؀-ۿ]/);
  });

  it('rejects with the note, and the owner reads the note', async () => {
    const { organisationId } = await application();
    const note = 'Please add a link to the club’s past events.';

    const result = await decide(organisationId, { decision: 'reject', note });
    if (!result.ok) throw result.error;

    expect(result.data).toMatchObject({ status: 'rejected', reviewNote: note });
    expect(sent[0]?.text).toContain(note);
  });

  it('suspends an approved organisation and reinstates it', async () => {
    const { organisationId } = await application('approved');

    const suspended = await decide(organisationId, { decision: 'suspend' });
    const reinstated = await decide(organisationId, { decision: 'reinstate' });

    expect(suspended.ok && suspended.data.status).toBe('suspended');
    expect(reinstated.ok && reinstated.data.status).toBe('approved');
    expect((await trail(organisationId)).map((row) => row.action)).toEqual(
      expect.arrayContaining(['suspended', 'approved']),
    );
    expect(sent).toHaveLength(2);
  });

  it('refuses a decision that does not fit the status, and writes and sends nothing', async () => {
    const { organisationId } = await application('approved');

    const result = await decide(organisationId, { decision: 'approve' });

    expect(result.ok ? null : result.error.code).toBe(
      'invalid_organisation_transition',
    );
    expect(await trail(organisationId)).toEqual([]);
    expect(sent).toEqual([]);
  });

  it('refuses an organisation that does not exist', async () => {
    const result = await decide('org_00000000000000000000000000000000', {
      decision: 'approve',
    });

    expect(result.ok ? null : result.error.code).toBe('not_found');
  });

  it('keeps the decision when the email fails, and logs it by id alone', async () => {
    const { organisationId, ownerEmail } = await application();

    const result = await decide(
      organisationId,
      { decision: 'approve' },
      failing,
    );

    expect(result.ok).toBe(true);
    expect((await getOrganisation(db, organisationId))?.status).toBe(
      'approved',
    );
    expect(
      entries.find(
        (entry) => entry.msg === 'organisation_decision_email_failed',
      ),
    ).toMatchObject({ organisationId, decision: 'approve' });
    expect(JSON.stringify(entries)).not.toContain(ownerEmail);
  });

  it('keeps the decision when the Worker has no mail binding', async () => {
    const { organisationId } = await application();

    const result = await decide(organisationId, { decision: 'approve' }, null);

    expect(result.ok).toBe(true);
    expect(
      entries.some(
        (entry) => entry.msg === 'organisation_decision_email_unbound',
      ),
    ).toBe(true);
    const [owner] = await db
      .select({ id: member.userId })
      .from(member)
      .where(eq(member.organizationId, organisationId));
    expect(owner).toBeDefined();
  });
});
