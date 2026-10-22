import {
  AppError,
  err,
  ok,
  type AttendanceMode,
  type HackathonAiPolicy,
  type HackathonTrackKind,
  type Result,
} from '@founders-coffee/core';
import {
  readEventPageRows,
  type Db,
  type HackathonWorkshop,
  type Market,
  type PublicHackathonJudge,
  type PublicHackathonMentor,
  type PublicHackathonPrize,
} from '@founders-coffee/db';
import { reportError } from '@founders-coffee/observability';

import { resolveMarket } from '../markets/resolver.js';
import { ownerProfileOf, publicProfileOf } from '../profile/projection.js';
import type { PublicProfile } from '../profile/schemas.js';
import type { EventDetailItem } from './attendance.js';
import { eventDetail } from './detail.js';
import {
  hackathonScheduleOf,
  type HackathonSchedule,
} from './hackathon-schedule.js';
import { availableToReader } from './resolver.js';
import type { EventPageRequestInput } from './schemas.js';

export type PublicHackathonTrack = {
  readonly id: string;
  readonly kind: HackathonTrackKind;
  readonly title: string;
  readonly brief: string;
  readonly partnerName: string | null;
  readonly sourceUrls: readonly string[];
};

export type PublicHackathonPrizeView = Omit<
  PublicHackathonPrize,
  'confirmedAt'
>;

export type PublicHackathonRules = {
  readonly rules: string | null;
  readonly minimumAge: number | null;
  readonly attendanceModes: readonly AttendanceMode[];
  readonly teamMin: number;
  readonly teamMax: number;
  readonly aiPolicy: HackathonAiPolicy;
  readonly aiPolicyNote: string | null;
  readonly licenceNote: string | null;
};

export type HackathonOrganisation = {
  readonly name: string;
  readonly slug: string;
};

export interface EventPage {
  readonly market: Market;
  readonly event: EventDetailItem;
  readonly host: PublicProfile | null;
  readonly viewerId: string | null;
  readonly hackathon: HackathonSchedule | null;
  readonly rules: PublicHackathonRules | null;
  readonly judges: readonly PublicHackathonJudge[];
  readonly tracks: readonly PublicHackathonTrack[];
  readonly prizes: readonly PublicHackathonPrizeView[];
  readonly mentors: readonly PublicHackathonMentor[];
  readonly workshops: readonly HackathonWorkshop[];
  readonly organisations: readonly HackathonOrganisation[];
}

type PageRows = Awaited<ReturnType<typeof readEventPageRows>>;

/** The organisations that run a hackathon, the lead first, for its structured data (B-HKN-24). */
const organisationsOf = (
  rows: PageRows['organisers'],
): HackathonOrganisation[] =>
  [...rows]
    .sort((a, b) => Number(b.role === 'lead') - Number(a.role === 'lead'))
    .map(({ name, slug }) => ({ name, slug }));

const rulesOf = (
  row: PageRows['hackathon'],
  isHackathon: boolean,
): PublicHackathonRules | null =>
  row && isHackathon
    ? {
        rules: row.rules,
        minimumAge: row.minimumAge,
        attendanceModes: row.attendanceModes,
        teamMin: row.teamMin,
        teamMax: row.teamMax,
        aiPolicy: row.aiPolicy,
        aiPolicyNote: row.aiPolicyNote,
        licenceNote: row.licenceNote,
      }
    : null;

const publicPrizeOf = (
  prize: PublicHackathonPrize,
): PublicHackathonPrizeView => ({
  id: prize.id,
  trackId: prize.trackId,
  place: prize.place,
  title: prize.title,
  description: prize.description,
  providerName: prize.providerName,
  value: prize.value,
});

