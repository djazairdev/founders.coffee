import { MapPin } from 'lucide-react';

export const EventCityBadge = ({ cityName }: { cityName: string | null }) =>
  cityName ? (
    <span className="inline-flex items-center gap-1.5 text-body-sm text-neutral">
      <MapPin className="size-4 text-secondary" aria-hidden="true" />
      <span dir="auto">{cityName}</span>
    </span>
  ) : null;
