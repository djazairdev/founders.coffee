import type { Market } from '@founders-coffee/db';
import type { geo } from '@founders-coffee/domain';
import { MapPin } from 'lucide-react';

import { type Locale } from '@founders-coffee/i18n';

import { EventFormatField } from '../../../components/events/EventFormatField';
import { HostDetailsStep } from '../../../components/host/HostDetailsStep';
import { HostVenueLine } from '../../../components/host/HostVenueLine';
import { HostVenueStep } from '../../../components/host/HostVenueStep';
import type { useVenueOverlay } from '../../../components/host/useVenueOverlay';
import { hostCreateViewCopy } from '../../events/host-create-copy';
import {
  hackathonDetailsCopy,
  hackathonPlaceCopy,
} from '../hackathon-create-copy';
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

const HACKATHON_CREATE_FORMATS = ['online', 'in_person'] as const;

export const HackathonWizardStepBody = ({
  locale,
  market,
  city,
  wizard,
  venueOverlay,
  listCenter,
  isMapReady,
  onCitySelect,
}: HackathonWizardStepBodyProps) => {
  const placeCopy = hackathonPlaceCopy(locale);
  return (
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
            label={placeCopy.formatLabel}
            names={placeCopy.formatNames}
            formats={HACKATHON_CREATE_FORMATS}
            isHintVisible={false}
            onChange={wizard.setFormat}
          />
          <hr className="border-base-300" />
          <p className="text-body-sm text-neutral">
            {placeCopy.descriptions[wizard.format]}
          </p>
          {wizard.isVenueFormat ? (
            <section
              aria-labelledby="hackathon-venue-heading"
              className="grid gap-3 border-t border-base-300 pt-4"
            >
              <h3
                className="font-display text-h5 font-semibold text-base-content"
                id="hackathon-venue-heading"
              >
                {wizard.isLinkFormat
                  ? placeCopy.hybridLocationTitle
                  : placeCopy.venueTitle}
              </h3>
              {wizard.isLinkFormat ? (
                <p className="inline-flex items-center gap-2 text-body-sm text-neutral">
                  <MapPin
                    aria-hidden="true"
                    className="size-4 shrink-0 text-secondary"
                  />
                  {placeCopy.hybridLocationHint}
                </p>
              ) : (
                <p className="inline-flex items-center gap-2 text-body-sm text-neutral">
                  <MapPin
                    aria-hidden="true"
                    className="size-4 shrink-0 text-secondary"
                  />
                  {placeCopy.mapHint}
                </p>
              )}
              <HostVenueStep
                locale={locale}
                area={wizard.venueArea}
                cityCode={city?.code}
                center={listCenter}
                marketCode={market.code}
                searchValue={wizard.searchValue}
                venue={wizard.venue}
                venueName={wizard.venueName}
                venueNamePlaceholder={placeCopy.venueNamePlaceholder}
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
                isEmptyHintVisible={false}
                onSearchChange={wizard.setSearchValue}
                onVenueNameChange={wizard.setVenueName}
                onVenueSelect={wizard.selectVenue}
                onCitySelect={onCitySelect}
              />
            </section>
          ) : null}
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
        <div className="grid gap-5">
          <HostDetailsStep
            locale={locale}
            title={wizard.title}
            description={wizard.description}
            tags={wizard.tags}
            constraints={hostCreateViewCopy().constraints}
            errors={wizard.fieldErrors}
            copy={hackathonDetailsCopy(locale)}
            onTitleChange={wizard.setTitle}
            onDescriptionChange={wizard.setDescription}
            onTagsChange={wizard.setTags}
          />
        </div>
      )}
    </>
  );
};
