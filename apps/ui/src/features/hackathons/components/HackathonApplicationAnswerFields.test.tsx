import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { id } from '@founders-coffee/core';

import { HackathonApplicationAnswerFields } from './HackathonApplicationAnswerFields';

afterEach(cleanup);

describe('HackathonApplicationAnswerFields', () => {
  it('renders choices accessibly and reports the selected answer', () => {
    const question = {
      id: id('qst'),
      scope: 'participant' as const,
      type: 'single_choice' as const,
      label: 'Which track interests you?',
      isRequired: true,
      options: ['AI', 'Accessibility'],
    };
    const onChange = vi.fn();
    render(
      <HackathonApplicationAnswerFields
        questions={[question]}
        answers={[]}
        locale="en"
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: 'AI' }));

    expect(onChange).toHaveBeenCalledWith([
      { questionId: question.id, value: 'AI' },
    ]);
    expect(screen.getByText('Required')).toBeTruthy();
  });
});