/** Read the meetup and its host's rows, answering a failed read with a typed error. */
const pageRows = async (
  db: Db,
  input: EventPageRequestInput,
): Promise<Result<PageRows>> => {
  try {
    return ok(
      await readEventPageRows(db, input.marketCode, input.slug, new Date()),
    );
  } catch (error) {
    reportError(error, {
      operation: 'read_event_page',
      market: input.marketCode,
    });
    return err(
      new AppError('event_unavailable', 'The meetup could not be read'),
    );
  }
};

/**
 * The host's public card, or `null` when the host has none to show.
 *
 * A host with no public profile, an erased one among them, still leaves the meetup on its page as
 * the city's record (#105), so a missing card is an answer rather than a failure. The card is
 * built by the same steps as `readPublicProfile`, from the same rows.
 */
const hostCard = (
  hostId: string,
  host: PageRows['host'],
): PublicProfile | null => {
  const owner = ownerProfileOf(hostId, host.identity, host.stored);
  if (!owner.ok) return null;
  const card = publicProfileOf(owner.data, host);
  return card.ok ? card.data : null;
};

/**
 * Everything a meetup's page shows, in as few trips to D1 as its reads allow (#114).
 *
 * Each trip costs a round trip from where the Worker runs to the database's region, Madrid to
 * London for a reader in Algeria. The meetup and every row of its host's card come back in one
 * batch, read beside the market and the reader's session, so a reader who is signed out waits on
 * one trip here. One who is signed in waits on a second, for whether they are going, which needs
 * both the session and the meetup. Before this, the page read the meetup, then checked its host,
 * then read the host's profile, then counted the host's record, one after another.
 *
 * The session comes in as a promise so that it resolves alongside the first reads, and the host
 * card is read without the budget `getPublicProfile` spends. That budget stops somebody walking
 * user ids to collect profiles. This card is only ever the one a published meetup's page already
 * shows to anyone who opens it, reached by the meetup's address rather than by an id.
 *
 * The reader's id comes back with the page, `null` for a reader who is signed out. The page is
 * rendered for one reader (`private, no-store`), and whether they host the meetup has to be in the
 * HTML the server sends, as whether they are going already is. The browser's own session answers
 * only after hydration, and until it did, a host's own meetup showed them a guest's RSVP box. A
 * hackathon's schedule and current phase come back with it, read in the same batch (B-HKN-17), with
 * its rules, eligibility, AI policy and licence (B-HKN-19), and
 * so do the judges who accepted (B-JDG-03), its tracks and confirmed prizes (B-HKN-18), and its
 * mentors and its organisers' workshops before kickoff (B-HKN-26), and the organisations that run
 * it, for its structured data (B-HKN-24), none for a meetup.
 */
export const readEventPage = async (
  db: Db,
  input: EventPageRequestInput,
  viewer: Promise<string | undefined>,
): Promise<Result<EventPage>> => {
  const [market, rows, viewerId] = await Promise.all([
    resolveMarket(db, { code: input.marketCode }),
    pageRows(db, input),
    viewer,
  ]);
  if (!market.ok) return market;
  if (!rows.ok) return rows;
  const event = await availableToReader(
    db,
    rows.data.event,
    input.slug,
    viewerId,
  );
  if (!event.ok) return event;
  const isHackathon = event.data.kind === 'hackathon';
  return ok({
    market: market.data,
    event: await eventDetail(db, event.data, viewerId, rows.data.organisers),
    host: hostCard(event.data.hostId, rows.data.host),
    viewerId: viewerId ?? null,
    hackathon: hackathonScheduleOf(event.data, rows.data.hackathon, Date.now()),
    rules: rulesOf(rows.data.hackathon, isHackathon),
    judges: isHackathon ? rows.data.judges : [],
    tracks: isHackathon ? rows.data.tracks : [],
    prizes: isHackathon ? rows.data.prizes.map(publicPrizeOf) : [],
    mentors: isHackathon ? rows.data.mentors : [],
    workshops: isHackathon ? rows.data.workshops : [],
    organisations: isHackathon ? organisationsOf(rows.data.organisers) : [],
  });
};
