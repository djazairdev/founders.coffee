import { AppError, err, ok, type Result } from '@founders-coffee/core';
import {
  initializeMemberProfile,
  setPublishHackathonRecord,
  type Db,
} from '@founders-coffee/db';
import { logger } from '@founders-coffee/observability';

/**
 * Show or hide a member's hackathon record on their profile (B-PRF-05). It starts off, and this is
 * the one place it changes outside the profile form, so the offer made when results come out does not
 * need the whole profile to answer it.
 */
export const setHackathonRecordShownResolver = async (
  db: Db,
  input: { readonly userId: string; readonly isShown: boolean },
): Promise<Result<{ readonly isShown: boolean }>> => {
  await initializeMemberProfile(db, input.userId);
  if (!(await setPublishHackathonRecord(db, input)))
    return err(new AppError('not_found', 'Profile not found'));
  logger.info('profile.hackathon_record_changed', { isShown: input.isShown });
  return ok({ isShown: input.isShown });
};
