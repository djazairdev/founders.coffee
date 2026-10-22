import {
  hackathon_details_judging_ends,
  hackathon_details_registration_closes,
  hackathon_details_registration_opens,
  hackathon_details_submission_deadline,
  hackathon_details_timeline,
  hackathon_details_timeline_hint,
  optional,
  type Locale,
} from '@founders-coffee/i18n';
import { fieldNoteId, FormField, Input } from '@founders-coffee/ui';

import type { DetailsField } from '../hackathon-details-form';
import {
  detailsFieldId,
  type useHackathonDetailsForm,
} from '../useHackathonDetailsForm';

type TimelineField = Extract<
  DetailsField,
  | 'registrationOpensAt'
  | 'registrationClosesAt'
  | 'submissionDeadlineAt'
  | 'judgingEndsAt'
>;

const LABELS = {
  registrationOpensAt: hackathon_details_registration_opens,
  registrationClosesAt: hackathon_details_registration_closes,
  submissionDeadlineAt: hackathon_details_submission_deadline,
  judgingEndsAt: hackathon_details_judging_ends,
} as const;

export const HackathonTimelineFields = ({
  form,
  locale,
  kickoff,
  demoDay,
}: {
  form: ReturnType<typeof useHackathonDetailsForm>;
  locale: Locale;
  kickoff: string;
  demoDay: string;
}) => (
  <fieldset className="grid gap-4">
    <legend className="mb-1 font-display text-h4">
      {hackathon_details_timeline({}, { locale })}
    </legend>
    <p className="text-body-sm text-neutral">
      {hackathon_details_timeline_hint({ kickoff, demoDay }, { locale })}
    </p>
    <div className="grid gap-4 sm:grid-cols-2">
      {(Object.keys(LABELS) as TimelineField[]).map((field) => {
        const id = detailsFieldId(field);
        const error = form.errors[field];
        return (
          <FormField
            key={field}
            id={id}
            label={LABELS[field]({}, { locale })}
            optionalLabel={optional({}, { locale })}
            error={error}
          >
            <Input
              id={id}
              type="datetime-local"
              value={form.values[field]}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? fieldNoteId(id) : undefined}
              onChange={(event) => form.set(field, event.target.value)}
            />
          </FormField>
        );
      })}
    </div>
  </fieldset>
);
