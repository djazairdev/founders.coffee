import { Building2, Plus } from 'lucide-react';

import {
  org_profile_create,
  org_profile_empty,
  type Locale,
} from '@founders-coffee/i18n';

export const OrganisationProfileEmpty = ({
  locale,
  onCreate,
}: {
  locale: Locale;
  onCreate: () => void;
}) => (
  <div className="flex min-h-80 flex-col items-center justify-center gap-6 rounded-box bg-base-200 px-5 py-12 text-center">
    <Building2 className="size-12 text-primary" aria-hidden="true" />
    <p>{org_profile_empty({}, { locale })}</p>
    <button
      type="button"
      className="btn btn-primary btn-xs sm:btn-sm md:btn-md lg:btn-lg"
      onClick={onCreate}
    >
      <Plus className="size-5" aria-hidden="true" />
      {org_profile_create({}, { locale })}
    </button>
  </div>
);
