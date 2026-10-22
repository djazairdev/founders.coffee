import { useState, type FormEvent } from 'react';

import {
  hackathon_submission_save,
  hackathon_submission_saved,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, StatusMessage } from '@founders-coffee/ui';

import type { SubmissionPageView } from '../api';
import { submissionErrorMessage } from '../submission-errors';
import {
  checkSubmissionDraft,
  formDraftOf,
  SUBMISSION_FIELD_IDS,
  SUBMISSION_FIELD_ORDER,
  type SubmissionField,
  type SubmissionFormDraft,
} from '../submission-form';
import { useSaveSubmissionDraft } from '../submission-hooks';
import { HackathonSubmissionFields } from './HackathonSubmissionFields';

export const HackathonSubmissionForm = ({
  eventId,
  tracks,
  entry,
  isReadOnly,
  locale,
}: {
  eventId: string;
  tracks: SubmissionPageView['tracks'];
  entry: SubmissionPageView['entry'];
  isReadOnly: boolean;
  locale: Locale;
}) => {
  const save = useSaveSubmissionDraft(eventId);
  const [form, setForm] = useState<SubmissionFormDraft>(() =>
    formDraftOf(entry),
  );
  const [errors, setErrors] = useState<
    Partial<Record<SubmissionField, string>>
  >({});
  const [savedVersion, setSavedVersion] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const isOpenSource =
    tracks.find((track) => track.id === form.trackId)?.kind === 'open_source';

  const change = (patch: Partial<SubmissionFormDraft>) => {
    setForm({ ...form, ...patch });
    setIsSaved(false);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (isReadOnly || save.isPending) return;
    const checked = checkSubmissionDraft(form, { isOpenSource, entry, locale });
    if (!checked.ok) {
      setErrors(checked.errors);
      const first = SUBMISSION_FIELD_ORDER.find(
        (field) => checked.errors[field],
      );
      if (first) document.getElementById(SUBMISSION_FIELD_IDS[first])?.focus();
      return;
    }
    setErrors({});
    save.mutate(
      {
        version: Math.max(savedVersion, entry?.version ?? 0),
        draft: checked.draft,
      },
      {
        onSuccess: (saved) => {
          setSavedVersion(saved.version);
          setIsSaved(true);
        },
      },
    );
  };

  return (
    <form className="mt-6 grid gap-4" noValidate onSubmit={submit}>
      <HackathonSubmissionFields
        form={form}
        tracks={tracks}
        errors={errors}
        isOpenSource={isOpenSource}
        isReadOnly={isReadOnly}
        locale={locale}
        onChange={change}
      />
      {save.isError ? (
        <StatusMessage variant="error">
          {submissionErrorMessage(save.error, locale)}
        </StatusMessage>
      ) : null}
      {isSaved ? (
        <StatusMessage variant="success">
          {hackathon_submission_saved({}, { locale })}
        </StatusMessage>
      ) : null}
      {isReadOnly ? null : (
        <div>
          <Button type="submit" variant="primary" aria-busy={save.isPending}>
            {hackathon_submission_save({}, { locale })}
          </Button>
        </div>
      )}
    </form>
  );
};
