/**
 * Outbound “ringback” while waiting for callee to answer (WebRTC has no telco ringback).
 * Separate AudioContext from incoming ring so both modules don’t fight.
 */

let ctx = null;
let intervalId = null;

/** North-American style ringback: 440+480 Hz ~2s, pause ~4s (shortened slightly for the web). */
function playRingbackBurst() {
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const dur = 1.8;
  const f1 = 440;
  const f2 = 480;
  for (const freq of [f1, f2]) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.06, t0 + 0.04);
    g.gain.exponentialRampToValueAtTime(0.06, t0 + dur - 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }
}

export function startOutgoingCallRing() {
  stopOutgoingCallRing();
  if (typeof window === "undefined") return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const kick = () => {
      if (!ctx) return;
      if (ctx.state === "suspended") void ctx.resume();
      playRingbackBurst();
    };
    kick();
    intervalId = window.setInterval(kick, 5200);
  } catch {
    stopOutgoingCallRing();
  }
}

export function stopOutgoingCallRing() {
  if (intervalId != null) {
    clearInterval(intervalId);
    intervalId = null;
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
