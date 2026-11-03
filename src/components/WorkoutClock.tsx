import { useEffect, useState } from 'react';
import { pad } from '../lib/dates';

export const formatElapsed = (ms: number) => {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
};

/** Elapsed time since the workout started; frozen once it's finished. */
export function WorkoutClock({ startedAt, finishedAt }: { startedAt: number; finishedAt?: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (finishedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    const onVis = () => setNow(Date.now());
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [finishedAt]);

  return (
    <span className={`workout-clock ${finishedAt ? 'done' : 'live'}`} role="timer" aria-label="Workout time">
      {!finishedAt && <span className="clock-dot" />}
      {formatElapsed((finishedAt ?? now) - startedAt)}
    </span>
  );
}
