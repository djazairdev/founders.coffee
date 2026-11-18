import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { visibleOptionMarkup } from '../../../lib/visible-selection';
import { IMPACT_CRITERION } from '../judge-entry-page.fixtures';
import { HackathonJudgeCriterionField } from './HackathonJudgeCriterionField';

afterEach(cleanup);

const markupWith = (value: number | null, option: string) => {
  const { container } = render(
    <HackathonJudgeCriterionField
      criterion={IMPACT_CRITERION}
      draft={{ value, comment: '' }}
      isMissing={false}
      isDisabled={false}
      locale="en"
      onChange={() => undefined}
    />,
  );
  const markup = visibleOptionMarkup(container, option);
  cleanup();
  return markup;
};

describe('the score a judge has chosen', () => {
  it('looks different from the ones they have not', () => {
    expect(markupWith(8, '8')).not.toEqual(markupWith(3, '8'));
    expect(markupWith(8, '8')).not.toEqual(markupWith(null, '8'));
  });

  it('marks the one that is chosen, not merely a different one each time', () => {
    const unchosen = markupWith(null, '3');
    expect(markupWith(8, '3')).toEqual(unchosen);
    expect(markupWith(3, '3')).not.toEqual(unchosen);
  });
});
