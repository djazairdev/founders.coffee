import { appErrorCode } from '@founders-coffee/core';

export type CoHostNotice =
  'added' | 'removed' | 'already' | 'not_approved' | 'failed';

/** What to tell the operator about a change that was refused, from the code it was refused with. */
export const refusalNotice = (error: unknown): CoHostNotice => {
  const code = appErrorCode(error);
  if (code === 'organisation_already_organiser') return 'already';
  if (code === 'organisation_not_approved') return 'not_approved';
  return 'failed';
};

/** Whether the event could not be found, as opposed to failing to load. */
export const isEventNotFound = (error: unknown): boolean =>
  appErrorCode(error) === 'event_not_found';
