import { useState } from 'react';

import {
  cancel,
  hackathon_team_captain,
  hackathon_team_confirm,
  hackathon_team_leave,
  hackathon_team_leave_confirm,
  hackathon_team_make_captain,
  hackathon_team_members_heading,
  hackathon_team_pass_first,
  hackathon_team_remove,
  hackathon_team_remove_confirm,
  hackathon_team_unnamed,
  hackathon_team_you,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, IsolatedValue, StatusMessage } from '@founders-coffee/ui';

import type { TeamPageView } from '../api';
import { teamErrorMessage } from '../team-errors';
import {
  useLeaveTeam,
  usePassCaptaincy,
  useRemoveTeamMember,
} from '../team-hooks';

type Team = NonNullable<TeamPageView['team']>;
type Pending = { readonly kind: 'remove'; readonly userId: string } | null;

export const HackathonTeamMembers = ({
  eventId,
  team,
  viewerId,
  canChange,
  locale,
}: {
  eventId: string;
  team: Team;
  viewerId: string;
  canChange: boolean;
  locale: Locale;
}) => {
  const pass = usePassCaptaincy(eventId);
  const remove = useRemoveTeamMember(eventId);
  const leave = useLeaveTeam(eventId);
  const [pending, setPending] = useState<Pending>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const isBusy = pass.isPending || remove.isPending || leave.isPending;
  const failed = [pass, remove, leave].find((change) => change.isError);
  const nameOf = (name: string | null) =>
    name ?? hackathon_team_unnamed({}, { locale });
  const mustPassFirst = team.isCaptain && team.members.length > 1;

  return (
    <section aria-labelledby="hackathon-team-members-heading" className="mt-6">
      <h2 id="hackathon-team-members-heading" className="font-display text-h4">
        {hackathon_team_members_heading({}, { locale })}
      </h2>
      <ul className="mt-3 divide-y divide-base-300 rounded-box border border-base-300">
        {team.members.map((member) => (
          <li key={member.userId} className="grid gap-2 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <bdi className="min-w-0 break-words font-medium">
                {nameOf(member.name)}
              </bdi>
              {member.isCaptain ? (
                <span className="badge badge-primary badge-sm">
                  {hackathon_team_captain({}, { locale })}
                </span>
              ) : null}
              {member.userId === viewerId ? (
                <span className="badge badge-ghost badge-sm">
                  {hackathon_team_you({}, { locale })}
                </span>
              ) : null}
            </div>
            {canChange && team.isCaptain && member.userId !== viewerId ? (
              pending?.userId === member.userId ? (
                <div className="grid gap-2">
                  <p className="text-body-sm">
                    <IsolatedValue
                      value={nameOf(member.name)}
                      message={(name) =>
                        hackathon_team_remove_confirm({ name }, { locale })
                      }
                    />
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      onClick={() => {
                        if (isBusy) return;
                        remove.mutate(member.userId, {
                          onSettled: () => setPending(null),
                        });
                      }}
                    >
                      {hackathon_team_confirm({}, { locale })}
                    </Button>
                    <Button variant="ghost" onClick={() => setPending(null)}>
                      {cancel({}, { locale })}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!isBusy) pass.mutate(member.userId);
                    }}
                  >
                    {hackathon_team_make_captain({}, { locale })}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setPending({ kind: 'remove', userId: member.userId })
                    }
                  >
                    {hackathon_team_remove({}, { locale })}
                  </Button>
                </div>
              )
            ) : null}
          </li>
        ))}
      </ul>
      {failed ? (
        <StatusMessage variant="error" className="mt-3">
          {teamErrorMessage(failed.error, locale)}
        </StatusMessage>
      ) : null}
      {canChange ? (
        <div className="mt-4">
          {mustPassFirst ? (
            <p className="text-body-sm text-neutral">
              {hackathon_team_pass_first({}, { locale })}
            </p>
          ) : isLeaving ? (
            <div className="grid gap-2">
              <p className="text-body-sm">
                <IsolatedValue
                  value={team.name}
                  message={(name) =>
                    hackathon_team_leave_confirm({ team: name }, { locale })
                  }
                />
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  onClick={() => {
                    if (!isBusy) leave.mutate();
                  }}
                >
                  {hackathon_team_confirm({}, { locale })}
                </Button>
                <Button variant="ghost" onClick={() => setIsLeaving(false)}>
                  {cancel({}, { locale })}
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setIsLeaving(true)}>
              {hackathon_team_leave({}, { locale })}
            </Button>
          )}
        </div>
      ) : null}
    </section>
  );
};
