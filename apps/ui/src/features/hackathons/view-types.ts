import type {
  CreateHackathonDraftRequest,
  EventPage,
  HackathonDraftView,
  HackathonRegistrationView,
  JoinHackathonInterestRequest,
  PublicHackathonPrizeView,
  PublicHackathonRules,
  PublicHackathonTrack,
} from '@founders-coffee/server-fns';

export type HackathonEditSaved = {
  readonly eventId: string;
  readonly version: number;
};
export type HackathonTrackView = HackathonDraftView['tracks'][number];
export type HackathonOffer = {
  readonly tracks: readonly PublicHackathonTrack[];
  readonly prizes: readonly PublicHackathonPrizeView[];
};
export type HackathonJudgeView = EventPage['judges'][number];
export type HackathonMentorView = EventPage['mentors'][number];
export type HackathonWorkshopView = EventPage['workshops'][number];
export type HackathonPublicResults = NonNullable<EventPage['results']>;
export type HackathonPublicResult = HackathonPublicResults['overall'][number];
export type HackathonPageDetails = HackathonOffer & {
  readonly rules: PublicHackathonRules;
  readonly judges: readonly HackathonJudgeView[];
  readonly mentors: readonly HackathonMentorView[];
  readonly workshops: readonly HackathonWorkshopView[];
  readonly results: EventPage['results'];
  readonly registration: HackathonRegistrationView | null;
};
export type HackathonPrizeView = HackathonDraftView['prizes'][number];
export type HackathonBasicsRequest = CreateHackathonDraftRequest['hackathon'];
export type JoinHackathonInterestArgs = { data: JoinHackathonInterestRequest };
