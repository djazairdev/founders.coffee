import { z } from 'zod';

import {
  AppError,
  err,
  ok,
  type AuditAction,
  type OrganisationStatus,
  type Result,
} from '@founders-coffee/core';

export const ORGANISATION_DECISIONS = [
  'approve',
  'reject',
  'suspend',
  'reinstate',
] as const;
export type OrganisationDecision = (typeof ORGANISATION_DECISIONS)[number];

export const ORGANISATION_REVIEW_NOTE_MAX_LENGTH = 1000;
export const ORGANISATION_REJECTION_NOTE_MIN_LENGTH = 10;

type DecisionRule = {
  readonly from: OrganisationStatus;
  readonly to: OrganisationStatus;
  readonly action: AuditAction;
};

const RULES: Record<OrganisationDecision, DecisionRule> = {
  approve: { from: 'pending', to: 'approved', action: 'approved' },
  reject: { from: 'pending', to: 'rejected', action: 'rejected' },
  suspend: { from: 'approved', to: 'suspended', action: 'suspended' },
  reinstate: { from: 'suspended', to: 'approved', action: 'approved' },
};

const note = z.string().trim().max(ORGANISATION_REVIEW_NOTE_MAX_LENGTH);

export const organisationDecisionSchema = z.discriminatedUnion('decision', [
  z.strictObject({
    decision: z.literal('reject'),
    note: note.min(ORGANISATION_REJECTION_NOTE_MIN_LENGTH),
  }),
  z.strictObject({
    decision: z.enum(['approve', 'suspend', 'reinstate']),
    note: note.optional().transform((value) => value || undefined),
  }),
]);

export type OrganisationDecisionInput = z.infer<
  typeof organisationDecisionSchema
>;

/**
 * What an operator's decision does to an organisation in `current` status (B-ORG-06), or a typed
 * refusal.
 *
 * Each decision moves from one status only: approving and rejecting decide a pending application,
 * suspending stops an approved organisation, and reinstating approves a suspended one again. So
 * "approve" can never quietly reinstate, and the audit's action says what the operator meant.
 */
export const decideOrganisationStatus = (
  current: OrganisationStatus,
  decision: OrganisationDecision,
): Result<DecisionRule> => {
  const rule = RULES[decision];
  return rule.from === current
    ? ok(rule)
    : err(
        new AppError(
          'invalid_organisation_transition',
          `Cannot ${decision} an organisation that is '${current}'`,
        ),
      );
};
