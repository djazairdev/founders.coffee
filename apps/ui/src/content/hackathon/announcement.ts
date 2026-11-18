import { getZonedWallClock } from '@founders-coffee/i18n';

export type CalendarDay = `${number}-${number}-${number}`;

export type HackathonAnnouncementEntry = {
  readonly marketCode: string;
  readonly registrationOpens: CalendarDay;
  readonly kickoff: CalendarDay;
  readonly submissionsClose: CalendarDay;
  readonly demoDay: CalendarDay;
};

export const FIRST_HACKATHON: HackathonAnnouncementEntry = {
  marketCode: 'DZ',
  registrationOpens: '2027-01-04',
  kickoff: '2027-01-22',
  submissionsClose: '2027-01-29',
  demoDay: '2027-01-30',
};

const twoDigits = (value: number): string => String(value).padStart(2, '0');

/**
 * Whether a market's pages still carry the announcement.
 *
 * Only the market the hackathon runs in shows it, and only until the day registration opens there,
 * when the hackathon's own section (B-HKN-20) takes its place. The day is read on the market's
 * clock, so the section goes at midnight in Algiers whatever the reader's device says.
 */
export const isAnnouncementShown = (
  entry: HackathonAnnouncementEntry,
  marketCode: string,
  timeZone: string,
  now: number,
): boolean => {
  if (marketCode !== entry.marketCode) return false;
  const { year, month, day } = getZonedWallClock(now, timeZone);
  const today = `${year}-${twoDigits(month)}-${twoDigits(day)}`;
  return today < entry.registrationOpens;
};
