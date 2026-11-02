import { useEffect } from 'react';

/** Keep the screen on while `active` (iOS 18.4+ in home-screen apps, most other browsers). */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        if (document.visibilityState !== 'visible' || (lock && !lock.released)) return;
        lock = await navigator.wakeLock.request('screen');
        if (cancelled) lock.release().catch(() => {});
      } catch {
        /* denied or unsupported — the app still works, the screen may just sleep */
      }
    };
    // The lock is dropped whenever the app is hidden; take it again on return.
    const onVis = () => document.visibilityState === 'visible' && acquire();

    acquire();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      lock?.release().catch(() => {});
    };
  }, [active]);
}
