import { sql } from 'drizzle-orm';

import { hackathonSubmissionVersions } from './schema.js';

export const lastSubmittedVersion = sql`${hackathonSubmissionVersions.version} = (SELECT max(v.version) FROM hackathon_submission_versions v WHERE v.submission_id = ${hackathonSubmissionVersions.submissionId})`;
