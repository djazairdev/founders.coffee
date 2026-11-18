import { z } from 'zod';

import { AppError, err, type Result } from '@founders-coffee/core';
import {
  hackathonDeadlinesUpdate,
  hackathonDetailsWrite,
  hackathonSectionDraftDelete,
  hackathonSectionDraftWrite,
  hackathonSettingsUpdate,
  syncChatChannel,
  touchHackathonDetails,
  type Db,
  type HackathonEditWrite,
  type HackathonDeadlines,
  type HackathonSettings,
} from '@founders-coffee/db';
import { hackathons } from '@founders-coffee/domain';

import { moveHackathonReminders } from '../notifications/hackathon-reminders.js';
import {
  deadlinesInputOf,
  loadHackathonEdit,
  runHackathonEdit,
  settingsInputOf,
} from './edit-context.js';

type Section = 'deadlines' | 'settings';
type Saved = { readonly eventId: string; readonly version: number };
type SectionValue =
  hackathons.HackathonDeadlinesInput | hackathons.HackathonSettingsInput;

const validationError = (error: z.ZodError, section: Section) => {
  const flat = z.flattenError(error);
  return new AppError(
    'validation_failed',
    section === 'deadlines'
      ? 'The deadlines do not fit the event'
      : 'The details do not fit the event',
    { fields: flat.fieldErrors, formErrors: flat.formErrors },
  );
};

const storedDetails = (details: hackathons.HackathonDetailsInput) => ({
  rules: details.rules ?? null,
  minimumAge: details.minimumAge ?? null,
  attendanceModes: details.attendanceModes,
  teamMin: details.teamMin,
  teamMax: details.teamMax,
  capacity: details.capacity ?? null,
  registrationOpensAt: new Date(details.registrationOpensAt),
  registrationClosesAt: new Date(details.registrationClosesAt),
  submissionDeadlineAt: new Date(details.submissionDeadlineAt),
  judgingEndsAt: new Date(details.judgingEndsAt),
  aiPolicy: details.aiPolicy,
  aiPolicyNote: details.aiPolicyNote ?? null,
  licenceNote: details.licenceNote ?? null,
});

const storedDeadlines = (
  deadlines: hackathons.HackathonDeadlinesInput,
): HackathonDeadlines => ({
  registrationOpensAt: new Date(deadlines.registrationOpensAt),
  registrationClosesAt: new Date(deadlines.registrationClosesAt),
  submissionDeadlineAt: new Date(deadlines.submissionDeadlineAt),
  judgingEndsAt: new Date(deadlines.judgingEndsAt),
});

const storedSettings = (
  settings: hackathons.HackathonSettingsInput,
): HackathonSettings => ({
  rules: settings.rules ?? null,
  minimumAge: settings.minimumAge ?? null,
  attendanceModes: [...settings.attendanceModes],
  teamMin: settings.teamMin,
  teamMax: settings.teamMax,
  capacity: settings.capacity ?? null,
  aiPolicy: settings.aiPolicy,
  aiPolicyNote: settings.aiPolicyNote ?? null,
  licenceNote: settings.licenceNote ?? null,
});

const invalidStoredSection = (error: z.ZodError) =>
  new AppError('hackathon_save_failed', 'A saved section could not be read', {
    issues: error.issues.map((issue) => ({ path: issue.path })),
  });

