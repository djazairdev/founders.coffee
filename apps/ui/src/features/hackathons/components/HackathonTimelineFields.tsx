import {
  hackathon_details_date_label,
  hackathon_details_judging_ends,
  hackathon_details_judging_ends_hint,
  hackathon_details_registration_closes,
  hackathon_details_registration_closes_hint,
  hackathon_details_registration_opens,
  hackathon_details_registration_opens_hint,
  hackathon_details_submission_deadline,
  hackathon_details_submission_deadline_hint,
  hackathon_details_time_label,
  hackathon_details_timezone_hint,
  type Locale,
} from '@founders-coffee/i18n';
import { Input } from '@founders-coffee/ui';

import type { DetailsField } from '../hackathon-details-form';
import {
  combineDateAndTime,
  splitDateTimeValue,
  TIME_PATTERN,
} from '../hackathon-details-date-time';
import { isolateBidi } from '../hackathon-timezone';
import {
  detailsFieldId,
  type DetailsFormState,
} from '../useHackathonDetailsForm';
import { HackathonDateField } from './HackathonDateField';

type TimelineField = Extract<
  DetailsField,
  | 'registrationOpensAt'
  | 'registrationClosesAt'
  | 'submissionDeadlineAt'
  | 'judgingEndsAt'
>;

const LABELS = {
  registrationOpensAt: {
    label: hackathon_details_registration_opens,
    hint: hackathon_details_registration_opens_hint,
  },
  registrationClosesAt: {
    label: hackathon_details_registration_closes,
    hint: hackathon_details_registration_closes_hint,
  },
  submissionDeadlineAt: {
    label: hackathon_details_submission_deadline,
    hint: hackathon_details_submission_deadline_hint,
  },
  judgingEndsAt: {
    label: hackathon_details_judging_ends,
    hint: hackathon_details_judging_ends_hint,
  },
} as const;

export const HackathonTimelineFields = ({
  form,
  locale,
  timeZone,
  timeZoneName,
  utcOffset,
}: {
  form: DetailsFormState;
  locale: Locale;
  timeZone: string;
  timeZoneName: string;
  utcOffset: string;
}) => (
  <fieldset className="grid gap-4">
    <div className="grid gap-4">
      {(Object.keys(LABELS) as TimelineField[]).map((field) => {
        const id = detailsFieldId(field);
        const dateId = `${id}-date`;
        const timeId = `${id}-time`;
        const errorId = `${id}-error`;
        const error = form.errors[field];
        const { date: currentDate, time: currentTime } = splitDateTimeValue(
          form.values[field],
        );
        return (
          <fieldset
            key={field}
            id={id}
            className="grid min-w-0 gap-2"
            aria-describedby={error ? errorId : undefined}
          >
            <legend className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-label">
                {LABELS[field].label({}, { locale })}
              </span>
              <span className="text-body-sm text-neutral">
                {LABELS[field].hint({}, { locale })}
              </span>
            </legend>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <HackathonDateField
                id={dateId}
                label={hackathon_details_date_label({}, { locale })}
                value={currentDate}
                locale={locale}
                timeZone={timeZone}
                align="start"
                isInvalid={Boolean(error)}
                describedBy={error ? errorId : undefined}
                hideValidation
                onChange={(date) =>
                  form.set(field, combineDateAndTime(date, currentTime))
                }
              />
              <div className="flex min-w-0 flex-col gap-1 text-body-sm text-neutral">
                <label htmlFor={timeId}>
                  {hackathon_details_time_label({}, { locale })}
                </label>
                <Input
                  id={timeId}
                  type="text"
                  className={error ? 'input-error' : undefined}
                  inputMode="numeric"
                  pattern={TIME_PATTERN.source}
                  maxLength={5}
                  dir="ltr"
                  value={currentTime}
                  required
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? errorId : undefined}
                  onChange={(event) =>
                    form.set(
                      field,
                      combineDateAndTime(currentDate, event.target.value),
                    )
                  }
                />
              </div>
            </div>
            {error ? (
              <p id={errorId} className="text-body-sm text-error">
                {error}
              </p>
            ) : null}
          </fieldset>
        );
      })}
    </div>
    <p className="text-body-sm text-neutral">
      {hackathon_details_timezone_hint(
        {
          market: isolateBidi(timeZoneName),
          offset: isolateBidi(utcOffset),
        },
        { locale },
      )}
    </p>
  </fieldset>
);
