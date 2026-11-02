import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { addDays, formatLong, todayISO } from '../lib/dates';
import { plannedTemplateId } from '../lib/schedule';
import { NavBar, Section } from '../components/ui';
import { templateSummary } from './ProgramHome';

/** Temporary Today screen for step 1: shows the next 7 planned days. Replaced in step 2. */
export function TodayPreview() {
  const data = useLiveQuery(async () => {
    const [program, shifts, overrides, templates] = await Promise.all([
      db.program.get('main'),
      db.shifts.toArray(),
      db.overrides.toArray(),
      db.templates.toArray(),
    ]);
    return { program, shifts, overrides: new Map(overrides.map((o) => [o.date, o])), templates };
  });
  if (!data) return null;

  const tplById = new Map(data.templates.map((t) => [t.id, t]));
  const today = todayISO();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  return (
    <div className="screen">
      <NavBar />
      <h1 className="large-title">Today</h1>
      <Section header="Next 7 days" footer="Set logging, the week strip and the rest timer arrive in the next steps.">
        {days.map((d, i) => {
          const tid = plannedTemplateId(d, data.program, data.shifts, data.overrides);
          const t = tid ? tplById.get(tid) : undefined;
          return (
            <div key={d} className="row">
              <div className="row-main">
                <div className="row-title" style={{ fontWeight: i === 0 ? 600 : undefined }}>
                  {i === 0 ? 'Today' : formatLong(d)}
                </div>
                <div className="row-sub">{t ? `${t.name} · ${templateSummary(t)}` : 'Rest'}</div>
              </div>
            </div>
          );
        })}
      </Section>
    </div>
  );
}
