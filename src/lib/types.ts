export type ExerciseKind = 'weighted' | 'bodyweight' | 'duration';

export const MUSCLES = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Forearms',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Core',
  'Full Body',
] as const;
export type Muscle = (typeof MUSCLES)[number];

export const EQUIPMENT = [
  'Barbell',
  'Dumbbell',
  'Machine',
  'Cable',
  'Bodyweight',
  'Kettlebell',
  'Other',
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export interface Exercise {
  id: string;
  name: string;
  muscles: Muscle[];
  equipment: Equipment;
  kind: ExerciseKind;
  /** Default rest after each set, in seconds. Copied into templates when added. */
  defaultRestSec: number;
  isCustom: boolean;
}

export interface TemplateItem {
  /** Stable id for list keys / reordering. */
  id: string;
  exerciseId: string;
  sets: number;
  /** Target reps per set (weighted/bodyweight). Drives the "Try +5 lb" hint. */
  targetReps?: number;
  /** Target seconds per set (duration exercises). */
  targetSec?: number;
  restSec: number;
}

export interface Template {
  id: string;
  name: string;
  items: TemplateItem[];
  updatedAt: number;
}

/** Index 0 = Sunday … 6 = Saturday (matches Date.getDay()). */
export type Weekdays = [
  string | null,
  string | null,
  string | null,
  string | null,
  string | null,
  string | null,
  string | null,
];

export interface Program {
  id: 'main';
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD, inclusive. Undefined = runs indefinitely. */
  endDate?: string;
  weekdays: Weekdays;
}

/**
 * Recorded when the user accepts "You missed X. Shift schedule?".
 * The program from missedDate onward moves `days` later, so the missed
 * workout lands on the day the shift was accepted.
 */
export interface ScheduleShift {
  id?: number;
  missedDate: string;
  /** How many days later everything moves. */
  days: number;
  createdAt: number;
}

/** A single-day override, e.g. from "Move to…". templateId null = rest day. */
export interface DayOverride {
  date: string;
  templateId: string | null;
}

export interface SessionSet {
  weight?: number;
  reps?: number;
  durationSec?: number;
  completedAt?: number;
}

export interface SessionExercise {
  id: string;
  exerciseId: string;
  restSec: number;
  targetReps?: number;
  targetSec?: number;
  sets: SessionSet[];
}

export interface Session {
  id: string;
  /** YYYY-MM-DD — one session per day. */
  date: string;
  templateId: string | null;
  name: string;
  status: 'in-progress' | 'done';
  startedAt: number;
  finishedAt?: number;
  exercises: SessionExercise[];
}

export interface Meta {
  key: string;
  value: unknown;
}
