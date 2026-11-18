import type { HackathonTrackKind } from '@founders-coffee/core';
import { hackathons } from '@founders-coffee/domain';
import {
  hackathon_track_error_brief,
  hackathon_track_error_partner,
  hackathon_track_error_source,
  hackathon_track_error_sources,
  hackathon_track_error_title,
  type Locale,
} from '@founders-coffee/i18n';

import type { HackathonTrackView, SaveHackathonTracksRequest } from './api';

export const TRACK_LIMIT = hackathons.HACKATHON_TRACK_LIMIT;
export const SOURCE_LIMIT = hackathons.HACKATHON_TRACK_SOURCE_LIMIT;

export type TrackDraft = {
  readonly key: string;
  readonly id: string | null;
  readonly kind: HackathonTrackKind;
  readonly title: string;
  readonly brief: string;
  readonly partnerName: string;
  readonly sourceUrls: readonly string[];
};

export type TrackField = 'title' | 'brief' | 'partnerName' | 'sourceUrls';

export type TrackErrors = {
  readonly fields: Partial<Record<TrackField, string>>;
  readonly sources: Readonly<Record<number, string>>;
};

export type TracksCheck =
  | { readonly ok: true; readonly tracks: SaveHackathonTracksRequest['tracks'] }
  | {
      readonly ok: false;
      readonly errors: Readonly<Record<string, TrackErrors>>;
      readonly first: { readonly key: string; readonly target: string } | null;
    };

/** A saved track as the form holds it, keyed by its id. */
export const trackDraftOf = (track: HackathonTrackView): TrackDraft => ({
  key: track.id,
  id: track.id,
  kind: track.kind,
  title: track.title,
  brief: track.brief,
  partnerName: track.partnerName ?? '',
  sourceUrls: track.sourceUrls.length > 0 ? track.sourceUrls : [''],
});

/** A new track, a founder's problem until the organiser picks another kind. */
export const emptyTrack = (key: string): TrackDraft => ({
  key,
  id: null,
  kind: 'founder_problem',
  title: '',
  brief: '',
  partnerName: '',
  sourceUrls: [''],
});

/** A track as the server takes it, carrying only the fields its kind uses. */
const trackInput = (draft: TrackDraft) => {
  const common = { title: draft.title, brief: draft.brief };
  switch (draft.kind) {
    case 'founder_problem':
      return { kind: draft.kind, ...common };
    case 'partner_technology':
      return { kind: draft.kind, ...common, partnerName: draft.partnerName };
    case 'open_source':
      return {
        kind: draft.kind,
        ...common,
        sourceUrls: draft.sourceUrls
          .map((url) => url.trim())
          .filter((url) => url !== ''),
      };
  }
};

const FIELD_MESSAGES = {
  title: hackathon_track_error_title,
  brief: hackathon_track_error_brief,
  partnerName: hackathon_track_error_partner,
  sourceUrls: hackathon_track_error_sources,
} as const;

/**
 * The errors one track holds back, by field, with the shared track rule. A link the rule refuses
 * is named by its place among the links the organiser typed, so the message sits under that link.
 */
const trackErrors = (draft: TrackDraft, locale: Locale): TrackErrors | null => {
  const parsed = hackathons.hackathonTrackSchema.safeParse(trackInput(draft));
  if (parsed.success) return null;
  const typed = draft.sourceUrls.flatMap((url, index) =>
    url.trim() === '' ? [] : [index],
  );
  const fields: Partial<Record<TrackField, string>> = {};
  const sources: Record<number, string> = {};
  for (const issue of parsed.error.issues) {
    const [field, at] = issue.path;
    if (field === 'sourceUrls' && typeof at === 'number')
      sources[typed[at] ?? at] = hackathon_track_error_source({}, { locale });
    else if (field && field in FIELD_MESSAGES)
      fields[field as TrackField] = FIELD_MESSAGES[field as TrackField](
        {},
        { locale },
      );
  }
  return { fields, sources };
};

/** The id of a track's field, or of one of its links, for labels and for taking the organiser there. */
export const trackFieldId = (
  key: string,
  field: TrackField | 'kind' | number,
) =>
  typeof field === 'number'
    ? `hackathon-track-${key}-source-${field}`
    : `hackathon-track-${key}-${field}`;

const FIELD_ORDER: readonly TrackField[] = [
  'title',
  'brief',
  'partnerName',
  'sourceUrls',
];

/** Where the organiser goes first: a track's first field in error, or its first link in error. */
const firstTarget = (key: string, errors: TrackErrors): string => {
  const field = FIELD_ORDER.find((candidate) => errors.fields[candidate]);
  const source = Object.keys(errors.sources)
    .map(Number)
    .sort((a, b) => a - b)[0];
  if (field && field !== 'sourceUrls') return trackFieldId(key, field);
  return trackFieldId(key, source ?? 0);
};

/**
 * Check every track with the rule the server holds them to, and either send them as the server
 * takes them, in their order, or name what each track still needs and where to go first.
 */
export const checkTracks = (
  drafts: readonly TrackDraft[],
  locale: Locale,
): TracksCheck => {
  const errors: Record<string, TrackErrors> = {};
  let first: { key: string; target: string } | null = null;
  for (const draft of drafts) {
    const found = trackErrors(draft, locale);
    if (!found) continue;
    errors[draft.key] = found;
    first ??= { key: draft.key, target: firstTarget(draft.key, found) };
  }
  if (first) return { ok: false, errors, first };
  return {
    ok: true,
    tracks: drafts.map((draft) => ({ id: draft.id, track: trackInput(draft) })),
  };
};
