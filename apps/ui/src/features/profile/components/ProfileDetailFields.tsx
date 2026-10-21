import type { RefObject } from 'react';

import type { ProfileLinkKind } from '@founders-coffee/core';
import {
  profile_attended_hint,
  profile_attended_label,
  profile_interests_hint,
  profile_interests_label,
  profile_languages_label,
  type Locale,
} from '@founders-coffee/i18n';
import { ChipGroup, toggleChip } from '@founders-coffee/ui';

import {
  localeLabel,
  SPOKEN_LOCALE_OPTIONS,
  topicLabel,
  TOPIC_OPTIONS,
} from '../profile-labels';
import type { ProfileDraft } from '../profile-draft';
import { OptionalChip } from './OptionalChip';
import { ProfileLinksFields, type LinkInputs } from './ProfileLinksFields';
import { ProfileOpenToField } from './ProfileOpenToField';
import { ProfileSearchField } from './ProfileSearchField';
import { ProfileSkillsField } from './ProfileSkillsField';
import { PublishToggle } from './PublishToggle';

export const ProfileDetailFields = ({
  locale,
  draft,
  isDisabled,
  invalidLink,
  linkInputs,
  onChange,
}: {
  locale: Locale;
  draft: ProfileDraft;
  isDisabled: boolean;
  invalidLink: ProfileLinkKind | null;
  linkInputs: RefObject<LinkInputs>;
  onChange: (patch: Partial<ProfileDraft>) => void;
}) => {
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-label">
            {profile_interests_label({}, { locale })}
          </span>
          <OptionalChip locale={locale} />
        </div>
        <ChipGroup
          options={TOPIC_OPTIONS}
          selected={draft.interests}
          max={5}
          groupLabel={profile_interests_label({}, { locale })}
          labelFor={(topic) => topicLabel(topic, locale)}
          onToggle={(topic) =>
            onChange({ interests: toggleChip(draft.interests, topic, 5) })
          }
        />
        <p className="mt-2 text-body-sm text-neutral">
          {profile_interests_hint({}, { locale })}
        </p>
        <PublishToggle
          locale={locale}
          isPublic={draft.visibility.interests}
          isDisabled={isDisabled || draft.interests.length === 0}
          fieldLabel={profile_interests_label({}, { locale })}
          onChange={(isPublic) =>
            onChange({
              visibility: { ...draft.visibility, interests: isPublic },
            })
          }
        />
      </div>

      <ProfileSkillsField
        locale={locale}
        draft={draft}
        isDisabled={isDisabled}
        onChange={onChange}
      />

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-label">
            {profile_languages_label({}, { locale })}
          </span>
          <OptionalChip locale={locale} />
        </div>
        <ChipGroup
          options={SPOKEN_LOCALE_OPTIONS}
          selected={draft.spokenLanguages}
          max={6}
          groupLabel={profile_languages_label({}, { locale })}
          labelFor={(spoken) => localeLabel(spoken, locale)}
          onToggle={(spoken) =>
            onChange({
              spokenLanguages: toggleChip(draft.spokenLanguages, spoken, 6),
            })
          }
        />
        <PublishToggle
          locale={locale}
          isPublic={draft.visibility.spokenLanguages}
          isDisabled={isDisabled || draft.spokenLanguages.length === 0}
          fieldLabel={profile_languages_label({}, { locale })}
          onChange={(isPublic) =>
            onChange({
              visibility: { ...draft.visibility, spokenLanguages: isPublic },
            })
          }
        />
      </div>

      <ProfileOpenToField
        locale={locale}
        draft={draft}
        isDisabled={isDisabled}
        onChange={onChange}
      />

      <ProfileLinksFields
        locale={locale}
        draft={draft}
        isDisabled={isDisabled}
        invalidLink={invalidLink}
        inputs={linkInputs}
        onChange={onChange}
      />

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-label">
            {profile_attended_label({}, { locale })}
          </span>
          <OptionalChip locale={locale} />
        </div>
        <p className="text-body-sm text-neutral">
          {profile_attended_hint({}, { locale })}
        </p>
        <PublishToggle
          locale={locale}
          isPublic={draft.visibility.attendedCount}
          isDisabled={isDisabled}
          fieldLabel={profile_attended_label({}, { locale })}
          onChange={(isPublic) =>
            onChange({
              visibility: { ...draft.visibility, attendedCount: isPublic },
            })
          }
        />
      </div>

      <ProfileSearchField
        locale={locale}
        draft={draft}
        isDisabled={isDisabled}
        onChange={onChange}
      />
    </div>
  );
};
