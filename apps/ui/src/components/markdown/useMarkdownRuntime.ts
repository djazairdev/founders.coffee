import { useEffect, useState, type ComponentType } from 'react';

import type { MarkdownRuntimeProps } from './MarkdownRuntime';

type MarkdownRuntimeState =
  | { status: 'loading' }
  | {
      status: 'ready';
      Component: ComponentType<MarkdownRuntimeProps>;
    }
  | { status: 'error' };

export const useMarkdownRuntime = () => {
  const [state, setState] = useState<MarkdownRuntimeState>({
    status: 'loading',
  });

  useEffect(() => {
    let isActive = true;
    void import('./MarkdownRuntime')
      .then(({ MarkdownRuntime }) => {
        if (isActive) setState({ status: 'ready', Component: MarkdownRuntime });
      })
      .catch(() => {
        if (isActive) setState({ status: 'error' });
      });
    return () => {
      isActive = false;
    };
  }, []);

  return state;
};
