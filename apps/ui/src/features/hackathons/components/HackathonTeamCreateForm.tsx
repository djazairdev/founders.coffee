import { useState, type FormEvent } from 'react';

import {
  hackathon_team_create,
  hackathon_team_create_heading,
  hackathon_team_create_hint,
  hackathon_application_team_answers_heading,
  hackathon_application_questions_description,
  hackathon_application_questions_privacy,
  hackathon_application_questions_invalid_error,
  hackathon_team_description,
  hackathon_team_looking,
  hackathon_team_name,
  optional,
  type Locale,
} from '@founders-coffee/i18n';
import {
  Button,
  fieldNoteId,
  FormField,
  Input,
  StatusMessage,
} from '@founders-coffee/ui';

import {
  checkTeamDraft,
  TEAM_DESCRIPTION_MAX,
  TEAM_NAME_MAX,
  type TeamCheck,
  type TeamDraft,
} from '../team-form';
import { teamErrorMessage } from '../team-errors';
import { useCreateTeam } from '../team-hooks';
import {
  checkApplicationAnswers,
  type HackathonApplicationAnswer,
  type HackathonApplicationQuestion,
} from '../application-answers';
import { HackathonApplicationAnswerFields } from './HackathonApplicationAnswerFields';

const NAME_ID = 'hackathon-team-name';
const DESCRIPTION_ID = 'hackathon-team-description';

type Errors = Extract<TeamCheck, { ok: false }>['errors'];

const described = (id: string, error: string | undefined) => ({
  'aria-invalid': error ? true : undefined,
  'aria-describedby': error ? fieldNoteId(id) : undefined,
});

export const HackathonTeamCreateForm = ({
  eventId,
  locale,
  questions,
}: {
  eventId: string;
  locale: Locale;
  questions: readonly HackathonApplicationQuestion[];
}) => {
  const create = useCreateTeam(eventId);
  const [draft, setDraft] = useState<TeamDraft>({
    name: '',
    description: '',
    isLookingForMembers: true,
    applicationAnswers: [],
  });
  const [errors, setErrors] = useState<Errors>({});
  const [applicationError, setApplicationError] = useState<{
    readonly questionId: string | null;
    readonly reason: 'required' | 'invalid' | null;
  } | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (create.isPending) return;
    const checkedAnswers = checkApplicationAnswers(
      questions,
      draft.applicationAnswers,
      'team',
    );
    if (!checkedAnswers.ok) {
      setApplicationError({
        questionId: checkedAnswers.questionId,
        reason:
          checkedAnswers.reason === 'unknown'
            ? 'invalid'
            : checkedAnswers.reason,
      });
      if (checkedAnswers.questionId)
        document
          .getElementById(`application-question-${checkedAnswers.questionId}`)
          ?.focus();
      return;
    }
    setApplicationError(null);
    const checked = checkTeamDraft(
      eventId,
      { ...draft, applicationAnswers: checkedAnswers.answers },
      locale,
    );
    if (!checked.ok) {
      setErrors(checked.errors);
      document
        .getElementById(checked.errors.name ? NAME_ID : DESCRIPTION_ID)
        ?.focus();
      return;
    }
    setErrors({});
    create.mutate(checked.team);
  };

  return (
    <section aria-labelledby="hackathon-team-create-heading" className="mt-8">
      <h2 id="hackathon-team-create-heading" className="font-display text-h4">
        {hackathon_team_create_heading({}, { locale })}
      </h2>
      <p className="mt-1 text-body-sm text-neutral">
        {hackathon_team_create_hint({}, { locale })}
      </p>
      <form className="mt-4 grid gap-4" noValidate onSubmit={submit}>
        <FormField
          id={NAME_ID}
          label={hackathon_team_name({}, { locale })}
          optionalLabel={optional({}, { locale })}
          error={errors.name}
        >
          <Input
            id={NAME_ID}
            dir="auto"
            maxLength={TEAM_NAME_MAX}
            value={draft.name}
            {...described(NAME_ID, errors.name)}
            onChange={(event) =>
              setDraft({ ...draft, name: event.target.value })
            }
          />
        </FormField>
        <FormField
          id={DESCRIPTION_ID}
          label={hackathon_team_description({}, { locale })}
          optionalLabel={optional({}, { locale })}
          isOptional
          error={errors.description}
        >
          <textarea
            id={DESCRIPTION_ID}
            className="textarea textarea-sm md:textarea-md w-full"
            rows={3}
            dir="auto"
            maxLength={TEAM_DESCRIPTION_MAX}
            value={draft.description}
            {...described(DESCRIPTION_ID, errors.description)}
            onChange={(event) =>
              setDraft({ ...draft, description: event.target.value })
            }
          />
        </FormField>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="checkbox checkbox-sm checkbox-primary"
            checked={draft.isLookingForMembers}
            onChange={(event) =>
              setDraft({ ...draft, isLookingForMembers: event.target.checked })
            }
          />
          <span className="text-body-sm">
            {hackathon_team_looking({}, { locale })}
          </span>
        </label>
        {questions.length > 0 ? (
          <fieldset className="grid gap-3 border-t border-base-300 pt-4">
            <legend className="font-display text-h5">
              {hackathon_application_team_answers_heading({}, { locale })}
            </legend>
            <p className="text-body-sm text-neutral">
              {hackathon_application_questions_description({}, { locale })}
            </p>
            <HackathonApplicationAnswerFields
              questions={questions.filter(
                (question) => question.scope === 'team',
              )}
              answers={draft.applicationAnswers}
              locale={locale}
              errorQuestionId={applicationError?.questionId}
              errorReason={applicationError?.reason}
              onChange={(
                applicationAnswers: readonly HackathonApplicationAnswer[],
              ) => setDraft({ ...draft, applicationAnswers })}
            />
            <p className="text-body-xs text-neutral">
              {hackathon_application_questions_privacy({}, { locale })}
            </p>
          </fieldset>
        ) : null}
        {applicationError?.questionId === null ? (
          <StatusMessage variant="error" aria-live="polite">
            {hackathon_application_questions_invalid_error({}, { locale })}
          </StatusMessage>
        ) : null}
        {create.isError ? (
          <StatusMessage variant="error">
            {teamErrorMessage(create.error, locale)}
          </StatusMessage>
        ) : null}
        <div>
          <Button type="submit" variant="primary">
            {hackathon_team_create({}, { locale })}
          </Button>
        </div>
      </form>
    </section>
  );
};
