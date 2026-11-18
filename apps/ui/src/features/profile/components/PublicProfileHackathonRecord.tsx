import { Link } from '@tanstack/react-router';

import {
  profile_hackathon_record_certificate,
  profile_hackathon_record_judge,
  profile_hackathon_record_label,
  profile_hackathon_record_participant,
  profile_hackathon_record_project,
  profile_hackathon_record_winner,
  type Locale,
} from '@founders-coffee/i18n';

import {
  localizedCertificate,
  localizedEvent,
  localizedProject,
} from '../../../lib/locale-routing';
import type { PublicProfile } from '../api';

const KIND = {
  participant: profile_hackathon_record_participant,
  winner: profile_hackathon_record_winner,
  judge: profile_hackathon_record_judge,
};

export const PublicProfileHackathonRecord = ({
  locale,
  profile,
}: {
  locale: Locale;
  profile: PublicProfile;
}) => {
  const options = { locale };
  if (profile.hackathonRecord.length === 0) return null;
  return (
    <div>
      <h2 className="eyebrow">{profile_hackathon_record_label({}, options)}</h2>
      <ul className="mt-1.5 grid gap-3">
        {profile.hackathonRecord.map((entry) => (
          <li key={entry.certificateCode} className="min-w-0">
            <Link
              {...localizedEvent(locale, entry.marketSlug, entry.slug)}
              className="link font-medium break-words"
            >
              <bdi>{entry.title}</bdi>
            </Link>
            <p className="text-body-sm text-neutral">
              {KIND[entry.kind]({}, options)}
              {entry.placements.map((placement) => (
                <span key={placement}>
                  {' · '}
                  <bdi>{placement}</bdi>
                </span>
              ))}
            </p>
            <p className="flex flex-wrap gap-x-3 text-body-sm">
              {entry.projectSlug ? (
                <Link
                  {...localizedProject(locale, entry.projectSlug)}
                  className="link"
                >
                  {profile_hackathon_record_project({}, options)}
                </Link>
              ) : null}
              <Link
                {...localizedCertificate(locale, entry.certificateCode)}
                className="link"
              >
                {profile_hackathon_record_certificate({}, options)}
              </Link>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};
