import { z } from 'zod';

import {
  addEventCreateIssues,
  EVENT_CREATE_FIELDS,
} from '../events/schemas.js';

/**
 * Hold a hackathon's first step, the event it is (B-HKN-11), to every new event's rules for the
 * hackathon's own type: its city, its venue or link for its format, and kickoff to demo day, which
 * may run up to fourteen days. The draft is saved from this alone; the rules, eligibility, AI policy
 * and timeline around it are the next step's, so none of them is assumed here.
 */
const addBasicsIssues = (
  input: z.infer<typeof hackathonBasicsShape>,
  context: z.RefinementCtx,
): void => addEventCreateIssues({ ...input, kind: 'hackathon' }, context);

const hackathonBasicsShape = z.object(EVENT_CREATE_FIELDS).strict();

export const hackathonBasicsSchema =
  hackathonBasicsShape.superRefine(addBasicsIssues);

export type HackathonBasics = z.infer<typeof hackathonBasicsSchema>;
