export const JAPAN_ZONE = 'Asia/Tokyo';

export function japanDate(at = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: JAPAN_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(at);
  const find = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${find('year')}-${find('month')}-${find('day')}`;
}

export function mondayOf(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid date');
  const day = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== date) throw new Error('Invalid date');
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0, 10);
}

export function calendarDays(month: string): Array<{ date: string; day: number }> {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Invalid month');
  const first = new Date(`${month}-01T00:00:00Z`);
  if (Number.isNaN(first.getTime()) || first.toISOString().slice(0, 7) !== month) throw new Error('Invalid month');
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => ({ date: `${month}-${String(i + 1).padStart(2, '0')}`, day: i + 1 }));
}

export function validQuizDate(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
}
