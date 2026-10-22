export type HackathonReviewSearch = { readonly page: number };

/** The queue's page from the address, falling back to the first. */
export const readHackathonReviewSearch = (
  search: Record<string, unknown>,
): HackathonReviewSearch => {
  const page = Number(search.page);
  return {
    page: Number.isInteger(page) && page > 0 && page <= 1000 ? page : 0,
  };
};
