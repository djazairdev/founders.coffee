import type { EventFormat } from '@founders-coffee/core';
import {
  hackathon_format_hybrid,
  hackathon_format_label,
  hackathon_format_online,
  hackathon_hybrid_description,
  hackathon_hybrid_location_hint,
  hackathon_hybrid_location_title,
  hackathon_location_prompt_body,
  hackathon_location_prompt_title,
  hackathon_in_person_description,
  hackathon_online_description,
  hackathon_venue_title,
  hackathon_venue_name_placeholder,
  hackathon_desc_label,
  hackathon_desc_ph,
  hackathon_step_details,
  hackathon_step_details_short,
  hackathon_step_place,
  hackathon_step_place_short,
  hackathon_step_schedule,
  hackathon_step_schedule_short,
  hackathon_step_schedule_sub,
  hackathon_title_label,
  host_venue_empty,
  type Locale,
} from '@founders-coffee/i18n';

/** The hackathon wizard's step labels, titles and lines under them, in the reader's language. */
export const hackathonStepCopy = (locale: Locale) => ({
  labels: [
    hackathon_step_place_short({}, { locale }),
    hackathon_step_schedule_short({}, { locale }),
    hackathon_step_details_short({}, { locale }),
  ],
  titles: [
    hackathon_step_place({}, { locale }),
    hackathon_step_schedule({}, { locale }),
    hackathon_step_details({}, { locale }),
  ],
  descriptions: [null, hackathon_step_schedule_sub({}, { locale }), null],
});

/** The labels and examples the details step shows for a hackathon instead of a meetup's. */
export const hackathonDetailsCopy = (locale: Locale) => ({
  titleLabel: hackathon_title_label({}, { locale }),
  descriptionLabel: hackathon_desc_label({}, { locale }),
  descriptionPlaceholder: hackathon_desc_ph({}, { locale }),
});

export const hackathonPlaceCopy = (locale: Locale) => ({
  formatLabel: hackathon_format_label({}, { locale }),
  formatNames: {
    online: hackathon_format_online({}, { locale }),
    hybrid: hackathon_format_hybrid({}, { locale }),
  } satisfies Partial<Record<EventFormat, string>>,
  descriptions: {
    in_person: hackathon_in_person_description({}, { locale }),
    online: hackathon_online_description({}, { locale }),
    hybrid: hackathon_hybrid_description({}, { locale }),
  } satisfies Record<EventFormat, string>,
  venueTitle: hackathon_venue_title({}, { locale }),
  venueNamePlaceholder: hackathon_venue_name_placeholder({}, { locale }),
  mapHint: host_venue_empty({}, { locale }),
  hybridLocationTitle: hackathon_hybrid_location_title({}, { locale }),
  hybridLocationHint: hackathon_hybrid_location_hint({}, { locale }),
  locationPrompt: {
    title: hackathon_location_prompt_title({}, { locale }),
    body: hackathon_location_prompt_body({}, { locale }),
  },
});
