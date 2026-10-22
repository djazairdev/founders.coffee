import type { Market } from '@founders-coffee/db';
import type { geo } from '@founders-coffee/domain';
import { hackathon_online_city_hint, type Locale } from '@founders-coffee/i18n';

import { EventFormatField } from '../../../components/events/EventFormatField';
import { HostDetailsStep } from '../../../components/host/HostDetailsStep';
import { HostMeetingLinkField } from '../../../components/host/HostMeetingLinkField';
import { HostOnlineCityField } from '../../../components/host/HostOnlineCityField';
import { HostVenueLine } from '../../../components/host/HostVenueLine';
import { HostVenueStep } from '../../../components/host/HostVenueStep';
import type { useVenueOverlay } from '../../../components/host/useVenueOverlay';
import { hostCreateViewCopy } from '../../events/host-create-copy';
import { hackathonDetailsCopy } from '../hackathon-create-copy';
import type { useHackathonCreateWizard } from '../useHackathonCreateWizard';
import { HackathonScheduleStep } from './HackathonScheduleStep';

type HackathonWizardStepBodyProps = {
  locale: Locale;
  market: Market;
  city: geo.GeoCity | null;
  wizard: ReturnType<typeof useHackathonCreateWizard>;
  venueOverlay: ReturnType<typeof useVenueOverlay>;
  listCenter: { latitude: number; longitude: number };
  isMapReady: boolean;
  onCitySelect: (city: geo.GeoCity) => void;
};

export const HackathonWizardStepBody = ({
  locale,
  market,
  city,
  wizard,
  venueOverlay,
  listCenter,
  isMapReady,
  onCitySelect,
}: HackathonWizardStepBodyProps) => (
  <>
    {wizard.step > 1 && wizard.isVenueFormat && wizard.venue && (
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
            hint={hackathon_online_city_hint({}, { locale })}
            onCitySelect={onCitySelect}
          />
        )}
      </div>
    )}

    {wizard.step === 2 && (
      <HackathonScheduleStep
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
        tags={wizard.tags}
        constraints={hostCreateViewCopy().constraints}
        errors={wizard.fieldErrors}
        copy={hackathonDetailsCopy(locale)}
        onTitleChange={wizard.setTitle}
        onDescriptionChange={wizard.setDescription}
        onLanguagesChange={wizard.setLanguages}
        onTagsChange={wizard.setTags}
      />
    )}
  </>
);
