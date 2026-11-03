/**
 * Timer chimes via Web Audio.
 *
 * Sounds are scheduled on the audio clock (not setTimeout), so they fire on time
 * even if the page's JS timers are throttled. iOS only allows audio after a user
 * gesture, so unlockAudio() is called when a set is completed.
 */

let ctx: AudioContext | null = null;
let scheduled: AudioScheduledSourceNode[] = [];

type NavWithAudioSession = Navigator & { audioSession?: { type: string } };

/**
 * 'mix'  — chimes mix with Spotify/Apple Music (default). iOS then also mutes
 *          them when the silent switch is on.
 * 'loud' — chimes play through the silent switch, but iOS pauses other audio.
 */
export type SoundMode = 'mix' | 'loud';
const MODE_KEY = 'timerSoundMode';

export function getSoundMode(): SoundMode {
  try {
    return localStorage.getItem(MODE_KEY) === 'loud' ? 'loud' : 'mix';
  } catch {
    return 'mix';
  }
}
export function setSoundMode(m: SoundMode) {
  try {
    localStorage.setItem(MODE_KEY, m);
  } catch {
    /* storage unavailable */
  }
  applyAudioSession();
}

function applyAudioSession() {
  try {
    // Safari 17+ audio session: 'ambient' mixes with other apps' audio;
    // 'playback' ignores the silent switch but interrupts other audio.
    const nav = navigator as NavWithAudioSession;
    const want = getSoundMode() === 'loud' ? 'playback' : 'ambient';
    if (nav.audioSession && nav.audioSession.type !== want) nav.audioSession.type = want;
  } catch {
    /* unsupported */
  }
}

export function unlockAudio() {
  applyAudioSession();
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
  }
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  // A silent blip inside the gesture fully unlocks output on iOS.
  beep(ctx.currentTime, 440, 0.01, 0.0001);
}

function beep(at: number, freq: number, dur: number, vol: number) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(vol, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + dur + 0.05);
  scheduled.push(osc);
  osc.onended = () => (scheduled = scheduled.filter((o) => o !== osc));
}

/** Short single tick: 10 seconds left. */
function warning(at: number) {
  beep(at, 880, 0.15, 0.35);
}

/** Rising three-note chime: rest is over. */
function done(at: number) {
  beep(at, 784, 0.18, 0.6);
  beep(at + 0.2, 988, 0.18, 0.6);
  beep(at + 0.4, 1319, 0.5, 0.7);
}

export function cancelChimes() {
  for (const o of scheduled) {
    try {
      o.stop();
    } catch {
      /* already stopped */
    }
  }
  scheduled = [];
}

/** (Re)schedule the warning and end chimes for a timer ending at endsAt (epoch ms). */
export function scheduleChimes(endsAt: number) {
  cancelChimes();
  if (!ctx || ctx.state === 'closed') return;
  const now = ctx.currentTime;
  const remaining = (endsAt - Date.now()) / 1000;
  if (remaining > 10.5) warning(now + remaining - 10);
  if (remaining > 0) done(now + remaining);
}

/** Preview the end chime (used for testing / settings). */
export function playDoneNow() {
  unlockAudio();
  if (ctx) done(ctx.currentTime + 0.05);
}
