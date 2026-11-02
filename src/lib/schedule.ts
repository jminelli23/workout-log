import { addDays, fromISO } from './dates';
import type { DayOverride, Program, ScheduleShift } from './types';

/**
 * Works out which template (if any) is planned for a date.
 *
 * 1. A DayOverride for the date always wins ("Move to…").
 * 2. Otherwise, each accepted schedule shift whose missedDate is before this
 *    date pushes the program one day later, so we look up the weekday of
 *    (date − number of earlier shifts).
 * 3. The program's start/end dates are shifted too.
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

  const offset = shifts.filter((s) => s.missedDate < date).length;
  // A day whose workout was missed and shifted shows nothing planned.
  if (shifts.some((s) => s.missedDate === date)) return null;

  const source = addDays(date, -offset);
  if (source < program.startDate) return null;
  if (program.endDate && source > program.endDate) return null;
  return program.weekdays[fromISO(source).getDay()];
}
