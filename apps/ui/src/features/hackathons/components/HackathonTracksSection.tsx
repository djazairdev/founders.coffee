import { Plus } from 'lucide-react';

import {
  hackathon_details_saving,
  hackathon_track_add,
  hackathon_tracks_heading,
  hackathon_tracks_hint,
  hackathon_tracks_locked_hint,
  hackathon_tracks_needs_details,
  hackathon_tracks_save,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, StatusMessage } from '@founders-coffee/ui';

import type { HackathonDraftView } from '../api';
import type { HackathonFeedback } from '../hackathon-feedback';
import { TRACK_LIMIT } from '../hackathon-tracks-form';
import {
  TRACKS_ADD_ID,
  useHackathonTracksForm,
} from '../useHackathonTracksForm';
import { HackathonSaveButton } from './HackathonSaveButton';
import { HackathonTrackEditor } from './HackathonTrackEditor';

const HEADING_ID = 'hackathon-tracks-heading';

const TracksForm = ({
  draft,
  locale,
  onFeedback,
}: {
  draft: HackathonDraftView;
  locale: Locale;
  onFeedback: HackathonFeedback;
}) => {
  const form = useHackathonTracksForm({ draft, locale, onFeedback });
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
      <div>
        <HackathonSaveButton type="submit" isBusy={form.isSaving}>
          {form.isSaving
            ? hackathon_details_saving({}, { locale })
            : hackathon_tracks_save({}, { locale })}
        </HackathonSaveButton>
      </div>
    </form>
  );
};

export const HackathonTracksSection = ({
  draft,
  locale,
  onFeedback,
}: {
  draft: HackathonDraftView;
  locale: Locale;
  onFeedback: HackathonFeedback;
}) => (
  <section aria-labelledby={HEADING_ID} className="mt-12">
    <h2 id={HEADING_ID} className="font-display text-h4">
      {hackathon_tracks_heading({}, { locale })}
    </h2>
    <p className="mt-1 mb-6 text-body-sm text-neutral">
      {hackathon_tracks_hint({ max: TRACK_LIMIT }, { locale })}
    </p>
    {draft.details ? (
      <TracksForm draft={draft} locale={locale} onFeedback={onFeedback} />
    ) : (
      <StatusMessage variant="info">
        {hackathon_tracks_needs_details({}, { locale })}
      </StatusMessage>
    )}
  </section>
);
