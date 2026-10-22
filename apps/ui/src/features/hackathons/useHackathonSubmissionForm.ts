import { useState } from 'react';

import type { HackathonAiPolicy } from '@founders-coffee/core';
import type { Locale } from '@founders-coffee/i18n';

import { seekField } from '../events/seek-field';
import type { SubmissionDraftFields, SubmissionPageView } from './api';
import {
  checkSubmissionDraft,
  draftFieldsOf,
  formDraftOf,
  type SubmissionFormDraft,
} from './submission-form';
import {
  useSaveSubmissionDraft,
  useSubmitSubmission,
} from './submission-hooks';
import {
  firstErrorField,
  missingForSubmit,
  type SubmissionFormErrors,
} from './submission-ready';

/**
 * The team's project as a form (B-SUB-05, B-SUB-06): its fields, Save, which keeps a draft, and
 * Submit, which checks what a submission needs, the original-work statement among it, saves what
 * changed since the last save, and then submits at the version that save left. Either takes the
 * captain to the first field holding it back.
 */
export const useHackathonSubmissionForm = ({
  eventId,
  tracks,
  entry,
  aiPolicy,
  locale,
}: {
  eventId: string;
  tracks: SubmissionPageView['tracks'];
  entry: SubmissionPageView['entry'];
  aiPolicy: HackathonAiPolicy;
  locale: Locale;
}) => {
  const save = useSaveSubmissionDraft(eventId);
  const send = useSubmitSubmission(eventId);
  const [form, setForm] = useState<SubmissionFormDraft>(() =>
    formDraftOf(entry),
  );
  const [errors, setErrors] = useState<SubmissionFormErrors>({});
  const [savedVersion, setSavedVersion] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isOriginalWorkAttested, setIsOriginalWorkAttested] = useState(false);
  const isOpenSource =
    tracks.find((track) => track.id === form.trackId)?.kind === 'open_source';
  const version = Math.max(savedVersion, entry?.version ?? 0);
  const isBusy = save.isPending || send.isPending;

  const change = (patch: Partial<SubmissionFormDraft>) => {
    setForm({ ...form, ...patch });
    setIsDirty(true);
    setIsSaved(false);
  };

  const begin = (found: SubmissionFormErrors): boolean => {
    setErrors(found);
    const field = firstErrorField(found);
    if (field) seekField(field);
    save.reset();
    send.reset();
    setIsSaved(false);
    return field === null;
  };

  const checked = (): SubmissionDraftFields | null => {
    const draft = checkSubmissionDraft(form, { isOpenSource, locale });
    if (draft.ok) return draft.draft;
    begin(draft.errors);
    return null;
  };

  const saveDraft = (
    draft: SubmissionDraftFields,
    onSaved: (version: number) => void,
  ) =>
    save.mutate(
      { version, draft },
      {
        onSuccess: (saved) => {
          setSavedVersion(saved.version);
          setIsDirty(false);
          onSaved(saved.version);
        },
      },
    );

  const saveOnly = () => {
    const draft = isBusy ? null : checked();
    if (draft === null || !begin({})) return;
    saveDraft(draft, () => setIsSaved(true));
  };

  const submitAt = (at: number) =>
    send.mutate(at, {
      onSuccess: (submitted) => {
        setSavedVersion(submitted.version);
        setIsOriginalWorkAttested(false);
      },
    });

  const submit = () => {
    if (isBusy) return;
    const draft = checkSubmissionDraft(form, { isOpenSource, locale });
    const missing = missingForSubmit(draftFieldsOf(form, isOpenSource), {
      aiPolicy,
      isOriginalWorkAttested,
      draftErrors: draft.ok ? {} : draft.errors,
      locale,
    });
    if (!begin(missing) || !draft.ok) return;
    if (isDirty || version === 0) saveDraft(draft.draft, submitAt);
    else submitAt(version);
  };

  return {
    form,
    errors,
    change,
    isOpenSource,
    isOriginalWorkAttested,
    attest: setIsOriginalWorkAttested,
    saveOnly,
    submit,
    isSaved,
    isBusy,
    isSaving: save.isPending,
    isSubmitting: send.isPending,
    failure: send.error ?? save.error,
    submittedAt: send.data?.submittedAt ?? entry?.submittedAt ?? null,
  };
};
