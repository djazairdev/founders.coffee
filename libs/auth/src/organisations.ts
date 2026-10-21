import { organization } from 'better-auth/plugins';

import { organisationAc, organisationRoles } from './organisation-access.js';

/**
 * Better Auth's organisation plugin, configured for organisers (B-ORG-01).
 *
 * Organisations, their members, roles and invitations come from the plugin rather than new tables.
 * Teams stay off: a hackathon team is not a team of the organiser, and its participants are not
 * the organiser's members. Our fields sit on the organisation row; `status` cannot be sent by a
 * caller, so every organisation starts `pending` until an operator approves it. Roles carry our
 * organising grants (B-ORG-02) beside Better Auth's own.
 */
export const organisationPlugin = () =>
  organization({
    teams: { enabled: false },
    ac: organisationAc,
    roles: organisationRoles,
    schema: {
      organization: {
        additionalFields: {
          kind: { type: 'string', required: true },
          status: {
            type: 'string',
            required: false,
            input: false,
            defaultValue: 'pending',
          },
          marketCode: { type: 'string', required: true },
          cityCode: { type: 'string', required: false },
          description: { type: 'string', required: true },
          websiteUrl: { type: 'string', required: false },
          ownerLeftAt: { type: 'date', required: false, input: false },
        },
      },
    },
  });

/**
 * Every HTTP path the organisation plugin mounts, for Better Auth's `disabledPaths`.
 *
 * Read from the plugin's own endpoints rather than written out, so a path a later Better Auth
 * version adds is closed with the rest. Our server functions call `auth.api.*`, which never goes
 * through these paths; an endpoint without a path (`addMember`) is server-only already.
 */
export const organisationHttpPaths = (
  plugin: ReturnType<typeof organisationPlugin>,
): string[] =>
  Object.values(plugin.endpoints).flatMap((endpoint) =>
    typeof endpoint.path === 'string' ? [endpoint.path] : [],
  );
