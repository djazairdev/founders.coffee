import { AppError, type HackathonErrorCode } from '@founders-coffee/core';
import { hackathonsEnabled, type Db } from '@founders-coffee/db';

const HACKATHONS_DISABLED: HackathonErrorCode = 'hackathons_disabled';

/**
 * Refuse when the market has not turned hackathons on.
 *
 * Every Stage B server function calls this before it reads or writes anything, so switching the
 * flag off closes the feature on the server, not only on the screens that link to it. The reader
 * treats an absent key and an unknown market as off.
 */
export const requireHackathonsEnabled = async (
  db: Db,
  marketCode: string,
): Promise<AppError | null> =>
  (await hackathonsEnabled(db, marketCode))
    ? null
    : new AppError(
        HACKATHONS_DISABLED,
        'Hackathons are not enabled in this market',
      );
