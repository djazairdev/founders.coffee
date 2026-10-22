import {
  hackathon_team_join,
  hackathon_team_join_heading,
  hackathon_team_join_hint,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, StatusMessage } from '@founders-coffee/ui';

import { teamErrorMessage } from '../team-errors';
import { useJoinTeam } from '../team-hooks';

export const HackathonTeamJoin = ({
  eventId,
  token,
  locale,
  onJoined,
}: {
  eventId: string;
  token: string;
  locale: Locale;
  onJoined: (teamId: string) => void;
}) => {
  const join = useJoinTeam(eventId);

  return (
    <section
      aria-labelledby="hackathon-team-join-heading"
      className="mt-6 rounded-box border border-base-300 p-4"
    >
      <h2 id="hackathon-team-join-heading" className="font-display text-h4">
        {hackathon_team_join_heading({}, { locale })}
      </h2>
      <p className="mt-1 text-body-sm text-neutral">
        {hackathon_team_join_hint({}, { locale })}
      </p>
      {join.isError ? (
        <StatusMessage variant="error" className="mt-3">
          {teamErrorMessage(join.error, locale)}
        </StatusMessage>
      ) : null}
      <div className="mt-3">
        <Button
          variant="primary"
          onClick={() => {
            if (!join.isPending)
              join.mutate(token, {
                onSuccess: (joined) => onJoined(joined.teamId),
              });
          }}
        >
          {hackathon_team_join({}, { locale })}
        </Button>
      </div>
    </section>
  );
};
