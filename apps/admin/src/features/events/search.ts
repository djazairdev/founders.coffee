export type EventCoHostSearch = { readonly event?: string };

const REFERENCE_MAX_LENGTH = 500;

/** The event the operator named in the address, if any: trimmed, and dropped when blank or too long. */
export const readEventCoHostSearch = (
  search: Record<string, unknown>,
): EventCoHostSearch => {
  const event = typeof search.event === 'string' ? search.event.trim() : '';
  return event.length > 0 && event.length <= REFERENCE_MAX_LENGTH
    ? { event }
    : {};
};
