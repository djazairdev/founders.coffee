import { eq, projects as projectRows, type Db } from '@founders-coffee/db';
import { projects } from '@founders-coffee/domain';

import {
  leaveProjectResolver,
  projectEditorResolver,
  updateProjectResolver,
} from '../../projects/edit.js';
import {
  confirmProjectListingResolver,
  createProjectFromEntryResolver,
  publishProjectResolver,
} from '../../projects/from-entry.js';
import {
  removeScreenshotResolver,
  reserveScreenshotResolver,
} from '../screenshots.js';
import { saveSubmissionDraftResolver } from '../submission-drafts.js';
import { submissionPageResolver } from '../submission-page.js';
import { submitSubmissionResolver } from '../submission-submit.js';
import {
  everyone,
  everyoneBut,
  inEveryPhase,
  may,
  whilePublished,
  selfOf,
  type Cells,
  type Operations,
} from './matrix.fixtures.js';
import { entryDraft } from './seeds.fixtures.js';

/** A project's edit screen is reached by its slug, which the matrix's world does not hold. */
const projectSlugOf = async (db: Db, projectId: string): Promise<string> => {
  const [row] = await db
    .select({ slug: projectRows.slug })
    .from(projectRows)
    .where(eq(projectRows.id, projectId))
    .limit(1);
  return row?.slug ?? '';
};

const captainWhileBuilding: Cells = {
  ...whilePublished(everyone('deadline_passed')),
  open: everyone('building_not_started'),
  building: everyoneBut('not_team_captain', { captain: 'ok' }),
};

export const SUBMISSION_OPERATIONS: Operations = {
  getHackathonSubmissionPage: {
    gate: may('submission', 'create'),
    run: (call) => submissionPageResolver(call.db, selfOf(call)),
    cells: whilePublished(everyone('ok')),
  },
  saveHackathonSubmissionDraft: {
    gate: may('submission', 'create'),
    changesWorld: true,
    run: (call) =>
      saveSubmissionDraftResolver(call.db, {
        ...selfOf(call),
        version: call.world.entryVersion,
        draft: entryDraft(call.world.trackId),
      }),
    cells: captainWhileBuilding,
  },
  submitHackathonSubmission: {
    gate: may('submission', 'create'),
    changesWorld: true,
    run: (call) =>
      submitSubmissionResolver(call.db, null, {
        ...selfOf(call),
        version: call.world.entryVersion,
      }),
    cells: captainWhileBuilding,
  },
  reserveHackathonScreenshot: {
    gate: may('submission', 'create'),
    changesWorld: true,
    run: (call) => reserveScreenshotResolver(call.db, selfOf(call)),
    cells: captainWhileBuilding,
  },
  removeHackathonScreenshot: {
    gate: may('submission', 'create'),
    changesWorld: true,
    run: (call) =>
      removeScreenshotResolver(call.db, {
        ...selfOf(call),
        screenshotId: 'sht_missing',
      }),
    cells: {
      ...captainWhileBuilding,
      building: everyoneBut('not_team_captain', { captain: 'not_found' }),
    },
  },
  createHackathonProject: {
    gate: may('team', 'join'),
    changesWorld: true,
    run: (call) => createProjectFromEntryResolver(call.db, null, selfOf(call)),
    cells: {
      ...whilePublished(
        everyoneBut('not_team_captain', { captain: 'project_not_available' }),
      ),
      results: everyoneBut('not_team_captain', { captain: 'ok' }),
    },
  },
  confirmHackathonProject: {
    gate: may('team', 'join'),
    changesWorld: true,
    needs: 'project',
    run: ({ db, world, userId }) =>
      confirmProjectListingResolver(db, {
        projectId: world.projectId,
        userId,
      }),
    cells: inEveryPhase(everyone('project_not_found'), {
      results: everyoneBut('project_not_found', {
        captain: 'ok',
        member: 'ok',
      }),
    }),
  },
  getProjectEditor: {
    gate: may('team', 'join'),
    needs: 'project',
    run: async ({ db, world, userId }) =>
      projectEditorResolver(db, {
        slug: await projectSlugOf(db, world.projectId),
        userId,
      }),
    cells: inEveryPhase(everyone('project_not_found'), {
      results: everyoneBut('project_not_found', {
        captain: 'ok',
        member: 'ok',
      }),
    }),
  },
  updateProject: {
    gate: may('team', 'join'),
    changesWorld: true,
    needs: 'project',
    run: ({ db, world, userId }) =>
      updateProjectResolver(db, {
        ...projects.projectEditSchema.parse({
          projectId: world.projectId,
          expectedVersion: 1,
          stage: 'launched',
        }),
        userId,
      }),
    cells: inEveryPhase(everyone('project_not_found'), {
      results: everyoneBut('project_not_found', {
        captain: 'ok',
        member: 'not_project_owner',
      }),
    }),
  },
  leaveProjectPage: {
    gate: may('team', 'join'),
    changesWorld: true,
    needs: 'project',
    run: ({ db, world, userId }) =>
      leaveProjectResolver(db, { projectId: world.projectId, userId }),
    cells: inEveryPhase(everyone('project_not_found'), {
      results: everyoneBut('project_not_found', {
        captain: 'ok',
        member: 'ok',
      }),
    }),
  },
  publishHackathonProject: {
    gate: may('team', 'join'),
    changesWorld: true,
    needs: 'confirmedProject',
    run: ({ db, world, userId }) =>
      publishProjectResolver(db, null, {
        projectId: world.projectId,
        userId,
      }),
    cells: inEveryPhase(everyone('project_not_found'), {
      results: everyoneBut('project_not_found', {
        captain: 'ok',
        member: 'not_project_owner',
      }),
    }),
  },
};
