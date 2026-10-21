import {
  localizedName,
  optional,
  org_apply_city,
  org_apply_city_none,
  org_apply_error_city,
  org_apply_market,
  org_apply_state,
  org_apply_state_none,
  type Locale,
} from '@founders-coffee/i18n';
import { Select } from '@founders-coffee/ui';

import type { RootMarket } from '../../markets/api';
import { useMarketStates, useStateCities } from '../../geo/hooks';
import { ApplicationField, fieldNoteId } from './ApplicationField';

export const OrganisationLocationFields = ({
  locale,
  markets,
  marketCode,
  stateCode,
  cityCode,
  isCityInvalid,
  isDisabled,
  cityRef,
  onMarket,
  onState,
  onCity,
}: {
  locale: Locale;
  markets: readonly RootMarket[];
  marketCode: string;
  stateCode: string;
  cityCode: string;
  isCityInvalid: boolean;
  isDisabled: boolean;
  cityRef: (element: HTMLSelectElement | null) => void;
  onMarket: (marketCode: string) => void;
  onState: (stateCode: string) => void;
  onCity: (cityCode: string) => void;
}) => {
  const states = useMarketStates(marketCode);
  const cities = useStateCities(marketCode, stateCode);
  const optionalLabel = optional({}, { locale });
  return (
    <>
      <ApplicationField
        id="organisation-market"
        label={org_apply_market({}, { locale })}
        optionalLabel={optionalLabel}
      >
        <Select
          disabled={isDisabled}
          id="organisation-market"
          onChange={(event) => onMarket(event.target.value)}
          value={marketCode}
        >
          {markets.map((market) => (
            <option key={market.code} value={market.code}>
              {localizedName(market, locale)}
            </option>
          ))}
        </Select>
      </ApplicationField>
      <div className="grid gap-4 sm:grid-cols-2">
        <ApplicationField
          id="organisation-state"
          isOptional
          label={org_apply_state({}, { locale })}
          optionalLabel={optionalLabel}
        >
          <Select
            disabled={isDisabled || !states.data}
            id="organisation-state"
            onChange={(event) => onState(event.target.value)}
            value={stateCode}
          >
            <option value="">{org_apply_state_none({}, { locale })}</option>
            {(states.data ?? []).map((state) => (
              <option key={state.code} value={state.code}>
                {localizedName(state, locale)}
              </option>
            ))}
          </Select>
        </ApplicationField>
        <ApplicationField
          error={isCityInvalid ? org_apply_error_city({}, { locale }) : null}
          id="organisation-city"
          isOptional
          label={org_apply_city({}, { locale })}
          optionalLabel={optionalLabel}
        >
          <Select
            aria-describedby={
              isCityInvalid ? fieldNoteId('organisation-city') : undefined
            }
            aria-invalid={isCityInvalid || undefined}
            disabled={isDisabled || !stateCode || !cities.data}
            id="organisation-city"
            onChange={(event) => onCity(event.target.value)}
            ref={cityRef}
            value={cityCode}
          >
            <option value="">{org_apply_city_none({}, { locale })}</option>
            {(cities.data ?? []).map((city) => (
              <option key={city.code} value={city.code}>
                {localizedName(city, locale)}
              </option>
            ))}
          </Select>
        </ApplicationField>
      </div>
    </>
  );
};
