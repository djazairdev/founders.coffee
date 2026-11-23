import { useRouter } from '@tanstack/react-router';
import { useRef, useState, type FormEvent } from 'react';

import {
  ATTENDANCE_MODES_BY_FORMAT,
  type AttendanceMode,
  type EventFormat,
} from '@founders-coffee/core';
import {
  formatNumber,
  hackathon_register_age,
  hackathon_application_questions_heading,
  hackathon_application_questions_description,
  hackathon_application_questions_privacy,
  hackathon_application_questions_invalid_error,
  hackathon_register_mode,
  hackathon_register_need_age,
  hackathon_register_need_mode,
  hackathon_register_saving,
  hackathon_register_submit,
  hackathon_register_waitlist_submit,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, StatusMessage } from '@founders-coffee/ui';

import { ATTENDANCE_LABELS } from '../detail-labels';
import { registrationErrorMessage } from '../registration-errors';
import { useRegisterForHackathon } from '../registration-hooks';
import {
  checkApplicationAnswers,
  type HackathonApplicationAnswer,
  type HackathonApplicationQuestion,
} from '../application-answers';
import { HackathonApplicationAnswerFields } from './HackathonApplicationAnswerFields';

const MODE_ID = 'hackathon-register-mode';
const AGE_ID = 'hackathon-register-age';

export const HackathonRegistrationForm = ({
  eventId,
  format,
  minimumAge,
  isFull,
  locale,
  applicationQuestions,
}: {
  eventId: string;
  format: EventFormat;
  minimumAge: number | null;
  isFull: boolean;
  locale: Locale;
  applicationQuestions: readonly HackathonApplicationQuestion[];
}) => {
  const options = { locale };
  const router = useRouter();
  const register = useRegisterForHackathon();
  const modes = ATTENDANCE_MODES_BY_FORMAT[format];
  const [mode, setMode] = useState<AttendanceMode | null>(
    modes.length === 1 ? modes[0] : null,
  );
  const [isAgeAttested, setIsAgeAttested] = useState(false);
  const [missing, setMissing] = useState<string | null>(null);
  const [applicationAnswers, setApplicationAnswers] = useState<
    readonly HackathonApplicationAnswer[]
  >([]);
  const [applicationError, setApplicationError] = useState<{
    readonly questionId: string | null;
    readonly reason: 'required' | 'invalid' | null;
  } | null>(null);
  const modeRef = useRef<HTMLInputElement>(null);
  const ageRef = useRef<HTMLInputElement>(null);

  const guide = (message: string, field: HTMLInputElement | null) => {
    setMissing(message);
    field?.focus();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (mode === null)
      return guide(hackathon_register_need_mode({}, options), modeRef.current);
    if (minimumAge !== null && !isAgeAttested)
      return guide(hackathon_register_need_age({}, options), ageRef.current);
    const checkedAnswers = checkApplicationAnswers(
      applicationQuestions,
      applicationAnswers,
      'participant',
    );
    if (!checkedAnswers.ok) {
      setApplicationError({
        questionId: checkedAnswers.questionId,
        reason:
          checkedAnswers.reason === 'unknown'
            ? 'invalid'
            : checkedAnswers.reason,
      });
      setMissing(null);
      if (checkedAnswers.questionId)
        document
          .getElementById(`application-question-${checkedAnswers.questionId}`)
          ?.focus();
      return;
    }
    setApplicationError(null);
    setMissing(null);
    register.mutate(
      {
        eventId,
        attendanceMode: mode,
        isAgeAttested,
        applicationAnswers: checkedAnswers.answers,
      },
      { onSuccess: () => void router.invalidate() },
    );
  };

  const message =
    missing ??
    (register.isError
      ? registrationErrorMessage(register.error, locale)
      : null);

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      {modes.length > 1 ? (
        <fieldset className="grid gap-2">
          <legend id={MODE_ID} className="text-label">
            {hackathon_register_mode({}, options)}
          </legend>
          <div
            role="radiogroup"
            aria-labelledby={MODE_ID}
            className="grid gap-2"
          >
            {modes.map((each, index) => (
              <label key={each} className="flex items-center gap-2">
                <input
                  ref={index === 0 ? modeRef : undefined}
                  type="radio"
                  name={MODE_ID}
                  value={each}
                  className="radio radio-sm radio-primary"
                  checked={mode === each}
                  onChange={() => setMode(each)}
                />
                <span className="text-body-sm">
                  {ATTENDANCE_LABELS[each]({}, options)}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      {minimumAge !== null ? (
        <label htmlFor={AGE_ID} className="flex items-start gap-2">
          <input
            ref={ageRef}
            id={AGE_ID}
            type="checkbox"
            className="checkbox checkbox-sm checkbox-primary mt-0.5"
            checked={isAgeAttested}
            onChange={(event) => setIsAgeAttested(event.target.checked)}
          />
          <span className="text-body-sm">
            {hackathon_register_age(
              { age: formatNumber(minimumAge, locale) },
              options,
            )}
          </span>
        </label>
      ) : null}
      {applicationQuestions.length > 0 ? (
        <fieldset className="grid gap-3 border-t border-base-300 pt-4">
          <legend className="font-display text-h5">
            {hackathon_application_questions_heading({}, options)}
          </legend>
          <p className="text-body-sm text-neutral">
            {hackathon_application_questions_description({}, options)}
          </p>
          <HackathonApplicationAnswerFields
            questions={applicationQuestions.filter(
              (question) => question.scope === 'participant',
            )}
            answers={applicationAnswers}
            locale={locale}
            errorQuestionId={applicationError?.questionId}
            errorReason={applicationError?.reason}
            onChange={setApplicationAnswers}
          />
          <p className="text-body-xs text-neutral">
            {hackathon_application_questions_privacy({}, options)}
          </p>
        </fieldset>
      ) : null}
      {applicationError?.questionId === null ? (
        <StatusMessage variant="error" aria-live="polite">
          {hackathon_application_questions_invalid_error({}, options)}
        </StatusMessage>
      ) : null}
      {message ? (
        <StatusMessage variant="error" aria-live="polite">
          {message}
        </StatusMessage>
      ) : null}
      <div>
        <Button
          type="submit"
          variant="secondary"
          className="w-full rounded-full sm:w-auto"
          isBusy={register.isPending}
        >
          {register.isPending
            ? hackathon_register_saving({}, options)
            : isFull
              ? hackathon_register_waitlist_submit({}, options)
              : hackathon_register_submit({}, options)}
        </Button>
      </div>
    </form>
  );
};
