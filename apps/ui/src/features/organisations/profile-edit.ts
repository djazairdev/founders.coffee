import { organisations } from '@founders-coffee/domain';

import type { OrganisationView } from './api';

export type OrganisationDraft = {
  name: string;
  description: string;
  websiteUrl: string;
};

export const organisationDraftFrom = (
  organisation: OrganisationView,
): OrganisationDraft => ({
  name: organisation.name,
  description: organisation.description,
  websiteUrl: organisation.websiteUrl ?? '',
});

/** Reuse the server contract, accepting a website with or without its scheme. */
export const organisationEditFrom = (draft: OrganisationDraft) => {
  const url = draft.websiteUrl.trim();
  return organisations.organisationEditSchema.safeParse({
    ...draft,
    websiteUrl: !url
      ? null
      : /^[a-z][a-z0-9+.-]*:/iu.test(url)
        ? url
        : `https://${url}`,
  });
};
