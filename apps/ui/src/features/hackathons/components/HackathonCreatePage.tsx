import { Link, useNavigate } from '@tanstack/react-router';
import { useRef, useState } from 'react';

import type { Market } from '@founders-coffee/db';
import type { geo } from '@founders-coffee/domain';
import {
  hackathon_create,
  hackathon_create_back,
  hackathon_create_forbidden,
  hackathon_online_panel,
  hackathon_save_draft,
  hackathon_saving,
  host_progress_label,
  host_step_progress,
  type Locale,
} from '@founders-coffee/i18n';
import { StatusMessage } from '@founders-coffee/ui';

import { HostMapPanel } from '../../../components/host/HostMapPanel';
import { HostOnlinePanel } from '../../../components/host/HostOnlinePanel';
import { HostStepHeading } from '../../../components/host/HostStepHeading';
import { HostWizardActions } from '../../../components/host/HostWizardActions';
import { HostWizardHeader } from '../../../components/host/HostWizardHeader';
import { useStepFocus } from '../../../components/host/useStepFocus';
import { useVenueOverlay } from '../../../components/host/useVenueOverlay';
import { WizardSteps } from '../../../components/host/WizardSteps';
import {
  localizedHackathonCreate,
  localizedMyOrganisation,
} from '../../../lib/locale-routing';
import { useHostMapContext } from '../../events/hooks';
import type { OrganisationRoster } from '../../organisations/types';
import { hackathonStepCopy } from '../hackathon-create-copy';
import {
  HACKATHON_WIZARD_STEPS,
  useHackathonCreateWizard,
} from '../useHackathonCreateWizard';
import { HackathonWizardStepBody } from './HackathonWizardStepBody';

type HackathonCreatePageProps = {
  locale: Locale;
  organisation: OrganisationRoster;
  market: Market;
  city: geo.GeoCity | null;
  mapboxToken: string;
};

export const HackathonCreatePage = ({
  locale,
  organisation,
  market,
  city,
  mapboxToken,
}: HackathonCreatePageProps) => {
  const navigate = useNavigate();
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
  const wizard = useHackathonCreateWizard({
    locale,
    market,
    city,
    organisation,
  });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  useStepFocus(wizard.step, headingRef, scrollRef);
  const venueOverlay = useVenueOverlay();
  const backToOrganisation = localizedMyOrganisation(locale, organisation.slug);
  const copy = hackathonStepCopy(locale);
  const stepTitle = copy.titles[wizard.step - 1] ?? copy.titles[0];

  if (!organisation.canCreateHackathon)
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
        <h1 className="font-display text-h3">
          {hackathon_create({}, { locale })}
        </h1>
        <StatusMessage variant="warning" className="mt-6">
          {hackathon_create_forbidden({}, { locale })}
        </StatusMessage>
        <Link {...backToOrganisation} className="link mt-4 inline-block">
          {hackathon_create_back({}, { locale })}
        </Link>
      </div>
    );

  const switchCity = (chosen: geo.GeoCity) => {
    wizard.clearVenue();
    venueOverlay.listPlaces();
    void navigate({
      ...localizedHackathonCreate(locale, organisation.slug),
      search: { city: chosen.code },
      replace: true,
    });
  };
  const listCenter = (mapCenter?.cityCode === city?.code ? mapCenter : null) ??
    wizard.venue ??
    mapContext.data?.center ?? { latitude: 0, longitude: 0 };
  const isMapStep = wizard.step === 1 && wizard.isVenueFormat;

  return (
    <div
      className={`grid min-h-dvh grid-cols-1 lg:h-[calc(100vh-4rem)] lg:min-h-0 lg:grid-cols-[26rem_minmax(0,1fr)] lg:grid-rows-[auto_minmax(0,1fr)_auto] xl:grid-cols-[30rem_minmax(0,1fr)] ${
        isMapStep
          ? 'grid-rows-[auto_auto_minmax(16rem,1fr)_auto]'
          : 'grid-rows-[auto_1fr_auto]'
      }`}
    >
      <HostWizardHeader
        locale={locale}
        marketName={organisation.name}
        step={wizard.step}
        totalSteps={HACKATHON_WIZARD_STEPS}
      >
        <WizardSteps
          current={wizard.step}
          labels={copy.labels}
          ariaLabel={host_progress_label({}, { locale })}
          statusText={host_step_progress(
            {
              current: wizard.step,
              total: HACKATHON_WIZARD_STEPS,
              label: stepTitle,
            },
            { locale },
          )}
        />
      </HostWizardHeader>
      <section className="host-fade-up relative flex min-h-0 flex-col border-base-300 bg-base-100 lg:col-start-1 lg:row-start-2 lg:border-e">
        <div
          ref={scrollRef}
          className={`flex min-h-0 flex-1 flex-col gap-3 px-4 pt-3 pb-4 lg:gap-4 lg:overflow-y-auto lg:px-7 lg:pt-5 lg:pb-7 ${
            wizard.step === 1 ? 'max-lg:py-0' : ''
          }`}
        >
          <HostStepHeading
            locale={locale}
            headingRef={headingRef}
            title={stepTitle}
            sub={copy.descriptions[wizard.step - 1] ?? null}
            repeatTitle={null}
            pageTitle={hackathon_create({}, { locale })}
          />
          <HackathonWizardStepBody
            locale={locale}
            market={market}
            city={city}
            wizard={wizard}
            venueOverlay={venueOverlay}
            listCenter={listCenter}
            isMapReady={!!mapContext.data}
            onCitySelect={switchCity}
          />
        </div>
        {wizard.saveError ? (
          <div className="border-t border-base-300 px-4 pt-3 lg:px-7 lg:pt-4">
            <StatusMessage variant="error">{wizard.saveError}</StatusMessage>
          </div>
        ) : null}
      </section>

      <div
        className={`min-h-0 lg:col-start-2 lg:row-span-3 lg:row-start-1 ${
          isMapStep ? '' : 'hidden lg:block'
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
            onCitySelect={switchCity}
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
          <HostOnlinePanel
            locale={locale}
            text={hackathon_online_panel({}, { locale })}
          />
        )}
      </div>

      <HostWizardActions
        locale={locale}
        marketSlug={market.slug}
        step={wizard.step}
        isAuthenticated
        isDisabled={wizard.isSaving}
        isPublishing={wizard.isSaving}
        totalSteps={HACKATHON_WIZARD_STEPS}
        finishLabel={hackathon_save_draft({}, { locale })}
        busyLabel={hackathon_saving({}, { locale })}
        exitTo={backToOrganisation}
        exitLabel={hackathon_create_back({}, { locale })}
        onBack={wizard.prev}
        onNext={() => {
          if (wizard.step === 1 && wizard.isVenueFormat && !wizard.venue)
            venueOverlay.offerPlaces();
          wizard.next();
        }}
      />
    </div>
  );
};
