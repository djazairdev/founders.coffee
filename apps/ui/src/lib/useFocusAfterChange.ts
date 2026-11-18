import { useEffect, useRef } from 'react';

/**
 * Give focus to the returned element when `value` changes and the change took the focused control
 * with it, which leaves focus on the page itself and a keyboard user back at the top.
 *
 * The first value a page loads is not a change, and a change that leaves focus where it was moves
 * nothing, so neither takes focus from anyone.
 */
export const useFocusAfterChange = <T extends HTMLElement>(value: unknown) => {
  const ref = useRef<T>(null);
  const previous = useRef(value);
  useEffect(() => {
    const before = previous.current;
    previous.current = value;
    if (before === value || before === undefined || before === null) return;
    if (document.activeElement === document.body) ref.current?.focus();
  }, [value]);
  return ref;
};
