import { getHackathon, type Db } from '@founders-coffee/db';
import { reportError } from '@founders-coffee/observability';

import { scheduleJudgeReminders } from './hackathon-reminders.js';
import { enqueueHackathonTeamNotices } from './hackathon-team.js';

/**
 * Tell a member who just accepted to judge that they are in, and schedule the notice that judging
 * has opened (B-JDG-11). Invites go out as links with no address behind them, so this is the first
 * moment a judge has one to write to. A failure is reported, never thrown: their place is taken.
 */
export const notifyJudgeAccepted = async (
  db: Db,
  opts: { readonly eventId: string; readonly userId: string },
): Promise<void> => {
  try {
    const found = await getHackathon(db, opts.eventId);
    if (!found) return;
    await enqueueHackathonTeamNotices(db, {
      templateKey: 'hackathon_judge_accepted',
      event: found.event,
      recipients: [opts.userId],
      team: '',
      name: null,
    });
    await scheduleJudgeReminders(db, opts);
  } catch (error) {
    reportError(error, {
      operation: 'notify_judge_accepted',
      eventId: opts.eventId,
    });
  }
};
