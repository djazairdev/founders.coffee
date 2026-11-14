import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { flushSync } from 'react-dom';

import type { EventFormat, Topic } from '@founders-coffee/core';
import type { Market } from '@founders-coffee/db';
import { events, type geo } from '@founders-coffee/domain';
import {
  host_time_invalid,
  host_time_nonexistent,
  host_time_zone_error,
  localizedName,
  type Locale,
  type ZonedDateTimeError,
} from '@founders-coffee/i18n';

import {
  firstInvalidField,
  focusInvalidField,
  shownErrors,
  validateDetailsStep,
  validateVenueStep,
  type HostCreateFieldErrors,
} from '../events/host-create-validation';
import { eventPlaceFields } from '../events/host-create-payload';
import type { VenueArea, VenueSelection } from '../events/types';
import { localizedHackathonManage } from '../../lib/locale-routing';
import { validateHackathonSchedule } from './hackathon-schedule';
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
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<Topic[]>([]);
  const [fieldErrors, setFieldErrors] = useState<HostCreateFieldErrors>({});
  const clearError = (field: keyof HostCreateFieldErrors) =>
    setFieldErrors((current) => ({ ...current, [field]: undefined }));

  const validateCurrentStep = (): boolean => {
    const check =
      step === 1
        ? events.hasVenue(format)
          ? validateVenueStep(venue, venueName, locale)
          : {}
        : step === 2
          ? validateHackathonSchedule(startsAt, endsAt, locale)
          : validateDetailsStep(
              {
                title,
                description,
                languages: [locale],
              },
              locale,
            );
    flushSync(() => setFieldErrors((shown) => shownErrors(check, shown)));
    const first = firstInvalidField(check);
    if (first) focusInvalidField(first);
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
          tags: [...tags],
          startsAt,
          endsAt,
          ...place,
        },
      },
      {
        onSuccess: (created) =>
          void navigate({
            ...localizedHackathonManage(locale, created.eventId),
            search: { created: true },
          }),
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
    tags,
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
    setTags,
  };
};
