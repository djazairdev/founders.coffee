import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import type { geo } from '@founders-coffee/domain';

import { geoApi } from './api';

/** Debounce a value by `delayMs` (one render lag) — used to coalesce typeahead keystrokes. */
export const useDebouncedValue = <T>(value: T, delayMs: number): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
};

/**
 * Free-text city typeahead for the hero search (matches city OR state name). Debounced 250ms;
 * `keepPreviousData` holds the prior results visible while the next query loads so the dropdown
 * doesn't flicker between keystrokes. Disabled on empty query (no search until the user types).
 */
export const useCitySearch = (marketCode: string, query: string) => {
  const debounced = useDebouncedValue(query, 250);
  return useQuery({
    queryKey: ['geo', 'search', marketCode, debounced],
    queryFn: () =>
      geoApi.searchCities({ data: { marketCode, query: debounced } }),
    enabled: debounced.trim().length > 0,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
};

/**
 * Cities matching what a host typed into the wizard's venue search, which debounces it already.
 *
 * Ranked as the hero search ranks them, a city's own name before its wilaya's, and asked for a few
 * at a time: they share a panel with the cafés, and a host after a town types enough of its name.
 */
export const useCitySuggestions = (
  marketCode: string,
  query: string,
  limit: number,
) =>
  useQuery<readonly geo.CitySearchResult[]>({
    queryKey: ['geo', 'suggest', marketCode, query, limit],
    queryFn: () => geoApi.searchCities({ data: { marketCode, query, limit } }),
    enabled: query.trim().length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

/** A market's states, for a form that asks for a state and then one of its cities. */
export const useMarketStates = (marketCode: string) =>
  useQuery<readonly geo.GeoState[]>({
    queryKey: ['geo', 'states', marketCode],
    queryFn: () => geoApi.getStates({ data: { country: marketCode } }),
    enabled: marketCode.length > 0,
    staleTime: Infinity,
  });

/** The cities of one state, asked for once a state is chosen. */
export const useStateCities = (marketCode: string, stateCode: string) =>
  useQuery<readonly geo.GeoCity[]>({
    queryKey: ['geo', 'cities', marketCode, stateCode],
    queryFn: () =>
      geoApi.getCities({ data: { country: marketCode, state: stateCode } }),
    enabled: marketCode.length > 0 && stateCode.length > 0,
    staleTime: Infinity,
  });
