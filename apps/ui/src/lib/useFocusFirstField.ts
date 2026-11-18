import { useEffect, useRef } from 'react';

/**
 * Give focus to a form's first usable field when it opens in place of the button that opened it, so
 * a keyboard user carries on inside it rather than from the top of the page.
 */
export const useFocusFirstField = () => {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    ref.current
      ?.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled)',
      )
      ?.focus();
  }, []);
  return ref;
};
