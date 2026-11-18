import {
  hackathon_team_accept,
  hackathon_team_decline,
  hackathon_team_requests_empty,
  hackathon_team_requests_heading,
  hackathon_team_unnamed,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, StatusMessage } from '@founders-coffee/ui';

import type { TeamPageView } from '../api';
import { teamErrorMessage } from '../team-errors';
import { useAnswerTeamRequest } from '../team-hooks';

type Requests = NonNullable<TeamPageView['team']>['requests'];

export const HackathonTeamRequests = ({
  eventId,
  requests,
  locale,
}: {
  eventId: string;
  requests: Requests;
  locale: Locale;
}) => {
  const answer = useAnswerTeamRequest(eventId);
  const reply = (requestId: string, decision: 'accept' | 'decline') => {
    if (!answer.isPending) answer.mutate({ requestId, decision });
  };

  return (
    <section aria-labelledby="hackathon-team-requests-heading" className="mt-6">
      <h2 id="hackathon-team-requests-heading" className="font-display text-h4">
        {hackathon_team_requests_heading({}, { locale })}
      </h2>
      {requests.length === 0 ? (
        <p className="mt-2 text-body-sm text-neutral">
          {hackathon_team_requests_empty({}, { locale })}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-base-300 rounded-box border border-base-300">
          {requests.map((request) => (
            <li
              key={request.id}
              className="flex flex-wrap items-center justify-between gap-2 p-3"
            >
              <bdi className="min-w-0 break-words font-medium">
                {request.name ?? hackathon_team_unnamed({}, { locale })}
              </bdi>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  onClick={() => reply(request.id, 'accept')}
                >
                  {hackathon_team_accept({}, { locale })}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => reply(request.id, 'decline')}
                >
                  {hackathon_team_decline({}, { locale })}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {answer.isError ? (
        <StatusMessage variant="error" className="mt-3">
          {teamErrorMessage(answer.error, locale)}
        </StatusMessage>
      ) : null}
    </section>
  );
};
