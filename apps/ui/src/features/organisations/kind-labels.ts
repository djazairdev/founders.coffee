import {
  organisation_kind_club,
  organisation_kind_community,
  organisation_kind_company,
  organisation_kind_platform,
  organisation_kind_university,
  type Locale,
} from '@founders-coffee/i18n';
import type { OrganisationKind } from '@founders-coffee/core';

import type { ApplicantKind } from './application';

export const KIND_LABELS: Record<ApplicantKind, typeof organisation_kind_club> =
  {
    club: organisation_kind_club,
    university: organisation_kind_university,
    community: organisation_kind_community,
    company: organisation_kind_company,
  };

/** What kind of organisation this is, in the reader's language, the platform's own included. */
export const organisationKindLabel = (
  kind: OrganisationKind,
  locale: Locale,
): string =>
  (kind === 'platform' ? organisation_kind_platform : KIND_LABELS[kind])(
    {},
    { locale },
  );
