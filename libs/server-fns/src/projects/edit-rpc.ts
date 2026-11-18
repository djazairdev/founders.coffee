import { createServerFn } from '@tanstack/react-start';

import { appValidator, handleResult } from '@founders-coffee/core';
import { projects } from '@founders-coffee/domain';

import { requirePermission } from '../auth-middleware.js';
import { requireAuth } from '../authz.js';
import { getDb } from '../db.js';
import { RATE_BUDGETS } from '../rate-budgets.js';
import { rateLimit } from '../rate-limit.js';
import { privateNoStore } from '../response-cache.js';
import {
  leaveProjectResolver,
  projectEditorResolver,
  updateProjectResolver,
} from './edit.js';

const { projectEdit } = RATE_BUDGETS.edit;

const withinBudget = rateLimit(
  projectEdit.action,
  projectEdit.limit,
  projectEdit.windowMs,
);

/** A project as one of its members sees it on its edit screen (B-PRJ-04). */
export const getProjectEditor = createServerFn({ strict: false })
  .middleware([requirePermission('team', 'join')])
  .validator(appValidator(projects.projectEditorSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      projectEditorResolver(getDb(), {
        slug: data.slug,
        userId: requireAuth(context.session).user.id,
      }),
    );
  });

/** An owner saves their edit of a project, guarded by its version (B-PRJ-04). */
export const updateProject = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([requirePermission('team', 'join'), withinBudget])
  .validator(appValidator(projects.projectEditSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      updateProjectResolver(getDb(), {
        ...data,
        userId: requireAuth(context.session).user.id,
      }),
    );
  });

/** A member takes themselves off a project (B-PRJ-04). */
export const leaveProjectPage = createServerFn({
  method: 'POST',
  strict: false,
})
  .middleware([requirePermission('team', 'join'), withinBudget])
  .validator(appValidator(projects.projectRefSchema))
  .handler(({ context, data }) => {
    privateNoStore();
    return handleResult(
      leaveProjectResolver(getDb(), {
        projectId: data.projectId,
        userId: requireAuth(context.session).user.id,
      }),
    );
  });
