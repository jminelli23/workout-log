import type { Exercise, SessionExercise, SessionSet } from '../lib/types';
import { formatRest } from '../lib/dates';
import { formatRepTargets, isSetDone, repTarget, type SupersetPos } from '../lib/session';
import { IconDown, IconTrash, IconUp } from './Icons';
import { SetRow } from './SetRow';
import { RestTimerInline } from './RestTimerInline';
import type { RestTimer } from '../lib/timer';
import { Fragment } from 'react';

export function ExerciseCard({
  se,
  exercise,
  last,
  timer,
  superset,
  swappedFromName,
  onSwap,
  editing,
  isFirst,
  isLast,
  onSetChange,
  onComplete,
  onUncomplete,
  onAddSet,
  onRemoveSet,
  onMove,
  onRemove,
}: {
  se: SessionExercise;
  exercise: Exercise | undefined;
  last?: SessionSet[];
  /** The active rest timer, if it belongs to this exercise. */
  timer?: RestTimer;
  superset?: SupersetPos;
  /** Name of the planned exercise this one replaced today. */
  swappedFromName?: string;
  onSwap: () => void;
  editing: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSetChange: (i: number, patch: Partial<SessionSet>) => void;
  onComplete: (i: number, values: Partial<SessionSet>) => void;
  onUncomplete: (i: number) => void;
  onAddSet: () => void;
  onRemoveSet: () => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const kind = exercise?.kind ?? 'weighted';
  const doneCount = se.sets.filter(isSetDone).length;
  const target =
    kind === 'duration'
      ? se.targetSec
        ? ` × ${formatRest(se.targetSec)}`
        : ''
      : formatRepTargets(se)
        ? ` × ${formatRepTargets(se)}`
        : '';

  const hintFor = (i: number): SessionSet => {
    if (last && last.length) {
      const l = last[Math.min(i, last.length - 1)];
      return { weight: l.weight, reps: l.reps, durationSec: l.durationSec };
    }
    return { reps: repTarget(se, i), durationSec: se.targetSec };
  };

  const allDone = doneCount === se.sets.length && se.sets.length > 0;

  return (
    <div className={`ex-card ${superset ? `ss ss-${superset.pos}` : ''}`}>
      <div className="ex-head">
        <div className="row-main" style={{ padding: 0 }}>
          {superset && <span className="ss-chip">Superset {superset.letter}</span>}
          <div className={`ex-name ${allDone ? 'complete' : ''}`}>{exercise?.name ?? 'Unknown exercise'}</div>
          <div className="row-sub">
            {se.sets.length} set{se.sets.length === 1 ? '' : 's'}
            {target} · Rest {formatRest(se.restSec)}
            {doneCount > 0 && !allDone && ` · ${doneCount}/${se.sets.length} done`}
          </div>
          {swappedFromName && <div className="swapped">⇄ Instead of {swappedFromName}</div>}
          {se.notes && <div className="ex-notes">{se.notes}</div>}
        </div>
        {!editing && (
          <button className="swap-btn" onClick={onSwap} aria-label="Swap exercise">
            ⇄ Swap
          </button>
        )}
        {editing && (
          <>
            <button className="icon-btn" aria-label="Move up" disabled={isFirst} onClick={() => onMove(-1)}>
              <IconUp />
            </button>
            <button className="icon-btn" aria-label="Move down" disabled={isLast} onClick={() => onMove(1)}>
              <IconDown />
            </button>
            <button className="icon-btn danger" aria-label="Remove exercise" onClick={onRemove}>
              <IconTrash />
            </button>
          </>
        )}
      </div>

      <div className="setrow setrow-head">
        <span className="set-num">Set</span>
        {kind === 'duration' ? <span className="numfield-spacer" /> : <span className="col-label">{kind === 'bodyweight' ? '+lbs' : 'lbs'}</span>}
        <span className="col-label">{kind === 'duration' ? 'sec' : 'reps'}</span>
        <span className="set-check-spacer" />
      </div>

      {se.sets.map((set, i) => (
        <Fragment key={i}>
        <SetRow
          index={i}
          set={set}
          kind={kind}
          hint={hintFor(i)}
          onChange={(p) => onSetChange(i, p)}
          onComplete={(v) => onComplete(i, v)}
          onUncomplete={() => onUncomplete(i)}
        />
        {timer && timer.setIdx === i && <RestTimerInline timer={timer} />}
        </Fragment>
      ))}

      <div className="ex-foot">
        <button className="link-btn" onClick={onAddSet}>
          + Add Set
        </button>
        {se.sets.length > 1 && !isSetDone(se.sets[se.sets.length - 1]) && (
          <button className="link-btn muted" onClick={onRemoveSet}>
            Remove Set
          </button>
        )}
      </div>
    </div>
  );
}
