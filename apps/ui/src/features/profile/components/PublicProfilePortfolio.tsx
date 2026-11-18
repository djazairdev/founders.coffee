import {
  profile_open_to_label,
  profile_skills_label,
  type Locale,
} from '@founders-coffee/i18n';

import type { PublicProfile } from '../api';
import { openToLabel } from '../portfolio-labels';
import { skillLabel } from '../skill-labels';

export const PublicProfilePortfolio = ({
  locale,
  profile,
}: {
  locale: Locale;
  profile: PublicProfile;
}) => {
  const groups = [
    {
      key: 'skills',
      title: profile_skills_label({}, { locale }),
      labels: profile.skills.map((skill) => skillLabel(skill, locale)),
    },
    {
      key: 'open-to',
      title: profile_open_to_label({}, { locale }),
      labels: profile.openTo.map((openTo) => openToLabel(openTo, locale)),
    },
  ].filter((group) => group.labels.length > 0);

  return groups.length > 0 ? (
    <dl className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group.key}>
          <dt className="eyebrow">{group.title}</dt>
          <dd>
            <ul className="mt-1.5 flex flex-wrap gap-2">
              {group.labels.map((label) => (
                <li
                  key={label}
                  className="rounded-full bg-base-100 px-3 py-1 text-body-sm"
                >
                  {label}
                </li>
              ))}
            </ul>
          </dd>
        </div>
      ))}
    </dl>
  ) : null;
};
