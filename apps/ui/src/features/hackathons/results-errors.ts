import { appErrorCode } from '@founders-coffee/core';
import {
  hackathon_judging_error_failed,
  hackathon_results_panel_error_no_entries,
  hackathon_results_panel_error_not_ended,
  hackathon_results_panel_error_published,
  hackathon_results_panel_error_ties,
  hackathon_results_panel_reason_needed,
  hackathon_team_error_rate_limited,
  type Locale,
} from '@founders-coffee/i18n';

/** What a refused publication of the results tells the organiser (B-JDG-09). */
export const resultsErrorMessage = (error: unknown, locale: Locale): string => {
  const options = { locale };
  switch (appErrorCode(error)) {
    case 'judging_not_ended':
      return hackathon_results_panel_error_not_ended({}, options);
    case 'results_already_published':
      return hackathon_results_panel_error_published({}, options);
    case 'results_no_entries':
      return hackathon_results_panel_error_no_entries({}, options);
    case 'missing_scores_reason_required':
      return hackathon_results_panel_reason_needed({}, options);
    case 'tie_pick_required':
      return hackathon_results_panel_error_ties({}, options);
    case 'rate_limited':
      return hackathon_team_error_rate_limited({}, options);
    default:
      return hackathon_judging_error_failed({}, options);
  }
};
