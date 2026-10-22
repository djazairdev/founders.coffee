import { HACKATHON_TRACK_KINDS } from '@founders-coffee/core';
import { ArrowDown, ArrowUp } from 'lucide-react';

import {
  hackathon_remove,
  hackathon_track_brief,
  hackathon_track_brief_ph,
  hackathon_track_kind,
  hackathon_track_move_down,
  hackathon_track_move_up,
  hackathon_track_number,
  hackathon_track_partner,
  hackathon_track_remove,
  hackathon_track_title,
  optional,
  type Locale,
} from '@founders-coffee/i18n';
import {
  Button,
  fieldNoteId,
  FormField,
  Input,
  Select,
} from '@founders-coffee/ui';

import { TRACK_KIND_LABELS } from '../detail-labels';
import { trackFieldId, type TrackDraft } from '../hackathon-tracks-form';
import type { useHackathonTracksForm } from '../useHackathonTracksForm';
import { HackathonTrackSources } from './HackathonTrackSources';

export const HackathonTrackEditor = ({
  form,
  track,
  index,
  count,
  locale,
}: {
  form: ReturnType<typeof useHackathonTracksForm>;
  track: TrackDraft;
  index: number;
  count: number;
  locale: Locale;
}) => {
  const n = index + 1;
  const errors = form.errors[track.key]?.fields;
  const headingId = `hackathon-track-${track.key}-heading`;
  const kindId = trackFieldId(track.key, 'kind');
  const titleId = trackFieldId(track.key, 'title');
  const briefId = trackFieldId(track.key, 'brief');
  const partnerId = trackFieldId(track.key, 'partnerName');
  const described = (id: string, error: string | undefined) => ({
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? fieldNoteId(id) : undefined,
  });

  return (
    <li
      aria-labelledby={headingId}
      className="grid gap-4 rounded-box border border-base-300 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={headingId} className="font-display text-h5">
          {hackathon_track_number({ n }, { locale })}
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            aria-label={hackathon_track_move_up({ n }, { locale })}
            disabled={index === 0}
            onClick={() => form.move(track.key, -1)}
          >
            <ArrowUp aria-hidden="true" className="size-4" />
          </Button>
          <Button
            variant="ghost"
            aria-label={hackathon_track_move_down({ n }, { locale })}
            disabled={index === count - 1}
            onClick={() => form.move(track.key, 1)}
          >
            <ArrowDown aria-hidden="true" className="size-4" />
          </Button>
          {form.isRemovable(track) ? (
            <Button
              variant="ghost"
              aria-label={hackathon_track_remove({ n }, { locale })}
              onClick={() => form.remove(track.key)}
            >
              {hackathon_remove({}, { locale })}
            </Button>
          ) : null}
        </div>
      </div>
      <FormField
        id={kindId}
        label={hackathon_track_kind({}, { locale })}
        optionalLabel={optional({}, { locale })}
      >
        <Select
          id={kindId}
          value={track.kind}
          onChange={(event) =>
            form.setKind(track.key, event.target.value as TrackDraft['kind'])
          }
        >
          {HACKATHON_TRACK_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {TRACK_KIND_LABELS[kind]({}, { locale })}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField
        id={titleId}
        label={hackathon_track_title({}, { locale })}
        optionalLabel={optional({}, { locale })}
        error={errors?.title}
      >
        <Input
          id={titleId}
          dir="auto"
          value={track.title}
          maxLength={100}
          {...described(titleId, errors?.title)}
          onChange={(event) => form.set(track.key, 'title')(event.target.value)}
        />
      </FormField>
      <FormField
        id={briefId}
        label={hackathon_track_brief({}, { locale })}
        optionalLabel={optional({}, { locale })}
        error={errors?.brief}
      >
        <textarea
          id={briefId}
          className="textarea textarea-sm md:textarea-md w-full"
          rows={4}
          dir="auto"
          maxLength={2000}
          placeholder={hackathon_track_brief_ph({}, { locale })}
          value={track.brief}
          {...described(briefId, errors?.brief)}
          onChange={(event) => form.set(track.key, 'brief')(event.target.value)}
        />
      </FormField>
      {track.kind === 'partner_technology' ? (
        <FormField
          id={partnerId}
          label={hackathon_track_partner({}, { locale })}
          optionalLabel={optional({}, { locale })}
          error={errors?.partnerName}
        >
          <Input
            id={partnerId}
            dir="auto"
            value={track.partnerName}
            maxLength={100}
            {...described(partnerId, errors?.partnerName)}
            onChange={(event) =>
              form.set(track.key, 'partnerName')(event.target.value)
            }
          />
        </FormField>
      ) : null}
      {track.kind === 'open_source' ? (
        <HackathonTrackSources form={form} track={track} locale={locale} />
      ) : null}
    </li>
  );
};
