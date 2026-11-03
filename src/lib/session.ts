import { db, newId } from './db';
import type { Exercise, Session, SessionExercise, SessionSet, Template } from './types';

/** Build an (unsaved) session from a template for a date. */
export function sessionFromTemplate(date: string, tpl: Template): Session {
  return {
    id: newId(),
    date,
    templateId: tpl.id,
    name: tpl.name,
    status: 'in-progress',
    startedAt: 0,
    exercises: tpl.items.map((i) => ({
      id: newId(),
      exerciseId: i.exerciseId,
      restSec: i.restSec,
      targetReps: i.targetReps,
      repsPerSet: i.repsPerSet,
      targetSec: i.targetSec,
      notes: i.notes,
      supersetId: i.supersetId,
      sets: Array.from({ length: i.sets }, () => ({})),
    })),
  };
}

export function newSessionExercise(ex: Exercise, sets = 3): SessionExercise {
  return {
    id: newId(),
    exerciseId: ex.id,
    restSec: ex.defaultRestSec,
    sets: Array.from({ length: sets }, () => ({})),
  };
}

/**
 * Apply a change to the session for `draft.date`. If the session hasn't been
 * saved yet (the user is touching a planned workout for the first time), it is
 * saved first — that moment counts as the workout's start.
 */
export async function updateSession(draft: Session, fn: (s: Session) => void) {
  await db.transaction('rw', db.sessions, async () => {
    let s = await db.sessions.where('date').equals(draft.date).first();
    if (!s) s = { ...structuredClone(draft), startedAt: Date.now() };
    fn(s);
    await db.sessions.put(s);
  });
}

export const isSetDone = (s: SessionSet) => s.completedAt != null;

export function sessionStats(s: Session) {
  let sets = 0;
  let volume = 0;
  let total = 0;
  for (const e of s.exercises) {
    for (const set of e.sets) {
      total++;
      if (!isSetDone(set)) continue;
      sets++;
      if (set.weight && set.reps) volume += set.weight * set.reps;
    }
  }
  const end = s.finishedAt ?? Date.now();
  const durationMin = s.startedAt ? Math.max(1, Math.round((end - s.startedAt) / 60000)) : 0;
  return { sets, total, volume, durationMin };
}

/** Completed sets from the most recent earlier session that included each exercise. */
export async function lastPerformance(beforeDate: string, exerciseIds: string[]) {
  const want = new Set(exerciseIds);
  const out = new Map<string, { date: string; sets: SessionSet[] }>();
  if (want.size === 0) return out;
  await db.sessions
    .where('date')
    .below(beforeDate)
    .reverse()
    .until(() => out.size === want.size)
    .each((s) => {
      for (const e of s.exercises) {
        if (!want.has(e.exerciseId) || out.has(e.exerciseId)) continue;
        const done = e.sets.filter(isSetDone);
        if (done.length) out.set(e.exerciseId, { date: s.date, sets: done });
      }
    });
  return out;
}

export const formatWeight = (w: number) => (Number.isInteger(w) ? String(w) : w.toFixed(1).replace(/\.0$/, ''));

/** Rep target for set i (per-set targets win; the last one repeats if sets were added). */
export function repTarget(t: { targetReps?: number; repsPerSet?: number[] }, i: number) {
  if (t.repsPerSet?.length) return t.repsPerSet[Math.min(i, t.repsPerSet.length - 1)];
  return t.targetReps;
}

/** "8", "10/8/6/4" — or '' if there is no target. */
export function formatRepTargets(t: { targetReps?: number; repsPerSet?: number[] }) {
  if (t.repsPerSet?.length) return t.repsPerSet.join('/');
  return t.targetReps ? String(t.targetReps) : '';
}

/** Parse "8" or "10 / 8 / 6 / 4" into target fields. */
export function parseRepTargets(text: string): { targetReps?: number; repsPerSet?: number[] } {
  const nums = (text.match(/\d+/g) ?? []).map(Number).filter((n) => n > 0);
  if (nums.length === 0) return { targetReps: undefined, repsPerSet: undefined };
  if (nums.every((n) => n === nums[0])) return { targetReps: nums[0], repsPerSet: undefined };
  return { targetReps: undefined, repsPerSet: nums };
}

/** [first, last] indices of the run of consecutive items sharing idx's supersetId. */
export function supersetRange(items: { supersetId?: string }[], idx: number): [number, number] {
  const id = items[idx]?.supersetId;
  if (!id) return [idx, idx];
  let a = idx;
  let b = idx;
  while (a > 0 && items[a - 1].supersetId === id) a--;
  while (b < items.length - 1 && items[b + 1].supersetId === id) b++;
  return [a, b];
}

export type SupersetPos = { pos: 'first' | 'mid' | 'last'; letter: string };

/** Position + letter (A, B, …) of each item that belongs to a superset of 2+. */
export function supersetPositions(items: { supersetId?: string }[]): (SupersetPos | undefined)[] {
  const out: (SupersetPos | undefined)[] = [];
  let letter = 0;
  for (let i = 0; i < items.length; i++) {
    const [a, b] = supersetRange(items, i);
    if (a === b) {
      out.push(undefined);
      continue;
    }
    if (i === a) letter++;
    out.push({ pos: i === a ? 'first' : i === b ? 'last' : 'mid', letter: String.fromCharCode(64 + letter) });
  }
  return out;
}
