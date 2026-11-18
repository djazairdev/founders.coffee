import {
  AppError,
  err,
  id,
  ok,
  type Locale,
  type Result,
} from '@founders-coffee/core';
import {
  getMarketByCode,
  insertHackathonInterest,
  type Db,
} from '@founders-coffee/db';
import {
  logger,
  reportError,
  type Metrics,
} from '@founders-coffee/observability';

export const HACKATHON_INTEREST_JOINED_METRIC = 'hackathon_interest_joined';

export type JoinHackathonInterestInput = {
  readonly email: string;
  readonly marketCode: string;
  readonly locale: Locale;
};

export type JoinHackathonInterestResult = { readonly status: 'received' };

/**
 * Count one new address on the interest list, by market and reading language only.
 *
 * Nothing about the person goes into the row, and a repeat is not counted, so the total is how many
 * addresses asked. A metrics failure is reported and never fails the join.
 */
const recordJoined = (
  metrics: Metrics | null,
  input: JoinHackathonInterestInput,
): void => {
  try {
    metrics?.trackEvent(HACKATHON_INTEREST_JOINED_METRIC, {
      market: input.marketCode,
      locale: input.locale,
    });
  } catch (error) {
    reportError(error, { operation: HACKATHON_INTEREST_JOINED_METRIC });
  }
};

/**
 * Add an address to a market's "tell me when registration opens" list (B-ANN-01).
 *
 * It answers `received` whether the address is new or was already there, so the form cannot be
 * used to learn who signed up. It does not read the market's `hackathons` flag: the list is how the
 * hackathon is announced before the product is switched on. The address never reaches a log.
 */
export const joinHackathonInterestResolver = async (
  db: Db,
  metrics: Metrics | null,
  input: JoinHackathonInterestInput,
): Promise<Result<JoinHackathonInterestResult>> => {
  if (!(await getMarketByCode(db, input.marketCode)))
    return err(
      new AppError('market_not_found', `No market ${input.marketCode}`),
    );
  const { isNew } = await insertHackathonInterest(db, {
    id: id('hint'),
    email: input.email,
    marketCode: input.marketCode,
    locale: input.locale,
  });
  logger.info('hackathon_interest.joined', {
    marketCode: input.marketCode,
    locale: input.locale,
    isNew,
  });
  if (isNew) recordJoined(metrics, input);
  return ok({ status: 'received' });
};
