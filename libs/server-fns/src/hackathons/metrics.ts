import { idSchema } from '@founders-coffee/core';
import {
  reportError,
  type HackathonMetric,
  type Metrics,
} from '@founders-coffee/observability';

interface HackathonMetricSubject {
  readonly marketCode: string;
  readonly hackathonId: string;
  readonly trackId?: string;
}

const isId = (value: string): boolean => idSchema.safeParse(value).success;

/**
 * Count one Stage B outcome on the Analytics Engine dataset, after the write it describes committed.
 *
 * The only dimensions are the market, the hackathon's event id and, for a submission, its track id:
 * no member, team name, title or other free text, so the row says how much happened and where, never
 * who. An id that is not in the id factory's format is refused rather than written, which is what
 * keeps a caller from passing a title where an id belongs. A metrics failure is reported and never
 * undoes the outcome.
 */
export const recordHackathonMetric = (
  metrics: Metrics | null | undefined,
  metric: HackathonMetric,
  subject: HackathonMetricSubject,
): void => {
  try {
    if (
      !isId(subject.hackathonId) ||
      (subject.trackId !== undefined && !isId(subject.trackId))
    ) {
      reportError(new Error('A hackathon metric was given a malformed id'), {
        operation: metric,
      });
      return;
    }
    metrics?.trackEvent(metric, {
      market: subject.marketCode,
      hackathon: subject.hackathonId,
      ...(subject.trackId === undefined ? {} : { track: subject.trackId }),
    });
  } catch (error) {
    reportError(error, { operation: metric });
  }
};
