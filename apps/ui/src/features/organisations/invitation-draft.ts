import { organisations } from '@founders-coffee/domain';

export type InvitableRole = organisations.OrganisationInvitationInput['role'];

export const INVITABLE_ROLES = organisations.INVITABLE_ORGANISATION_ROLES;

/**
 * The invitation a draft makes, checked against the schema the server function validates with, or
 * null when the address is not one.
 */
export const invitationFrom = (draft: {
  readonly email: string;
  readonly role: InvitableRole;
}): organisations.OrganisationInvitationInput | null => {
  const parsed = organisations.organisationInvitationSchema.safeParse(draft);
  return parsed.success ? parsed.data : null;
};
