import { useEffect, useRef, useState } from 'react';
import type { ExerciseKind, SessionSet } from '../lib/types';
import { formatWeight, isSetDone } from '../lib/session';
import { IconCheck } from './Icons';

const toStr = (n: number | undefined) => (n == null ? '' : formatWeight(n));
const toNum = (s: string) => {
  if (s.trim() === '' || s.trim() === '-') return undefined;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
};

function NumField({
  value,
  onChange,
  placeholder,
  step,
  min,
  decimal,
  label,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  step: number;
  min: number;
  decimal?: boolean;
  label: string;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const bump = (dir: 1 | -1) => {
    const base = toNum(value) ?? toNum(placeholder ?? '') ?? 0;
    const next = Math.max(min, Math.round((base + dir * step) * 100) / 100);
    onChange(formatWeight(next));
  };
  return (
    <div className="numfield">
      <button tabIndex={-1} aria-label={`Decrease ${label}`} onClick={() => bump(-1)}>
        −
      </button>
      <input
        ref={inputRef}
        aria-label={label}
        inputMode={decimal ? 'decimal' : 'numeric'}
        enterKeyHint="done"
        value={value}
        placeholder={placeholder}
        onFocus={(e) => e.target.select()}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.,-]/g, ''))}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      <button tabIndex={-1} aria-label={`Increase ${label}`} onClick={() => bump(1)}>
        +
      </button>
    </div>
  );
}

export function SetRow({
  index,
  set,
  kind,
  hint,
  onChange,
  onComplete,
  onUncomplete,
}: {
  index: number;
  set: SessionSet;
  kind: ExerciseKind;
  /** Grey placeholder values (last session's numbers, or targets). */
  hint: SessionSet;
  onChange: (patch: Partial<SessionSet>) => void;
  onComplete: (values: Partial<SessionSet>) => void;
  onUncomplete: () => void;
}) {
  const done = isSetDone(set);
  const [w, setW] = useState(toStr(set.weight));
  const [r, setR] = useState(toStr(kind === 'duration' ? set.durationSec : set.reps));
  const weightRef = useRef<HTMLInputElement>(null);
  const repsRef = useRef<HTMLInputElement>(null);
  const editing = useRef(false);

  // Keep local text in sync with saved data when we're not the source of the change.
  useEffect(() => {
    if (editing.current) return;
    setW(toStr(set.weight));
    setR(toStr(kind === 'duration' ? set.durationSec : set.reps));
  }, [set.weight, set.reps, set.durationSec, kind]);

  const commitW = (v: string) => {
    setW(v);
    editing.current = true;
    onChange({ weight: toNum(v) });
    queueMicrotask(() => (editing.current = false));
  };
  const commitR = (v: string) => {
    setR(v);
    editing.current = true;
    const n = toNum(v);
    onChange(kind === 'duration' ? { durationSec: n } : { reps: n });
    queueMicrotask(() => (editing.current = false));
  };

  const toggle = () => {
    if (done) return onUncomplete();
    const weight = toNum(w) ?? hint.weight;
    const second = toNum(r) ?? (kind === 'duration' ? hint.durationSec : hint.reps);
    if (kind === 'weighted' && weight == null) return weightRef.current?.focus();
    if (second == null || second <= 0) return repsRef.current?.focus();
    (document.activeElement as HTMLElement | null)?.blur?.();
    onComplete(
      kind === 'duration'
        ? { durationSec: second, weight }
        : { reps: second, weight: kind === 'bodyweight' && !weight ? undefined : weight },
    );
  };

  const repsHint = kind === 'duration' ? hint.durationSec : hint.reps;

  return (
    <div className={`setrow ${done ? 'done' : ''}`}>
      <span className="set-num">{index + 1}</span>
      {kind === 'duration' ? (
        <span className="numfield-spacer" />
      ) : (
        <NumField
          label="weight"
          value={w}
          onChange={commitW}
          placeholder={hint.weight != null ? formatWeight(hint.weight) : kind === 'bodyweight' ? 'BW' : ''}
          step={5}
          min={kind === 'bodyweight' ? -500 : 0}
          decimal
          inputRef={weightRef}
        />
      )}
      <NumField
        label={kind === 'duration' ? 'seconds' : 'reps'}
        value={r}
        onChange={commitR}
        placeholder={repsHint != null ? String(repsHint) : ''}
        step={kind === 'duration' ? 5 : 1}
        min={0}
        inputRef={repsRef}
      />
      <button className={`set-check ${done ? 'on' : ''}`} aria-label={done ? 'Mark not done' : 'Complete set'} onClick={toggle}>
        <IconCheck />
      </button>
    </div>
  );
}
