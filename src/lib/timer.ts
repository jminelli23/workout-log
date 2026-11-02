import { useSyncExternalStore } from 'react';
import { cancelChimes, scheduleChimes } from './sound';

/**
 * The single active rest timer. Stored as timestamps (not a ticking counter),
 * so it stays correct if the app is backgrounded, the screen locks, or the
 * app is closed and reopened.
 */
export interface RestTimer {
  date: string;
  /** SessionExercise.id + set index of the set that started it. */
  seId: string;
  setIdx: number;
  startedAt: number;
  endsAt: number;
  /** e.g. "Set 3 of 4" or "Next: Dip". */
  nextLabel: string;
}

const KEY = 'rest-timer';
/** Timers this far past their end are dropped. */
const STALE_MS = 10 * 60 * 1000;

let state: RestTimer | null = load();
const listeners = new Set<() => void>();

function load(): RestTimer | null {
  try {
    const t = JSON.parse(localStorage.getItem(KEY) ?? 'null') as RestTimer | null;
    return t && Date.now() - t.endsAt < STALE_MS ? t : null;
  } catch {
    return null;
  }
}

function set(next: RestTimer | null) {
  state = next;
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
  if (next) scheduleChimes(next.endsAt);
  else cancelChimes();
  listeners.forEach((l) => l());
}

export const restTimer = {
  get: () => state,
  start(t: Omit<RestTimer, 'startedAt' | 'endsAt'>, restSec: number) {
    const now = Date.now();
    set({ ...t, startedAt: now, endsAt: now + restSec * 1000 });
  },
  adjust(deltaSec: number) {
    if (!state) return;
    const endsAt = Math.max(Date.now(), state.endsAt + deltaSec * 1000);
    set({ ...state, endsAt });
  },
  clear() {
    set(null);
  },
  /** Clear only if this set owns the timer (e.g. the set was un-completed). */
  clearIf(seId: string, setIdx: number) {
    if (state && state.seId === seId && state.setIdx === setIdx) set(null);
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export const useRestTimer = () => useSyncExternalStore(restTimer.subscribe, restTimer.get);
