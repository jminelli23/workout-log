import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { db, newId } from '../lib/db';
import { formatRest } from '../lib/dates';
import type { Exercise, Template, TemplateItem, Weekdays } from '../lib/types';
import { NavBar, Section, Sheet, Stepper } from '../components/ui';
import { formatRepTargets, parseRepTargets, supersetPositions, supersetRange } from '../lib/session';
import { IconDown, IconPlus, IconTrash, IconUp } from '../components/Icons';
import { ExercisePicker, exerciseSubtitle } from './ExercisePicker';

export const REST_OPTIONS = Array.from({ length: 20 }, (_, i) => (i + 1) * 15); // 0:15 … 5:00

export function RestSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const opts = REST_OPTIONS.includes(value) ? REST_OPTIONS : [...REST_OPTIONS, value].sort((a, b) => a - b);
  return (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {opts.map((s) => (
        <option key={s} value={s}>
          {formatRest(s)}
        </option>
      ))}
    </select>
  );
}

export function TemplateEditor({ id, isNew, onBack }: { id: string; isNew?: boolean; onBack: () => void }) {
  const [tpl, setTpl] = useState<Template | null>(null);
  const [picking, setPicking] = useState(false);
  const exercises = useLiveQuery(() => db.exercises.toArray());
  const loaded = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    db.templates.get(id).then((t) => {
      if (t) setTpl(t);
      loaded.current = true;
    });
  }, [id]);

  // Autosave every change.
  useEffect(() => {
    if (tpl && loaded.current) db.templates.put({ ...tpl, updatedAt: Date.now() });
  }, [tpl]);

  useEffect(() => {
    if (isNew && tpl) nameRef.current?.select();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, tpl?.id]);

  if (!tpl || !exercises) return null;
  const byId = new Map(exercises.map((e) => [e.id, e]));

  const setItems = (items: TemplateItem[]) => setTpl({ ...tpl, items });
  const patchItem = (itemId: string, patch: Partial<TemplateItem>) =>
    setItems(tpl.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)));
  const move = (idx: number, dir: -1 | 1) => {
    const items = [...tpl.items];
    [items[idx], items[idx + dir]] = [items[idx + dir], items[idx]];
    setItems(items);
  };

  /** Join item idx and the next item (and its group) into one superset. */
  const link = (idx: number) => {
    const items = [...tpl.items];
    const id = items[idx].supersetId ?? newId();
    const [, b] = supersetRange(items, idx + 1);
    for (let k = idx; k <= b; k++) items[k] = { ...items[k], supersetId: id };
    setItems(items);
  };
  /** Split the superset between idx and idx + 1. */
  const unlink = (idx: number) => {
    const items = [...tpl.items];
    const [a, b] = supersetRange(items, idx);
    const tailId = b - idx > 1 ? newId() : undefined;
    for (let k = idx + 1; k <= b; k++) items[k] = { ...items[k], supersetId: tailId };
    if (idx === a) items[idx] = { ...items[idx], supersetId: undefined };
    setItems(items);
  };
  const ss = supersetPositions(tpl.items);

  const addExercise = (e: Exercise) => {
    const item: TemplateItem = {
      id: newId(),
      exerciseId: e.id,
      sets: 3,
      restSec: e.defaultRestSec,
      ...(e.kind === 'duration' ? { targetSec: 60 } : { targetReps: 8 }),
    };
    setItems([...tpl.items, item]);
    setPicking(false);
  };

  const deleteTemplate = async () => {
    if (!confirm(`Delete “${tpl.name}”? Days using it in your weekly schedule will become rest days. Past logged workouts are kept.`)) return;
    await db.transaction('rw', db.templates, db.program, async () => {
      await db.templates.delete(tpl.id);
      const p = await db.program.get('main');
      if (p) {
        const weekdays = p.weekdays.map((w) => (w === tpl.id ? null : w)) as Weekdays;
        await db.program.update('main', { weekdays });
      }
    });
    onBack();
  };

  return (
    <div className="screen push-enter">
      <NavBar title={tpl.name || 'Template'} back="Program" onBack={onBack} />

      <Section header="Name">
        <div className="row">
          <input
            ref={nameRef}
            className="text-input"
            value={tpl.name}
            placeholder="Workout name"
            onChange={(e) => setTpl({ ...tpl, name: e.target.value })}
            onBlur={() => !tpl.name.trim() && setTpl({ ...tpl, name: 'Untitled Workout' })}
          />
        </div>
      </Section>

      <Section header="Exercises" footer="Rest is how long the timer runs after each set of that exercise.">
        {tpl.items.map((item, idx) => {
          const ex = byId.get(item.exerciseId);
          const isDuration = ex?.kind === 'duration';
          const linked = idx < tpl.items.length - 1 && !!item.supersetId && tpl.items[idx + 1].supersetId === item.supersetId;
          return (
            <div key={item.id} className="row-wrap">
              <div className={`item-card ${ss[idx] ? 'in-superset' : ''}`}>
                <div className="item-head">
                  <div className="row-main">
                    <div className="row-title" style={{ fontWeight: 600 }}>
                      {ex?.name ?? 'Unknown exercise'}
                    </div>
                    {ss[idx] && <span className="ss-chip">Superset {ss[idx]!.letter}</span>}
                    {ex && <div className="row-sub">{exerciseSubtitle(ex)}</div>}
                  </div>
                  <button className="icon-btn" aria-label="Move up" disabled={idx === 0} onClick={() => move(idx, -1)}>
                    <IconUp />
                  </button>
                  <button
                    className="icon-btn"
                    aria-label="Move down"
                    disabled={idx === tpl.items.length - 1}
                    onClick={() => move(idx, 1)}
                  >
                    <IconDown />
                  </button>
                  <button
                    className="icon-btn danger"
                    aria-label="Remove"
                    onClick={() => setItems(tpl.items.filter((i) => i.id !== item.id))}
                  >
                    <IconTrash />
                  </button>
                </div>
                <div className="item-fields">
                  <div className="item-field">
                    <label>Sets</label>
                    <Stepper value={item.sets} min={1} max={12} onChange={(sets) => patchItem(item.id, { sets })} />
                  </div>
                  {isDuration ? (
                    <div className="item-field">
                      <label>Target time</label>
                      <Stepper
                        value={item.targetSec ?? 0}
                        min={0}
                        max={600}
                        step={5}
                        format={(v) => (v ? formatRest(v) : '—')}
                        onChange={(v) => patchItem(item.id, { targetSec: v || undefined })}
                      />
                    </div>
                  ) : (
                    <div className="item-field">
                      <label>Target reps</label>
                      <input
                        className="field-input"
                        defaultValue={formatRepTargets(item)}
                        placeholder="e.g. 8 or 10/8/6/4"
                        inputMode="text"
                        onBlur={(e) => {
                          const t = parseRepTargets(e.target.value);
                          e.target.value = formatRepTargets(t);
                          patchItem(item.id, t);
                        }}
                      />
                    </div>
                  )}
                  <div className="item-field">
                    <label>Rest</label>
                    <RestSelect value={item.restSec} onChange={(restSec) => patchItem(item.id, { restSec })} />
                  </div>
                  {ss[idx] && ss[idx]!.pos !== 'last' && (
                    <div className="section-footer" style={{ padding: 0, marginTop: -4 }}>
                      In a superset, rest runs after the last exercise of the group.
                    </div>
                  )}
                  <div className="item-field">
                    <textarea
                      rows={2}
                      className="field-input notes"
                      defaultValue={item.notes ?? ''}
                      placeholder="Notes (optional)"
                      onBlur={(e) => patchItem(item.id, { notes: e.target.value.trim() || undefined })}
                    />
                  </div>
                </div>
              </div>
              {idx < tpl.items.length - 1 && (
                <button className={`ss-link ${linked ? 'on' : ''}`} onClick={() => (linked ? unlink(idx) : link(idx))}>
                  {linked ? '⛓ Linked as superset · Unlink' : '+ Superset with next'}
                </button>
              )}
            </div>
          );
        })}
        <button className="row action" onClick={() => setPicking(true)}>
          <IconPlus width={20} height={20} />
          <div className="row-main">Add Exercise</div>
        </button>
      </Section>

      <Section>
        <button className="row destructive" onClick={deleteTemplate}>
          Delete Template
        </button>
      </Section>

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
    </div>
  );
}
