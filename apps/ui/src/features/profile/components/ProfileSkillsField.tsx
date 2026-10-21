import {
  profile_skills_hint,
  profile_skills_label,
  type Locale,
} from '@founders-coffee/i18n';
import { ChipGroup, toggleChip } from '@founders-coffee/ui';

import { SKILL_LIMIT, type ProfileDraft } from '../profile-draft';
import { skillLabel, SKILL_OPTIONS } from '../skill-labels';
import { OptionalChip } from './OptionalChip';
import { PublishToggle } from './PublishToggle';

export const ProfileSkillsField = ({
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
      <span className="text-label">{profile_skills_label({}, { locale })}</span>
      <OptionalChip locale={locale} />
    </div>
    <ChipGroup
      options={SKILL_OPTIONS}
      selected={draft.skills}
      max={SKILL_LIMIT}
      groupLabel={profile_skills_label({}, { locale })}
      describedBy="profile-skills-hint"
      labelFor={(skill) => skillLabel(skill, locale)}
      onToggle={(skill) =>
        onChange({
          skills: toggleChip(draft.skills, skill, SKILL_LIMIT),
        })
      }
    />
    <p id="profile-skills-hint" className="mt-2 text-body-sm text-neutral">
      {profile_skills_hint({}, { locale })}
    </p>
    <PublishToggle
      locale={locale}
      isPublic={draft.visibility.skills}
      isDisabled={isDisabled || draft.skills.length === 0}
      fieldLabel={profile_skills_label({}, { locale })}
      onChange={(isPublic) =>
        onChange({ visibility: { ...draft.visibility, skills: isPublic } })
      }
    />
  </div>
);
