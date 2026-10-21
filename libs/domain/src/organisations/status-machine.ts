import {
  AppError,
  err,
  ok,
  type OrganisationStatus,
  type Result,
} from '@founders-coffee/core';

const TRANSITIONS: Record<OrganisationStatus, readonly OrganisationStatus[]> = {
  pending: ['approved', 'rejected'],
  approved: ['suspended'],
  suspended: ['approved'],
  rejected: [],
};

export const canTransitionOrganisation = (
  from: OrganisationStatus,
  to: OrganisationStatus,
): boolean => TRANSITIONS[from].includes(to);

/**
 * Move an organisation to `to`, or refuse with a typed error.
 *
 * An application is decided once: approved or rejected. An approved organisation can be suspended
 * and reinstated as often as needed; a rejected one stays rejected, and its people apply again as a
 * new organisation, so a decision on the record is never quietly reversed.
 */
export const transitionOrganisation = (
  from: OrganisationStatus,
  to: OrganisationStatus,
): Result<OrganisationStatus> =>
  canTransitionOrganisation(from, to)
    ? ok(to)
    : err(
        new AppError(
          'invalid_organisation_transition',
          `Cannot move an organisation from '${from}' to '${to}'`,
        ),
      );

/**
 * Whether an organisation may act: create hackathons, host events, invite members.
 *
 * Only an approved one may. Pending is waiting for an admin, and rejected and suspended are
 * decisions against it, so every Stage B action that needs an organisation checks this first.
 */
export const isOrganisationActive = (status: OrganisationStatus): boolean =>
  status === 'approved';
