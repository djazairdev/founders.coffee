import { appErrorCode } from '@founders-coffee/core';
import {
  hackathon_judging_closed,
  hackathon_judging_entry_missing,
  hackathon_judging_entry_recused,
  hackathon_judging_error_failed,
  hackathon_judging_not_judge,
  hackathon_team_error_rate_limited,
  type Locale,
} from '@founders-coffee/i18n';

/** What a refused save of scores or a refused recusal tells the judge (B-JDG-07). */
export const judgingErrorMessage = (error: unknown, locale: Locale): string => {
  const options = { locale };
  switch (appErrorCode(error)) {
    case 'judging_closed':
      return hackathon_judging_closed({}, options);
    case 'judge_recused':
    case 'already_recused':
      return hackathon_judging_entry_recused({}, options);
    case 'not_judge':
      return hackathon_judging_not_judge({}, options);
    case 'submission_not_found':
      return hackathon_judging_entry_missing({}, options);
    case 'rate_limited':
      return hackathon_team_error_rate_limited({}, options);
    default:
      return hackathon_judging_error_failed({}, options);
  }
};
