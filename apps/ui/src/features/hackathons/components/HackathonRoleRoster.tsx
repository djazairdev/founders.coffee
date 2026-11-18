import { useState } from 'react';

import {
  cancel,
  confirm,
  formatNumber,
  hackathon_mentor_helps_with,
  hackathon_mentor_office_hours,
  hackathon_role_closed,
  hackathon_role_empty,
  hackathon_role_invite_judge,
  hackathon_role_invite_mentor,
  hackathon_role_link_hint,
  hackathon_role_place_name,
  hackathon_role_remove,
  hackathon_role_remove_confirm,
  hackathon_team_invite_copied,
  hackathon_team_invite_copy,
  hackathon_team_invite_label,
  loading,
  retry,
  type Locale,
} from '@founders-coffee/i18n';
import {
  Button,
  Input,
  LoadingStatus,
  StatusMessage,
} from '@founders-coffee/ui';

import { useManageHackathonRole } from '../role-invitation-hooks';
import {
  roleInvitationError,
  rolePlaceStatus,
  roleRosterTitle,
} from '../role-invitation-labels';
import { roleInvitationUrl, type HackathonRole } from '../role-invitations';

export const HackathonRoleRoster = ({
  eventId,
  role,
  canChange,
  locale,
}: {
  eventId: string;
  role: HackathonRole;
  canChange: boolean;
  locale: Locale;
}) => {
  const { roster, create, remove } = useManageHackathonRole(eventId, role);
  const [confirmId, setConfirmId] = useState<string>();
  const [copiedId, setCopiedId] = useState<string>();
  const options = { locale };
  const headingId = `hackathon-${role}-roster-heading`;
  const linkId = `hackathon-${role}-invite-link`;
  const createdPlace = roster.data?.find(
    (place) => place.id === create.data?.id,
  );
  const invite =
    canChange && (!createdPlace || createdPlace.status === 'invited')
      ? create.data
      : undefined;
  const link = invite
    ? roleInvitationUrl(window.location.origin, locale, {
        role,
        token: invite.token,
      })
    : null;
  const isBusy = create.isPending || remove.isPending;
  const error = create.error ?? remove.error;

  const copy = async () => {
    if (!link || !invite) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(invite.id);
    } catch {
      document.getElementById(linkId)?.focus();
    }
  };

  return (
    <section aria-labelledby={headingId} className="mt-8 grid gap-3">
      <h2 id={headingId} className="font-display text-h4">
        {roleRosterTitle(role, locale)}
      </h2>
      {roster.isError ? (
        <StatusMessage
          variant="error"
          action={
            <Button variant="outline" onClick={() => void roster.refetch()}>
              {retry({}, options)}
            </Button>
          }
        >
          {roleInvitationError(roster.error, locale)}
        </StatusMessage>
      ) : null}
      {roster.isPending ? <LoadingStatus label={loading({}, options)} /> : null}
      {roster.data?.length === 0 ? (
        <p className="text-body-sm text-neutral">
          {hackathon_role_empty({}, options)}
        </p>
      ) : null}
      {roster.data?.length ? (
        <ul className="divide-y divide-base-300 rounded-box border border-base-300">
          {roster.data.map((place, index) => (
            <li key={place.id} className="grid gap-2 p-3">
              <div className="flex flex-wrap items-baseline gap-2">
                <bdi className="min-w-0 break-words font-medium">
                  {place.name ??
                    hackathon_role_place_name(
                      { number: formatNumber(index + 1, locale) },
                      options,
                    )}
                </bdi>
                <span className="badge badge-sm badge-ghost">
                  {rolePlaceStatus(place.status, locale)}
                </span>
              </div>
              {place.status === 'accepted' && 'helpsWith' in place ? (
                <dl className="grid gap-1 text-body-sm">
                  {place.helpsWith ? (
                    <>
                      <dt>{hackathon_mentor_helps_with({}, options)}</dt>
                      <dd dir="auto" className="break-words">
                        {place.helpsWith}
                      </dd>
                    </>
                  ) : null}
                  {place.officeHours ? (
                    <>
                      <dt>{hackathon_mentor_office_hours({}, options)}</dt>
                      <dd dir="auto" className="break-words">
                        {place.officeHours}
                      </dd>
                    </>
                  ) : null}
                </dl>
              ) : null}
              {canChange &&
              (place.status === 'invited' || place.status === 'accepted') ? (
                confirmId === place.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="w-full text-body-sm">
                      {hackathon_role_remove_confirm({}, options)}
                    </p>
                    <Button
                      disabled={isBusy}
                      variant="outline"
                      onClick={() =>
                        remove.mutate(place.id, {
                          onSuccess: () => setConfirmId(undefined),
                        })
                      }
                    >
                      {confirm({}, options)}
                    </Button>
                    <Button
                      disabled={isBusy}
                      variant="ghost"
                      onClick={() => setConfirmId(undefined)}
                    >
                      {cancel({}, options)}
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Button
                      disabled={isBusy}
                      variant="ghost"
                      onClick={() => setConfirmId(place.id)}
                    >
                      {hackathon_role_remove({}, options)}
                    </Button>
                  </div>
                )
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <StatusMessage variant="error">
          {roleInvitationError(error, locale)}
        </StatusMessage>
      ) : null}
      {link ? (
        <div className="grid gap-2">
          <p className="text-body-sm text-neutral">
            {hackathon_role_link_hint({}, options)}
          </p>
          <label htmlFor={linkId} className="text-label">
            {hackathon_team_invite_label({}, options)}
          </label>
          <div className="flex gap-2">
            <Input
              id={linkId}
              readOnly
              dir="ltr"
              value={link}
              onFocus={(event) => event.target.select()}
            />
            <Button variant="outline" onClick={() => void copy()}>
              {copiedId === invite?.id
                ? hackathon_team_invite_copied({}, options)
                : hackathon_team_invite_copy({}, options)}
            </Button>
          </div>
        </div>
      ) : null}
      {canChange ? (
        <div>
          <Button disabled={isBusy} onClick={() => create.mutate()}>
            {(role === 'judge'
              ? hackathon_role_invite_judge
              : hackathon_role_invite_mentor)({}, options)}
          </Button>
        </div>
      ) : (
        <p className="text-body-sm text-neutral">
          {hackathon_role_closed({}, options)}
        </p>
      )}
    </section>
  );
};
