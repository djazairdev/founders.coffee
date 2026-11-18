import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Button } from './Button.js';

afterEach(cleanup);

describe('Button while it is busy', () => {
  it('keeps focus, so a keyboard user does not lose their place (#471)', () => {
    const { rerender } = render(<Button>Save</Button>);
    const button = screen.getByRole('button');
    button.focus();

    rerender(<Button isBusy>Save</Button>);

    expect(document.activeElement).toBe(button);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.hasAttribute('disabled')).toBe(false);
    expect(button.className).toContain('btn-disabled');
  });

  it('ignores another press', () => {
    const onClick = vi.fn();
    render(
      <Button isBusy onClick={onClick}>
        Save
      </Button>,
    );

    fireEvent.click(screen.getByRole('button'));

    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not submit its form again', () => {
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    const { container } = render(
      <form>
        <Button type="submit" isBusy>
          Save
        </Button>
      </form>,
    );
    container.querySelector('form')?.addEventListener('submit', onSubmit);

    fireEvent.click(screen.getByRole('button'));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('presses as normal once it is not', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);

    fireEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByRole('button').hasAttribute('aria-disabled')).toBe(
      false,
    );
  });
});
