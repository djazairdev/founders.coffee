import { Link } from '@tanstack/react-router';

import { hackathon_dashboard_judges, type Locale } from '@founders-coffee/i18n';

import { HostFace } from '../../../components/events/HostFace';
import { localizedPublicProfile } from '../../../lib/locale-routing';
import type { HackathonJudgeView } from '../api';

const HEADING_ID = 'hackathon-judges-heading';

export const HackathonJudges = ({
  judges,
  locale,
}: {
  judges: readonly HackathonJudgeView[];
  locale: Locale;
}) => (
  <section aria-labelledby={HEADING_ID} className="mt-8">
    <h2 id={HEADING_ID} className="font-display text-h4 font-semibold">
      {hackathon_dashboard_judges({}, { locale })}
    </h2>
    <ul className="mt-4 grid gap-3 sm:grid-cols-2">
      {judges.map((judge) => (
        <li key={judge.userId}>
          <Link
            {...localizedPublicProfile(locale, judge.userId)}
            className="flex min-w-0 items-center gap-3 rounded-box border border-base-300 bg-base-100 p-3 font-medium hover:border-secondary"
          >
            <HostFace name={judge.name} photoAssetId={judge.photoAssetId} />
            <bdi className="min-w-0 break-words">{judge.name}</bdi>
          </Link>
        </li>
      ))}
    </ul>
  </section>
);
