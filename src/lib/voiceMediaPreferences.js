/**
 * Maps GTN voice/data preferences to getUserMedia constraints and WebRTC sender bitrate
 * (where the browser supports RTCRtpSender#setParameters encoding limits).
 */

/**
 * @typedef {Object} VoiceMediaPrefs
 * @property {"low"|"medium"|"high"} callQuality
 * @property {boolean} dataSaver
 * @property {boolean} muteOnCallStart
 * @property {boolean} speakerDefault
 */

/**
 * @param {{ preferences?: import("./userPreferences.js").GtnUserPreferences } | null | undefined} user
 * @returns {VoiceMediaPrefs}
 */
export function getVoiceMediaPrefs(user) {
  const v = user?.preferences?.voice || {};
  const d = user?.preferences?.data || {};
  const cq = v.callQuality;
  const callQuality = cq === "low" || cq === "high" ? cq : "medium";
  return {
    callQuality,
    dataSaver: Boolean(d.dataSaver),
    muteOnCallStart: Boolean(v.muteOnCallStart),
    speakerDefault: v.speakerDefault !== false,
  };
}

/**
 * Mic capture constraints: hint sample rate / mono from quality + data saver.
 * @param {VoiceMediaPrefs} prefs
 * @returns {MediaStreamConstraints}
 */
export function buildAudioCaptureConstraints(prefs) {
  const { callQuality, dataSaver } = prefs;
  /** @type {MediaTrackConstraints} */
  const audio = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
  };
  if (callQuality === "low" || dataSaver) {
    audio.sampleRate = { ideal: 16000 };
  } else if (callQuality === "high" && !dataSaver) {
    audio.sampleRate = { ideal: 48000 };
  }
  return { audio };
}

/**
 * Outgoing audio cap for Opus (and similar) via encodings[].maxBitrate.
 * @param {VoiceMediaPrefs} prefs
 * @returns {number}
 */
export function getOutboundAudioMaxBitrateBps(prefs) {
  const { callQuality, dataSaver } = prefs;
  const table = { low: 28_000, medium: 48_000, high: 96_000 };
  let b = table[callQuality] ?? table.medium;
  if (dataSaver) {
    b = Math.min(b, 32_000);
    if (callQuality === "high") b = Math.min(b, 40_000);
  }
  return b;
}

/**
 * @param {VoiceMediaPrefs} prefs
 * @returns {Promise<MediaStream>}
 */
export async function acquireMicStream(prefs) {
  const primary = buildAudioCaptureConstraints(prefs);
  const fallbacks = [
    primary,
    {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    },
    { audio: true },
  ];

  let lastErr;
  for (const c of fallbacks) {
    try {
      return await navigator.mediaDevices.getUserMedia(c);
    } catch (e) {
      lastErr = e;
    }
  }
  const err = lastErr;
  if (err?.name === "NotFoundError" || err?.message?.includes("Requested device not found")) {
    throw new Error("No microphone device found. Connect/enable a mic and try again.");
  }
  throw err;
}

/**
 * @param {import("simple-peer").Instance} peer
 * @param {number} maxBitrateBps
 */
export async function applySimplePeerOutgoingAudioBitrate(peer, maxBitrateBps) {
  if (!peer || !maxBitrateBps) return;
  const pc = peer._pc;
  if (!pc || typeof pc.getSenders !== "function") return;

  const senders = pc.getSenders().filter((s) => s.track && s.track.kind === "audio");
  for (const sender of senders) {
    try {
      const p = sender.getParameters();
      const enc = Array.isArray(p.encodings) && p.encodings.length ? [...p.encodings] : [{}];
      enc[0] = { ...enc[0], maxBitrate: maxBitrateBps };
      await sender.setParameters({ ...p, encodings: enc });
    } catch {
      /* browser may reject before negotiation completes */
    }
  }
}

/**
 * Schedule bitrate tweaks around negotiation (simple-peer does not expose a stable "connected" for media-only).
 * @param {import("simple-peer").Instance} peer
 * @param {number} maxBitrateBps
 */
export function scheduleSimplePeerAudioBitrateTuning(peer, maxBitrateBps) {
  if (!peer || !maxBitrateBps) return;
  const run = () => void applySimplePeerOutgoingAudioBitrate(peer, maxBitrateBps);
  peer.once("connect", run);
  queueMicrotask(run);
  setTimeout(run, 250);
  setTimeout(run, 1200);
}

/**
 * Best-effort route remote audio to speaker vs default output (mobile/desktop).
 * @param {HTMLMediaElement | null} audioEl
 * @param {boolean} speakerDefault
 */
export async function applyRemoteAudioSinkPreference(audioEl, speakerDefault) {
  if (!audioEl || typeof audioEl.setSinkId !== "function") return;
  try {
    if (!speakerDefault) {
      await audioEl.setSinkId("default");
      return;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      return;
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    const outs = devices.filter((d) => d.kind === "audiooutput");
    if (outs.length <= 1) return;
    const speakerish =
      outs.find((d) => /speaker|loudspeaker|speakerphone/i.test(d.label)) ||
      outs.find((d) => d.deviceId && d.deviceId !== "default");
    if (speakerish?.deviceId) {
      await audioEl.setSinkId(speakerish.deviceId);
    }
  } catch {
    /* secure context / permission / unsupported */
  }
}
