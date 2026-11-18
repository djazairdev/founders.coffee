import { Link } from '@tanstack/react-router';

import {
  hackathon_mentor_helps_with,
  hackathon_mentor_office_hours,
  hackathon_mentors_heading,
  type Locale,
} from '@founders-coffee/i18n';

import { HostFace } from '../../../components/events/HostFace';
import { localizedPublicProfile } from '../../../lib/locale-routing';
import type { HackathonMentorView } from '../api';

const HEADING_ID = 'hackathon-mentors-heading';

const Note = ({ label, value }: { label: string; value: string | null }) =>
  value ? (
    <div className="grid gap-0.5">
      <dt className="text-caption text-neutral">{label}</dt>
      <dd className="text-body-sm whitespace-pre-line break-words">
        <bdi>{value}</bdi>
      </dd>
    </div>
  ) : null;

export const HackathonMentors = ({
  mentors,
  locale,
}: {
  mentors: readonly HackathonMentorView[];
  locale: Locale;
}) => {
  const options = { locale };
  return (
    <section aria-labelledby={HEADING_ID} className="mt-8">
      <h2 id={HEADING_ID} className="font-display text-h4 font-semibold">
        {hackathon_mentors_heading({}, options)}
      </h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {mentors.map((mentor) => (
          <li
            key={mentor.userId}
            className="grid gap-3 rounded-box border border-base-300 bg-base-100 p-3"
          >
            <Link
              {...localizedPublicProfile(locale, mentor.userId)}
              className="flex min-w-0 items-center gap-3 font-medium hover:text-secondary"
            >
              <HostFace name={mentor.name} photoAssetId={mentor.photoAssetId} />
              <bdi className="min-w-0 break-words">{mentor.name}</bdi>
            </Link>
            <dl className="grid gap-2">
              <Note
                label={hackathon_mentor_helps_with({}, options)}
                value={mentor.helpsWith}
              />
              <Note
                label={hackathon_mentor_office_hours({}, options)}
                value={mentor.officeHours}
              />
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
};
