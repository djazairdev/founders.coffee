import { Link } from '@tanstack/react-router';

import {
  admin_cohost_nav,
  admin_hkn_nav,
  admin_org_nav,
  type Locale,
} from '@founders-coffee/i18n';

export const OperationsNav = ({ locale }: { locale: Locale }) => (
  <nav className="mb-6">
    <ul className="flex flex-wrap gap-2">
      <li>
        <Link
          className="btn btn-outline btn-xs sm:btn-sm md:btn-md"
          search={{ status: 'pending', page: 0 }}
          to="/organisations"
        >
          {admin_org_nav({}, { locale })}
        </Link>
      </li>
      <li>
        <Link
          className="btn btn-outline btn-xs sm:btn-sm md:btn-md"
          search={{ page: 0 }}
          to="/hackathons"
        >
          {admin_hkn_nav({}, { locale })}
        </Link>
      </li>
      <li>
        <Link
          className="btn btn-outline btn-xs sm:btn-sm md:btn-md"
          search={{}}
          to="/co-hosts"
        >
          {admin_cohost_nav({}, { locale })}
        </Link>
      </li>
    </ul>
  </nav>
);
