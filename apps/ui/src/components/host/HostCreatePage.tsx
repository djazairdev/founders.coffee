import { useRef, useState } from 'react';

import type { Market } from '@founders-coffee/db';
import type { geo } from '@founders-coffee/domain';
import {
  host_progress_label,
  host_step_progress,
  localizedName,
  type Locale,
} from '@founders-coffee/i18n';

import { useHostMapContext } from '../../features/events/hooks';
import type { RepeatEventTemplate } from '../../features/events/api';
import {
  TOTAL_STEPS,
  useHostCreateWizard,
} from '../../features/events/useHostCreateWizard';
import { useAuth } from '../../lib/app-providers';
import type { SocialProvider } from '../auth/SocialSignIn';
import { HostMapPanel } from './HostMapPanel';
import { HostOnlinePanel } from './HostOnlinePanel';
import { HostStepHeading } from './HostStepHeading';
import { HostWizardActions } from './HostWizardActions';
import { HostWizardHeader } from './HostWizardHeader';
import { HostWizardPanel } from './HostWizardPanel';
import { HostWizardStepBody } from './HostWizardStepBody';
import { useCitySwitch } from './useCitySwitch';
import { useStepFocus } from './useStepFocus';
import { useVenueOverlay } from './useVenueOverlay';
import { WizardSteps } from './WizardSteps';

type HostCreatePageProps = {
  locale: Locale;
  market: Market;
  city: geo.GeoCity | null;
  mapboxToken: string;
  turnstileSiteKey: string | null;
  isTurnstileBypassed: boolean;
  socialProviders: readonly SocialProvider[];
  repeatTemplate: RepeatEventTemplate | null;
};

export const HostCreatePage = ({
  locale,
  market,
  city,
  mapboxToken,
  turnstileSiteKey,
  isTurnstileBypassed,
  socialProviders,
  repeatTemplate,
}: HostCreatePageProps) => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [mapCenter, setMapCenter] = useState<{
    cityCode?: string;
    latitude: number;
    longitude: number;
  } | null>(null);
  const mapContext = useHostMapContext({
    marketCode: market.code,
    cityCode: city?.code,
    locale,
  });
  const wizard = useHostCreateWizard({
    locale,
    market,
    city,
    repeatTemplate,
    isAuthenticated,
    isAuthLoading,
  });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  useStepFocus(wizard.step, headingRef, scrollRef);
  const venueOverlay = useVenueOverlay();
  const switchCity = useCitySwitch({
    locale,
    marketSlug: market.slug,
    onSwitch: () => {
      wizard.clearVenue();
      venueOverlay.listPlaces();
    },
  });

  const listCenter = (mapCenter?.cityCode === city?.code ? mapCenter : null) ??
    wizard.venue ??
    mapContext.data?.center ?? { latitude: 0, longitude: 0 };
  const marketName = localizedName(market, locale);
  const steps = (
    <WizardSteps
      current={wizard.step}
      labels={wizard.stepLabels}
      ariaLabel={host_progress_label({}, { locale })}
      statusText={host_step_progress(
        { current: wizard.step, total: TOTAL_STEPS, label: wizard.stepTitle },
        { locale },
      )}
    />
  );

  return (
    <div
      className={`grid min-h-dvh grid-cols-1 lg:h-[calc(100vh-4rem)] lg:min-h-0 lg:grid-cols-[26rem_minmax(0,1fr)] lg:grid-rows-[auto_minmax(0,1fr)_auto] xl:grid-cols-[30rem_minmax(0,1fr)] ${
        wizard.step === 1 && wizard.isVenueFormat
          ? 'grid-rows-[auto_auto_minmax(16rem,1fr)_auto]'
          : 'grid-rows-[auto_1fr_auto]'
      }`}
    >
      <HostWizardHeader
        locale={locale}
        marketName={marketName}
        step={wizard.step}
      >
        {steps}
      </HostWizardHeader>
      <HostWizardPanel
        locale={locale}
        wizard={wizard}
        scrollRef={scrollRef}
        turnstileSiteKey={turnstileSiteKey}
        isTurnstileBypassed={isTurnstileBypassed}
        socialProviders={socialProviders}
      >
        <HostStepHeading
          locale={locale}
          headingRef={headingRef}
          title={wizard.stepTitle}
          sub={wizard.stepSub}
          repeatTitle={
            wizard.isRepeat && repeatTemplate ? repeatTemplate.title : null
          }
        />
        <HostWizardStepBody
          locale={locale}
          market={market}
          city={city}
          wizard={wizard}
          venueOverlay={venueOverlay}
          listCenter={listCenter}
          isMapReady={!!mapContext.data}
          onCitySelect={wizard.isRepeat ? undefined : switchCity}
        />
      </HostWizardPanel>

      <div
        className={`min-h-0 lg:col-start-2 lg:row-span-3 lg:row-start-1 ${
          wizard.step === 1 && wizard.isVenueFormat ? '' : 'hidden lg:block'
        }`}
      >
        {wizard.isVenueFormat ? (
          <HostMapPanel
            locale={locale}
            accessToken={mapboxToken}
            marketCode={market.code}
            cityCode={city?.code}
            venue={wizard.venue}
            viewport={mapContext.data}
            error={mapContext.error}
            isInteractive={wizard.step === 1}
            covered={wizard.step === 1 ? venueOverlay.covered : 0}
            onRetry={() => void mapContext.refetch()}
            onCitySelect={wizard.isRepeat ? undefined : switchCity}
            onVenueSelect={wizard.selectVenue}
            onVenueInvalidate={wizard.clearVenue}
            onCenterChange={(center) =>
              setMapCenter({ ...center, cityCode: city?.code })
            }
            onSearch={
              venueOverlay.isSearchOpen ? undefined : venueOverlay.openSearch
            }
            onMiss={venueOverlay.offerPlaces}
            {...venueOverlay.map}
          />
        ) : (
          <HostOnlinePanel locale={locale} />
        )}
      </div>

      {!wizard.isAuthGateOpen && (
        <HostWizardActions
          locale={locale}
          marketSlug={market.slug}
          step={wizard.step}
          isAuthenticated={isAuthenticated}
          isDisabled={wizard.isActionDisabled}
          isPublishing={wizard.publishing}
          onBack={wizard.prev}
          onNext={() => {
            if (wizard.isVenueFormat && !wizard.venue)
              venueOverlay.offerPlaces();
            wizard.next();
          }}
        />
      )}
    </div>
  );
};
