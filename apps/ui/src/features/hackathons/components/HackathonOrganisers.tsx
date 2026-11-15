import { Link } from '@tanstack/react-router';
import { ArrowRight, FolderCheck, Trophy, Users } from 'lucide-react';

import {
  hackathon_organisers_apply,
  hackathon_organisers_intro,
  hackathon_organisers_judging_body,
  hackathon_organisers_judging_title,
  hackathon_organisers_label,
  hackathon_organisers_registration_body,
  hackathon_organisers_registration_title,
  hackathon_organisers_submissions_body,
  hackathon_organisers_submissions_title,
  hackathon_organisers_title,
  type Locale,
} from '@founders-coffee/i18n';

const FEATURES = [
  {
    key: 'registration',
    icon: Users,
    title: hackathon_organisers_registration_title,
    body: hackathon_organisers_registration_body,
  },
  {
    key: 'submissions',
    icon: FolderCheck,
    title: hackathon_organisers_submissions_title,
    body: hackathon_organisers_submissions_body,
  },
  {
    key: 'judging',
    icon: Trophy,
    title: hackathon_organisers_judging_title,
    body: hackathon_organisers_judging_body,
  },
] as const;

export const HackathonOrganisers = ({
  locale,
  isEnabled,
}: {
  locale: Locale;
  isEnabled: boolean;
}) => {
  if (!isEnabled) return null;

  return (
    <section
      aria-labelledby="hackathon-organisers-title"
      className="mx-auto max-w-content px-4 pt-10 md:px-8 md:pt-14"
    >
      <div className="rounded-box border border-base-300 bg-base-200 p-5 sm:p-8 md:p-10">
        <header className="text-center">
          <p className="text-body-sm font-semibold text-accent">
            {hackathon_organisers_label({}, { locale })}
          </p>
          <h2
            id="hackathon-organisers-title"
            className="mx-auto mt-4 max-w-4xl font-display text-h3 leading-snug font-bold tracking-tight text-balance text-base-content md:text-h2 lg:text-h1"
          >
            {hackathon_organisers_title({}, { locale })}
          </h2>
          <p className="mx-auto mt-3 max-w-3xl text-body-sm leading-relaxed text-pretty text-base-content/80 md:text-body">
            {hackathon_organisers_intro({}, { locale })}
          </p>
          <Link
            to="/$locale/profile/organisations"
            params={{ locale }}
            className="btn btn-secondary btn-xs sm:btn-sm md:btn-md lg:btn-lg mt-6 w-full max-w-64 rounded-full border-0 font-semibold shadow-none"
          >
            {hackathon_organisers_apply({}, { locale })}
            <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
          </Link>
        </header>

        <ul className="mt-8 grid gap-3 text-start md:mt-10 md:grid-cols-3 md:gap-4">
          {FEATURES.map(({ key, icon: Icon, title, body }) => (
            <li
              key={key}
              className="flex items-start gap-4 rounded-box border border-base-300 bg-base-100 p-4 md:flex-col md:gap-5 md:p-6"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-base-200 text-secondary">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-body-lg font-semibold text-base-content">
                  {title({}, { locale })}
                </h3>
                <p className="mt-1 text-body-sm leading-relaxed text-base-content/80">
                  {body({}, { locale })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
