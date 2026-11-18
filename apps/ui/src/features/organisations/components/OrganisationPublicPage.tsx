import { ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  org_page_no_past,
  org_page_no_upcoming,
  org_page_past,
  org_page_upcoming,
  org_page_website,
  type Locale,
} from '@founders-coffee/i18n';
import { Badge, IsolatedLines } from '@founders-coffee/ui';

import type { RootMarket } from '../../markets/api';
import type { OrganisationPage } from '../api';
import { organisationKindLabel } from '../kind-labels';
import { OrganisationEventList } from './OrganisationEventList';

export const OrganisationPublicPage = ({
  locale,
  page,
  markets,
  manageLink = null,
}: {
  locale: Locale;
  page: OrganisationPage;
  markets: readonly RootMarket[];
  manageLink?: ReactNode;
}) => {
  const { organisation } = page;
  const website = org_page_website({}, { locale });

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <article
        aria-labelledby="organisation-title"
        className="rounded-box bg-base-200 p-5 sm:p-8"
      >
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col items-start gap-2">
            {organisation.logo && (
              <img
                src={organisation.logo}
                alt=""
                width={80}
                height={80}
                className="size-20 rounded-box object-contain"
              />
            )}
            <Badge variant="outline" size="sm" className="font-medium">
              {organisationKindLabel(organisation.kind, locale)}
            </Badge>
            <h1
              id="organisation-title"
              className="font-display text-h2 font-semibold break-words"
            >
              <bdi>{organisation.name}</bdi>
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {manageLink}
            {organisation.websiteUrl ? (
              <a
                href={organisation.websiteUrl}
                target="_blank"
                rel="noopener noreferrer nofollow ugc"
                aria-label={`${website}: ${organisation.websiteUrl}`}
                className="btn btn-outline btn-xs shrink-0 self-start sm:btn-sm md:btn-md"
              >
                <span>{website}</span>
                <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            ) : null}
          </div>
        </header>
        <p className="mt-5 max-w-prose whitespace-pre-line break-words text-body-lg">
          <IsolatedLines text={organisation.description} />
        </p>
      </article>

      <OrganisationEventList
        id="organisation-upcoming"
        title={org_page_upcoming({}, { locale })}
        emptyText={org_page_no_upcoming({}, { locale })}
        events={page.upcoming}
        locale={locale}
        markets={markets}
      />
      <OrganisationEventList
        id="organisation-past"
        title={org_page_past({}, { locale })}
        emptyText={org_page_no_past({}, { locale })}
        events={page.past}
        locale={locale}
        markets={markets}
      />
    </section>
  );
};
