import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ListboxSelect } from './ListboxSelect.js';

const OPTIONS = [
  { value: 'club', label: 'Student club' },
  { value: 'community', label: 'Developer community' },
  { value: 'company', label: 'Company' },
];

const Example = ({ dir = 'ltr' }: { dir?: 'rtl' | 'ltr' }) => {
  const [value, setValue] = useState('');
  return (
    <>
      <label htmlFor="kind">Type</label>
      <ListboxSelect
        dir={dir}
        id="kind"
        onChange={setValue}
        options={OPTIONS}
        placeholder="Choose a type"
        value={value}
      />
      <button type="button">Outside</button>
    </>
  );
};

afterEach(cleanup);

describe('ListboxSelect', () => {
  it.each(['rtl', 'ltr'] as const)(
    'keeps its labelled trigger and options in %s',
    (dir) => {
      render(<Example dir={dir} />);
      const trigger = screen.getByRole('combobox', { name: 'Type' });
      expect(trigger.getAttribute('dir')).toBe(dir);
      fireEvent.click(trigger);
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(screen.getByRole('listbox').getAttribute('dir')).toBe(dir);
      for (const option of screen.getAllByRole('option')) {
        expect(option.getAttribute('dir')).toBe(dir);
      }
      fireEvent.click(screen.getByRole('option', { name: 'Student club' }));
      expect(trigger.textContent).toBe('Student club');
      expect(screen.queryByRole('listbox')).toBeNull();
      expect(document.activeElement).toBe(trigger);
      fireEvent.click(trigger);
      expect(
        screen
          .getByRole('option', { name: 'Student club' })
          .getAttribute('aria-selected'),
      ).toBe('true');
    },
  );

  it('supports arrows, Home, End and keyboard selection with focus on the trigger', () => {
    render(<Example />);
    const trigger = screen.getByRole('combobox');
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    fireEvent.keyDown(trigger, { key: 'ArrowUp' });
    const company = screen.getByRole('option', { name: 'Company' });
    expect(trigger.getAttribute('aria-activedescendant')).toBe(company.id);
    fireEvent.keyDown(trigger, { key: 'Home' });
    expect(trigger.getAttribute('aria-activedescendant')).toBe(
      screen.getByRole('option', { name: 'Student club' }).id,
    );
    fireEvent.keyDown(trigger, { key: 'End' });
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(trigger.textContent).toBe('Company');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('supports type-ahead and closes on Escape without changing the choice', () => {
    render(<Example />);
    const trigger = screen.getByRole('combobox');
    fireEvent.keyDown(trigger, { key: 'd' });
    fireEvent.keyDown(trigger, { key: 'e' });
    expect(trigger.getAttribute('aria-activedescendant')).toBe(
      screen.getByRole('option', { name: 'Developer community' }).id,
    );
    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(trigger.textContent).toBe('Choose a type');
  });

  it('closes on outside clicks and lets Tab leave the field', () => {
    render(<Example />);
    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryByRole('listbox')).toBeNull();
    fireEvent.keyDown(trigger, { key: ' ' });
    expect(screen.getByRole('listbox')).toBeTruthy();
    fireEvent.keyDown(trigger, { key: 'Tab' });
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('forwards validation and focus while preventing interaction when disabled', () => {
    const ref = createRef<HTMLButtonElement>();
    const change = vi.fn();
    render(
      <ListboxSelect
        aria-invalid="true"
        disabled
        id="kind"
        onChange={change}
        options={OPTIONS}
        placeholder="Choose"
        ref={ref}
        value=""
      />,
    );
    const trigger = screen.getByRole('combobox');
    expect(ref.current).toBe(trigger);
    expect(trigger.getAttribute('aria-invalid')).toBe('true');
    fireEvent.click(trigger);
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(change).not.toHaveBeenCalled();
  });
});
