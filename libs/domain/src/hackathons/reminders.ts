import {
  HACKATHON_JUDGE_REMINDER_KEYS,
  HACKATHON_ORGANISER_REMINDER_KEYS,
  type HackathonReminderKey,
} from '@founders-coffee/core';

import type { HackathonTimeline } from './timeline.js';

const HOUR_MS = 60 * 60 * 1000;

export type HackathonReminder = {
  readonly templateKey: HackathonReminderKey;
  readonly audience: 'organisers' | 'participants' | 'judges';
  readonly sendAt: number;
};

const OFFSETS: readonly {
  readonly templateKey: HackathonReminderKey;
  readonly at: (timeline: HackathonTimeline) => number;
}[] = [
  {
    templateKey: 'hackathon_registration_closing',
    at: (timeline) => timeline.registrationClosesAt - 24 * HOUR_MS,
  },
  {
    templateKey: 'hackathon_kickoff',
    at: (timeline) => timeline.kickoffAt - HOUR_MS,
  },
  {
    templateKey: 'hackathon_deadline_24h',
    at: (timeline) => timeline.submissionDeadlineAt - 24 * HOUR_MS,
  },
  {
    templateKey: 'hackathon_deadline_1h',
    at: (timeline) => timeline.submissionDeadlineAt - HOUR_MS,
  },
  {
    templateKey: 'hackathon_judging_open',
    at: (timeline) => timeline.submissionDeadlineAt,
  },
  {
    templateKey: 'hackathon_judge_judging_open',
    at: (timeline) => timeline.submissionDeadlineAt,
  },
];

const audienceOf = (
  templateKey: HackathonReminderKey,
): HackathonReminder['audience'] => {
  if (
    (HACKATHON_JUDGE_REMINDER_KEYS as readonly string[]).includes(templateKey)
  )
    return 'judges';
  return (HACKATHON_ORGANISER_REMINDER_KEYS as readonly string[]).includes(
    templateKey,
  )
    ? 'organisers'
    : 'participants';
};

/**
 * When each of a hackathon's reminders is due, and to whom (B-HKN-21). The organisers hear that
 * registration closes in 24 hours and that judging has opened; each registered participant hears
 * that kickoff is an hour away and that the submission deadline is 24 hours and then an hour away;
 * each judge who accepted hears that judging has opened (B-JDG-11).
 * Every time comes from the dates alone, so a date change moves its reminders with it.
 */
export const hackathonReminders = (
  timeline: HackathonTimeline,
): HackathonReminder[] =>
  OFFSETS.map(({ templateKey, at }) => ({
    templateKey,
    audience: audienceOf(templateKey),
    sendAt: at(timeline),
  }));
