import type { ReactNode } from 'react';

import {
  hackathon_submission_original,
  hackathon_submission_submit,
  hackathon_submission_submit_again,
  hackathon_submission_submitting,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, fieldNoteId } from '@founders-coffee/ui';

import { noted } from '../submission-field-notes';
import { SUBMISSION_ORIGINAL_ID } from '../submission-ready';

export const HackathonSubmissionSend = ({
  isAttested,
  error,
  hasSubmitted,
  isSubmitting,
  locale,
  onAttest,
  onSubmit,
  children,
}: {
  isAttested: boolean;
  error: string | undefined;
  hasSubmitted: boolean;
  isSubmitting: boolean;
  locale: Locale;
  onAttest: (isAttested: boolean) => void;
  onSubmit: () => void;
  children: ReactNode;
}) => {
  const options = { locale };
  const label = isSubmitting
    ? hackathon_submission_submitting({}, options)
    : hasSubmitted
      ? hackathon_submission_submit_again({}, options)
      : hackathon_submission_submit({}, options);
  return (
    <div className="grid gap-4">
      <div>
        <label className="flex items-start gap-2">
          <input
            id={SUBMISSION_ORIGINAL_ID}
            type="checkbox"
            className="checkbox checkbox-sm checkbox-primary mt-0.5"
            checked={isAttested}
            {...noted(SUBMISSION_ORIGINAL_ID, error)}
            onChange={(event) => onAttest(event.target.checked)}
          />
          <span className="text-body-sm">
            {hackathon_submission_original({}, options)}
          </span>
        </label>
        {error ? (
          <p
            className="mt-1.5 text-body-sm text-error"
            id={fieldNoteId(SUBMISSION_ORIGINAL_ID)}
          >
            {error}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="primary"
          aria-busy={isSubmitting}
          onClick={onSubmit}
        >
          {label}
        </Button>
        {children}
      </div>
    </div>
  );
};
