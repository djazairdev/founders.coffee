import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { OrganisationStatus } from '@founders-coffee/core';

import { organisationReviewApi } from './api';
import { decisionRequest, type OrganisationDecision } from './decisions';

const QUEUE_KEY = 'organisation-review';

/**
 * One page of the organisations in `status`. The page before stays on screen while the next one of
 * the same status loads; a different status starts from its loading state.
 */
export const useOrganisationReviewQueue = (
  status: OrganisationStatus,
  page: number,
) =>
  useQuery({
    queryKey: [QUEUE_KEY, status, page],
    queryFn: () => organisationReviewApi.list({ status, page }),
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === status ? previous : undefined,
  });

/**
 * Decide on one organisation. The queue is reloaded however it ends, so a decision another operator
 * took first shows up rather than lingering.
 */
export const useDecideOrganisation = () => {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      organisationId: string;
      decision: OrganisationDecision;
      note: string;
    }) => {
      const decision = decisionRequest(input.decision, input.note);
      if (!decision) throw new Error('The decision needs a note');
      return organisationReviewApi.decide({
        organisationId: input.organisationId,
        decision,
      });
    },
    onSettled: () => cache.invalidateQueries({ queryKey: [QUEUE_KEY] }),
  });
};
