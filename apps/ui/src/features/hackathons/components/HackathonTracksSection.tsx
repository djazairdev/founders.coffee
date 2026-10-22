import { Plus } from 'lucide-react';

import {
  hackathon_details_saving,
  hackathon_track_add,
  hackathon_tracks_heading,
  hackathon_tracks_hint,
  hackathon_tracks_locked_hint,
  hackathon_tracks_needs_details,
  hackathon_tracks_save,
  hackathon_tracks_saved,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, StatusMessage } from '@founders-coffee/ui';

import type { HackathonDraftView } from '../api';
import { TRACK_LIMIT } from '../hackathon-tracks-form';
import {
  TRACKS_ADD_ID,
  useHackathonTracksForm,
} from '../useHackathonTracksForm';
import { HackathonTrackEditor } from './HackathonTrackEditor';

const HEADING_ID = 'hackathon-tracks-heading';

const TracksForm = ({
  draft,
  locale,
}: {
  draft: HackathonDraftView;
  locale: Locale;
}) => {
  const form = useHackathonTracksForm({ draft, locale });
  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        form.submit();
      }}
    >
      {draft.stage === 'locked' ? (
        <StatusMessage variant="info">
          {hackathon_tracks_locked_hint({}, { locale })}
        </StatusMessage>
      ) : null}
      <ol className="grid gap-4">
        {form.tracks.map((track, index) => (
          <HackathonTrackEditor
            key={track.key}
            form={form}
            track={track}
            index={index}
            count={form.tracks.length}
            locale={locale}
          />
        ))}
      </ol>
      <div>
        <Button
          id={TRACKS_ADD_ID}
          variant="outline"
          disabled={!form.canAdd}
          onClick={form.add}
        >
          <Plus aria-hidden="true" className="size-4" />
          {hackathon_track_add({}, { locale })}
        </Button>
      </div>
      {form.listError ? (
        <StatusMessage variant="error">{form.listError}</StatusMessage>
      ) : null}
      {form.saveError ? (
        <StatusMessage variant="error">{form.saveError}</StatusMessage>
      ) : null}
      {form.isSaved ? (
        <StatusMessage variant="success">
          {hackathon_tracks_saved({}, { locale })}
        </StatusMessage>
      ) : null}
      <div>
        <Button type="submit" variant="primary" disabled={form.isSaving}>
          {form.isSaving
            ? hackathon_details_saving({}, { locale })
            : hackathon_tracks_save({}, { locale })}
        </Button>
      </div>
    </form>
  );
};

export const HackathonTracksSection = ({
  draft,
  locale,
}: {
  draft: HackathonDraftView;
  locale: Locale;
}) => (
  <section aria-labelledby={HEADING_ID} className="mt-12">
    <h2 id={HEADING_ID} className="font-display text-h4">
      {hackathon_tracks_heading({}, { locale })}
    </h2>
    <p className="mt-1 mb-6 text-body-sm text-neutral">
      {hackathon_tracks_hint({ max: TRACK_LIMIT }, { locale })}
    </p>
    {draft.details ? (
      <TracksForm draft={draft} locale={locale} />
    ) : (
      <StatusMessage variant="info">
        {hackathon_tracks_needs_details({}, { locale })}
      </StatusMessage>
    )}
  </section>
);
