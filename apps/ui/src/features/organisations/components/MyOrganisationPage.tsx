import { useState } from 'react';

import {
  org_manage_error,
  org_manage_loading,
  org_manage_member_note,
  org_manage_not_found,
  org_manage_title,
  org_roster_error_failed,
  org_roster_error_rate_limited,
  retry,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, LoadingStatus, StatusMessage } from '@founders-coffee/ui';

import type { RootMarket } from '../../markets/api';
import { isOrganisationNotFound, rosterRefusal } from '../errors';
import {
  useCancelInvitation,
  useMyOrganisation,
  useRemoveMember,
} from '../hooks';
import type { OrganisationRoster, RosterMember } from '../types';
import { InviteMemberForm } from './InviteMemberForm';
import { OrganisationHackathonList } from './OrganisationHackathonList';
import { OrganisationInvitationList } from './OrganisationInvitationList';
import { OrganisationMemberList } from './OrganisationMemberList';
import { OrganisationReviewCard } from './OrganisationReviewCard';
import { RemoveMemberDialog } from './RemoveMemberDialog';

const RosterSections = ({
  roster,
  locale,
  timeZone,
}: {
  roster: OrganisationRoster;
  locale: Locale;
  timeZone: string;
}) => {
  const [removing, setRemoving] = useState<RosterMember | null>(null);
  const remove = useRemoveMember();
  const cancel = useCancelInvitation();
  const failure = remove.error ?? cancel.error;
  const failureText =
    failure && rosterRefusal(failure) === 'rate_limited'
      ? org_roster_error_rate_limited({}, { locale })
      : org_roster_error_failed({}, { locale });

  return (
    <>
      {failure ? (
        <StatusMessage variant="error">{failureText}</StatusMessage>
      ) : null}
      <OrganisationMemberList
        members={roster.members}
        locale={locale}
        timeZone={timeZone}
        onRemove={(member) => {
          remove.reset();
          cancel.reset();
          setRemoving(member);
        }}
      />
      <OrganisationInvitationList
        invitations={roster.invitations}
        locale={locale}
        timeZone={timeZone}
        cancellingId={
          cancel.isPending ? (cancel.variables?.invitationId ?? null) : null
        }
        onCancel={(invitation) => {
          remove.reset();
          cancel.mutate({
            organisationId: roster.id,
            invitationId: invitation.id,
          });
        }}
      />
      <InviteMemberForm organisationId={roster.id} locale={locale} />
      <RemoveMemberDialog
        name={removing?.name ?? null}
        locale={locale}
        isPending={remove.isPending}
        onKeep={() => setRemoving(null)}
        onConfirm={() => {
          if (!removing) return;
          remove.mutate(
            { organisationId: roster.id, memberId: removing.memberId },
            { onSettled: () => setRemoving(null) },
          );
        }}
      />
    </>
  );
};

export const MyOrganisationPage = ({
  slug,
  locale,
  markets,
  savedHackathonId = null,
}: {
  slug: string;
  locale: Locale;
  markets: readonly RootMarket[];
  savedHackathonId?: string | null;
}) => {
  const query = useMyOrganisation(slug);
  const roster = query.data;
  const timeZone =
    markets.find((market) => market.code === roster?.marketCode)?.timezone ??
    'UTC';

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <h1 className="font-display text-h3">
        {roster ? <bdi>{roster.name}</bdi> : org_manage_title({}, { locale })}
      </h1>
      {roster ? (
        <div className="mt-6 space-y-6">
          <OrganisationReviewCard
            review={roster.review}
            locale={locale}
            timeZone={timeZone}
          />
          {roster.canCreateHackathon || roster.hackathons.length > 0 ? (
            <OrganisationHackathonList
              slug={roster.slug}
              hackathons={roster.hackathons}
              canCreate={roster.canCreateHackathon}
              savedId={savedHackathonId}
              locale={locale}
              timeZone={timeZone}
            />
          ) : null}
          {roster.canManage ? (
            <RosterSections
              roster={roster}
              locale={locale}
              timeZone={timeZone}
            />
          ) : roster.review.status === 'approved' ? (
            <p className="text-body-sm text-neutral">
              {org_manage_member_note({}, { locale })}
            </p>
          ) : null}
        </div>
      ) : query.isError ? (
        isOrganisationNotFound(query.error) ? (
          <StatusMessage variant="warning" className="mt-6">
            {org_manage_not_found({}, { locale })}
          </StatusMessage>
        ) : (
          <StatusMessage
            variant="error"
            className="mt-6"
            action={
              <Button variant="outline" onClick={() => void query.refetch()}>
                {retry({}, { locale })}
              </Button>
            }
          >
            {org_manage_error({}, { locale })}
          </StatusMessage>
        )
      ) : (
        <LoadingStatus
          className="mt-6"
          label={org_manage_loading({}, { locale })}
        />
      )}
    </div>
  );
};
