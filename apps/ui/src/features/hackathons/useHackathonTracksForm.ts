import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import {
  hackathon_tracks_error_none,
  type Locale,
} from '@founders-coffee/i18n';

import { seekField } from '../events/seek-field';
import type { HackathonDraftView } from './api';
import { hackathonEditError } from './edit-errors';
import {
  checkTracks,
  emptyTrack,
  SOURCE_LIMIT,
  TRACK_LIMIT,
  trackDraftOf,
  type TrackDraft,
  type TrackErrors,
  type TrackField,
} from './hackathon-tracks-form';
import { useSaveHackathonTracks } from './hooks';

export const TRACKS_ADD_ID = 'hackathon-tracks-add';

const seekId = (id: string) => {
  const element = document.getElementById(id);
  if (element) seekField(element);
};

/** A copy of `record` without `key`. */
const without = <V>(
  record: Readonly<Partial<Record<string | number, V>>>,
  key: string | number,
): Record<string, V> =>
  Object.fromEntries(
    Object.entries(record).filter(
      (entry): entry is [string, V] =>
        entry[0] !== String(key) && entry[1] !== undefined,
    ),
  );

/** Move the item at `from` by `step` places, keeping the list as it is at either end. */
const moved = <T>(items: readonly T[], from: number, step: number): T[] => {
  const to = from + step;
  if (from < 0 || to < 0 || to >= items.length) return [...items];
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
};

/**
 * A hackathon's tracks as a form (B-HKN-13): add, reword, reorder and remove them, then save the
 * whole list in its order.
 *
 * Save checks every track with the rule the server applies and takes the organiser to the first
 * field holding it back. Once registration is open a saved track can no longer be removed
 * (B-HKN-07). After a save the list is read again from the hackathon, so new tracks carry the ids
 * the server gave them and the next save keeps them.
 */
export const useHackathonTracksForm = ({
  draft,
  locale,
}: {
  draft: HackathonDraftView;
  locale: Locale;
}) => {
  const save = useSaveHackathonTracks();
  const counter = useRef(0);
  const newKey = () => {
    counter.current += 1;
    return `new-${counter.current}`;
  };
  const [tracks, setTracks] = useState<readonly TrackDraft[]>(() =>
    draft.tracks.length > 0
      ? draft.tracks.map(trackDraftOf)
      : [emptyTrack(newKey())],
  );
  const [errors, setErrors] = useState<Readonly<Record<string, TrackErrors>>>(
    {},
  );
  const [listError, setListError] = useState<string | null>(null);
  const [syncedVersion, setSyncedVersion] = useState(draft.version);

  if (save.isSuccess && save.data.version !== syncedVersion) {
    setSyncedVersion(save.data.version);
    setTracks(draft.tracks.map(trackDraftOf));
  }

  const edited = (next: readonly TrackDraft[]) => {
    setTracks(next);
    setListError(null);
    save.reset();
  };

  const update = (key: string, change: Partial<TrackDraft>) =>
    edited(
      tracks.map((track) =>
        track.key === key ? { ...track, ...change } : track,
      ),
    );

  const clearError = (key: string, field: TrackField | number) =>
    setErrors((current) => {
      const track = current[key];
      if (!track) return current;
      return {
        ...current,
        [key]: {
          fields: without(track.fields, field),
          sources: without(track.sources, field),
        },
      };
    });

  const set =
    (key: string, field: Exclude<TrackField, 'sourceUrls'>) =>
    (value: string) => {
      update(key, { [field]: value });
      clearError(key, field);
    };

  const sourcesOf = (key: string) =>
    tracks.find((track) => track.key === key)?.sourceUrls ?? [];

  const setSource = (key: string, index: number, value: string) => {
    update(key, {
      sourceUrls: sourcesOf(key).map((url, at) => (at === index ? value : url)),
    });
    clearError(key, index);
    clearError(key, 'sourceUrls');
  };

  const addSource = (key: string) => {
    const sources = sourcesOf(key);
    if (sources.length >= SOURCE_LIMIT) return;
    flushSync(() => update(key, { sourceUrls: [...sources, ''] }));
    seekId(`hackathon-track-${key}-source-${sources.length}`);
  };

  const removeSource = (key: string, index: number) => {
    const sources = sourcesOf(key);
    update(key, {
      sourceUrls:
        sources.length > 1 ? sources.filter((_, at) => at !== index) : [''],
    });
    setErrors((current) => {
      const track = current[key];
      return track
        ? { ...current, [key]: { fields: track.fields, sources: {} } }
        : current;
    });
  };

  const add = () => {
    if (tracks.length >= TRACK_LIMIT) return;
    const key = newKey();
    flushSync(() => edited([...tracks, emptyTrack(key)]));
    seekId(`hackathon-track-${key}-title`);
  };

  const remove = (key: string) => {
    const at = tracks.findIndex((track) => track.key === key);
    const rest = tracks.filter((track) => track.key !== key);
    flushSync(() => edited(rest));
    const next = rest[Math.min(at, rest.length - 1)];
    seekId(next ? `hackathon-track-${next.key}-title` : TRACKS_ADD_ID);
  };

  const move = (key: string, step: number) =>
    edited(
      moved(
        tracks,
        tracks.findIndex((track) => track.key === key),
        step,
      ),
    );

  const isRemovable = (track: TrackDraft) =>
    !(draft.stage === 'locked' && track.id !== null);

  const submit = () => {
    if (save.isPending) return;
    if (tracks.length === 0) {
      setListError(hackathon_tracks_error_none({}, { locale }));
      seekId(TRACKS_ADD_ID);
      return;
    }
    const check = checkTracks(tracks, locale);
    if (!check.ok) {
      flushSync(() => setErrors(check.errors));
      if (check.first) seekId(check.first.target);
      return;
    }
    setErrors({});
    save.mutate({
      eventId: draft.event.id,
      version: draft.version,
      tracks: check.tracks,
    });
  };

  return {
    tracks,
    errors,
    listError,
    set,
    setKind: (key: string, kind: TrackDraft['kind']) => update(key, { kind }),
    setSource,
    addSource,
    removeSource,
    add,
    remove,
    move,
    isRemovable,
    canAdd: tracks.length < TRACK_LIMIT,
    submit,
    isSaving: save.isPending,
    isSaved: save.isSuccess,
    saveError: save.isError ? hackathonEditError(save.error, locale) : null,
  };
};
