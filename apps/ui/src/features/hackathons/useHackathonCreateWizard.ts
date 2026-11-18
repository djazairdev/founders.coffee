import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { flushSync } from 'react-dom';

import type {
  EventFormat,
  HackathonField,
  HackathonTypeTag,
} from '@founders-coffee/core';
import type { Market } from '@founders-coffee/db';
import { events, type geo } from '@founders-coffee/domain';
import {
  host_time_invalid,
  host_time_nonexistent,
  host_time_zone_error,
  hackathon_desc_template,
  localizedName,
  type Locale,
  type ZonedDateTimeError,
} from '@founders-coffee/i18n';

import { focusInvalidField } from '../events/host-create-validation';
import { eventPlaceFields } from '../events/host-create-payload';
import type { VenueArea, VenueSelection } from '../events/types';
import { localizedHackathonManage } from '../../lib/locale-routing';
import {
  firstInvalidHackathonField,
  shownHackathonErrors,
  validateHackathonCreateStep,
  type HackathonCreateFieldErrors,
} from './hackathon-create-validation';
import { useCreateHackathonDraft } from './hooks';
import { hackathonSaveError } from './save-errors';

export const HACKATHON_WIZARD_STEPS = 3;

const scheduleErrorMessage = (
  error: ZonedDateTimeError | null,
  locale: Locale,
): string | undefined => {
  if (error === 'nonexistent_time')
    return host_time_nonexistent({}, { locale });
  if (error === 'invalid_time_zone')
    return host_time_zone_error({}, { locale });
  return error ? host_time_invalid({}, { locale }) : undefined;
};

/**
 * The organiser flow's first step (B-HKN-11): the hackathon as an event, collected over three
 * screens (its place, kickoff to demo day, and what it is) and saved as the organisation's draft.
 *
 * Each screen is checked as Next leaves it, the way the host wizard checks its own, and the
 * organiser is taken to the first field holding it back. Saving sends the basics alone; a refusal
 * keeps every field and says what to do, and a saved draft opens its second step.
 */
