import { Plus } from 'lucide-react';

import {
  hackathon_remove,
  hackathon_track_source_add,
  hackathon_track_source_label,
  hackathon_track_source_remove,
  hackathon_track_sources,
  hackathon_track_sources_hint,
  optional,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, fieldNoteId, FormField, Input } from '@founders-coffee/ui';

import {
  SOURCE_LIMIT,
  trackFieldId,
  type TrackDraft,
} from '../hackathon-tracks-form';
import type { useHackathonTracksForm } from '../useHackathonTracksForm';

export const HackathonTrackSources = ({
  form,
  track,
  locale,
}: {
  form: ReturnType<typeof useHackathonTracksForm>;
  track: TrackDraft;
  locale: Locale;
}) => {
  const groupId = trackFieldId(track.key, 'sourceUrls');
  const errors = form.errors[track.key];
  return (
    <div
      id={groupId}
      role="group"
      aria-labelledby={`${groupId}-label`}
      aria-describedby={fieldNoteId(groupId)}
    >
      <p id={`${groupId}-label`} className="text-label">
        {hackathon_track_sources({}, { locale })}
      </p>
      <p
        id={fieldNoteId(groupId)}
        className={
          errors?.fields.sourceUrls
            ? 'mt-1 text-body-sm text-error'
            : 'mt-1 text-body-sm text-neutral'
        }
      >
        {errors?.fields.sourceUrls ??
          hackathon_track_sources_hint({}, { locale })}
      </p>
      <ul className="mt-3 grid gap-3">
        {track.sourceUrls.map((url, index) => {
          const id = trackFieldId(track.key, index);
          const error = errors?.sources[index];
          const n = index + 1;
          return (
            <li key={index}>
              <FormField
                id={id}
                label={hackathon_track_source_label({ n }, { locale })}
                optionalLabel={optional({}, { locale })}
                error={error}
                aside={
                  <Button
                    variant="link"
                    aria-label={hackathon_track_source_remove(
                      { n },
                      { locale },
                    )}
                    onClick={() => form.removeSource(track.key, index)}
                  >
                    {hackathon_remove({}, { locale })}
                  </Button>
                }
              >
                <Input
                  id={id}
                  type="url"
                  inputMode="url"
                  dir="ltr"
                  autoComplete="off"
                  value={url}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? fieldNoteId(id) : undefined}
                  onChange={(event) =>
                    form.setSource(track.key, index, event.target.value)
                  }
                />
              </FormField>
            </li>
          );
        })}
      </ul>
      <Button
        variant="outline"
        className="mt-3"
        disabled={track.sourceUrls.length >= SOURCE_LIMIT}
        onClick={() => form.addSource(track.key)}
      >
        <Plus aria-hidden="true" className="size-4" />
        {hackathon_track_source_add({}, { locale })}
      </Button>
    </div>
  );
};
