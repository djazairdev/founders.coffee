import type { FormEvent } from 'react';

import type { HackathonAiPolicy } from '@founders-coffee/core';
import {
  hackathon_submission_save,
  hackathon_submission_saved,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, StatusMessage } from '@founders-coffee/ui';

import type { SubmissionPageView } from '../api';
import { submissionErrorMessage } from '../submission-errors';
import { useHackathonSubmissionForm } from '../useHackathonSubmissionForm';
import { HackathonSubmissionAiFields } from './HackathonSubmissionAiFields';
import { HackathonSubmissionFields } from './HackathonSubmissionFields';
import { HackathonSubmissionSend } from './HackathonSubmissionSend';
import { HackathonSubmissionSubmitted } from './HackathonSubmissionSubmitted';

export const HackathonSubmissionForm = ({
  eventId,
  tracks,
  entry,
  aiPolicy,
  isReadOnly,
  isOpen,
  locale,
  timeZone,
}: {
  eventId: string;
  tracks: SubmissionPageView['tracks'];
  entry: SubmissionPageView['entry'];
  aiPolicy: HackathonAiPolicy;
  isReadOnly: boolean;
  isOpen: boolean;
  locale: Locale;
  timeZone: string;
}) => {
  const project = useHackathonSubmissionForm({
    eventId,
    tracks,
    entry,
    aiPolicy,
    locale,
  });

  const saveOnly = (event: FormEvent) => {
    event.preventDefault();
    if (!isReadOnly) project.saveOnly();
  };

  return (
    <form className="mt-6 grid gap-4" noValidate onSubmit={saveOnly}>
      {project.submittedAt === null ? null : (
        <HackathonSubmissionSubmitted
          submittedAt={project.submittedAt}
          isOpen={isOpen}
          locale={locale}
          timeZone={timeZone}
        />
      )}
      <HackathonSubmissionFields
        form={project.form}
        tracks={tracks}
        errors={project.errors}
        isOpenSource={project.isOpenSource}
        isReadOnly={isReadOnly}
        locale={locale}
        onChange={project.change}
      />
      <HackathonSubmissionAiFields
        form={project.form}
        aiPolicy={aiPolicy}
        errors={project.errors}
        isReadOnly={isReadOnly}
        locale={locale}
        onChange={project.change}
      />
      {project.failure ? (
        <StatusMessage variant="error">
          {submissionErrorMessage(project.failure, locale)}
        </StatusMessage>
      ) : null}
      {project.isSaved ? (
        <StatusMessage variant="success">
          {hackathon_submission_saved({}, { locale })}
        </StatusMessage>
      ) : null}
      {isReadOnly ? null : (
        <HackathonSubmissionSend
          isAttested={project.isOriginalWorkAttested}
          error={project.errors.original}
          hasSubmitted={project.submittedAt !== null}
          isSubmitting={project.isSubmitting}
          locale={locale}
          onAttest={project.attest}
          onSubmit={project.submit}
        >
          <Button type="submit" variant="outline" aria-busy={project.isSaving}>
            {hackathon_submission_save({}, { locale })}
          </Button>
        </HackathonSubmissionSend>
      )}
    </form>
  );
};
