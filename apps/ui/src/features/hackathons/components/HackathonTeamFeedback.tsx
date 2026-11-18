import {
  formatNumber,
  hackathon_results_page_criterion_score,
  hackathon_team_feedback_empty,
  hackathon_team_feedback_heading,
  hackathon_team_feedback_judge,
  hackathon_team_feedback_note,
  type Locale,
} from '@founders-coffee/i18n';
import { IsolatedValue } from '@founders-coffee/ui';

import type { TeamPageView } from '../api';

export const HackathonTeamFeedback = ({
  feedback,
  locale,
}: {
  feedback: NonNullable<TeamPageView['feedback']>;
  locale: Locale;
}) => {
  const options = { locale };
  const number = (value: number) => formatNumber(value, locale);
  return (
    <section aria-labelledby="hackathon-team-feedback-heading" className="mt-6">
      <h2 id="hackathon-team-feedback-heading" className="font-display text-h4">
        {hackathon_team_feedback_heading({}, options)}
      </h2>
      <p className="mt-1 font-medium">
        <bdi className="break-words">{feedback.title}</bdi>
      </p>
      {feedback.judges.length === 0 ? (
        <p className="mt-1 text-body-sm text-neutral">
          {hackathon_team_feedback_empty({}, options)}
        </p>
      ) : (
        <>
          <p className="mt-1 text-body-sm text-neutral">
            {hackathon_team_feedback_note({}, options)}
          </p>
          <ul className="mt-3 divide-y divide-base-300 rounded-box border border-base-300">
            {feedback.judges.map((judge) => (
              <li key={judge.number} className="p-3">
                <h3 className="font-medium">
                  {hackathon_team_feedback_judge(
                    { number: number(judge.number) },
                    options,
                  )}
                </h3>
                <ul className="mt-2 grid gap-2">
                  {judge.scores.map((score) => (
                    <li key={score.criterionId} className="text-body-sm">
                      <p className="font-medium">
                        <IsolatedValue
                          value={score.name}
                          message={(name) =>
                            hackathon_results_page_criterion_score(
                              {
                                name,
                                score: number(score.value),
                                scale: number(score.scale),
                              },
                              options,
                            )
                          }
                        />
                      </p>
                      {score.comment ? (
                        <p className="mt-0.5 text-neutral">
                          <bdi className="break-words whitespace-pre-line">
                            {score.comment}
                          </bdi>
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
};