export const useHackathonCreateWizard = ({
  locale,
  market,
  city,
  organisation,
}: {
  locale: Locale;
  market: Market;
  city: geo.GeoCity | null;
  organisation: { readonly id: string; readonly slug: string };
}) => {
  const navigate = useNavigate();
  const save = useCreateHackathonDraft();
  const [step, setStep] = useState(1);
  const [format, setFormat] = useState<EventFormat>('online');
  const [venue, setVenue] = useState<VenueSelection | null>(null);
  const [venueName, setVenueName] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [startsAt, setStartsAt] = useState<number | null>(null);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState<string>(() =>
    hackathon_desc_template({}, { locale }),
  );
  const [fields, setFields] = useState<HackathonField[]>([]);
  const [typeTags, setTypeTags] = useState<HackathonTypeTag[]>([]);
  const [showScheduleValidation, setShowScheduleValidation] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<HackathonCreateFieldErrors>(
    {},
  );
  const clearError = (field: keyof HackathonCreateFieldErrors) =>
    setFieldErrors((current) => ({ ...current, [field]: undefined }));

  const validateCurrentStep = (): boolean => {
    const check = validateHackathonCreateStep({
      step,
      title,
      description,
      fields,
      typeTags,
      format,
      venue,
      venueName,
      startsAt,
      endsAt,
      locale,
    });
    flushSync(() => {
      setFieldErrors((shown) => shownHackathonErrors(check, shown));
      if (step === 2) setShowScheduleValidation(true);
    });
    const first = firstInvalidHackathonField(check);
    if (first === 'schedule' && step === 2) {
      const invalidScheduleField = document.querySelector<HTMLElement>(
        '#hackathon-start-date[aria-invalid="true"], #hackathon-end-date[aria-invalid="true"], #hackathon-kickoff-time[aria-invalid="true"], #hackathon-demo-day-time[aria-invalid="true"]',
      );
      (
        invalidScheduleField ?? document.getElementById('hackathon-start-date')
      )?.focus();
    } else if (first === 'description' && step === 3) {
      document.getElementById('hackathon-description')?.focus();
    } else if (first === 'hackathonFields' || first === 'hackathonTypeTags') {
      document
        .getElementById(
          first === 'hackathonFields'
            ? 'hackathon-fields'
            : 'hackathon-type-tags',
        )
        ?.focus();
    } else if (first) {
      focusInvalidField(first);
    }
    return first === null;
  };

  const submit = () => {
    const place = eventPlaceFields(
      { format, venue, venueName, meetingUrl: '' },
      format === 'online' ? undefined : city?.code,
      {
        allowNationwideOnline: true,
        allowOnlineWithoutMeetingLink: true,
      },
    );
    if (!place || startsAt === null || endsAt === null) return;
    save.mutate(
      {
        organisationId: organisation.id,
        hackathon: {
          marketCode: market.code,
          ...(format === 'online' ? {} : { cityCode: city?.code }),
          title,
          description,
          languages: [locale],
          tags: [],
          hackathonFields: [...fields],
          hackathonTypeTags: [...typeTags],
          startsAt,
          endsAt,
          ...place,
        },
      },
      {
        onSuccess: (created) =>
          void navigate(localizedHackathonManage(locale, created.eventId)),
      },
    );
  };

  const next = () => {
    if (save.isPending || !validateCurrentStep()) return;
    save.reset();
    if (step < HACKATHON_WIZARD_STEPS) setStep(step + 1);
    else submit();
  };

  const venueArea: VenueArea = city
    ? { kind: 'city', name: localizedName(city, locale) }
    : { kind: 'market', name: localizedName(market, locale) };

  return {
    step,
    format,
    venue,
    venueName,
    searchValue,
    startsAt,
    endsAt,
    title,
    description,
    fields,
    typeTags,
    showScheduleValidation,
    fieldErrors,
    venueArea,
    isVenueFormat: events.hasVenue(format),
    isLinkFormat: events.hasMeetingLink(format),
    isSaving: save.isPending,
    saveError: save.isError ? hackathonSaveError(save.error, locale) : null,
    next,
    prev: () => {
      save.reset();
      setFieldErrors({});
      setShowScheduleValidation(false);
      setStep(Math.max(1, step - 1));
    },
    setFormat: (value: EventFormat) => {
      setFormat(value);
      setFieldErrors({});
      save.reset();
    },
    setSearchValue,
    setVenueName: (value: string) => {
      setVenueName(value);
      clearError('venueName');
    },
    selectVenue: (selection: VenueSelection) => {
      setVenue(selection);
      setVenueName(selection.kind === 'poi' ? selection.name : '');
      setFieldErrors((current) => ({
        ...current,
        venue: undefined,
        venueName: undefined,
      }));
    },
    clearVenue: () => {
      setVenue(null);
      setVenueName('');
      setSearchValue('');
    },
    clearVenueError: () => clearError('venue'),
    setSchedule: (nextStartsAt: number | null, nextEndsAt: number | null) => {
      setStartsAt(nextStartsAt);
      setEndsAt(nextEndsAt);
      clearError('schedule');
    },
    setScheduleError: (error: ZonedDateTimeError | null) =>
      setFieldErrors((current) => ({
        ...current,
        schedule: scheduleErrorMessage(error, locale),
      })),
    setTitle: (value: string) => {
      setTitle(value);
      clearError('title');
    },
    setDescription: (value: string) => {
      setDescription(value);
      clearError('description');
    },
    setFields: (next: HackathonField[]) => {
      setFields(next);
      if (next.length > 0) clearError('hackathonFields');
    },
    setTypeTags: (next: HackathonTypeTag[]) => {
      setTypeTags(next);
      if (next.length > 0) clearError('hackathonTypeTags');
    },
  };
};
