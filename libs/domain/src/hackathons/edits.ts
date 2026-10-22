import type { HackathonDetailsInput } from './draft.js';

export type HackathonEditStage = 'open' | 'locked' | 'closed';

export type HackathonDetailsField = keyof HackathonDetailsInput;

export const HACKATHON_LOCKED_FIELDS = [
  'rules',
  'minimumAge',
  'attendanceModes',
  'teamMin',
  'teamMax',
  'aiPolicy',
  'aiPolicyNote',
  'licenceNote',
] as const satisfies readonly HackathonDetailsField[];

const DATE_FIELDS = [
  'registrationOpensAt',
  'registrationClosesAt',
  'submissionDeadlineAt',
  'judgingEndsAt',
] as const satisfies readonly HackathonDetailsField[];

type SavedDates = Pick<
  HackathonDetailsInput,
  'registrationOpensAt' | 'judgingEndsAt'
>;

/**
 * How far a hackathon can still be edited at `now` (B-HKN-07). Until registration opens nobody has
 * signed up to anything, so every detail is `open`; from then the published rules are a promise to
 * the people who registered under them, so they are `locked`; once judging ends the hackathon is
 * over and `closed` to edits. A hackathon that is not published, or has no saved details, has
 * nothing anyone registered for.
 */
export const editStageAt = (
  details: SavedDates | null,
  isPublished: boolean,
  now: number,
): HackathonEditStage => {
  if (!isPublished || !details || now < details.registrationOpensAt)
    return 'open';
  return now < details.judgingEndsAt ? 'locked' : 'closed';
};

const sameValue = (before: unknown, after: unknown): boolean =>
  JSON.stringify(before ?? null) === JSON.stringify(after ?? null);

const sameModes = (
  before: HackathonDetailsInput['attendanceModes'],
  after: HackathonDetailsInput['attendanceModes'],
): boolean => sameValue([...before].sort(), [...after].sort());

/** Whether a date may move: never back once locked, and never at all once it has passed. */
const isDateMoveAllowed = (
  before: number,
  after: number,
  now: number,
): boolean => after === before || (before > now && after > before);

/** Whether the number of places may change: once locked, only up, or to no limit. */
const isCapacityAllowed = (
  before: number | undefined,
  after: number | undefined,
): boolean =>
  before === undefined || after === undefined
    ? after === undefined || before === after
    : after >= before;

/**
 * The fields of an edit its hackathon's stage does not allow; empty when the edit may land
 * (B-HKN-07).
 *
 * While `open` anything goes. Once `locked`, the rules people registered under (the rules text,
 * minimum age, ways to take part, team size, AI policy and licence) stay as they are, places can
 * only grow, and dates can only move later, except one that has already passed, which stays. Once
 * `closed`, every change is refused.
 */
export const lockedDetailChanges = (
  before: HackathonDetailsInput | null,
  after: HackathonDetailsInput,
  stage: HackathonEditStage,
  now: number,
): HackathonDetailsField[] => {
  if (!before || stage === 'open') return [];
  const fields = new Set([
    ...Object.keys(before),
    ...Object.keys(after),
  ]) as Set<HackathonDetailsField>;
  const changed = [...fields].filter(
    (field) => !sameValue(before[field], after[field]),
  );
  if (stage === 'closed') return changed;
  return changed.filter((field) => {
    if (field === 'attendanceModes')
      return !sameModes(before.attendanceModes, after.attendanceModes);
    if (field === 'capacity')
      return !isCapacityAllowed(before.capacity, after.capacity);
    if ((DATE_FIELDS as readonly string[]).includes(field)) {
      const date = field as (typeof DATE_FIELDS)[number];
      return !isDateMoveAllowed(before[date], after[date], now);
    }
    return (HACKATHON_LOCKED_FIELDS as readonly string[]).includes(field);
  });
};

/** Whether a hackathon's judging rubric may change: only before anyone registered under it. */
export const isRubricEditable = (stage: HackathonEditStage): boolean =>
  stage === 'open';

/** Whether a track may be removed: only before registration opens, since teams plan around it. */
export const isTrackRemovable = (stage: HackathonEditStage): boolean =>
  stage === 'open';

/** Whether tracks may be added or reworded: until the hackathon is over. */
export const areTracksEditable = (stage: HackathonEditStage): boolean =>
  stage !== 'closed';

/** Whether a prize may be added: until the hackathon is over, so a late sponsor still can. */
export const isPrizeAddable = (stage: HackathonEditStage): boolean =>
  stage !== 'closed';

/**
 * Whether a prize may be changed or withdrawn: only before registration opens, and only while its
 * provider has not confirmed it, since a confirmation is to the terms as they were written.
 */
export const isPrizeChangeable = (
  stage: HackathonEditStage,
  isConfirmed: boolean,
): boolean => stage === 'open' && !isConfirmed;
