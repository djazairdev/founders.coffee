import { Link } from '@tanstack/react-router';

import {
  org_apply_sent_link,
  org_invitation_accept,
  org_invitation_accepted_body,
  org_invitation_already_member_body,
  org_invitation_as_admin,
  org_invitation_as_member,
  org_invitation_cancelled_body,
  org_invitation_decline,
  org_invitation_declined_body,
  org_invitation_error,
  org_invitation_error_failed,
  org_invitation_expired_body,
  org_invitation_expires,
  org_invitation_from,
  org_invitation_loading,
  org_invitation_members_can,
  org_invitation_not_found,
  org_invitation_title,
  org_invitation_unavailable_body,
  org_invitation_verify,
  org_invitation_verify_link,
  org_roster_error_rate_limited,
  retry,
  type Locale,
} from '@founders-coffee/i18n';
import {
  Button,
  IsolatedValue,
  LoadingStatus,
  StatusMessage,
} from '@founders-coffee/ui';

import {
  localizedMyOrganisation,
  localizedProfileAccount,
} from '../../../lib/locale-routing';
import type { RootMarket } from '../../markets/api';
import { isInvitationNotFound, rosterRefusal } from '../errors';
import { useAnswerInvitation, useOrganisationInvitation } from '../hooks';
import { rosterDate } from '../roster-labels';
import type { InvitationView } from '../types';

const LINK_CLASS = 'link link-hover font-medium text-secondary';

const OrganisationLink = ({
  invitation,
  locale,
}: {
  invitation: InvitationView;
  locale: Locale;
}) => (
  <Link
    {...localizedMyOrganisation(locale, invitation.organisationSlug)}
    className={LINK_CLASS}
  >
    {org_apply_sent_link({}, { locale })}
  </Link>
);

const PendingInvitation = ({
  invitation,
  locale,
  timeZone,
}: {
  invitation: InvitationView;
  locale: Locale;
  timeZone: string;
}) => {
  const answer = useAnswerInvitation();
  const reply = (choice: 'accept' | 'decline') =>
    answer.mutate({ invitationId: invitation.id, answer: choice });
  const isRateLimited =
    answer.error !== null && rosterRefusal(answer.error) === 'rate_limited';

  return (
    <div className="space-y-4">
      <p className="text-body">
        <IsolatedValue
          value={invitation.organisationName}
          message={(organisation) =>
            invitation.role === 'admin'
              ? org_invitation_as_admin({ organisation }, { locale })
              : org_invitation_as_member({ organisation }, { locale })
          }
        />
      </p>
      <p className="text-body-sm text-neutral">
        {org_invitation_members_can({}, { locale })}
      </p>
      {invitation.inviterName ? (
        <p className="text-body-sm text-neutral">
          <IsolatedValue
            value={invitation.inviterName}
            message={(inviter) => org_invitation_from({ inviter }, { locale })}
          />
        </p>
      ) : null}
      <p className="text-caption text-neutral">
        {org_invitation_expires(
          {
            date: rosterDate(invitation.expiresAt, locale, timeZone),
          },
          { locale },
        )}
      </p>
      {answer.isError ? (
        <StatusMessage variant="error">
          {isRateLimited
            ? org_roster_error_rate_limited({}, { locale })
            : org_invitation_error_failed({}, { locale })}
        </StatusMessage>
      ) : null}
      {invitation.isEmailVerified ? (
        <div className="flex flex-wrap gap-2">
          <Button disabled={answer.isPending} onClick={() => reply('accept')}>
            {org_invitation_accept({}, { locale })}
          </Button>
          <Button
            variant="outline"
            disabled={answer.isPending}
            onClick={() => reply('decline')}
          >
            {org_invitation_decline({}, { locale })}
          </Button>
        </div>
      ) : (
        <StatusMessage
          variant="warning"
          action={
            <Link {...localizedProfileAccount(locale)} className={LINK_CLASS}>
              {org_invitation_verify_link({}, { locale })}
            </Link>
          }
        >
          {org_invitation_verify({}, { locale })}
        </StatusMessage>
      )}
    </div>
  );
};

const AnsweredInvitation = ({
  invitation,
  locale,
}: {
  invitation: InvitationView;
  locale: Locale;
}) => {
  const named = (message: typeof org_invitation_accepted_body) => (
    <IsolatedValue
      value={invitation.organisationName}
      message={(organisation) => message({ organisation }, { locale })}
    />
  );
  switch (invitation.state) {
    case 'accepted':
    case 'already_member':
      return (
        <div className="space-y-3">
          <StatusMessage variant="success">
            {named(
              invitation.state === 'accepted'
                ? org_invitation_accepted_body
                : org_invitation_already_member_body,
            )}
          </StatusMessage>
          <OrganisationLink invitation={invitation} locale={locale} />
        </div>
      );
    case 'declined':
      return (
        <StatusMessage variant="info">
          {org_invitation_declined_body({}, { locale })}
        </StatusMessage>
      );
    case 'expired':
      return (
        <StatusMessage variant="warning">
          {org_invitation_expired_body({}, { locale })}
        </StatusMessage>
      );
    case 'cancelled':
      return (
        <StatusMessage variant="warning">
          {org_invitation_cancelled_body({}, { locale })}
        </StatusMessage>
      );
    case 'unavailable':
      return (
        <StatusMessage variant="warning">
          {named(org_invitation_unavailable_body)}
        </StatusMessage>
      );
    case 'pending':
      return null;
  }
};

export const OrganisationInvitationPage = ({
  invitationId,
  locale,
  markets,
}: {
  invitationId: string;
  locale: Locale;
  markets: readonly RootMarket[];
}) => {
  const query = useOrganisationInvitation(invitationId);
  const invitation = query.data;

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12">
      <h1 className="font-display text-h3">
        {invitation ? (
          <bdi>{invitation.organisationName}</bdi>
        ) : (
          org_invitation_title({}, { locale })
        )}
      </h1>
      <div className="mt-6" aria-live="polite">
        {invitation ? (
          invitation.state === 'pending' ? (
            <PendingInvitation
              invitation={invitation}
              locale={locale}
              timeZone={
                markets.find((market) => market.code === invitation.marketCode)
                  ?.timezone ?? 'UTC'
              }
            />
          ) : (
            <AnsweredInvitation invitation={invitation} locale={locale} />
          )
        ) : query.isError ? (
          isInvitationNotFound(query.error) ? (
            <StatusMessage variant="warning">
              {org_invitation_not_found({}, { locale })}
            </StatusMessage>
          ) : (
            <StatusMessage
              variant="error"
              action={
                <Button variant="outline" onClick={() => void query.refetch()}>
                  {retry({}, { locale })}
                </Button>
              }
            >
              {org_invitation_error({}, { locale })}
            </StatusMessage>
          )
        ) : (
          <LoadingStatus label={org_invitation_loading({}, { locale })} />
        )}
      </div>
    </div>
  );
};
