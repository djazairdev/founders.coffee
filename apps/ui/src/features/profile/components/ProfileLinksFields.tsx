import type { RefObject } from 'react';

import type { ProfileLinkKind } from '@founders-coffee/core';
import {
  profile_links_hint,
  profile_links_label,
  type Locale,
} from '@founders-coffee/i18n';
import { Input } from '@founders-coffee/ui';

import { LINK_KIND_OPTIONS, linkFieldText } from '../portfolio-labels';
import { linkUrlOf, withLink, type ProfileDraft } from '../profile-draft';
import { OptionalChip } from './OptionalChip';
import { PublishToggle } from './PublishToggle';

export type LinkInputs = Partial<Record<ProfileLinkKind, HTMLInputElement>>;

export const ProfileLinksFields = ({
  locale,
  draft,
  isDisabled,
  invalidLink,
  inputs,
  onChange,
}: {
  locale: Locale;
  draft: ProfileDraft;
  isDisabled: boolean;
  invalidLink: ProfileLinkKind | null;
  inputs: RefObject<LinkInputs>;
  onChange: (patch: Partial<ProfileDraft>) => void;
}) => (
  <div
    role="group"
    aria-labelledby="profile-links-label"
    aria-describedby="profile-links-hint"
  >
    <div className="mb-2 flex items-center justify-between gap-2">
      <span id="profile-links-label" className="text-label">
        {profile_links_label({}, { locale })}
      </span>
      <OptionalChip locale={locale} />
    </div>
    <p id="profile-links-hint" className="mb-3 text-body-sm text-neutral">
      {profile_links_hint({}, { locale })}
    </p>
    <div className="space-y-3">
      {LINK_KIND_OPTIONS.map((kind) => {
        const text = linkFieldText(kind, locale);
        const isInvalid = invalidLink === kind;
        return (
          <div key={kind}>
            <label
              htmlFor={`profile-link-${kind}`}
              className="mb-1 block text-body-sm font-medium"
            >
              {text.label}
            </label>
            <Input
              id={`profile-link-${kind}`}
              ref={(input) => {
                if (input) inputs.current[kind] = input;
              }}
              type="url"
              inputMode="url"
              dir="ltr"
              maxLength={2048}
              value={linkUrlOf(draft.links, kind)}
              disabled={isDisabled}
              placeholder={text.placeholder}
              aria-invalid={isInvalid || undefined}
              aria-describedby={
                isInvalid ? `profile-link-${kind}-error` : undefined
              }
              onChange={(event) =>
                onChange({
                  links: withLink(draft.links, kind, event.target.value),
                })
              }
            />
            {isInvalid ? (
              <p
                id={`profile-link-${kind}-error`}
                className="mt-1 text-body-sm text-error"
              >
                {text.invalid}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
    <PublishToggle
      locale={locale}
      isPublic={draft.visibility.links}
      isDisabled={isDisabled || draft.links.length === 0}
      fieldLabel={profile_links_label({}, { locale })}
      onChange={(isPublic) =>
        onChange({ visibility: { ...draft.visibility, links: isPublic } })
      }
    />
  </div>
);
