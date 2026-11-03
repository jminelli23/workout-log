import { useEffect, useState } from 'react';
import { restTimer, type RestTimer } from '../lib/timer';
import { formatRest } from '../lib/dates';

export function RestTimerInline({ timer }: { timer: RestTimer }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    // Catch up immediately when returning to the app.
    const onVis = () => setNow(Date.now());
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const total = timer.endsAt - timer.startedAt;
  const leftMs = timer.endsAt - now;
  const over = leftMs <= 0;
  const leftSec = Math.ceil(leftMs / 1000);
  const warn = !over && leftSec <= 10;
  const pct = over ? 100 : Math.min(100, Math.max(0, ((total - leftMs) / total) * 100));

  // Forgotten timers clear themselves after 10 minutes of overtime.
  useEffect(() => {
    if (-leftMs > 10 * 60 * 1000) restTimer.clear();
  }, [leftMs]);

  // Vibrate at zero where supported (not on iPhone — Safari has no vibration API).
  useEffect(() => {
    if (over && 'vibrate' in navigator) navigator.vibrate?.([200, 100, 200]);
  }, [over]);

  return (
    <div className={`rest ${over ? 'over' : warn ? 'warn' : ''}`} role="timer" aria-live="polite">
      <div className="rest-bar" style={{ width: `${pct}%` }} />
      <div className="rest-body">
        <div className="rest-main">
          {over ? (
            <>
              <div className="rest-go">GO</div>
              <div className="rest-sub">
                {timer.nextLabel} · +{formatRest(Math.floor(-leftMs / 1000))}
              </div>
            </>
          ) : (
            <>
              <div className="rest-time">{formatRest(leftSec)}</div>
              <div className="rest-sub">Rest · {timer.nextLabel}</div>
            </>
          )}
        </div>
        {!over && (
          <>
            <button className="rest-btn" onClick={() => restTimer.adjust(-15)} aria-label="Subtract 15 seconds">
              −15
            </button>
            <button className="rest-btn" onClick={() => restTimer.adjust(15)} aria-label="Add 15 seconds">
              +15
            </button>
          </>
        )}
        <button className="rest-btn" onClick={() => restTimer.clear()}>
          {over ? 'Dismiss' : 'Skip'}
        </button>
      </div>
    </div>
  );
}
