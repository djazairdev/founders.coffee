import {
  profile_search_hint,
  profile_search_label,
  profile_search_toggle,
  type Locale,
} from '@founders-coffee/i18n';

import type { ProfileDraft } from '../profile-draft';
import { OptionalChip } from './OptionalChip';

export const ProfileSearchField = ({
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
      <span className="text-label">{profile_search_label({}, { locale })}</span>
      <OptionalChip locale={locale} />
    </div>
    <p id="profile-search-hint" className="text-body-sm text-neutral">
      {profile_search_hint({}, { locale })}
    </p>
    <label className="mt-2 flex cursor-pointer items-center justify-between gap-3">
      <span className="text-body-sm">
        {profile_search_toggle({}, { locale })}
      </span>
      <input
        type="checkbox"
        className="toggle toggle-primary toggle-sm"
        checked={draft.indexable}
        disabled={isDisabled}
        aria-describedby="profile-search-hint"
        onChange={(event) => onChange({ indexable: event.target.checked })}
      />
    </label>
  </div>
);
