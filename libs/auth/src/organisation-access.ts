import { createAccessControl } from 'better-auth/plugins/access';
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from 'better-auth/plugins/organization/access';

const ORGANISING = {
  event: ['create'],
  hackathon: ['create', 'manage'],
} as const;

export const organisationAc = createAccessControl({
  ...defaultStatements,
  ...ORGANISING,
});

export const organisationRoles = {
  owner: organisationAc.newRole({ ...ownerAc.statements, ...ORGANISING }),
  admin: organisationAc.newRole({ ...adminAc.statements, ...ORGANISING }),
  member: organisationAc.newRole({ ...memberAc.statements, ...ORGANISING }),
};

type OrganisationStatements = typeof organisationAc.statements;

export type OrganisationResource = keyof OrganisationStatements;
export type OrganisationAction<R extends OrganisationResource> =
  OrganisationStatements[R][number];

const isOrganisationRole = (
  name: string,
): name is keyof typeof organisationRoles =>
  Object.hasOwn(organisationRoles, name);

/**
 * Whether a member's role may take an action in their organisation, read from the same role table
 * Better Auth enforces on its own endpoints. A member row may hold several roles, comma-separated,
 * and any one that allows it is enough. This says what to offer; the server function still asks
 * Better Auth when the action is taken.
 */
export const organisationRoleAllows = <R extends OrganisationResource>(
  role: string,
  resource: R,
  action: OrganisationAction<R>,
): boolean =>
  role
    .split(',')
    .map((name) => name.trim())
    .filter(isOrganisationRole)
    .some(
      (name) =>
        organisationRoles[name].authorize({ [resource]: [action] }).success,
    );
