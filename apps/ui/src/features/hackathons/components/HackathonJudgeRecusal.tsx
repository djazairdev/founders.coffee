import { useState, type FormEvent } from 'react';

import { HACKATHON_RECUSAL_REASON_MAX } from '@founders-coffee/core';
import {
  hackathon_judging_recuse_button,
  hackathon_judging_recuse_heading,
  hackathon_judging_recuse_hint,
  hackathon_judging_recuse_needed,
  hackathon_judging_recuse_reason,
  hackathon_judging_recusing,
  optional,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, FormField, StatusMessage } from '@founders-coffee/ui';

import { judgingErrorMessage } from '../judging-errors';
import { isRecusalReason } from '../judging-form';
import { useRecuseFromEntry } from '../judging-hooks';

const HEADING_ID = 'hackathon-judge-recuse-heading';
const REASON_ID = 'hackathon-judge-recuse-reason';

export const HackathonJudgeRecusal = ({
  eventId,
  submissionId,
  locale,
}: {
  eventId: string;
  submissionId: string;
  locale: Locale;
}) => {
  const options = { locale };
  const recuse = useRecuseFromEntry(eventId);
  const [reason, setReason] = useState('');
  const [isReasonMissing, setIsReasonMissing] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    recuse.reset();
    if (!isRecusalReason(reason)) {
      setIsReasonMissing(true);
      document.getElementById(REASON_ID)?.focus();
      return;
    }
    recuse.mutate({ eventId, submissionId, reason });
  };
  return (
    <section
      aria-labelledby={HEADING_ID}
      className="mt-8 border-t border-base-300 pt-6"
    >
      <h2 id={HEADING_ID} className="font-display text-h4">
        {hackathon_judging_recuse_heading({}, options)}
      </h2>
      <p className="mt-2 text-body-sm text-neutral">
        {hackathon_judging_recuse_hint({}, options)}
      </p>
      <form noValidate onSubmit={submit} className="mt-3 grid gap-3">
        <FormField
          id={REASON_ID}
          label={hackathon_judging_recuse_reason({}, options)}
          optionalLabel={optional({}, options)}
          error={
            isReasonMissing
              ? hackathon_judging_recuse_needed({}, options)
              : null
          }
        >
          <textarea
            id={REASON_ID}
            className="textarea textarea-sm md:textarea-md w-full"
            rows={2}
            dir="auto"
            maxLength={HACKATHON_RECUSAL_REASON_MAX}
            value={reason}
            readOnly={recuse.isPending}
            onChange={(event) => {
              setReason(event.target.value);
              setIsReasonMissing(false);
            }}
          />
        </FormField>
        {recuse.error ? (
          <StatusMessage variant="error">
            {judgingErrorMessage(recuse.error, locale)}
          </StatusMessage>
        ) : null}
        <div>
          <Button type="submit" variant="outline" isBusy={recuse.isPending}>
            {recuse.isPending
              ? hackathon_judging_recusing({}, options)
              : hackathon_judging_recuse_button({}, options)}
          </Button>
        </div>
      </form>
    </section>
  );
};
