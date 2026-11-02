import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { db, newId } from '../lib/db';
import { EQUIPMENT, MUSCLES, type Exercise, type ExerciseKind } from '../lib/types';
import { LinkRow, NavBar, Section } from '../components/ui';
import { IconPlus } from '../components/Icons';
import { SearchAndFilter, exerciseSubtitle, useExerciseFilter } from './ExercisePicker';
import { RestSelect } from './TemplateEditor';
import type { ProgramRoute } from './ProgramTab';

export function ExerciseLibrary({ push, onBack }: { push: (r: ProgramRoute) => void; onBack: () => void }) {
  const exercises = useLiveQuery(() => db.exercises.toArray());
  const f = useExerciseFilter(exercises);

  return (
    <div className="screen push-enter">
      <NavBar
        title="Exercises"
        back="Program"
        onBack={onBack}
        right={
          <button className="nav-btn" aria-label="New exercise" onClick={() => push({ name: 'exercise', id: null })}>
            <IconPlus width={24} height={24} />
          </button>
        }
      />
      <SearchAndFilter {...f} />
      <Section>
        {f.filtered.map((e) => (
          <LinkRow
            key={e.id}
            title={
              <>
                {e.name}
                {e.isCustom && <span className="badge">Custom</span>}
              </>
            }
            sub={exerciseSubtitle(e)}
            onClick={() => push({ name: 'exercise', id: e.id })}
          />
        ))}
        {f.filtered.length === 0 && <div className="empty">No matching exercises</div>}
      </Section>
    </div>
  );
}

const KIND_LABEL: Record<ExerciseKind, string> = {
  weighted: 'Weight × reps',
  bodyweight: 'Bodyweight (+ optional weight)',
  duration: 'Duration',
};

export function ExerciseEditor({ id, onBack }: { id: string | null; onBack: () => void }) {
  const [ex, setEx] = useState<Exercise | null>(null);

  useEffect(() => {
    if (id) db.exercises.get(id).then((e) => e && setEx(e));
    else
      setEx({
        id: newId(),
        name: '',
        muscles: [],
        equipment: 'Barbell',
        kind: 'weighted',
        defaultRestSec: 90,
        isCustom: true,
      });
  }, [id]);

  if (!ex) return null;
  const isNew = id === null;
  const canSave = ex.name.trim().length > 0;

  const save = async () => {
    if (!canSave) return;
    await db.exercises.put({ ...ex, name: ex.name.trim() });
    onBack();
  };

  const remove = async () => {
    const [inTemplates, inSessions] = await Promise.all([
      db.templates.filter((t) => t.items.some((i) => i.exerciseId === ex.id)).count(),
      db.sessions.filter((s) => s.exercises.some((i) => i.exerciseId === ex.id)).count(),
    ]);
    if (inTemplates || inSessions) {
      alert(
        `“${ex.name}” is used in ${inTemplates} template(s) and ${inSessions} logged workout(s), so it can’t be deleted. Remove it from those templates first.`,
      );
      return;
    }
    if (!confirm(`Delete “${ex.name}”?`)) return;
    await db.exercises.delete(ex.id);
    onBack();
  };

  const toggleMuscle = (m: (typeof MUSCLES)[number]) =>
    setEx({ ...ex, muscles: ex.muscles.includes(m) ? ex.muscles.filter((x) => x !== m) : [...ex.muscles, m] });

  return (
    <div className="screen push-enter">
      <NavBar
        title={isNew ? 'New Exercise' : 'Edit Exercise'}
        left={
          <button className="nav-btn" onClick={onBack}>
            Cancel
          </button>
        }
        right={
          <button className="nav-btn bold" disabled={!canSave} onClick={save}>
            {isNew ? 'Add' : 'Save'}
          </button>
        }
      />

      <Section header="Name">
        <div className="row">
          <input
            className="text-input"
            value={ex.name}
            placeholder="e.g. Incline Smith Press"
            autoFocus={isNew}
            onChange={(e) => setEx({ ...ex, name: e.target.value })}
          />
        </div>
      </Section>

      <Section header="Details">
        <label className="row">
          <div className="row-main">Logged as</div>
          <select value={ex.kind} onChange={(e) => setEx({ ...ex, kind: e.target.value as ExerciseKind })}>
            {(Object.keys(KIND_LABEL) as ExerciseKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="row">
          <div className="row-main">Equipment</div>
          <select value={ex.equipment} onChange={(e) => setEx({ ...ex, equipment: e.target.value as Exercise['equipment'] })}>
            {EQUIPMENT.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        </label>
        <label className="row">
          <div className="row-main">Default rest</div>
          <RestSelect value={ex.defaultRestSec} onChange={(defaultRestSec) => setEx({ ...ex, defaultRestSec })} />
        </label>
      </Section>
      <div className="section-footer" style={{ marginTop: -18, marginBottom: 16, padding: '0 32px' }}>
        Default rest is used when you add this exercise to a template. You can change it per template.
      </div>

      <div className="section-header" style={{ margin: '16px 16px 0' }}>Muscles</div>
      <div className="chips" style={{ flexWrap: 'wrap', paddingTop: 6 }}>
        {MUSCLES.map((m) => (
          <button key={m} className={`chip ${ex.muscles.includes(m) ? 'on' : ''}`} onClick={() => toggleMuscle(m)}>
            {m}
          </button>
        ))}
      </div>

      {!isNew && ex.isCustom && (
        <Section>
          <button className="row destructive" onClick={remove}>
            Delete Exercise
          </button>
        </Section>
      )}
    </div>
  );
}
