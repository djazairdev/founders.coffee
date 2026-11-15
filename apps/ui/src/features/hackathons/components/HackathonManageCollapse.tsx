import type { ReactNode } from 'react';

export const HackathonManageCollapse = ({
  title,
  isInitiallyOpen = false,
  children,
}: {
  title: string;
  isInitiallyOpen?: boolean;
  children: ReactNode;
}) => (
  <details
    open={isInitiallyOpen}
    className="collapse collapse-arrow mt-6 border border-base-300 bg-base-100"
  >
    <summary className="collapse-title font-display text-h4 after:start-5 after:end-auto pe-4 ps-12">
      {title}
    </summary>
    <div className="collapse-content">
      <div className="grid gap-6 [&>*]:!mt-0">{children}</div>
    </div>
  </details>
);
