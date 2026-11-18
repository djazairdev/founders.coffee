import {
  profile_open_to_hint,
  profile_open_to_label,
  type Locale,
} from '@founders-coffee/i18n';
import { ChipGroup, toggleChip } from '@founders-coffee/ui';

import { openToLabel, OPEN_TO_OPTIONS } from '../portfolio-labels';
import type { ProfileDraft } from '../profile-draft';
import { OptionalChip } from './OptionalChip';
import { PublishToggle } from './PublishToggle';

export const ProfileOpenToField = ({
  locale,
  draft,
  isDisabled,
  onChange,
}: {
  locale: Locale;
  draft: ProfileDraft;
  isDisabled: boolean;
  onChange: (patch: Partial<ProfileDraft>) => void;
}) => (
  <div>
    <div className="mb-2 flex items-center justify-between gap-2">
      <span className="text-label">
        {profile_open_to_label({}, { locale })}
      </span>
      <OptionalChip locale={locale} />
    </div>
    <ChipGroup
      options={OPEN_TO_OPTIONS}
      selected={draft.openTo}
      max={OPEN_TO_OPTIONS.length}
      groupLabel={profile_open_to_label({}, { locale })}
      describedBy="profile-open-to-hint"
      labelFor={(openTo) => openToLabel(openTo, locale)}
      onToggle={(openTo) =>
        onChange({
          openTo: toggleChip(draft.openTo, openTo, OPEN_TO_OPTIONS.length),
        })
      }
    />
    <p id="profile-open-to-hint" className="mt-2 text-body-sm text-neutral">
      {profile_open_to_hint({}, { locale })}
    </p>
    <PublishToggle
      locale={locale}
      isPublic={draft.visibility.openTo}
      isDisabled={isDisabled || draft.openTo.length === 0}
      fieldLabel={profile_open_to_label({}, { locale })}
      onChange={(isPublic) =>
        onChange({ visibility: { ...draft.visibility, openTo: isPublic } })
      }
    />
  </div>
);
