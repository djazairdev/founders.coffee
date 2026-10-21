import { AppError, err, id, ok, type Result } from '@founders-coffee/core';
import {
  decideOrganisation,
  getOrganisation,
  listOrganisationsForReview,
  type Db,
  type OrganisationForReview,
} from '@founders-coffee/db';
import { organisations } from '@founders-coffee/domain';
import { logger } from '@founders-coffee/observability';

import type { OrganisationDecisionNotice } from './organisation-decision-email.js';

export type OrganisationReviewItem = Pick<
  OrganisationForReview,
  | 'id'
  | 'name'
  | 'slug'
  | 'kind'
  | 'status'
  | 'marketCode'
  | 'cityCode'
  | 'description'
  | 'websiteUrl'
  | 'createdAt'
  | 'reviewNote'
  | 'reviewedAt'
  | 'ownerLeftAt'
  | 'ownerName'
  | 'timeZone'
>;

const itemOf = (row: OrganisationForReview): OrganisationReviewItem => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  kind: row.kind,
  status: row.status,
  marketCode: row.marketCode,
  cityCode: row.cityCode,
  description: row.description,
  websiteUrl: row.websiteUrl,
  createdAt: row.createdAt,
  reviewNote: row.reviewNote,
  reviewedAt: row.reviewedAt,
  ownerLeftAt: row.ownerLeftAt,
  ownerName: row.ownerName,
  timeZone: row.timeZone,
});

export type OrganisationDecided = Pick<
  OrganisationReviewItem,
  'id' | 'status' | 'reviewNote' | 'reviewedAt'
>;

export type OrganisationReviewQueue = {
  readonly items: readonly OrganisationReviewItem[];
  readonly hasMore: boolean;
};

/** One page of the organisations in one status, oldest first, for the operator's review queue (B-ORG-06). */
export const listOrganisationReviewQueueResolver = async (
  db: Db,
  status: OrganisationForReview['status'],
  page: number,
): Promise<Result<OrganisationReviewQueue>> => {
  const queue = await listOrganisationsForReview(db, status, page);
  logger.info('organisation.review_listed', {
    status,
    page,
    count: queue.items.length,
  });
  return ok({ items: queue.items.map(itemOf), hasMore: queue.hasMore });
};

/**
 * Approve, reject, suspend or reinstate an organisation, as an operator (B-ORG-06).
 *
 * The decision has to fit the status the organisation is in, and is written only if that status has
 * not moved since, with its audit entry in the same batch. The owners are then told by email; a
 * failed email is logged and never undoes the decision.
 */
export const decideOrganisationResolver = async (
  db: Db,
  notify: OrganisationDecisionNotice,
  input: {
    readonly organisationId: string;
    readonly decision: organisations.OrganisationDecisionInput;
    readonly actorUserId: string;
    readonly accessSubject: string | null;
  },
): Promise<Result<OrganisationDecided>> => {
  const current = await getOrganisation(db, input.organisationId);
  if (!current) return err(new AppError('not_found', 'Organisation not found'));
  const rule = organisations.decideOrganisationStatus(
    current.status,
    input.decision.decision,
  );
  if (!rule.ok) return rule;
  const note = input.decision.note ?? null;
  const decided = await decideOrganisation(db, {
    organisationId: current.id,
    from: rule.data.from,
    to: rule.data.to,
    note,
    action: rule.data.action,
    actorUserId: input.actorUserId,
    accessSubject: input.accessSubject,
    auditId: id('aud'),
  });
  if (!decided)
    return err(
      new AppError(
        'invalid_organisation_transition',
        'The organisation changed since it was read',
      ),
    );
  logger.info('organisation.decided', {
    organisationId: decided.id,
    decision: input.decision.decision,
    status: decided.status,
  });
  await notify(db, {
    organisation: decided,
    decision: input.decision.decision,
    note,
  });
  return ok({
    id: decided.id,
    status: decided.status,
    reviewNote: decided.reviewNote,
    reviewedAt: decided.reviewedAt,
  });
};
