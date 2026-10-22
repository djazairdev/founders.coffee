import {
  org_member_joined,
  org_member_remove,
  org_member_remove_label,
  org_member_you,
  org_members_heading,
  type Locale,
} from '@founders-coffee/i18n';
import { Button } from '@founders-coffee/ui';

import { roleLabel, rosterDate } from '../roster-labels';
import type { RosterMember } from '../types';

export const OrganisationMemberList = ({
  members,
  locale,
  timeZone,
  onRemove,
}: {
  members: readonly RosterMember[];
  locale: Locale;
  timeZone: string;
  onRemove: (member: RosterMember) => void;
}) => (
  <section className="rounded-box border border-base-300 bg-base-100 p-5 md:p-6">
    <h2 className="font-display text-h4">
      {org_members_heading({}, { locale })}
    </h2>
    <ul className="mt-3">
      {members.map((member) => (
        <li
          key={member.memberId}
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-base-200 py-3 last:border-b-0"
        >
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-body-sm font-medium">
              <bdi className="min-w-0 break-words">{member.name}</bdi>
              <span className="badge badge-ghost badge-sm">
                {roleLabel(member.role, locale)}
              </span>
              {member.isYou ? (
                <span className="badge badge-outline badge-sm">
                  {org_member_you({}, { locale })}
                </span>
              ) : null}
            </p>
            <p className="mt-0.5 text-caption text-neutral">
              {org_member_joined(
                { date: rosterDate(member.joinedAt, locale, timeZone) },
                { locale },
              )}
            </p>
          </div>
          {member.canRemove ? (
            <Button
              variant="ghost"
              className="text-error"
              aria-label={org_member_remove_label(
                { name: member.name },
                { locale },
              )}
              onClick={() => onRemove(member)}
            >
              {org_member_remove({}, { locale })}
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  </section>
);
