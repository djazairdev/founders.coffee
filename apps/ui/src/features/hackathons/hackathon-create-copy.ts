import {
  event_when,
  event_where,
  hackathon_desc_label,
  hackathon_desc_ph,
  hackathon_languages_hint,
  hackathon_languages_label,
  hackathon_step_details,
  hackathon_step_place,
  hackathon_step_schedule,
  hackathon_step_schedule_sub,
  hackathon_title_label,
  hackathon_title_ph,
  host_step3_short,
  host_step3_sub,
  type Locale,
} from '@founders-coffee/i18n';

import { HACKATHON_MAX_DAYS } from './hackathon-schedule';

/** The hackathon wizard's step labels, titles and lines under them, in the reader's language. */
export const hackathonStepCopy = (locale: Locale) => ({
  labels: [
    event_where({}, { locale }),
    event_when({}, { locale }),
    host_step3_short({}, { locale }),
  ],
  titles: [
    hackathon_step_place({}, { locale }),
    hackathon_step_schedule({}, { locale }),
    hackathon_step_details({}, { locale }),
  ],
  descriptions: [
    null,
    hackathon_step_schedule_sub({ days: HACKATHON_MAX_DAYS }, { locale }),
    host_step3_sub({}, { locale }),
  ],
});

/** The labels and examples the details step shows for a hackathon instead of a meetup's. */
export const hackathonDetailsCopy = (locale: Locale) => ({
  titleLabel: hackathon_title_label({}, { locale }),
  titlePlaceholder: hackathon_title_ph({}, { locale }),
  descriptionLabel: hackathon_desc_label({}, { locale }),
  descriptionPlaceholder: hackathon_desc_ph({}, { locale }),
  languagesLabel: hackathon_languages_label({}, { locale }),
  languagesHint: hackathon_languages_hint({}, { locale }),
});
