import type {
  EventFormat,
  HackathonField,
  HackathonTypeTag,
} from '@founders-coffee/core';
import { events, hackathons } from '@founders-coffee/domain';
import {
  host_desc_constraints,
  host_title_constraints,
  type Locale,
} from '@founders-coffee/i18n';

import {
  firstInvalidField,
  shownErrors,
  validateVenueStep,
  type HostCreateFieldErrors,
  type HostCreateStepCheck,
} from '../events/host-create-validation';
import type { VenueSelection } from '../events/types';
import { hackathonClassificationCopy } from './hackathon-classification-copy';
import { validateHackathonSchedule } from './hackathon-schedule';

export type HackathonClassificationField =
  'hackathonFields' | 'hackathonTypeTags';
export type HackathonCreateFieldErrors = HostCreateFieldErrors &
  Partial<Record<HackathonClassificationField, string>>;
export type HackathonCreateStepCheck = HostCreateStepCheck &
  Partial<Record<HackathonClassificationField, string | null>>;

export const shownHackathonErrors = (
  check: HackathonCreateStepCheck,
  shown: HackathonCreateFieldErrors,
): HackathonCreateFieldErrors => ({
  ...shownErrors(check, shown),
  ...('hackathonFields' in check
    ? { hackathonFields: check.hackathonFields ?? shown.hackathonFields }
    : {}),
  ...('hackathonTypeTags' in check
    ? {
        hackathonTypeTags: check.hackathonTypeTags ?? shown.hackathonTypeTags,
      }
    : {}),
});

export const validateHackathonCreateStep = (input: {
  step: number;
  title: string;
  description: string;
  fields: readonly HackathonField[];
  typeTags: readonly HackathonTypeTag[];
  format: EventFormat;
  venue: VenueSelection | null;
  venueName: string;
  startsAt: number | null;
  endsAt: number | null;
  locale: Locale;
}): HackathonCreateStepCheck => {
  if (input.step === 1) {
    const copy = hackathonClassificationCopy(input.locale);
    return {
      ...validateTitle(input.title, input.locale),
      ...(input.fields.length === 0
        ? { hackathonFields: copy.fieldsRequired }
        : {}),
      ...(input.typeTags.length === 0
        ? { hackathonTypeTags: copy.typeTagsRequired }
        : {}),
      ...(events.hasVenue(input.format)
        ? validateVenueStep(input.venue, input.venueName, input.locale)
        : {}),
    };
  }
  if (input.step === 2) {
    return validateHackathonSchedule(
      input.startsAt,
      input.endsAt,
      input.locale,
    );
  }
  return validateDescription(input.description, input.locale);
};

export const firstInvalidHackathonField = (
  check: HackathonCreateStepCheck,
): HackathonClassificationField | keyof HostCreateFieldErrors | null =>
  check.title !== undefined
    ? 'title'
    : check.hackathonFields !== undefined
      ? 'hackathonFields'
      : check.hackathonTypeTags !== undefined
        ? 'hackathonTypeTags'
        : firstInvalidField(check);

const validateTitle = (title: string, locale: Locale): HostCreateStepCheck => {
  if (!title.trim()) return { title: null };
  return events.eventTitleSchema.safeParse(title).success
    ? {}
    : {
        title: host_title_constraints(
          {
            min: events.EVENT_TITLE_MIN_LENGTH,
            max: events.EVENT_TITLE_MAX_LENGTH,
          },
          { locale },
        ),
      };
};

const validateDescription = (
  description: string,
  locale: Locale,
): HostCreateStepCheck => {
  if (!description.trim()) return { description: null };
  return hackathons.hackathonDescriptionSchema.safeParse(description).success
    ? {}
    : {
        description: host_desc_constraints(
          {
            min: events.EVENT_DESCRIPTION_MIN_LENGTH,
            max: hackathons.HACKATHON_DESCRIPTION_MAX_LENGTH,
          },
          { locale },
        ),
      };
};
