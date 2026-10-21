import { Link } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';

import { appErrorCode } from '@founders-coffee/core';
import {
  email_label,
  hackathon_alert_consent,
  hackathon_alert_label,
  hackathon_alert_privacy,
  hackathon_alert_success,
  hero_waitlist_error,
  hero_waitlist_invalid_email,
  hero_waitlist_submit,
  hero_waitlist_submitting,
  type Locale,
} from '@founders-coffee/i18n';
import { Input, StatusMessage, Turnstile } from '@founders-coffee/ui';

import { useAuth } from '../../../lib/app-providers';
import { localizedLanding } from '../../../lib/locale-routing';
import { usePublicAuthConfig } from '../../auth/hooks';
import { useJoinHackathonInterest } from '../hooks';

type HackathonAlertFormProps = {
  locale: Locale;
  marketCode: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PRIVACY_SLOT = '<<PRIVACY>>';
const EMAIL_ID = 'hackathon-alert-email';
const CONSENT_ID = 'hackathon-alert-consent';

export const HackathonAlertForm = ({
  locale,
  marketCode,
}: HackathonAlertFormProps) => {
  const { user } = useAuth();
  const [typed, setTyped] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const join = useJoinHackathonInterest();
  const authConfig = usePublicAuthConfig();
  const sitekey = authConfig.data?.turnstileSiteKey ?? null;
  const isBypassed = authConfig.data?.isTurnstileBypassed === true;
  const isVerified = isBypassed || turnstileToken !== null;
  const email = typed ?? user?.email ?? '';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const address = email.trim().toLowerCase();
    if (!EMAIL_RE.test(address)) {
      setError(hero_waitlist_invalid_email({}, { locale }));
      return;
    }
    if (!isVerified) return;
    setError(null);
    try {
      await join.mutateAsync({
        data: {
          email: address,
          marketCode,
          locale,
          turnstileToken: turnstileToken ?? undefined,
        },
      });
    } catch (caught) {
      setTurnstileToken(null);
      setTurnstileResetKey((value) => value + 1);
      setError(
        appErrorCode(caught) === 'validation_failed'
          ? hero_waitlist_invalid_email({}, { locale })
          : hero_waitlist_error({}, { locale }),
      );
    }
  };

  if (join.isSuccess) {
    return (
      <StatusMessage variant="success">
        {hackathon_alert_success({}, { locale })}
      </StatusMessage>
    );
  }

  const [beforePrivacy, afterPrivacy] = hackathon_alert_consent(
    { privacy: PRIVACY_SLOT },
    { locale },
  ).split(PRIVACY_SLOT);

  return (
    <form onSubmit={submit} className="flex flex-col gap-2" noValidate>
      <label
        htmlFor={EMAIL_ID}
        className="text-body-sm font-semibold text-base-content"
      >
        {hackathon_alert_label({}, { locale })}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={EMAIL_ID}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setTyped(event.target.value);
            if (error) setError(null);
          }}
          placeholder={email_label({}, { locale })}
          aria-invalid={error !== null}
          aria-describedby={CONSENT_ID}
          className="bg-base-100 sm:flex-1"
          disabled={join.isPending}
          required
        />
        <button
          type="submit"
          className="btn btn-primary btn-xs sm:btn-sm md:btn-md"
          disabled={join.isPending || !isVerified}
        >
          {join.isPending
            ? hero_waitlist_submitting({}, { locale })
            : hero_waitlist_submit({}, { locale })}
        </button>
      </div>
      {sitekey && !isBypassed && (
        <Turnstile
          sitekey={sitekey}
          action="join_hackathon_interest"
          appearance="interaction-only"
          language={locale}
          resetKey={turnstileResetKey}
          onToken={setTurnstileToken}
        />
      )}
      {error && <StatusMessage variant="error">{error}</StatusMessage>}
      <p id={CONSENT_ID} className="text-caption leading-5 text-neutral">
        {beforePrivacy}
        <Link
          {...localizedLanding(locale, 'privacy')}
          className="font-medium underline underline-offset-2 hover:text-primary"
        >
          {hackathon_alert_privacy({}, { locale })}
        </Link>
        {afterPrivacy}
      </p>
    </form>
  );
};
