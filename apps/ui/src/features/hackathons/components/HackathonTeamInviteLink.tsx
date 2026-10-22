import { useState } from 'react';

import {
  hackathon_team_invite_active,
  hackathon_team_invite_copied,
  hackathon_team_invite_copy,
  hackathon_team_invite_heading,
  hackathon_team_invite_hint,
  hackathon_team_invite_label,
  hackathon_team_invite_make,
  hackathon_team_invite_off,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, Input, StatusMessage } from '@founders-coffee/ui';

import { teamErrorMessage } from '../team-errors';
import { teamInviteUrl } from '../team-links';
import { useCreateTeamInvite, useRevokeTeamInvite } from '../team-hooks';
import { scheduleMoment } from '../schedule';

const LINK_ID = 'hackathon-team-invite-link';

export const HackathonTeamInviteLink = ({
  eventId,
  expiresAt,
  locale,
  timeZone,
}: {
  eventId: string;
  expiresAt: number | null;
  locale: Locale;
  timeZone: string;
}) => {
  const make = useCreateTeamInvite(eventId);
  const revoke = useRevokeTeamInvite(eventId);
  const [link, setLink] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const isBusy = make.isPending || revoke.isPending;
  const failed = make.isError
    ? make.error
    : revoke.isError
      ? revoke.error
      : null;

  const create = () => {
    if (isBusy) return;
    make.mutate(undefined, {
      onSuccess: (created) => {
        setIsCopied(false);
        setLink(
          teamInviteUrl(window.location.origin, locale, eventId, created.token),
        );
      },
    });
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setIsCopied(true);
    } catch {
      document.getElementById(LINK_ID)?.focus();
    }
  };

  const turnOff = () => {
    if (isBusy) return;
    revoke.mutate(undefined, { onSuccess: () => setLink(null) });
  };

  return (
    <section aria-labelledby="hackathon-team-invite-heading" className="mt-6">
      <h2 id="hackathon-team-invite-heading" className="font-display text-h4">
        {hackathon_team_invite_heading({}, { locale })}
      </h2>
      <p className="mt-1 text-body-sm text-neutral">
        {hackathon_team_invite_hint({}, { locale })}
      </p>
      {link ? (
        <div className="mt-3 grid gap-2">
          <label className="text-label" htmlFor={LINK_ID}>
            {hackathon_team_invite_label({}, { locale })}
          </label>
          <div className="flex gap-2">
            <Input
              id={LINK_ID}
              readOnly
              dir="ltr"
              value={link}
              onFocus={(event) => event.target.select()}
            />
            <Button variant="outline" onClick={() => void copy()}>
              {isCopied
                ? hackathon_team_invite_copied({}, { locale })
                : hackathon_team_invite_copy({}, { locale })}
            </Button>
          </div>
        </div>
      ) : expiresAt !== null ? (
        <p className="mt-3 text-body-sm">
          {hackathon_team_invite_active(
            { date: scheduleMoment(expiresAt, locale, timeZone) },
            { locale },
          )}
        </p>
      ) : null}
      {failed ? (
        <StatusMessage variant="error" className="mt-3">
          {teamErrorMessage(failed, locale)}
        </StatusMessage>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="primary" onClick={create}>
          {hackathon_team_invite_make({}, { locale })}
        </Button>
        {link || expiresAt !== null ? (
          <Button variant="ghost" onClick={turnOff}>
            {hackathon_team_invite_off({}, { locale })}
          </Button>
        ) : null}
      </div>
    </section>
  );
};
