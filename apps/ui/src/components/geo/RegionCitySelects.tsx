import type { Ref } from 'react';

import type { geo } from '@founders-coffee/domain';
import { localizedName, type Locale } from '@founders-coffee/i18n';
import { Select } from '@founders-coffee/ui';

import { useMarketStates, useStateCities } from '../../features/geo/hooks';

type Labels = {
  region: string;
  city: string;
  noRegion: string;
  noCity: string;
  optional?: string;
};

export const RegionCitySelects = ({
  locale,
  marketCode,
  regionId,
  cityId,
  labels,
  isOptional,
  stateCode,
  cityCode,
  cityNote,
  isCityInvalid = false,
  isDisabled = false,
  cityRef,
  onState,
  onCity,
}: {
  locale: Locale;
  marketCode: string;
  regionId: string;
  cityId: string;
  labels: Labels;
  isOptional: boolean;
  stateCode: string;
  cityCode: string;
  cityNote?: string | null;
  isCityInvalid?: boolean;
  isDisabled?: boolean;
  cityRef?: Ref<HTMLSelectElement>;
  onState: (stateCode: string) => void;
  onCity: (city: geo.GeoCity | null) => void;
}) => {
  const states = useMarketStates(marketCode);
  const cities = useStateCities(marketCode, stateCode);
  const label = (id: string, text: string) => (
    <label className="text-label" htmlFor={id}>
      {text}
      {isOptional && labels.optional ? (
        <span className="ms-1.5 text-neutral">
          ({labels.optional.toLowerCase()})
        </span>
      ) : null}
    </label>
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        {label(regionId, labels.region)}
        <Select
          className="mt-1.5"
          disabled={isDisabled || !states.data}
          id={regionId}
          onChange={(event) => onState(event.target.value)}
          value={stateCode}
        >
          <option disabled={!isOptional} value="">
            {labels.noRegion}
          </option>
          {(states.data ?? []).map((state) => (
            <option key={state.code} value={state.code}>
              {localizedName(state, locale)}
            </option>
          ))}
        </Select>
      </div>
      <div>
        {label(cityId, labels.city)}
        <Select
          aria-describedby={cityNote ? `${cityId}-note` : undefined}
          aria-invalid={isCityInvalid || undefined}
          className="mt-1.5"
          disabled={isDisabled || !stateCode || !cities.data}
          id={cityId}
          onChange={(event) =>
            onCity(
              cities.data?.find((city) => city.code === event.target.value) ??
                null,
            )
          }
          ref={cityRef}
          value={cityCode}
        >
          <option disabled={!isOptional} value="">
            {labels.noCity}
          </option>
          {(cities.data ?? []).map((city) => (
            <option key={city.code} value={city.code}>
              {localizedName(city, locale)}
            </option>
          ))}
        </Select>
        {cityNote ? (
          <p
            className={`mt-1.5 text-body-sm ${isCityInvalid ? 'text-error' : 'text-neutral'}`}
            id={`${cityId}-note`}
          >
            {cityNote}
          </p>
        ) : null}
      </div>
    </div>
  );
};
