import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EventFormatField } from './EventFormatField';

describe('EventFormatField', () => {
  afterEach(cleanup);

  it('keeps the event form chip presentation by default', () => {
    const { getByRole, getByText } = render(
      <EventFormatField locale="en" value="online" onChange={vi.fn()} />,
    );

    const online = getByRole('radio', { name: 'Online' });

    expect((online as HTMLInputElement).checked).toBe(true);
    expect(online.classList.contains('sr-only')).toBe(true);
    expect(getByText('Online').closest('label')?.className).toContain(
      'rounded-full',
    );
  });

  it('renders the radio-list presentation one format per line', () => {
    const onChange = vi.fn();
    const { getByRole } = render(
      <EventFormatField
        locale="en"
        value="online"
        presentation="radio-list"
        onChange={onChange}
      />,
    );

    const online = getByRole('radio', { name: 'Online' });
    const inPerson = getByRole('radio', { name: 'In person' });

    expect(online.classList.contains('radio')).toBe(true);
    expect(online.closest('label')?.className).toContain('min-h-11');
    fireEvent.click(inPerson);
    expect(onChange).toHaveBeenCalledWith('in_person');
  });
});
