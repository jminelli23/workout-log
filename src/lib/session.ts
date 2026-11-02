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
      targetSec: i.targetSec,
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
