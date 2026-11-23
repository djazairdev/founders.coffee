import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { id } from '@founders-coffee/core';

import { HackathonApplicationAnswerReview } from './HackathonApplicationAnswerReview';

afterEach(cleanup);

describe('HackathonApplicationAnswerReview', () => {
  it('reveals readable answers while keeping them collapsed by default', () => {
    const question = {
      id: id('qst'),
      scope: 'participant' as const,
      type: 'long_text' as const,
      label: 'ما المشروع الذي ستبنيه؟',
      isRequired: true,
      options: [],
    };
    render(
      <HackathonApplicationAnswerReview
        questions={[question]}
        answers={[{ questionId: question.id, value: 'منصة تعليمية' }]}
        locale="ar"
      />,
    );

    const disclosure = screen.getByText(/مراجعة الإجابات/u).closest('details');
    expect(disclosure?.open).toBe(false);
    fireEvent.click(screen.getByText(/مراجعة الإجابات/u));
    expect(disclosure?.open).toBe(true);
    expect(screen.getByText('ما المشروع الذي ستبنيه؟')).toBeTruthy();
    expect(screen.getByText('منصة تعليمية')).toBeTruthy();
  });
});
