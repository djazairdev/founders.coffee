import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useFocusAfterChange } from './useFocusAfterChange';

const Section = ({
  value,
  hasButton,
}: {
  value: unknown;
  hasButton: boolean;
}) => {
  const ref = useFocusAfterChange<HTMLHeadingElement>(value);
  return (
    <section>
      <h2 ref={ref} tabIndex={-1}>
        Heading
      </h2>
      {hasButton ? <button type="button">Press</button> : null}
    </section>
  );
};

afterEach(cleanup);

describe('useFocusAfterChange', () => {
  it('moves focus when the change removes the control that held it', () => {
    const { rerender } = render(<Section value="draft" hasButton />);
    screen.getByRole('button').focus();

    rerender(<Section value="sent" hasButton={false} />);

    expect(document.activeElement).toBe(screen.getByRole('heading'));
  });

  it('leaves focus alone when the control is still there', () => {
    const { rerender } = render(<Section value="draft" hasButton />);
    const button = screen.getByRole('button');
    button.focus();

    rerender(<Section value="sent" hasButton />);

    expect(document.activeElement).toBe(button);
  });

  it('takes no focus when a page first loads its value', () => {
    const { rerender } = render(
      <Section value={undefined} hasButton={false} />,
    );

    rerender(<Section value="sent" hasButton={false} />);

    expect(document.activeElement).toBe(document.body);
  });

  it('takes no focus when nothing changed', () => {
    const { rerender } = render(<Section value="draft" hasButton={false} />);

    rerender(<Section value="draft" hasButton={false} />);

    expect(document.activeElement).toBe(document.body);
  });
});
