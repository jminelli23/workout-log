import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import { db } from '../lib/db';
import { addDays, pad, todayISO, toISO } from '../lib/dates';
import { dayStatus, loadSchedule, plannedFor } from '../lib/schedule';
import { NavBar } from '../components/ui';
import { IconBack } from '../components/Icons';

const HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function CalendarTab({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  const today = todayISO();
  const [ym, setYm] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const touch = useRef<{ x: number; y: number } | null>(null);

  const first = new Date(ym.y, ym.m, 1);
  const lead = (first.getDay() + 6) % 7; // Monday-first
  const gridStart = addDays(toISO(first), -lead);
  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate();
  const weeks = Math.ceil((lead + daysInMonth) / 7);
  const cells = Array.from({ length: weeks * 7 }, (_, i) => addDays(gridStart, i));
  const monthPrefix = `${ym.y}-${pad(ym.m + 1)}`;

  const data = useLiveQuery(async () => {
    const [sched, sessions] = await Promise.all([
      loadSchedule(),
      db.sessions.where('date').between(cells[0], cells[cells.length - 1], true, true).toArray(),
    ]);
    return { sched, sessions: new Map(sessions.map((s) => [s.date, s])) };
  }, [monthPrefix]);

  const go = (delta: number) =>
    setYm(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  const isCurrentMonth = monthPrefix === today.slice(0, 7);

  return (
    <div className="screen">
      <NavBar
        right={
          !isCurrentMonth ? (
            <button
              className="nav-btn"
              onClick={() => {
                const d = new Date();
                setYm({ y: d.getFullYear(), m: d.getMonth() });
              }}
            >
              Today
            </button>
          ) : undefined
        }
      />
      <div className="cal-head">
        <h1 className="large-title" style={{ padding: 0 }}>
          {first.toLocaleDateString(undefined, { month: 'long' })}
          <span className="cal-year"> {ym.y}</span>
        </h1>
        <div className="cal-arrows">
          <button className="icon-btn" aria-label="Previous month" onClick={() => go(-1)}>
            <IconBack />
          </button>
          <button className="icon-btn" aria-label="Next month" onClick={() => go(1)} style={{ transform: 'scaleX(-1)' }}>
            <IconBack />
          </button>
        </div>
      </div>

      <div
        className="cal"
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          if (!touch.current) return;
          const dx = e.changedTouches[0].clientX - touch.current.x;
          const dy = e.changedTouches[0].clientY - touch.current.y;
          touch.current = null;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
        }}
      >
        {HEADERS.map((h, i) => (
          <div key={i} className="cal-h">
            {h}
          </div>
        ))}
        {cells.map((d) => {
          const inMonth = d.startsWith(monthPrefix);
          const session = data?.sessions.get(d);
          const status = data ? dayStatus(d, data.sched, session, today) : 'rest';
          const tid = data ? plannedFor(d, data.sched) : null;
          const label = session?.name ?? (tid ? data?.sched.templates.get(tid)?.name : undefined);
          return (
            <button
              key={d}
              className={`cal-cell ${inMonth ? '' : 'out'} ${d === today ? 'today' : ''}`}
              onClick={() => onOpenDay(d)}
            >
              <span className="cal-num">{Number(d.slice(8))}</span>
              {label && status !== 'rest' && <span className={`cal-label ${status}`}>{label}</span>}
            </button>
          );
        })}
      </div>

      <div className="cal-legend">
        <span><i className="planned" /> Planned</span>
        <span><i className="progress" /> In progress</span>
        <span><i className="done" /> Done</span>
        <span><i className="missed" /> Missed</span>
      </div>
    </div>
  );
}
