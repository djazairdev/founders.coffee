import {
  formatDate,
  hackathon_certificate_dates,
  hackathon_certificate_heading,
  hackathon_certificate_organised_by,
  hackathon_certificate_revoked,
  hackathon_certificate_statement_judge,
  hackathon_certificate_statement_participant,
  hackathon_certificate_statement_winner,
  hackathon_certificate_title_judge,
  hackathon_certificate_title_participant,
  hackathon_certificate_title_winner,
  hackathon_certificate_unknown,
  hackathon_certificate_verified,
  type Locale,
} from '@founders-coffee/i18n';
import { StatusMessage } from '@founders-coffee/ui';

import type { CertificatePage } from '../api';

const TITLE = {
  participant: hackathon_certificate_title_participant,
  winner: hackathon_certificate_title_winner,
  judge: hackathon_certificate_title_judge,
};

const STATEMENT = {
  participant: hackathon_certificate_statement_participant,
  winner: hackathon_certificate_statement_winner,
  judge: hackathon_certificate_statement_judge,
};

export const HackathonCertificatePage = ({
  certificate,
  locale,
}: {
  certificate: CertificatePage;
  locale: Locale;
}) => {
  const options = { locale };
  if (certificate.status !== 'valid')
    return (
      <section className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="font-display text-h3">
          {hackathon_certificate_heading({}, options)}
        </h1>
        <StatusMessage
          variant={certificate.status === 'revoked' ? 'error' : 'info'}
          className="mt-4"
        >
          {certificate.status === 'revoked'
            ? hackathon_certificate_revoked({}, options)
            : hackathon_certificate_unknown({}, options)}
        </StatusMessage>
      </section>
    );

  const day = (at: number) =>
    formatDate(new Date(at), locale, {
      timeZone: certificate.timeZone,
      hour12: false,
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  const start = day(certificate.startsAt);
  const end = certificate.endsAt === null ? start : day(certificate.endsAt);
  return (
    <section className="certificate-sheet mx-4 my-8 grid gap-4 rounded-box border border-base-300 px-5 py-10 text-center md:mx-auto md:max-w-3xl md:px-12">
      <p className="text-caption font-medium text-neutral">
        {hackathon_certificate_verified({}, options)}
      </p>
      <h1 className="font-display text-h4">
        {TITLE[certificate.kind]({}, options)}
      </h1>
      <p className="font-display text-h2 break-words">
        <bdi>{certificate.memberName}</bdi>
      </p>
      <p className="text-body-sm text-neutral">
        {STATEMENT[certificate.kind]({}, options)}
      </p>
      <p className="font-display text-h4 break-words">
        <bdi>{certificate.hackathonTitle}</bdi>
      </p>
      {certificate.placement ? (
        <p className="font-medium break-words">
          <bdi>{certificate.placement}</bdi>
        </p>
      ) : null}
      <p className="text-body-sm text-neutral">
        {start === end
          ? start
          : hackathon_certificate_dates({ start, end }, options)}
      </p>
      {certificate.organisers.length > 0 ? (
        <p className="text-body-sm text-neutral">
          {hackathon_certificate_organised_by({}, options)}{' '}
          {certificate.organisers.map((name, index) => (
            <span key={name}>
              {index > 0 ? ' · ' : null}
              <bdi>{name}</bdi>
            </span>
          ))}
        </p>
      ) : null}
    </section>
  );
};
