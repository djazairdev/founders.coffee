import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import {
  hackathon_certificate_title_judge,
  hackathon_certificate_title_participant,
  hackathon_certificate_title_winner,
  hackathon_certificates_copied,
  hackathon_certificates_copy,
  hackathon_certificates_copy_failed,
  hackathon_certificates_copy_short,
  hackathon_certificates_heading,
  hackathon_certificates_view,
  type Locale,
} from '@founders-coffee/i18n';
import { Button, StatusMessage } from '@founders-coffee/ui';

import { localizedCertificate } from '../../../lib/locale-routing';
import type { OwnCertificate } from '../api';

const TITLE = {
  participant: hackathon_certificate_title_participant,
  winner: hackathon_certificate_title_winner,
  judge: hackathon_certificate_title_judge,
};

export const HackathonCertificates = ({
  certificates,
  locale,
}: {
  certificates: readonly OwnCertificate[];
  locale: Locale;
}) => {
  const options = { locale };
  const [copied, setCopied] = useState<string | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  if (certificates.length === 0) return null;
  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/${locale}/c/${encodeURIComponent(code)}`,
      );
      setCopied(code);
      setHasFailed(false);
    } catch {
      setCopied(null);
      setHasFailed(true);
    }
  };
  return (
    <section aria-labelledby="hackathon-certificates-heading" className="mt-6">
      <h2 id="hackathon-certificates-heading" className="font-display text-h4">
        {hackathon_certificates_heading({}, options)}
      </h2>
      <ul className="mt-2 grid gap-3">
        {certificates.map(({ code, kind, placement }) => {
          const title = TITLE[kind]({}, options);
          return (
            <li key={code} className="min-w-0">
              <p className="font-medium">{title}</p>
              {placement ? (
                <p className="text-body-sm text-neutral">
                  <bdi className="break-words">{placement}</bdi>
                </p>
              ) : null}
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <Link
                  {...localizedCertificate(locale, code)}
                  aria-label={title}
                  className="link text-body-sm"
                >
                  {hackathon_certificates_view({}, options)}
                </Link>
                <Button
                  variant="outline"
                  aria-label={hackathon_certificates_copy({ title }, options)}
                  onClick={() => void copy(code)}
                >
                  {copied === code
                    ? hackathon_certificates_copied({}, options)
                    : hackathon_certificates_copy_short({}, options)}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      {hasFailed ? (
        <StatusMessage variant="error" className="mt-3">
          {hackathon_certificates_copy_failed({}, options)}
        </StatusMessage>
      ) : null}
    </section>
  );
};
