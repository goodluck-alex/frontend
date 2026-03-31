"use client";

import { useEffect, useRef, useState } from "react";

function apiBase() {
  const raw = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").trim();
  return raw.replace(/\/+$/, "");
}

/** Downsample audio buffer to bar heights 0–100 */
function computePeaks(channelData, barCount = 40) {
  const len = channelData.length;
  if (!len) return Array(barCount).fill(20);
  const step = Math.floor(len / barCount);
  const peaks = [];
  for (let i = 0; i < barCount; i++) {
    let sum = 0;
    const start = i * step;
    for (let j = 0; j < step; j++) {
      sum += Math.abs(channelData[start + j] || 0);
    }
    peaks.push(sum / step);
  }
  const max = Math.max(...peaks, 0.0001);
  return peaks.map((p) => Math.max(6, Math.round((p / max) * 100)));
}

/**
 * Voice note with WhatsApp-style waveform bars + play/pause + progress.
 */
export default function MessageVoiceWaveform({ messageId }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [peaks, setPeaks] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);

  const audioRef = useRef(null);
  const ctxRef = useRef(null);

  useEffect(() => {
    let revoked;
    let cancelled;
    (async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("gtn_token") : null;
        const res = await fetch(`${apiBase()}/messages/media/${messageId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error("load");
        const blob = await res.blob();
        if (cancelled) return;
        const u = URL.createObjectURL(blob);
        revoked = u;
        setBlobUrl(u);

        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) {
          setPeaks(Array(40).fill(35));
          setLoading(false);
          return;
        }
        const ctx = new AC();
        ctxRef.current = ctx;
        const buf = await blob.arrayBuffer();
        let audioBuf;
        try {
          audioBuf = await ctx.decodeAudioData(buf.slice(0));
        } catch {
          setPeaks(Array.from({ length: 40 }, (_, i) => 18 + ((i * 7) % 25)));
          return;
        }
        if (cancelled) return;
        const ch = audioBuf.getChannelData(0);
        setPeaks(computePeaks(ch, 40));
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
      if (ctxRef.current) {
        ctxRef.current.close().catch(() => {});
        ctxRef.current = null;
      }
    };
  }, [messageId]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => {
      if (a.duration && Number.isFinite(a.duration)) {
        setProgress(a.currentTime / a.duration);
      }
    };
    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnded);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
    };
  }, [blobUrl]);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
    } else {
      a.play().catch(() => {});
    }
  };

  if (error) {
    return <span className="msg-voice-fallback">Voice note unavailable</span>;
  }

  const barCount = peaks?.length || 40;
  const playedIdx = Math.floor(progress * barCount);

  return (
    <div className="msg-voice-wave">
      {blobUrl && (
        <audio ref={audioRef} src={blobUrl} preload="metadata" className="msg-voice-audio-hidden" />
      )}
      <button
        type="button"
        className="msg-voice-play"
        onClick={togglePlay}
        disabled={loading || !blobUrl}
        aria-label={playing ? "Pause" : "Play voice message"}
      >
        {loading ? "…" : playing ? "❚❚" : "▶"}
      </button>
      <div
        className="msg-voice-bars"
        role="img"
        aria-label={loading ? "Loading waveform" : "Voice waveform"}
        onClick={(e) => {
          const a = audioRef.current;
          if (!a || !a.duration) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const ratio = Math.max(0, Math.min(1, x / rect.width));
          a.currentTime = ratio * a.duration;
        }}
      >
        {(peaks || Array(barCount).fill(30)).map((h, i) => (
          <div
            key={i}
            className={`msg-voice-bar ${i <= playedIdx ? "msg-voice-bar--played" : ""}`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}
