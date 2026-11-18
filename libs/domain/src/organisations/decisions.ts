import { z } from 'zod';

import {
  AppError,
  err,
  ok,
  type AuditAction,
  type OrganisationStatus,
  type Result,
} from '@founders-coffee/core';

export const ORGANISATION_DECISIONS = ['suspend', 'reinstate'] as const;
export type OrganisationDecision = (typeof ORGANISATION_DECISIONS)[number];

export const ORGANISATION_REVIEW_NOTE_MAX_LENGTH = 1000;

type DecisionRule = {
  readonly from: OrganisationStatus;
  readonly to: OrganisationStatus;
  readonly action: AuditAction;
};

const RULES: Record<OrganisationDecision, DecisionRule> = {
  suspend: { from: 'approved', to: 'suspended', action: 'suspended' },
  reinstate: { from: 'suspended', to: 'approved', action: 'approved' },
};

const note = z.string().trim().max(ORGANISATION_REVIEW_NOTE_MAX_LENGTH);

export const organisationDecisionSchema = z.strictObject({
  decision: z.enum(ORGANISATION_DECISIONS),
  note: note.optional().transform((value) => value || undefined),
});

export type OrganisationDecisionInput = z.infer<
  typeof organisationDecisionSchema
>;

/** Apply an organisation moderation decision; initial registration requires no review (B-ORG-06). */
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
