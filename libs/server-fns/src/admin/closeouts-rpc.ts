import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';

import { roleAllows } from '@founders-coffee/auth';
import { appValidator, handleResult } from '@founders-coffee/core';
import { operations } from '@founders-coffee/domain';

import { requirePermission } from '../auth-middleware.js';
import { requireAuth } from '../authz.js';
import { getDb } from '../db.js';
import { RATE_BUDGETS } from '../rate-budgets.js';
import { limitedTo } from '../rate-limit.js';
import { privateNoStore } from '../response-cache.js';
import { adminAccessSubject } from './access-subject.js';
import {
  createMissingCloseoutResolver,
  listMissingCloseoutsResolver,
} from './closeouts.js';
import type { MissingCloseouts } from './closeouts.js';

const listSchema = z.strictObject({});

export type MissingCloseoutsRequest = z.input<typeof listSchema>;
export type AdminMissingCloseouts = MissingCloseouts & {
  readonly canCreate: boolean;
};
export type CreateMissingCloseoutRequest = z.input<
  typeof operations.createAdminCloseoutSchema
>;

export const listAdminMissingCloseouts = createServerFn({ strict: false })
  .middleware([requirePermission('operations', 'read')])
  .validator(appValidator(listSchema))
  .handler(async ({ context }) => {
    privateNoStore();
    const result = await listMissingCloseoutsResolver(getDb());
    if (!result.ok) return handleResult(Promise.resolve(result));
    const role = requireAuth(context.session).user.role;
    return {
      ...result.data,
      canCreate: roleAllows(role, { closeout: ['override'] }),
    };
  });

export const createAdminMissingCloseout = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([
    requirePermission('closeout', 'override'),
    limitedTo(RATE_BUDGETS.edit.adminCloseoutCreation),
  ])
  .validator(appValidator(operations.createAdminCloseoutSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      createMissingCloseoutResolver(getDb(), data, {
        actorId: requireAuth(context.session).user.id,
        accessSubject: adminAccessSubject(getRequest().headers),
      }),
    );
  });
