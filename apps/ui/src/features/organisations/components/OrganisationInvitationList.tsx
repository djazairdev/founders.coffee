import {
  org_invitation_cancel,
  org_invitation_cancel_label,
  org_invitation_expired,
  org_invitation_expires,
  org_invitations_empty,
  org_invitations_heading,
  type Locale,
} from '@founders-coffee/i18n';
import { Button } from '@founders-coffee/ui';

import { roleLabel, rosterDate } from '../roster-labels';
import type { RosterInvitation } from '../types';

export const OrganisationInvitationList = ({
  invitations,
  locale,
  timeZone,
  cancellingId,
  onCancel,
}: {
  invitations: readonly RosterInvitation[];
  locale: Locale;
  timeZone: string;
  cancellingId: string | null;
  onCancel: (invitation: RosterInvitation) => void;
}) => (
  <section className="rounded-box border border-base-300 bg-base-100 p-5 md:p-6">
    <h2 className="font-display text-h4">
      {org_invitations_heading({}, { locale })}
    </h2>
    {invitations.length === 0 ? (
      <p className="mt-3 text-body-sm text-neutral">
        {org_invitations_empty({}, { locale })}
      </p>
    ) : (
      <ul className="mt-3">
        {invitations.map((invitation) => (
          <li
            key={invitation.id}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-base-200 py-3 last:border-b-0"
          >
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-body-sm font-medium">
                <bdi dir="ltr" className="min-w-0 break-all">
                  {invitation.email}
                </bdi>
                <span className="badge badge-ghost badge-sm">
                  {roleLabel(invitation.role ?? 'member', locale)}
                </span>
              </p>
              <p className="mt-0.5 text-caption text-neutral">
                {invitation.isExpired
                  ? org_invitation_expired({}, { locale })
                  : org_invitation_expires(
                      {
                        date: rosterDate(
                          invitation.expiresAt,
                          locale,
                          timeZone,
                        ),
                      },
                      { locale },
                    )}
              </p>
            </div>
            <Button
              variant="ghost"
              aria-label={org_invitation_cancel_label(
                { email: invitation.email },
                { locale },
              )}
              disabled={cancellingId === invitation.id}
              onClick={() => onCancel(invitation)}
            >
              {org_invitation_cancel({}, { locale })}
            </Button>
          </li>
        ))}
      </ul>
    )}
  </section>
);
