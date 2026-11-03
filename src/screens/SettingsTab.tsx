import { useRef, useState } from 'react';
import { applyImport, buildImport, type ImportPlan } from '../lib/importPlan';
import { formatRest, WEEK_ORDER, WEEKDAY_SHORT } from '../lib/dates';
import { formatRepTargets, supersetPositions } from '../lib/session';
import { NavBar, Section, Sheet } from '../components/ui';

export function SettingsTab({ onImported }: { onImported: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const onFile = async (f: File | undefined) => {
    setError(null);
    setDone(null);
    if (!f) return;
    try {
      setPlan(await buildImport(await f.text()));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that file.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="screen">
      <NavBar />
      <h1 className="large-title">Settings</h1>

      <Section
        header="Import"
        footer={
          <>
            Import a workout plan from a CSV file with the columns Day, Order, Block, Exercise, Sets, Reps, Rest, Notes.
            Each Day becomes a template; templates with the same name are replaced.
          </>
        }
      >
        <button className="row action" onClick={() => fileRef.current?.click()}>
          <div className="row-main">Import Plan from CSV…</div>
        </button>
      </Section>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv,text/plain"
        style={{ display: 'none' }}
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      {error && <div className="notice error">{error}</div>}
      {done && <div className="notice ok">{done}</div>}

      <Section header="Backup" footer="Backup, restore and the weekly backup reminder arrive in a later step.">
        <div className="row" style={{ color: 'var(--text-3)' }}>
          <div className="row-main">Export Backup</div>
        </div>
      </Section>

      {plan && (
        <ImportPreview
          plan={plan}
          onCancel={() => setPlan(null)}
          onDone={(msg) => {
            setPlan(null);
            setDone(msg);
            onImported();
          }}
        />
      )}
    </div>
  );
}

function ImportPreview({ plan, onCancel, onDone }: { plan: ImportPlan; onCancel: () => void; onDone: (msg: string) => void }) {
  const [days, setDays] = useState<Record<string, number[]>>(() => Object.fromEntries(plan.templates.map((t) => [t.name, []])));
  const [busy, setBusy] = useState(false);
  const newIds = new Set(plan.newExercises.map((e) => e.id));

  const toggle = (name: string, d: number) =>
    setDays((cur) => {
      const next: Record<string, number[]> = {};
      // A weekday holds one workout, so picking it for one template removes it from the others.
      for (const [n, ds] of Object.entries(cur)) next[n] = ds.filter((x) => x !== d);
      if (!cur[name].includes(d)) next[name] = [...next[name], d];
      return next;
    });

  const run = async () => {
    setBusy(true);
    await applyImport(plan, days);
    const n = plan.templates.length;
    onDone(`Imported ${n} template${n === 1 ? '' : 's'}${plan.newExercises.length ? ` and ${plan.newExercises.length} new exercises` : ''}.`);
  };

  return (
    <Sheet onClose={onCancel}>
      <NavBar
        title="Import Plan"
        left={
          <button className="nav-btn" onClick={onCancel}>
            Cancel
          </button>
        }
        right={
          <button className="nav-btn bold" disabled={busy} onClick={run}>
            Import
          </button>
        }
      />
      {plan.warnings.length > 0 && (
        <div className="notice warn">
          {plan.warnings.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>
      )}
      {plan.templates.map((t) => {
        const ss = supersetPositions(t.items.map((i) => i.item));
        return (
          <div key={t.name}>
            <div className="section-header" style={{ margin: '16px 16px 0' }}>
              {t.name} · {t.items.length} exercises{t.existingId ? ' · replaces existing' : ''}
            </div>
            <div className="weekday-pick">
              {WEEK_ORDER.map((d) => (
                <button key={d} className={`chip ${days[t.name].includes(d) ? 'on' : ''}`} onClick={() => toggle(t.name, d)}>
                  {WEEKDAY_SHORT[d]}
                </button>
              ))}
            </div>
            <div className="section">
              <div className="list">
                {t.items.map(({ item, exerciseName }, i) => (
                  <div key={item.id} className="row" style={ss[i] ? { boxShadow: 'inset 3px 0 0 var(--orange)' } : undefined}>
                    <div className="row-main">
                      <div className="row-title">
                        {exerciseName}
                        {newIds.has(item.exerciseId) && <span className="badge">New</span>}
                      </div>
                      <div className="row-sub">
                        {ss[i] && `Superset ${ss[i]!.letter} · `}
                        {item.sets} × {formatRepTargets(item) || '—'} · Rest {formatRest(item.restSec)}
                      </div>
                      {item.notes && <div className="ex-notes">{item.notes}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
      <div className="section-footer" style={{ padding: '0 32px 16px' }}>
        Tap the days for each workout. “New” exercises are added to your library; you can edit their details there.
      </div>
    </Sheet>
  );
}
