import {
  organisationStatusSchema,
  type OrganisationStatus,
} from '@founders-coffee/core';

export type OrganisationReviewSearch = {
  readonly status: OrganisationStatus;
  readonly page: number;
};

/** The queue's status and page from the address, falling back to the first page of pending ones. */
export const readOrganisationReviewSearch = (
  search: Record<string, unknown>,
): OrganisationReviewSearch => {
  const status = organisationStatusSchema.safeParse(search.status);
  const page = Number(search.page);
  return {
    status: status.success ? status.data : 'pending',
    page: Number.isInteger(page) && page > 0 && page <= 1000 ? page : 0,
  };
};
