import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { addDays, fromISO, todayISO } from './dates';
import type { DayOverride, Program, ScheduleShift, Session, Template } from './types';

export interface ScheduleData {
  program: Program | undefined;
  /** Sorted newest missedDate first. */
  shifts: ScheduleShift[];
  overrides: Map<string, DayOverride>;
  templates: Map<string, Template>;
}

/**
 * Maps a calendar date back to the program date whose workout lands on it,
 * undoing accepted shifts (newest first). Returns null for the gap days a
 * shift leaves behind.
 */
function programDate(date: string, shifts: ScheduleShift[]): string | null {
  let d = date;
  for (const s of shifts) {
    const n = s.days ?? 1;
    if (d < s.missedDate) continue;
    if (d < addDays(s.missedDate, n)) return null;
    d = addDays(d, -n);
  }
  return d;
}

/**
 * Which template (if any) is planned for a date.
 * 1. A DayOverride for the date always wins ("Move to…").
 * 2. Otherwise accepted shifts are undone to find the program date, and the
 *    program's weekday assignment (within its start/end dates) is used.
 */
export function plannedTemplateId(
  date: string,
  program: Program | undefined,
  shifts: ScheduleShift[],
  overrides: Map<string, DayOverride>,
): string | null {
  const o = overrides.get(date);
  if (o) return o.templateId;
  if (!program) return null;
  const sorted = shifts.length > 1 ? [...shifts].sort((a, b) => (a.missedDate < b.missedDate ? 1 : -1)) : shifts;
  const source = programDate(date, sorted);
  if (!source) return null;
  if (source < program.startDate) return null;
  if (program.endDate && source > program.endDate) return null;
  return program.weekdays[fromISO(source).getDay()];
}

export async function loadSchedule(): Promise<ScheduleData> {
  const [program, shifts, overrides, templates] = await Promise.all([
    db.program.get('main'),
    db.shifts.toArray(),
    db.overrides.toArray(),
    db.templates.toArray(),
  ]);
  shifts.sort((a, b) => (a.missedDate < b.missedDate ? 1 : -1));
  return {
    program,
    shifts,
    overrides: new Map(overrides.map((o) => [o.date, o])),
    templates: new Map(templates.map((t) => [t.id, t])),
  };
}

export const plannedFor = (date: string, s: ScheduleData) =>
  plannedTemplateId(date, s.program, s.shifts, s.overrides);

export type DayStatus = 'planned' | 'progress' | 'done' | 'missed' | 'rest';

export function dayStatus(date: string, s: ScheduleData, session: Session | undefined, today = todayISO()): DayStatus {
  if (session?.status === 'done') return 'done';
  if (session) return 'progress';
  if (!plannedFor(date, s)) return 'rest';
  return date < today ? 'missed' : 'planned';
}

/** How far back the missed-workout banner looks. */
const MISSED_LOOKBACK_DAYS = 14;
const ACK_KEY = 'missedAcknowledged';

/**
 * The earliest recent planned workout that wasn't logged and that the user
 * hasn't already dismissed. Days with any logged sets don't count as missed.
 */
export function useMissedWorkout() {
  return useLiveQuery(async () => {
    const today = todayISO();
    const from = addDays(today, -MISSED_LOOKBACK_DAYS);
    const [sched, sessions, ack] = await Promise.all([
      loadSchedule(),
      db.sessions.where('date').between(from, today, true, false).toArray(),
      db.meta.get(ACK_KEY),
    ]);
    const acked = new Set((ack?.value as string[] | undefined) ?? []);
    // Once you've logged a workout after a miss, you've moved on: only misses
    // since the most recent logged workout are offered for shifting.
    const lastLogged = sessions.reduce((m, x) => (x.date > m ? x.date : m), '');
    const start = lastLogged >= from ? addDays(lastLogged, 1) : from;
    const missed: string[] = [];
    for (let d = start; d < today; d = addDays(d, 1)) {
      if (acked.has(d)) continue;
      if (plannedFor(d, sched)) missed.push(d);
    }
    if (!missed.length) return null;
    const date = missed[0];
    const tpl = sched.templates.get(plannedFor(date, sched)!);
    const days = Math.round((fromISO(today).getTime() - fromISO(date).getTime()) / 86400000);
    return { date, days, name: tpl?.name ?? 'Workout', all: missed };
  });
}

/** Shift the program so the workout planned on missedDate lands on today. */
export async function shiftScheduleFrom(missedDate: string) {
  const today = todayISO();
  const days = Math.round((fromISO(today).getTime() - fromISO(missedDate).getTime()) / 86400000);
  if (days <= 0) return;
  await db.shifts.add({ missedDate, days, createdAt: Date.now() });
}

/** "Keep as missed": stop asking about these days. */
export async function acknowledgeMissed(dates: string[]) {
  const ack = await db.meta.get(ACK_KEY);
  const cutoff = addDays(todayISO(), -MISSED_LOOKBACK_DAYS - 1);
  const prev = ((ack?.value as string[] | undefined) ?? []).filter((d) => d >= cutoff);
  await db.meta.put({ key: ACK_KEY, value: [...new Set([...prev, ...dates])] });
}

/**
 * Move a single planned workout to another date without shifting the program.
 * Whatever was planned on the target date is replaced (one workout per day).
 */
export async function moveWorkout(from: string, to: string, templateId: string) {
  await db.transaction('rw', db.overrides, async () => {
    await db.overrides.put({ date: from, templateId: null });
    await db.overrides.put({ date: to, templateId });
  });
}
