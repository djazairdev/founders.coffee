import { useEffect, useState, type ComponentType } from 'react';

import type { HackathonMilkdownRuntimeProps } from './components/HackathonMilkdownRuntime';

type HackathonMilkdownRuntimeState =
  | { status: 'loading' }
  | {
      status: 'ready';
      Component: ComponentType<HackathonMilkdownRuntimeProps>;
    }
  | { status: 'error' };

export const useHackathonMilkdownRuntime = () => {
  const [state, setState] = useState<HackathonMilkdownRuntimeState>({
    status: 'loading',
  });

  useEffect(() => {
    let isActive = true;
    void import('./components/HackathonMilkdownRuntime')
      .then(({ HackathonMilkdownRuntime }) => {
        if (isActive)
          setState({ status: 'ready', Component: HackathonMilkdownRuntime });
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
