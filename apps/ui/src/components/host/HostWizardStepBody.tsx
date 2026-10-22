import type { Market } from '@founders-coffee/db';
import type { geo } from '@founders-coffee/domain';
import type { Locale } from '@founders-coffee/i18n';

import type { useHostCreateWizard } from '../../features/events/useHostCreateWizard';
import { EventFormatField } from '../events/EventFormatField';
import { EventKindField } from '../events/EventKindField';
import { EventHostAsField } from '../events/EventHostAsField';
import { HostDetailsStep } from './HostDetailsStep';
import { HostMeetingLinkField } from './HostMeetingLinkField';
import { HostOnlineCityField } from './HostOnlineCityField';
import { HostScheduleStep } from './HostScheduleStep';
import { HostVenueLine } from './HostVenueLine';
import { HostVenueStep } from './HostVenueStep';
import type { useVenueOverlay } from './useVenueOverlay';

type HostWizardStepBodyProps = {
  locale: Locale;
  market: Market;
  city: geo.GeoCity | null;
  wizard: ReturnType<typeof useHostCreateWizard>;
  venueOverlay: ReturnType<typeof useVenueOverlay>;
  listCenter: { latitude: number; longitude: number };
  isMapReady: boolean;
  onCitySelect: ((city: geo.GeoCity) => void) | undefined;
};

export const HostWizardStepBody = ({
  locale,
  market,
  city,
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
      <div className="grid gap-5">
        <EventFormatField
          locale={locale}
          value={wizard.format}
          onChange={wizard.setFormat}
        />
        {wizard.isLinkFormat && (
          <HostMeetingLinkField
            locale={locale}
            value={wizard.meetingUrl}
            error={wizard.fieldErrors.meetingUrl}
            onChange={wizard.setMeetingUrl}
          />
        )}
        {wizard.isVenueFormat ? (
          <HostVenueStep
            locale={locale}
            area={wizard.venueArea}
            cityCode={city?.code}
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
        ) : (
          <HostOnlineCityField
            locale={locale}
            marketCode={market.code}
            city={city}
            isDisabled={!onCitySelect}
            onCitySelect={(chosen) => onCitySelect?.(chosen)}
          />
        )}
      </div>
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
      <div className="grid gap-5">
        {wizard.organisations.length > 0 && (
          <EventHostAsField
            locale={locale}
            organisations={wizard.organisations}
            value={wizard.hostAs}
            onChange={wizard.setHostAs}
          />
        )}
        <EventKindField
          locale={locale}
          value={wizard.kind}
          onChange={wizard.setKind}
        />
        <HostDetailsStep
          locale={locale}
          title={wizard.title}
          description={wizard.description}
          languages={wizard.languages}
          tags={wizard.tags}
          constraints={wizard.view.constraints}
          errors={wizard.fieldErrors}
          onTitleChange={wizard.setTitle}
          onDescriptionChange={wizard.setDescription}
          onLanguagesChange={wizard.setLanguages}
          onTagsChange={wizard.setTags}
        />
      </div>
    )}
  </>
);
