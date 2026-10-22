import {
  hackathon_submission_demo_video,
  hackathon_submission_description,
  hackathon_submission_description_hint,
  hackathon_submission_name,
  hackathon_submission_pull_requests,
  hackathon_submission_pull_requests_hint,
  hackathon_submission_repository,
  hackathon_submission_track,
  hackathon_submission_track_choose,
  optional,
  type Locale,
} from '@founders-coffee/i18n';
import { FormField, Input, Select } from '@founders-coffee/ui';

import type { SubmissionPageView } from '../api';
import {
  SUBMISSION_DESCRIPTION_MAX,
  SUBMISSION_PULL_REQUEST_MAX,
  SUBMISSION_TITLE_MAX,
  SUBMISSION_FIELD_IDS,
  SUBMISSION_URL_MAX,
  type SubmissionFormDraft,
} from '../submission-form';
import { noted } from '../submission-field-notes';
import type { SubmissionFormErrors } from '../submission-ready';

export const HackathonSubmissionFields = ({
  form,
  tracks,
  errors,
  isOpenSource,
  isReadOnly,
  locale,
  onChange,
}: {
  form: SubmissionFormDraft;
  tracks: SubmissionPageView['tracks'];
  errors: SubmissionFormErrors;
  isOpenSource: boolean;
  isReadOnly: boolean;
  locale: Locale;
  onChange: (patch: Partial<SubmissionFormDraft>) => void;
}) => {
  const options = { locale };
  const optionalLabel = optional({}, options);
  const ids = SUBMISSION_FIELD_IDS;
  return (
    <>
      <FormField
        id={ids.trackId}
        label={hackathon_submission_track({}, options)}
        optionalLabel={optionalLabel}
        error={errors.trackId}
      >
        <Select
          id={ids.trackId}
          value={form.trackId}
          disabled={isReadOnly}
          {...noted(ids.trackId, errors.trackId)}
          onChange={(event) => onChange({ trackId: event.target.value })}
        >
          <option value="">
            {hackathon_submission_track_choose({}, options)}
          </option>
          {tracks.map((track) => (
            <option key={track.id} value={track.id}>
              {track.title}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField
        id={ids.title}
        label={hackathon_submission_name({}, options)}
        optionalLabel={optionalLabel}
        error={errors.title}
      >
        <Input
          id={ids.title}
          dir="auto"
          maxLength={SUBMISSION_TITLE_MAX}
          value={form.title}
          readOnly={isReadOnly}
          {...noted(ids.title, errors.title)}
          onChange={(event) => onChange({ title: event.target.value })}
        />
      </FormField>
      <FormField
        id={ids.description}
        label={hackathon_submission_description({}, options)}
        optionalLabel={optionalLabel}
        hint={hackathon_submission_description_hint({}, options)}
        error={errors.description}
      >
        <textarea
          id={ids.description}
          className="textarea textarea-sm md:textarea-md w-full"
          rows={6}
          dir="auto"
          maxLength={SUBMISSION_DESCRIPTION_MAX}
          value={form.description}
          readOnly={isReadOnly}
          {...noted(ids.description, errors.description, true)}
          onChange={(event) => onChange({ description: event.target.value })}
        />
      </FormField>
      <FormField
        id={ids.repositoryUrl}
        label={hackathon_submission_repository({}, options)}
        optionalLabel={optionalLabel}
        error={errors.repositoryUrl}
      >
        <Input
          id={ids.repositoryUrl}
          type="url"
          inputMode="url"
          dir="ltr"
          maxLength={SUBMISSION_URL_MAX}
          placeholder="https://github.com/…"
          value={form.repositoryUrl}
          readOnly={isReadOnly}
          {...noted(ids.repositoryUrl, errors.repositoryUrl)}
          onChange={(event) => onChange({ repositoryUrl: event.target.value })}
        />
      </FormField>
      <FormField
        id={ids.demoVideoUrl}
        label={hackathon_submission_demo_video({}, options)}
        optionalLabel={optionalLabel}
        isOptional
        error={errors.demoVideoUrl}
      >
        <Input
          id={ids.demoVideoUrl}
          type="url"
          inputMode="url"
          dir="ltr"
          maxLength={SUBMISSION_URL_MAX}
          placeholder="https://"
          value={form.demoVideoUrl}
          readOnly={isReadOnly}
          {...noted(ids.demoVideoUrl, errors.demoVideoUrl)}
          onChange={(event) => onChange({ demoVideoUrl: event.target.value })}
        />
      </FormField>
      {isOpenSource ? (
        <FormField
          id={ids.pullRequestUrls}
          label={hackathon_submission_pull_requests({}, options)}
          optionalLabel={optionalLabel}
          isOptional
          hint={hackathon_submission_pull_requests_hint(
            { max: SUBMISSION_PULL_REQUEST_MAX },
            options,
          )}
          error={errors.pullRequestUrls}
        >
          <textarea
            id={ids.pullRequestUrls}
            className="textarea textarea-sm md:textarea-md w-full"
            rows={4}
            dir="ltr"
            placeholder="https://github.com/…/pull/1"
            value={form.pullRequestUrls}
            readOnly={isReadOnly}
            {...noted(ids.pullRequestUrls, errors.pullRequestUrls, true)}
            onChange={(event) =>
              onChange({ pullRequestUrls: event.target.value })
            }
          />
        </FormField>
      ) : null}
    </>
  );
};