const saveSection = async (
  db: Db,
  input: {
    readonly eventId: string;
    readonly version: number;
    readonly organisationId: string;
    readonly section: Section;
    readonly value: SectionValue;
  },
  now: number,
): Promise<Result<Saved>> => {
  const loaded = await loadHackathonEdit(db, input, now);
  if (!loaded.ok) return loaded;
  const { event } = loaded.data.rows;
  const frame = {
    startsAt: event.startsAt.getTime(),
    endsAt: event.endsAt.getTime(),
    format: event.format,
  };

  let deadlines: hackathons.HackathonDeadlinesInput | null = null;
  let settings: hackathons.HackathonSettingsInput | null = null;
  if (input.section === 'deadlines') {
    const checked = hackathons
      .hackathonDeadlinesFor(frame)
      .safeParse(input.value);
    if (!checked.success)
      return err(validationError(checked.error, 'deadlines'));
    deadlines = checked.data;
    if (loaded.data.rows.details) {
      settings = settingsInputOf(loaded.data.rows.details);
    } else if (
      loaded.data.rows.sectionDrafts?.settings !== null &&
      loaded.data.rows.sectionDrafts?.settings !== undefined
    ) {
      const parsed = hackathons.hackathonSettingsSchema.safeParse(
        loaded.data.rows.sectionDrafts.settings,
      );
      if (!parsed.success) return err(invalidStoredSection(parsed.error));
      settings = parsed.data;
    }
  } else {
    const checked = hackathons
      .hackathonSettingsFor(frame)
      .safeParse(input.value);
    if (!checked.success)
      return err(validationError(checked.error, 'settings'));
    settings = checked.data;
    if (loaded.data.rows.details) {
      deadlines = deadlinesInputOf(loaded.data.rows.details);
    } else if (
      loaded.data.rows.sectionDrafts?.deadlines !== null &&
      loaded.data.rows.sectionDrafts?.deadlines !== undefined
    ) {
      const parsed = hackathons.hackathonDeadlinesSchema.safeParse(
        loaded.data.rows.sectionDrafts.deadlines,
      );
      if (!parsed.success) return err(invalidStoredSection(parsed.error));
      deadlines = parsed.data;
    }
  }

  const currentDetails = loaded.data.details;
  let nextDetails: hackathons.HackathonDetailsInput | null = null;
  if (deadlines && settings) {
    const parsed = hackathons.hackathonDetailsFor(frame).safeParse({
      ...deadlines,
      ...settings,
    });
    if (!parsed.success)
      return err(validationError(parsed.error, input.section));
    nextDetails = parsed.data;
  }
  if (currentDetails && nextDetails) {
    const locked = hackathons.lockedDetailChanges(
      currentDetails,
      nextDetails,
      loaded.data.stage,
      now,
    );
    if (locked.length > 0)
      return err(
        new AppError(
          'hackathon_field_locked',
          'Registration has opened, so these details cannot change that way',
          { fields: locked },
        ),
      );
  }

  const fillsBothSections = deadlines !== null && settings !== null;
  let writes: HackathonEditWrite[];
  if (currentDetails) {
    if (input.section === 'deadlines' && deadlines) {
      writes = [
        hackathonDeadlinesUpdate(db, {
          eventId: input.eventId,
          version: input.version,
          deadlines: storedDeadlines(deadlines),
        }),
        syncChatChannel(db, input.eventId),
        touchHackathonDetails(db, {
          eventId: input.eventId,
          version: input.version,
        }),
      ];
    } else if (input.section === 'settings' && settings) {
      writes = [
        hackathonSettingsUpdate(db, {
          eventId: input.eventId,
          version: input.version,
          settings: storedSettings(settings),
        }),
      ];
    } else {
      return err(
        new AppError('hackathon_save_failed', 'A saved section is incomplete'),
      );
    }
  } else if (fillsBothSections && nextDetails) {
    writes = [
      hackathonDetailsWrite(db, {
        eventId: input.eventId,
        version: input.version,
        details: storedDetails(nextDetails),
      }),
      hackathonSectionDraftDelete(db, {
        eventId: input.eventId,
        version: input.version,
      }),
    ];
  } else {
    writes = [
      hackathonSectionDraftWrite(db, {
        eventId: input.eventId,
        version: input.version,
        section: input.section,
        value: input.value,
      }),
    ];
  }

  const saved = await runHackathonEdit(db, loaded.data, {
    operation: `hackathon_${input.section}_saved`,
    organisationId: input.organisationId,
    writes,
    isSingleRow: true,
  });
  if (
    saved.ok &&
    (input.section === 'deadlines' || !currentDetails) &&
    fillsBothSections
  )
    await moveHackathonReminders(db, input.eventId, now);
  return saved;
};

export const saveHackathonDeadlinesResolver = (
  db: Db,
  input: {
    readonly eventId: string;
    readonly version: number;
    readonly organisationId: string;
    readonly deadlines: hackathons.HackathonDeadlinesInput;
  },
  now: number = Date.now(),
) =>
  saveSection(
    db,
    {
      ...input,
      section: 'deadlines',
      value: input.deadlines,
    },
    now,
  );

export const saveHackathonSettingsResolver = (
  db: Db,
  input: {
    readonly eventId: string;
    readonly version: number;
    readonly organisationId: string;
    readonly settings: hackathons.HackathonSettingsInput;
  },
  now: number = Date.now(),
) =>
  saveSection(
    db,
    {
      ...input,
      section: 'settings',
      value: input.settings,
    },
    now,
  );
