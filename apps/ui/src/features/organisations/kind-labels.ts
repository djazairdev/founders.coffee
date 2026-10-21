import {
  organisation_kind_club,
  organisation_kind_community,
  organisation_kind_company,
  organisation_kind_university,
} from '@founders-coffee/i18n';

import type { ApplicantKind } from './application';

export const KIND_LABELS: Record<ApplicantKind, typeof organisation_kind_club> =
  {
    club: organisation_kind_club,
    university: organisation_kind_university,
    community: organisation_kind_community,
    company: organisation_kind_company,
  };
