import {
  AppError,
  err,
  ok,
  type OrganisationStatus,
  type Result,
} from '@founders-coffee/core';

const TRANSITIONS: Record<OrganisationStatus, readonly OrganisationStatus[]> = {
  pending: [],
  approved: ['suspended'],
  suspended: ['approved'],
  rejected: [],
};

export const canTransitionOrganisation = (
  from: OrganisationStatus,
  to: OrganisationStatus,
): boolean => TRANSITIONS[from].includes(to);

/** Suspend or reinstate an active organisation; legacy blocked statuses remain read-only. */
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

/** Active registrations can organise; suspended and legacy blocked records cannot. */
export const isOrganisationActive = (status: OrganisationStatus): boolean =>
  status === 'approved';
