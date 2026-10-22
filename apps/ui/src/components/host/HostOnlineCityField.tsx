import { useState } from 'react';

import type { geo } from '@founders-coffee/domain';
import {
  host_online_city,
  host_online_city_choose,
  host_online_city_hint,
  host_online_region,
  host_online_region_choose,
  type Locale,
} from '@founders-coffee/i18n';

import {
  ONLINE_CITY_ID,
  ONLINE_REGION_ID,
} from '../../features/events/host-create-validation';
import { RegionCitySelects } from '../geo/RegionCitySelects';

export const HostOnlineCityField = ({
  locale,
  marketCode,
  city,
  isDisabled = false,
  onCitySelect,
}: {
  locale: Locale;
  marketCode: string;
  city: geo.GeoCity | null;
  isDisabled?: boolean;
  onCitySelect: (city: geo.GeoCity) => void;
}) => {
  const [region, setRegion] = useState<string | null>(null);
  const stateCode = region ?? city?.stateCode ?? '';
  return (
    <RegionCitySelects
      cityCode={
        region === null || region === city?.stateCode ? (city?.code ?? '') : ''
      }
      cityId={ONLINE_CITY_ID}
      cityNote={host_online_city_hint({}, { locale })}
      isDisabled={isDisabled}
      isOptional={false}
      labels={{
        region: host_online_region({}, { locale }),
        city: host_online_city({}, { locale }),
        noRegion: host_online_region_choose({}, { locale }),
        noCity: host_online_city_choose({}, { locale }),
      }}
      locale={locale}
      marketCode={marketCode}
      onCity={(chosen) => {
        if (!chosen) return;
        setRegion(null);
        onCitySelect(chosen);
      }}
      onState={setRegion}
      regionId={ONLINE_REGION_ID}
      stateCode={stateCode}
    />
  );
};
