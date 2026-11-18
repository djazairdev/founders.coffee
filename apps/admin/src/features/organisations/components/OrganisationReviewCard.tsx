import {
  admin_org_applied_on,
  admin_org_last_note,
  admin_org_market,
  admin_org_no_owner,
  admin_org_owner,
  admin_org_reviewed_on,
  admin_org_website,
  formatDate,
  organisation_kind_club,
  organisation_kind_community,
  organisation_kind_company,
  organisation_kind_platform,
  organisation_kind_university,
  type Locale,
} from '@founders-coffee/i18n';
import type { OrganisationKind } from '@founders-coffee/core';

import type { OrganisationReviewItem } from '../api';
import type { OrganisationDecision } from '../decisions';
import { OrganisationDecisionForm } from './OrganisationDecisionForm';

const KINDS: Record<OrganisationKind, typeof organisation_kind_club> = {
  club: organisation_kind_club,
  university: organisation_kind_university,
  community: organisation_kind_community,
  company: organisation_kind_company,
  platform: organisation_kind_platform,
};

export const OrganisationReviewCard = ({
  locale,
  item,
  isDeciding,
  onDecide,
}: {
  locale: Locale;
  item: OrganisationReviewItem;
  isDeciding: boolean;
  onDecide: (decision: OrganisationDecision, note: string) => void;
}) => {
  const dateOf = (date: Date) =>
    formatDate(new Date(date), locale, {
      timeZone: item.timeZone,
      dateStyle: 'medium',
    });
  return (
    <li className="space-y-3 rounded-box border border-base-300 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-h4 font-medium">
          <bdi>{item.name}</bdi>
        </h2>
        <span className="badge badge-ghost">
          {KINDS[item.kind]({}, { locale })}
        </span>
      </div>
      <p className="whitespace-pre-line text-body-sm">
        <bdi>{item.description}</bdi>
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body-sm">
        <dt className="text-neutral">{admin_org_owner({}, { locale })}</dt>
        <dd>
          {item.ownerName ? (
            <bdi>{item.ownerName}</bdi>
          ) : (
            admin_org_no_owner({}, { locale })
          )}
        </dd>
        <dt className="text-neutral">{admin_org_market({}, { locale })}</dt>
        <dd>
          <bdi>{item.marketCode}</bdi>
        </dd>
        {item.websiteUrl ? (
          <>
            <dt className="text-neutral">
              {admin_org_website({}, { locale })}
            </dt>
            <dd className="min-w-0">
              <a
                className="link break-all"
                dir="ltr"
                href={item.websiteUrl}
                rel="noopener noreferrer nofollow"
                target="_blank"
              >
                {item.websiteUrl}
              </a>
            </dd>
          </>
        ) : null}
      </dl>
      <p className="text-caption text-neutral">
        {admin_org_applied_on({ date: dateOf(item.createdAt) }, { locale })}
        {item.reviewedAt ? (
          <>
            {' · '}
            {admin_org_reviewed_on(
              { date: dateOf(item.reviewedAt) },
              { locale },
            )}
          </>
        ) : null}
      </p>
      {item.reviewNote ? (
        <div className="rounded-box bg-base-200 p-3 text-body-sm">
          <p className="text-caption text-neutral">
            {admin_org_last_note({}, { locale })}
          </p>
          <p className="whitespace-pre-line">
            <bdi>{item.reviewNote}</bdi>
          </p>
        </div>
      ) : null}
      <OrganisationDecisionForm
        isDeciding={isDeciding}
        locale={locale}
        onDecide={onDecide}
        status={item.status}
      />
    </li>
  );
};
