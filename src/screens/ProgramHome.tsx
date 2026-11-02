import { useLiveQuery } from 'dexie-react-hooks';
import { db, newId } from '../lib/db';
import { WEEKDAY_LONG, WEEK_ORDER, addDays, todayISO } from '../lib/dates';
import type { Program, Template, Weekdays } from '../lib/types';
import { LinkRow, NavBar, Section } from '../components/ui';
import { IconPlus } from '../components/Icons';
import type { ProgramRoute } from './ProgramTab';

export const templateSummary = (t: Template) => {
  const sets = t.items.reduce((n, i) => n + i.sets, 0);
  const ex = t.items.length;
  return `${ex} exercise${ex === 1 ? '' : 's'} · ${sets} set${sets === 1 ? '' : 's'}`;
};

export function ProgramHome({ push }: { push: (r: ProgramRoute) => void }) {
  const program = useLiveQuery(() => db.program.get('main'));
  const templates = useLiveQuery(() => db.templates.orderBy('name').toArray());
  const exerciseCount = useLiveQuery(() => db.exercises.count());

  if (!program || !templates) return null;

  const update = (patch: Partial<Program>) => db.program.update('main', patch);

  const setDay = (day: number, templateId: string | null) => {
    const weekdays = [...program.weekdays] as Weekdays;
    weekdays[day] = templateId;
    update({ weekdays });
  };

  const newTemplate = async () => {
    const t: Template = { id: newId(), name: 'New Workout', items: [], updatedAt: Date.now() };
    await db.templates.add(t);
    push({ name: 'template', id: t.id, isNew: true });
  };

  return (
    <div className="screen">
      <NavBar />
      <h1 className="large-title">Program</h1>

      <Section
        header="Weekly schedule"
        footer={templates.length === 0 ? 'Create a workout template below, then assign it to days.' : undefined}
      >
        {WEEK_ORDER.map((day) => (
          <label key={day} className="row">
            <div className="row-main">{WEEKDAY_LONG[day]}</div>
            <select
              value={program.weekdays[day] ?? ''}
              onChange={(e) => setDay(day, e.target.value || null)}
              style={{ color: program.weekdays[day] ? 'var(--accent)' : undefined }}
            >
              <option value="">Rest</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        ))}
      </Section>

      <Section
        header="Dates"
        footer={program.endDate ? 'The schedule stops after the end date.' : 'The schedule repeats every week with no end date.'}
      >
        <label className="row">
          <div className="row-main">Starts</div>
          <input
            type="date"
            value={program.startDate}
            onChange={(e) => e.target.value && update({ startDate: e.target.value })}
          />
        </label>
        <label className="row">
          <div className="row-main">Ends</div>
          <select
            value={program.endDate ? 'date' : 'never'}
            onChange={(e) =>
              update({
                endDate:
                  e.target.value === 'date'
                    ? addDays(program.startDate > todayISO() ? program.startDate : todayISO(), 7 * 8 - 1)
                    : undefined,
              })
            }
          >
            <option value="never">Never</option>
            <option value="date">On date</option>
          </select>
        </label>
        {program.endDate && (
          <label className="row">
            <div className="row-main">End date</div>
            <input
              type="date"
              value={program.endDate}
              min={program.startDate}
              onChange={(e) => e.target.value && update({ endDate: e.target.value })}
            />
          </label>
        )}
      </Section>

      <Section header="Workout templates">
        {templates.map((t) => (
          <LinkRow key={t.id} title={t.name} sub={templateSummary(t)} onClick={() => push({ name: 'template', id: t.id })} />
        ))}
        <button className="row action" onClick={newTemplate}>
          <IconPlus width={20} height={20} />
          <div className="row-main">New Template</div>
        </button>
      </Section>

      <Section>
        <LinkRow title="Exercise Library" value={exerciseCount} onClick={() => push({ name: 'library' })} />
      </Section>
    </div>
  );
}
