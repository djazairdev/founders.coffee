import type { Market } from '@founders-coffee/db';
import type { geo } from '@founders-coffee/domain';
import type { Locale } from '@founders-coffee/i18n';

import type { useHostCreateWizard } from '../../features/events/useHostCreateWizard';
import { HostDetailsStep } from './HostDetailsStep';
import { HostScheduleStep } from './HostScheduleStep';
import { HostVenueLine } from './HostVenueLine';
import { HostVenueStep } from './HostVenueStep';
import type { useVenueOverlay } from './useVenueOverlay';

type HostWizardStepBodyProps = {
  locale: Locale;
  market: Market;
  cityCode: string | undefined;
  wizard: ReturnType<typeof useHostCreateWizard>;
  venueOverlay: ReturnType<typeof useVenueOverlay>;
  listCenter: { latitude: number; longitude: number };
  isMapReady: boolean;
  onCitySelect: ((city: geo.GeoCity) => void) | undefined;
};

export const HostWizardStepBody = ({
  locale,
  market,
  cityCode,
  wizard,
  venueOverlay,
  listCenter,
  isMapReady,
  onCitySelect,
}: HostWizardStepBodyProps) => (
  <>
    {wizard.step > 1 && wizard.venue && (
      <HostVenueLine
        locale={locale}
        venue={wizard.venue}
        venueName={wizard.venueName}
      />
    )}

    {wizard.step === 1 && (
      <HostVenueStep
        locale={locale}
        area={wizard.venueArea}
        cityCode={cityCode}
        center={listCenter}
        marketCode={market.code}
        searchValue={wizard.searchValue}
        venue={wizard.venue}
        venueName={wizard.venueName}
        nameError={wizard.fieldErrors.venueName}
        venueError={
          wizard.fieldErrors.venue
            ? {
                message: wizard.fieldErrors.venue,
                onDismiss: wizard.clearVenueError,
              }
            : undefined
        }
        overlay={{
          ...venueOverlay.panel,
          onPick: () => {
            venueOverlay.showMap();
            wizard.setSearchValue('');
          },
        }}
        isDisabled={!isMapReady}
        onSearchChange={wizard.setSearchValue}
        onVenueNameChange={wizard.setVenueName}
        onVenueSelect={wizard.selectVenue}
        onCitySelect={onCitySelect}
      />
    )}

    {wizard.step === 2 && (
      <HostScheduleStep
        locale={locale}
        timeZone={market.timezone}
        startsAt={wizard.startsAt}
        endsAt={wizard.endsAt}
        error={wizard.fieldErrors.schedule}
        onChange={wizard.setSchedule}
        onError={wizard.setScheduleError}
      />
    )}

    {wizard.step === 3 && (
      <HostDetailsStep
        locale={locale}
        title={wizard.title}
        description={wizard.description}
        languages={wizard.languages}
        constraints={wizard.view.constraints}
        errors={wizard.fieldErrors}
        onTitleChange={wizard.setTitle}
        onDescriptionChange={wizard.setDescription}
        onLanguagesChange={wizard.setLanguages}
      />
    )}
  </>
);
