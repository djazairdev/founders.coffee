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
