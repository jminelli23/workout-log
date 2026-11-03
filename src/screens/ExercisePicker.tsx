import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { db, newId } from '../lib/db';
import { MUSCLES, type Exercise, type Muscle } from '../lib/types';
import { IconPlus, IconSearch } from '../components/Icons';

export function useExerciseFilter(exercises: Exercise[] | undefined, initialMuscle: Muscle | null = null) {
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<Muscle | null>(initialMuscle);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (exercises ?? [])
      .filter((e) => !muscle || e.muscles.includes(muscle))
      .filter((e) => !q || e.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [exercises, query, muscle]);
  return { query, setQuery, muscle, setMuscle, filtered };
}

export function SearchAndFilter({
  query,
  setQuery,
  muscle,
  setMuscle,
}: ReturnType<typeof useExerciseFilter>) {
  return (
    <>
      <label className="search">
        <IconSearch />
        <input
          type="search"
          placeholder="Search exercises"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoCorrect="off"
        />
      </label>
      <div className="chips">
        <button className={`chip ${muscle === null ? 'on' : ''}`} onClick={() => setMuscle(null)}>
          All
        </button>
        {MUSCLES.map((m) => (
          <button key={m} className={`chip ${muscle === m ? 'on' : ''}`} onClick={() => setMuscle(muscle === m ? null : m)}>
            {m}
          </button>
        ))}
      </div>
    </>
  );
}

export const exerciseSubtitle = (e: Exercise) =>
  [e.equipment, e.muscles.join(', ')].filter(Boolean).join(' · ');

/** List of exercises to pick from. Offers to create a custom one if nothing matches. */
export function ExercisePicker({
  onPick,
  initialMuscle,
  exclude,
}: {
  onPick: (e: Exercise) => void;
  /** Start filtered to this muscle (e.g. when swapping). */
  initialMuscle?: Muscle;
  /** Hide this exercise id from the list. */
  exclude?: string;
}) {
  const all = useLiveQuery(() => db.exercises.toArray());
  const exercises = exclude ? all?.filter((e) => e.id !== exclude) : all;
  const f = useExerciseFilter(exercises, initialMuscle ?? null);
  const q = f.query.trim();
  const exact = exercises?.some((e) => e.name.toLowerCase() === q.toLowerCase());

  const createCustom = async () => {
    const ex: Exercise = {
      id: newId(),
      name: q,
      muscles: f.muscle ? [f.muscle] : [],
      equipment: 'Other',
      kind: 'weighted',
      defaultRestSec: 90,
      isCustom: true,
    };
    await db.exercises.add(ex);
    onPick(ex);
  };

  return (
    <>
      <SearchAndFilter {...f} />
      <div className="section">
        <div className="list">
          {q && !exact && (
            <button className="row action" onClick={createCustom}>
              <IconPlus width={20} height={20} />
              <div className="row-main">Create “{q}”</div>
            </button>
          )}
          {f.filtered.map((e) => (
            <button key={e.id} className="row" onClick={() => onPick(e)}>
              <div className="row-main">
                <div className="row-title">{e.name}</div>
                <div className="row-sub">{exerciseSubtitle(e)}</div>
              </div>
            </button>
          ))}
          {f.filtered.length === 0 && !q && <div className="empty">No exercises</div>}
        </div>
      </div>
    </>
  );
}
