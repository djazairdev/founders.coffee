import { Link } from '@tanstack/react-router';

import {
  hackathon_create,
  org_hackathon_dates,
  org_hackathon_saved,
  org_hackathons_empty,
  org_hackathons_heading,
  type Locale,
} from '@founders-coffee/i18n';
import { StatusMessage } from '@founders-coffee/ui';

import { localizedHackathonCreate } from '../../../lib/locale-routing';
import { hackathonStatusLabel } from '../hackathon-labels';
import { rosterDate } from '../roster-labels';
import type { OrganisationHackathon } from '../types';

export const OrganisationHackathonList = ({
  slug,
  hackathons,
  canCreate,
  savedId,
  locale,
  timeZone,
}: {
  slug: string;
  hackathons: readonly OrganisationHackathon[];
  canCreate: boolean;
  savedId: string | null;
  locale: Locale;
  timeZone: string;
}) => (
  <section
    aria-labelledby="org-hackathons-heading"
    className="rounded-box border border-base-300 bg-base-100 p-5 md:p-6"
  >
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="org-hackathons-heading" className="font-display text-h4">
        {org_hackathons_heading({}, { locale })}
      </h2>
      {canCreate ? (
        <Link
          {...localizedHackathonCreate(locale, slug)}
          className="btn btn-primary btn-xs sm:btn-sm md:btn-md"
        >
          {hackathon_create({}, { locale })}
        </Link>
      ) : null}
    </div>
    {savedId && hackathons.some((hackathon) => hackathon.id === savedId) ? (
      <StatusMessage variant="success" className="mt-3">
        {org_hackathon_saved({}, { locale })}
      </StatusMessage>
    ) : null}
    {hackathons.length === 0 ? (
      <p className="mt-3 text-body-sm text-neutral">
        {org_hackathons_empty({}, { locale })}
      </p>
    ) : (
      <ul className="mt-3">
        {hackathons.map((hackathon) => (
          <li
            key={hackathon.id}
            className="border-b border-base-200 py-3 last:border-b-0"
          >
            <p className="flex flex-wrap items-center gap-2 text-body-sm font-medium">
              <bdi className="min-w-0 break-words">{hackathon.title}</bdi>
              <span className="badge badge-ghost badge-sm">
                {hackathonStatusLabel(hackathon.status, locale)}
              </span>
            </p>
            <p className="mt-0.5 text-caption text-neutral">
              {hackathon.endsAt
                ? org_hackathon_dates(
                    {
                      start: rosterDate(hackathon.startsAt, locale, timeZone),
                      end: rosterDate(hackathon.endsAt, locale, timeZone),
                    },
                    { locale },
                  )
                : rosterDate(hackathon.startsAt, locale, timeZone)}
            </p>
          </li>
        ))}
      </ul>
    )}
  </section>
);
