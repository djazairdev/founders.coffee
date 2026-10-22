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

import { RegionCitySelects } from '../../../components/geo/RegionCitySelects';
import type { RootMarket } from '../../markets/api';
import { ApplicationField } from './ApplicationField';

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
}) => (
  <>
    <ApplicationField
      id="organisation-market"
      label={org_apply_market({}, { locale })}
      optionalLabel={optional({}, { locale })}
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
    <RegionCitySelects
      cityCode={cityCode}
      cityId="organisation-city"
      cityNote={isCityInvalid ? org_apply_error_city({}, { locale }) : null}
      cityRef={cityRef}
      isCityInvalid={isCityInvalid}
      isDisabled={isDisabled}
      isOptional
      labels={{
        region: org_apply_state({}, { locale }),
        city: org_apply_city({}, { locale }),
        noRegion: org_apply_state_none({}, { locale }),
        noCity: org_apply_city_none({}, { locale }),
        optional: optional({}, { locale }),
      }}
      locale={locale}
      marketCode={marketCode}
      onCity={(city) => onCity(city?.code ?? '')}
      onState={onState}
      regionId="organisation-state"
      stateCode={stateCode}
    />
  </>
);
