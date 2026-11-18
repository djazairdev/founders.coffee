import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { FormField } from './FormField.js';

afterEach(cleanup);

describe('FormField', () => {
  it('names an optional field with a real space before the hint (#475)', () => {
    render(
      <FormField id="note" label="Comment" isOptional optionalLabel="Optional">
        <textarea id="note" />
      </FormField>,
    );

    expect(screen.getByRole('textbox').labels?.[0]?.textContent).toBe(
      'Comment (optional)',
    );
  });

  it('adds nothing to a required field', () => {
    render(
      <FormField id="note" label="Comment" optionalLabel="Optional">
        <textarea id="note" />
      </FormField>,
    );

    expect(screen.getByRole('textbox').labels?.[0]?.textContent).toBe(
      'Comment',
    );
  });
});
