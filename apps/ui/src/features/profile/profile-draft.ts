import {
  PROFILE_LINK_KINDS,
  type ProfileLinkKind,
} from '@founders-coffee/core';
import { profile } from '@founders-coffee/domain';

import type { UserProfile } from './api';

export type ProfileDraft = Omit<
  UserProfile,
  'userId' | 'revision' | 'memberSince'
>;

export const SKILL_LIMIT = profile.PROFILE_SKILL_LIMIT;

/** Start a draft from the saved profile, so Discard has something exact to restore. */
export const draftFrom = (saved: UserProfile): ProfileDraft => ({
  displayName: saved.displayName,
  photoAssetId: saved.photoAssetId,
  headline: saved.headline,
  stage: saved.stage,
  introduction: saved.introduction,
  interests: [...saved.interests],
  spokenLanguages: [...saved.spokenLanguages],
  skills: [...saved.skills],
  links: saved.links.map((link) => ({ ...link })),
  openTo: [...saved.openTo],
  visibility: { ...saved.visibility },
});

/** The address the member gave for one kind of link, or an empty field when they gave none. */
export const linkUrlOf = (
  links: readonly profile.ProfileLink[],
  kind: ProfileLinkKind,
): string => links.find((link) => link.kind === kind)?.url ?? '';

/**
 * The links with one kind's address replaced by what the member typed into that kind's field, in
 * the fields' order. An empty field removes that kind. The kind is the field's, not one read from
 * the address, so a LinkedIn address typed under GitHub reaches the schema as a GitHub link and is
 * refused there, next to the field it was typed in.
 */
export const withLink = (
  links: readonly profile.ProfileLink[],
  kind: ProfileLinkKind,
  url: string,
): profile.ProfileLink[] =>
  PROFILE_LINK_KINDS.flatMap((each) => {
    const value = each === kind ? url : linkUrlOf(links, each);
    return value ? [{ kind: each, url: value }] : [];
  });

const linksByKind = (links: readonly profile.ProfileLink[]): string =>
  PROFILE_LINK_KINDS.map((kind) => linkUrlOf(links, kind)).join();

/**
 * Whether the draft still says what the saved profile says.
 *
 * Compared field by field rather than by reference or JSON, because the arrays are rebuilt on every
 * chip toggle and a reference check would call an untouched profile dirty the moment anything
 * re-rendered. Order matters for the arrays only in that the UI never reorders them; a member who
 * removes a topic and adds it back lands on a different order and is correctly told they have a
 * change to save, which is honest — the server stores what it is given.
 */
export const isDraftDirty = (
  draft: ProfileDraft,
  saved: UserProfile,
): boolean =>
  draft.displayName.trim() !== saved.displayName.trim() ||
  draft.headline !== saved.headline ||
  draft.stage !== saved.stage ||
  draft.introduction !== saved.introduction ||
  draft.skills.join() !== saved.skills.join() ||
  linksByKind(draft.links) !== linksByKind(saved.links) ||
  draft.openTo.join() !== saved.openTo.join() ||
  draft.interests.join() !== saved.interests.join() ||
  draft.spokenLanguages.join() !== saved.spokenLanguages.join() ||
  (Object.keys(draft.visibility) as (keyof ProfileDraft['visibility'])[]).some(
    (field) => draft.visibility[field] !== saved.visibility[field],
  );

/**
 * Build the command the server accepts, or report why it cannot be built yet.
 *
 * The draft is edited freely — an over-long introduction or a half-typed URL is a normal state to
 * be in — so validation happens here rather than blocking keystrokes. `updateProfileSchema` also
 * normalizes: it normalizes empty fields and withdraws a
 * publication flag whose field is empty, so the command sent is the one the server would have
 * derived anyway, and the preview built from it cannot disagree with what gets stored.
 */
export const commandFrom = (
  draft: ProfileDraft,
  expectedRevision: number,
):
  | { ok: true; command: profile.UpdateProfileInput }
  | { ok: false; field: string; linkKind?: ProfileLinkKind } => {
  const parsed = profile.updateProfileSchema.safeParse({
    displayName: draft.displayName,
    expectedRevision,
    headline: draft.headline,
    stage: draft.stage,
    introduction: draft.introduction,
    interests: draft.interests,
    spokenLanguages: draft.spokenLanguages,
    skills: draft.skills,
    links: draft.links,
    openTo: draft.openTo,
    visibility: draft.visibility,
  });
  if (parsed.success) return { ok: true, command: parsed.data };
  const [field, index] = parsed.error.issues[0]?.path ?? [];
  const linkKind =
    field === 'links' && typeof index === 'number'
      ? draft.links[index]?.kind
      : undefined;
  return {
    ok: false,
    field: String(field ?? 'profile'),
    ...(linkKind ? { linkKind } : {}),
  };
};
