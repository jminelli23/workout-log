import Dexie, { type Table } from 'dexie';
import { SEED_EXERCISES } from './seed';
import type {
  DayOverride,
  Exercise,
  Meta,
  Program,
  ScheduleShift,
  Session,
  Template,
} from './types';
import { todayISO } from './dates';

class WorkoutDB extends Dexie {
  exercises!: Table<Exercise, string>;
  templates!: Table<Template, string>;
  program!: Table<Program, string>;
  shifts!: Table<ScheduleShift, number>;
  overrides!: Table<DayOverride, string>;
  sessions!: Table<Session, string>;
  meta!: Table<Meta, string>;

  constructor() {
    super('workout-log');
    this.version(1).stores({
      exercises: 'id, name',
      templates: 'id, name',
      program: 'id',
      shifts: '++id, missedDate',
      overrides: 'date',
      sessions: 'id, &date, status',
      meta: 'key',
    });

    this.on('populate', (tx) => {
      tx.table('exercises').bulkAdd(SEED_EXERCISES);
      const program: Program = {
        id: 'main',
        startDate: todayISO(),
        weekdays: [null, null, null, null, null, null, null],
      };
      tx.table('program').add(program);
    });
  }
}

export const db = new WorkoutDB();

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** Ask the browser not to evict our data under storage pressure. */
export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    /* not supported — fine */
  }
}
