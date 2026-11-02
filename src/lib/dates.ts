/** All dates in the app are local-time YYYY-MM-DD strings. */

export const pad = (n: number) => String(n).padStart(2, '0');

export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const fromISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const todayISO = () => toISO(new Date());

export const addDays = (iso: string, n: number) => {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/** Display order for the weekly schedule: Monday first. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const formatLong = (iso: string) =>
  fromISO(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

export const formatShort = (iso: string) =>
  fromISO(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

export const formatRest = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${pad(s)}`;
};
