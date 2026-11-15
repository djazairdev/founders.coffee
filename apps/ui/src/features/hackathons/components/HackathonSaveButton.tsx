import type { MouseEventHandler, ReactNode } from 'react';
import { Save } from 'lucide-react';

import { Button } from '@founders-coffee/ui';

export const HackathonSaveButton = ({
  children,
  className,
  isBusy = false,
  onClick,
  type = 'button',
}: {
  children: ReactNode;
  className?: string;
  isBusy?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit';
}) => (
  <Button
    type={type}
    variant="primary"
    className={className}
    isBusy={isBusy}
    onClick={onClick}
  >
    <Save aria-hidden="true" className="size-4" />
    {children}
  </Button>
);
