import {
  HACKATHON_TEAM_DESCRIPTION_MAX,
  HACKATHON_TEAM_NAME_MAX,
} from '@founders-coffee/core';
import { hackathons } from '@founders-coffee/domain';
import {
  hackathon_team_error_description,
  hackathon_team_error_name,
  type Locale,
} from '@founders-coffee/i18n';

export const TEAM_NAME_MAX = HACKATHON_TEAM_NAME_MAX;
export const TEAM_DESCRIPTION_MAX = HACKATHON_TEAM_DESCRIPTION_MAX;

export type TeamDraft = {
  readonly name: string;
  readonly description: string;
  readonly isLookingForMembers: boolean;
};

export type TeamCheck =
  | {
      readonly ok: true;
      readonly team: {
        readonly name: string;
        readonly description: string | null;
        readonly isLookingForMembers: boolean;
      };
    }
  | {
      readonly ok: false;
      readonly errors: Partial<Record<'name' | 'description', string>>;
    };

/** Check a new team with the schema the server applies, naming what holds each field back. */
export const checkTeamDraft = (
  eventId: string,
  draft: TeamDraft,
  locale: Locale,
): TeamCheck => {
  const parsed = hackathons.hackathonTeamCreateSchema.safeParse({
    eventId,
    ...draft,
  });
  if (parsed.success) {
    const { name, description, isLookingForMembers } = parsed.data;
    return { ok: true, team: { name, description, isLookingForMembers } };
  }
  const failed = new Set(parsed.error.issues.map((issue) => issue.path[0]));
  return {
    ok: false,
    errors: {
      ...(failed.has('name')
        ? {
            name: hackathon_team_error_name({ max: TEAM_NAME_MAX }, { locale }),
          }
        : {}),
      ...(failed.has('description')
        ? {
            description: hackathon_team_error_description(
              { max: TEAM_DESCRIPTION_MAX },
              { locale },
            ),
          }
        : {}),
    },
  };
};
