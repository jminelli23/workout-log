import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { db } from '../lib/db';
import { addDays, formatLong, todayISO } from '../lib/dates';
import { plannedTemplateId } from '../lib/schedule';
import {
  formatWeight,
  isSetDone,
  lastPerformance,
  newSessionExercise,
  sessionFromTemplate,
  sessionStats,
  updateSession,
} from '../lib/session';
import type { Exercise, Session } from '../lib/types';
import { NavBar, Sheet } from '../components/ui';
import { WeekStrip, weekStart, type DayMark } from '../components/WeekStrip';
import { ExerciseCard } from '../components/ExerciseCard';
import { IconPlus } from '../components/Icons';
import { ExercisePicker } from './ExercisePicker';
import { restTimer, useRestTimer } from '../lib/timer';
import { unlockAudio } from '../lib/sound';
import { useWakeLock } from '../lib/wakeLock';

export function TodayTab() {
  const [date, setDate] = useState(todayISO());
  const [editing, setEditing] = useState(false);
  const [picking, setPicking] = useState(false);
  const [summary, setSummary] = useState(false);
  const today = todayISO();
  const timer = useRestTimer();

  const data = useLiveQuery(async () => {
    const ws = weekStart(date);
    const [program, shifts, overrides, templates, exercises, weekSessions] = await Promise.all([
      db.program.get('main'),
      db.shifts.toArray(),
      db.overrides.toArray(),
      db.templates.toArray(),
      db.exercises.toArray(),
      db.sessions.where('date').between(ws, addDays(ws, 6), true, true).toArray(),
    ]);
    return {
      program,
      shifts,
      overrides: new Map(overrides.map((o) => [o.date, o])),
      templates: new Map(templates.map((t) => [t.id, t])),
      exercises: new Map(exercises.map((e) => [e.id, e])),
      weekSessions: new Map(weekSessions.map((s) => [s.date, s])),
    };
  }, [date]);

  const planned = data ? plannedTemplateId(date, data.program, data.shifts, data.overrides) : null;
  const tpl = planned ? data?.templates.get(planned) : undefined;
  const saved = data?.weekSessions.get(date);

  // A saved session wins; otherwise show the planned template as an unsaved draft.
  const draft = useMemo<Session | null>(
    () => (tpl ? sessionFromTemplate(date, tpl) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [date, tpl?.id, tpl?.updatedAt],
  );
  const session = saved ?? draft;

  const exerciseIds = session?.exercises.map((e) => e.exerciseId) ?? [];
  const last = useLiveQuery(() => lastPerformance(date, exerciseIds), [date, exerciseIds.join()]);

  const isTodayView = date === today;
  useWakeLock((isTodayView && saved?.status === 'in-progress') || timer?.date === date);

  if (!data) return null;

  const marks = (d: string): DayMark => {
    const s = data.weekSessions.get(d);
    if (s?.status === 'done') return 'done';
    if (s) return 'progress';
    return plannedTemplateId(d, data.program, data.shifts, data.overrides) ? 'planned' : undefined;
  };

  const select = (d: string) => {
    setDate(d);
    setEditing(false);
    window.scrollTo(0, 0);
  };

  const mutate = (fn: (s: Session) => void) => session && updateSession(session, fn);

  const stats = saved ? sessionStats(saved) : null;
  const allDone = !!saved && stats!.total > 0 && stats!.sets === stats!.total;

  /** Start rest after completing set i of exercise idx — unless it was the last set left. */
  const startRest = (idx: number, i: number) => {
    if (!session || date !== today) return;
    const exs = session.exercises;
    const open = (e: number, k: number) => !(e === idx && k === i) && !isSetDone(exs[e].sets[k]);
    const se = exs[idx];
    let label: string | null = null;
    for (let k = i + 1; k < se.sets.length && !label; k++) if (open(idx, k)) label = `Set ${k + 1} of ${se.sets.length}`;
    for (let e = idx + 1; e < exs.length && !label; e++)
      if (exs[e].sets.some((_, k) => open(e, k))) label = `Next: ${data.exercises.get(exs[e].exerciseId)?.name ?? 'exercise'}`;
    for (let e = 0; e <= idx && !label; e++)
      exs[e].sets.forEach((_, k) => {
        if (!label && open(e, k)) label = e === idx ? `Set ${k + 1} of ${se.sets.length}` : `Next: ${data.exercises.get(exs[e].exerciseId)?.name ?? 'exercise'}`;
      });
    if (!label) return restTimer.clear();
    restTimer.start({ date, seId: se.id, setIdx: i, nextLabel: label }, se.restSec);
  };

  const finish = async () => {
    await mutate((s) => {
      s.status = 'done';
      s.finishedAt = Date.now();
    });
    if (timer?.date === date) restTimer.clear();
    setEditing(false);
    setSummary(true);
  };

  const reset = async () => {
    if (!saved) return;
    if (!confirm('Reset this workout? Everything logged for this day will be cleared and it will go back to the planned template.')) return;
    if (timer?.date === date) restTimer.clear();
    await db.sessions.delete(saved.id);
    setEditing(false);
  };

  const addExercise = (e: Exercise) => {
    mutate((s) => void s.exercises.push(newSessionExercise(e)));
    setPicking(false);
  };

  const isToday = isTodayView;

  return (
    <div className="screen">
      <NavBar
        left={
          !isToday ? (
            <button className="nav-btn" onClick={() => select(today)}>
              Today
            </button>
          ) : undefined
        }
        right={
          session ? (
            <button className={`nav-btn ${editing ? 'bold' : ''}`} onClick={() => setEditing(!editing)}>
              {editing ? 'Done' : 'Edit'}
            </button>
          ) : undefined
        }
      />
      <WeekStrip selected={date} onSelect={select} marks={marks} />

      <div className="day-head">
        <div className="day-date">{isToday ? `Today · ${formatLong(date)}` : formatLong(date)}</div>
        <h1 className="large-title" style={{ padding: 0 }}>
          {session?.name ?? 'Rest Day'}
        </h1>
        {saved?.status === 'done' && stats && (
          <button className="done-pill" onClick={() => setSummary(true)}>
            ✓ Completed · {stats.sets} sets · {stats.durationMin} min
          </button>
        )}
      </div>

      {!session && (
        <div className="empty">
          <p>{date < today ? 'Nothing was planned' : 'Nothing is planned'} for this day.</p>
        </div>
      )}

      {session && allDone && saved?.status !== 'done' && (
        <div className="finish-banner">
          <div>
            <strong>All sets complete</strong>
            <div className="row-sub">Nice work. Finish to save your summary.</div>
          </div>
          <button className="btn-primary small" onClick={finish}>
            Finish
          </button>
        </div>
      )}

      {session?.exercises.map((se, idx) => (
        <ExerciseCard
          key={se.id}
          se={se}
          exercise={data.exercises.get(se.exerciseId)}
          last={last?.get(se.exerciseId)?.sets}
          timer={timer && timer.date === date && timer.seId === se.id ? timer : undefined}
          editing={editing}
          isFirst={idx === 0}
          isLast={idx === session.exercises.length - 1}
          onSetChange={(i, patch) => mutate((s) => Object.assign(s.exercises[idx].sets[i], patch))}
          onComplete={(i, v) => {
            unlockAudio(); // must run inside the tap for iOS to allow sound
            startRest(idx, i);
            mutate((s) => void Object.assign(s.exercises[idx].sets[i], v, { completedAt: Date.now() }));
          }}
          onUncomplete={(i) => {
            restTimer.clearIf(se.id, i);
            mutate((s) => void delete s.exercises[idx].sets[i].completedAt);
          }}
          onAddSet={() => mutate((s) => void s.exercises[idx].sets.push({}))}
          onRemoveSet={() => mutate((s) => void s.exercises[idx].sets.pop())}
          onMove={(dir) =>
            mutate((s) => {
              const ex = s.exercises;
              [ex[idx], ex[idx + dir]] = [ex[idx + dir], ex[idx]];
            })
          }
          onRemove={() => {
            const name = data.exercises.get(se.exerciseId)?.name ?? 'this exercise';
            if (confirm(`Remove ${name} from this workout? (Your template isn’t changed.)`)) {
              if (timer?.seId === se.id) restTimer.clear();
              mutate((s) => void s.exercises.splice(idx, 1));
            }
          }}
        />
      ))}

      {session && (
        <div className="day-actions">
          <button className="btn-secondary" onClick={() => setPicking(true)}>
            <IconPlus width={18} height={18} /> Add Exercise
          </button>
          {saved?.status !== 'done' && (
            <button className="btn-primary" disabled={!stats || stats.sets === 0} onClick={finish}>
              Finish Workout
            </button>
          )}
          {editing && saved && (
            <button className="btn-text danger" onClick={reset}>
              Reset Workout
            </button>
          )}
          {session.exercises.length > 0 && (
            <p className="section-footer" style={{ textAlign: 'center' }}>
              Changes here only affect this day, not your template.
            </p>
          )}
        </div>
      )}

      {picking && (
        <Sheet onClose={() => setPicking(false)}>
          <NavBar
            title="Add Exercise"
            left={
              <button className="nav-btn" onClick={() => setPicking(false)}>
                Cancel
              </button>
            }
          />
          <ExercisePicker onPick={addExercise} />
        </Sheet>
      )}

      {summary && saved && <SummarySheet session={saved} exercises={data.exercises} onClose={() => setSummary(false)} />}
    </div>
  );
}

function SummarySheet({
  session,
  exercises,
  onClose,
}: {
  session: Session;
  exercises: Map<string, Exercise>;
  onClose: () => void;
}) {
  const st = sessionStats(session);
  return (
    <Sheet onClose={onClose}>
      <NavBar
        title="Workout Complete"
        right={
          <button className="nav-btn bold" onClick={onClose}>
            Done
          </button>
        }
      />
      <div className="summary-stats">
        <div>
          <div className="stat-val">{st.durationMin}</div>
          <div className="stat-label">minutes</div>
        </div>
        <div>
          <div className="stat-val">
            {st.sets}
            <span className="stat-of">/{st.total}</span>
          </div>
          <div className="stat-label">sets</div>
        </div>
        <div>
          <div className="stat-val">{st.volume.toLocaleString()}</div>
          <div className="stat-label">lbs volume</div>
        </div>
      </div>
      <div className="section">
        <div className="list">
          {session.exercises.map((se) => {
            const ex = exercises.get(se.exerciseId);
            const done = se.sets.filter(isSetDone);
            const txt = done
              .map((s) =>
                ex?.kind === 'duration'
                  ? `${s.durationSec}s`
                  : `${s.weight != null ? formatWeight(s.weight) : 'BW'}×${s.reps}`,
              )
              .join(', ');
            return (
              <div key={se.id} className="row">
                <div className="row-main">
                  <div className="row-title">{ex?.name}</div>
                  <div className="row-sub" style={{ whiteSpace: 'normal' }}>
                    {txt || 'Skipped'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Sheet>
  );
}
