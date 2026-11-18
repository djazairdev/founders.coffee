import { Link } from '@tanstack/react-router';

import {
  formatNumber,
  hackathon_looking_more_people,
  hackathon_looking_people_empty,
  hackathon_looking_people_heading,
  hackathon_team_unnamed,
  type Locale,
} from '@founders-coffee/i18n';

import { localizedPublicProfile } from '../../../lib/locale-routing';
import type { LookingForTeamView } from '../api';

const HEADING_ID = 'hackathon-looking-people-heading';

export const HackathonLookingParticipants = ({
  participants,
  hasMore,
  limit,
  locale,
}: {
  participants: LookingForTeamView['participants'];
  hasMore: boolean;
  limit: number;
  locale: Locale;
}) => (
  <section aria-labelledby={HEADING_ID} className="mt-8">
    <h2 id={HEADING_ID} className="font-display text-h4">
      {hackathon_looking_people_heading({}, { locale })}
    </h2>
    {participants.length === 0 ? (
      <p className="mt-2 text-body-sm text-neutral">
        {hackathon_looking_people_empty({}, { locale })}
      </p>
    ) : (
      <ul className="mt-3 divide-y divide-base-300 rounded-box border border-base-300">
        {participants.map((person) => (
          <li key={person.userId} className="grid gap-1 p-3">
            <Link
              {...localizedPublicProfile(locale, person.userId)}
              className="link link-hover font-medium"
            >
              <bdi className="break-words">
                {person.name || hackathon_team_unnamed({}, { locale })}
              </bdi>
            </Link>
            {person.skills ? (
              <p className="text-body-sm text-neutral">
                <bdi className="break-words">{person.skills}</bdi>
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    )}
    {hasMore ? (
      <p className="mt-2 text-caption text-neutral">
        {hackathon_looking_more_people(
          { count: formatNumber(limit, locale) },
          { locale },
        )}
      </p>
    ) : null}
  </section>
);
