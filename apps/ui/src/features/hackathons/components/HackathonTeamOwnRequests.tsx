import {
  hackathon_team_own_request,
  hackathon_team_own_requests_heading,
  hackathon_team_withdraw,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, IsolatedValue, StatusMessage } from '@founders-coffee/ui';

import type { TeamPageView } from '../api';
import { teamErrorMessage } from '../team-errors';
import { useCancelTeamRequest } from '../team-hooks';

export const HackathonTeamOwnRequests = ({
  eventId,
  requests,
  canChange,
  locale,
}: {
  eventId: string;
  requests: TeamPageView['ownRequests'];
  canChange: boolean;
  locale: Locale;
}) => {
  const withdraw = useCancelTeamRequest(eventId);
  if (requests.length === 0) return null;

  return (
    <section
      aria-labelledby="hackathon-team-own-requests-heading"
      className="mt-8"
    >
      <h2
        id="hackathon-team-own-requests-heading"
        className="font-display text-h4"
      >
        {hackathon_team_own_requests_heading({}, { locale })}
      </h2>
      <ul className="mt-3 divide-y divide-base-300 rounded-box border border-base-300">
        {requests.map((request) => (
          <li
            key={request.id}
            className="flex flex-wrap items-center justify-between gap-2 p-3"
          >
            <p className="min-w-0 text-body-sm">
              <IsolatedValue
                value={request.teamName}
                message={(team) =>
                  hackathon_team_own_request({ team }, { locale })
                }
              />
            </p>
            {canChange ? (
              <Button
                variant="ghost"
                onClick={() => {
                  if (!withdraw.isPending) withdraw.mutate(request.id);
                }}
              >
                {hackathon_team_withdraw({}, { locale })}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {withdraw.isError ? (
        <StatusMessage variant="error" className="mt-3">
          {teamErrorMessage(withdraw.error, locale)}
        </StatusMessage>
      ) : null}
    </section>
  );
};
