import { TZDate } from 'react-day-picker';

export const dateValue = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const parseDateValue = (value: string, timeZone: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new TZDate(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    timeZone,
  );
  return dateValue(date) === value ? date : null;
};
