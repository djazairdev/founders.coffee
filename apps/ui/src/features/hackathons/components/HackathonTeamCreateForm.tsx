import { useState, type FormEvent } from 'react';

import {
  hackathon_team_create,
  hackathon_team_create_heading,
  hackathon_team_create_hint,
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
}: {
  eventId: string;
  locale: Locale;
}) => {
  const create = useCreateTeam(eventId);
  const [draft, setDraft] = useState<TeamDraft>({
    name: '',
    description: '',
    isLookingForMembers: true,
  });
  const [errors, setErrors] = useState<Errors>({});

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (create.isPending) return;
    const checked = checkTeamDraft(eventId, draft, locale);
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
