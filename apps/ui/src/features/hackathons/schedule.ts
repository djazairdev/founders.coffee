import type { HackathonPhase } from '@founders-coffee/core';
import {
  formatDate,
  hackathon_phase_building,
  hackathon_phase_judging,
  hackathon_phase_registration_closed,
  hackathon_phase_registration_open,
  hackathon_phase_results,
  hackathon_phase_upcoming,
  hackathon_schedule_building,
  hackathon_schedule_closes,
  hackathon_schedule_deadline,
  hackathon_schedule_demo_day,
  hackathon_schedule_judging,
  hackathon_schedule_judging_ends,
  hackathon_schedule_kickoff,
  hackathon_schedule_moment,
  hackathon_schedule_opens,
  hackathon_schedule_registration,
  hackathon_schedule_results,
  type Locale,
} from '@founders-coffee/i18n';

import type { HackathonSchedule } from './api';

export type ScheduleStep = {
  readonly phase: HackathonPhase;
  readonly title: string;
  readonly lines: readonly string[];
};

/**
 * A moment of the schedule in the market's time zone: the day and the time formatted apart, with
 * the options the meetup page already renders on the server, and joined by the locale's own words.
 * A date formatted with its time reads differently in V8 and in Apple's ICU, which an iPhone
 * would refuse to hydrate.
 */
export const scheduleMoment = (
  at: number,
  locale: Locale,
  timeZone: string,
): string => {
  const names = locale === 'ar' ? 'long' : 'short';
  const date = new Date(at);
  const on = (options: Intl.DateTimeFormatOptions) =>
    formatDate(date, locale, { timeZone, hour12: false, ...options });
  return hackathon_schedule_moment(
    {
      day: on({ weekday: names, day: 'numeric', month: names }),
      time: on({ hour: '2-digit', minute: '2-digit' }),
    },
    { locale },
  );
};

/** The steps of a hackathon's schedule in order, each with the dates it shows (B-HKN-17). */
export const scheduleSteps = (
  schedule: HackathonSchedule,
  locale: Locale,
  timeZone: string,
): readonly ScheduleStep[] => {
  const options = { locale };
  const at = (moment: number) => ({
    date: scheduleMoment(moment, locale, timeZone),
  });
  return [
    {
      phase: 'registration_open',
      title: hackathon_schedule_registration({}, options),
      lines: [
        hackathon_schedule_opens(at(schedule.registrationOpensAt), options),
        hackathon_schedule_closes(at(schedule.registrationClosesAt), options),
      ],
    },
    {
      phase: 'registration_closed',
      title: hackathon_schedule_kickoff({}, options),
      lines: [scheduleMoment(schedule.kickoffAt, locale, timeZone)],
    },
    {
      phase: 'building',
      title: hackathon_schedule_building({}, options),
      lines: [
        hackathon_schedule_deadline(at(schedule.submissionDeadlineAt), options),
      ],
    },
    {
      phase: 'judging',
      title: hackathon_schedule_judging({}, options),
      lines: [
        hackathon_schedule_demo_day(at(schedule.endsAt), options),
        hackathon_schedule_judging_ends(at(schedule.judgingEndsAt), options),
      ],
    },
    {
      phase: 'results',
      title: hackathon_schedule_results({}, options),
      lines: [],
    },
  ];
};

/** One sentence on where the hackathon is now, with the next date that matters. */
export const phaseSentence = (
  schedule: HackathonSchedule,
  locale: Locale,
  timeZone: string,
): string => {
  const options = { locale };
  const at = (moment: number) => ({
    date: scheduleMoment(moment, locale, timeZone),
  });
  switch (schedule.phase) {
    case 'upcoming':
      return hackathon_phase_upcoming(
        at(schedule.registrationOpensAt),
        options,
      );
    case 'registration_open':
      return hackathon_phase_registration_open(
        at(schedule.registrationClosesAt),
        options,
      );
    case 'registration_closed':
      return hackathon_phase_registration_closed(
        at(schedule.kickoffAt),
        options,
      );
    case 'building':
      return hackathon_phase_building(
        at(schedule.submissionDeadlineAt),
        options,
      );
    case 'judging':
      return hackathon_phase_judging(at(schedule.judgingEndsAt), options);
    case 'results':
      return hackathon_phase_results({}, options);
  }
};
