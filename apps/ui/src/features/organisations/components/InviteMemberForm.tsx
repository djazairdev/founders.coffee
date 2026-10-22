import { useRef, useState, type FormEvent } from 'react';

import {
  org_invite_email,
  org_invite_error_email,
  org_invite_error_member,
  org_invite_heading,
  org_invite_role,
  org_invite_role_hint,
  org_invite_sent,
  org_invite_submit,
  org_roster_error_failed,
  org_roster_error_rate_limited,
  type Locale,
} from '@founders-coffee/i18n';
import {
  Button,
  Input,
  IsolatedValue,
  Select,
  StatusMessage,
} from '@founders-coffee/ui';

import { rosterRefusal, type RosterRefusal } from '../errors';
import { useInviteMember } from '../hooks';
import {
  INVITABLE_ROLES,
  invitationFrom,
  type InvitableRole,
} from '../invitation-draft';
import { roleLabel } from '../roster-labels';

const EMAIL_ID = 'organisation-invite-email';
const ROLE_ID = 'organisation-invite-role';

const refusalText = (refusal: RosterRefusal, locale: Locale) => {
  switch (refusal) {
    case 'already_member':
      return org_invite_error_member({}, { locale });
    case 'invalid_email':
      return org_invite_error_email({}, { locale });
    case 'rate_limited':
      return org_roster_error_rate_limited({}, { locale });
    case 'failed':
      return org_roster_error_failed({}, { locale });
  }
};

export const InviteMemberForm = ({
  organisationId,
  locale,
}: {
  organisationId: string;
  locale: Locale;
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InvitableRole>('member');
  const [refusal, setRefusal] = useState<RosterRefusal | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const invite = useInviteMember();
  const emailField = useRef<HTMLInputElement>(null);
  const isEmailRefused =
    refusal === 'invalid_email' || refusal === 'already_member';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (invite.isPending) return;
    setSentTo(null);
    const invitation = invitationFrom({ email, role });
    if (!invitation) {
      setRefusal('invalid_email');
      emailField.current?.focus();
      return;
    }
    setRefusal(null);
    try {
      await invite.mutateAsync({ organisationId, ...invitation });
      setSentTo(invitation.email);
      setEmail('');
    } catch (caught) {
      const reason = rosterRefusal(caught);
      setRefusal(reason);
      if (reason === 'invalid_email' || reason === 'already_member')
        emailField.current?.focus();
    }
  };

  return (
    <section className="rounded-box border border-base-300 bg-base-100 p-5 md:p-6">
      <h2 className="font-display text-h4">
        {org_invite_heading({}, { locale })}
      </h2>
      <form className="mt-4 space-y-4" noValidate onSubmit={submit}>
        <div>
          <label className="text-label" htmlFor={EMAIL_ID}>
            {org_invite_email({}, { locale })}
          </label>
          <Input
            ref={emailField}
            id={EMAIL_ID}
            type="email"
            autoComplete="off"
            className="mt-1.5"
            value={email}
            aria-invalid={isEmailRefused ? true : undefined}
            aria-describedby={isEmailRefused ? `${EMAIL_ID}-error` : undefined}
            onChange={(event) => {
              setEmail(event.target.value);
              if (isEmailRefused) setRefusal(null);
            }}
          />
          {isEmailRefused && refusal ? (
            <p
              id={`${EMAIL_ID}-error`}
              className="mt-1.5 text-body-sm text-error"
            >
              {refusalText(refusal, locale)}
            </p>
          ) : null}
        </div>
        <div>
          <label className="text-label" htmlFor={ROLE_ID}>
            {org_invite_role({}, { locale })}
          </label>
          <Select
            id={ROLE_ID}
            className="mt-1.5"
            value={role}
            aria-describedby={`${ROLE_ID}-hint`}
            onChange={(event) =>
              setRole(
                INVITABLE_ROLES.find(
                  (option) => option === event.target.value,
                ) ?? 'member',
              )
            }
          >
            {INVITABLE_ROLES.map((option) => (
              <option key={option} value={option}>
                {roleLabel(option, locale)}
              </option>
            ))}
          </Select>
          <p
            id={`${ROLE_ID}-hint`}
            className="mt-1.5 text-body-sm text-neutral"
          >
            {org_invite_role_hint({}, { locale })}
          </p>
        </div>
        {refusal && !isEmailRefused ? (
          <StatusMessage variant="error">
            {refusalText(refusal, locale)}
          </StatusMessage>
        ) : null}
        {sentTo ? (
          <StatusMessage variant="success">
            <IsolatedValue
              value={sentTo}
              message={(address) =>
                org_invite_sent({ email: address }, { locale })
              }
            />
          </StatusMessage>
        ) : null}
        <Button type="submit" disabled={invite.isPending}>
          {invite.isPending ? (
            <span
              className="loading loading-spinner loading-xs"
              aria-hidden="true"
            />
          ) : null}
          {org_invite_submit({}, { locale })}
        </Button>
      </form>
    </section>
  );
};
