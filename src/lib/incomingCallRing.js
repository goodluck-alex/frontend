/**
 * In-app incoming call alert (WebRTC has no system dialer ring).
 * Uses Web Audio + optional vibration; stops when callee answers, declines, or call ends.
 */

let ctx = null;
let intervalId = null;
let vibrateIntervalId = null;

function playTwoBeepPattern() {
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const beep = (start, freq) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = freq;
    const dur = 0.2;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  };
  beep(t0, 440);
  beep(t0 + 0.35, 480);
}

/**
 * Start repeating ring + vibration until {@link stopIncomingCallRing} runs.
 */
export function startIncomingCallRing() {
  stopIncomingCallRing();
  if (typeof window === "undefined") return;

  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();

    const kick = () => {
      if (!ctx) return;
      if (ctx.state === "suspended") void ctx.resume();
      playTwoBeepPattern();
    };
    kick();
    intervalId = window.setInterval(kick, 2400);

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      const vPattern = [600, 250, 600, 1200];
      navigator.vibrate(vPattern);
      vibrateIntervalId = window.setInterval(() => {
        navigator.vibrate(vPattern);
      }, 2800);
    }
  } catch {
    stopIncomingCallRing();
  }
}

export function stopIncomingCallRing() {
  if (intervalId != null) {
    clearInterval(intervalId);
    intervalId = null;
  }
  if (vibrateIntervalId != null) {
    clearInterval(vibrateIntervalId);
    vibrateIntervalId = null;
  }
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate(0);
    } catch {
      /* ignore */
    }
  }
  if (ctx) {
    try {
      void ctx.close();
    } catch {
      /* ignore */
    }
    ctx = null;
  }
}
