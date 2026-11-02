import { useRef } from 'react';
import { addDays, fromISO, todayISO } from '../lib/dates';

export type DayMark = 'planned' | 'done' | 'progress' | 'missed' | undefined;

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Monday of the week containing `iso`. */
export const weekStart = (iso: string) => {
  const dow = fromISO(iso).getDay();
  return addDays(iso, -((dow + 6) % 7));
};

export function WeekStrip({
  selected,
  onSelect,
  marks,
}: {
  selected: string;
  onSelect: (iso: string) => void;
  marks: (iso: string) => DayMark;
}) {
  const start = weekStart(selected);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const today = todayISO();
  const touch = useRef<{ x: number; y: number } | null>(null);

  const shiftWeek = (dir: number) => onSelect(addDays(selected, 7 * dir));

  return (
    <div
      className="weekstrip"
      onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        if (!touch.current) return;
        const dx = e.changedTouches[0].clientX - touch.current.x;
        const dy = e.changedTouches[0].clientY - touch.current.y;
        touch.current = null;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) shiftWeek(dx < 0 ? 1 : -1);
      }}
    >
      {days.map((d) => {
        const m = marks(d);
        const cls = ['wd', d === selected && 'sel', d === today && 'today'].filter(Boolean).join(' ');
        return (
          <button key={d} className={cls} onClick={() => onSelect(d)}>
            <span className="wd-letter">{LETTERS[fromISO(d).getDay()]}</span>
            <span className="wd-num">{fromISO(d).getDate()}</span>
            <span className={`wd-dot ${m ?? ''}`} />
          </button>
        );
      })}
    </div>
  );
}
