"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import axios from "@/services/api";
import { createOrInitiatePayment } from "@/services/paymentApi";
import { useAuthedUser } from "@/lib/useAuthedUser";
import PayShell from "@/components/PayShell";

function Card({ title, children }) {
  return (
    <div className="plans-card" style={{ marginBottom: 12 }}>
      <div className="plans-section-title">{title}</div>
      {children}
    </div>
  );
}

function makeIdempotencyKey() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {}
  return `gtn-pay-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

/** Live countdown string (re-render every second via parent `countdownTick` state). */
function formatPayWindowRemaining(iso) {
  if (!iso) return "";
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms)) return "";
  if (ms <= 0) return "Expired — create a new payment";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export default function PayNowCryptoProvider() {
  const { provider } = useParams();
  const sp = useSearchParams();
  const router = useRouter();
  const planId = sp.get("planId") || "";
  const { user, loading, isAuthed } = useAuthedUser();
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [cryptoInfo, setCryptoInfo] = useState(null);
  const [paymentId, setPaymentId] = useState("");
  const [txHash, setTxHash] = useState("");
  const [createdOnce, setCreatedOnce] = useState(false);
  const [, setCountdownTick] = useState(0);

  const providerId = useMemo(() => String(provider || "").trim().toUpperCase(), [provider]);

  useEffect(() => {
    if (!cryptoInfo?.expiresAt) return;
    const t = window.setInterval(() => setCountdownTick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [cryptoInfo?.expiresAt]);

  useEffect(() => {
    if (!planId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get("/plans");
        const plans = Array.isArray(res.data?.plans) ? res.data.plans : [];
        const found = plans.find((p) => String(p.id) === String(planId));
        if (!cancelled) setPlan(found || null);
      } catch {
        if (!cancelled) setPlan(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [planId]);

  const createInstructions = async () => {
    setError("");
    setInfo("");
    if (!planId) {
      setError("Missing planId. Go back and choose a plan.");
      return;
    }
    setBusy(true);
    try {
      const idem = makeIdempotencyKey();
      const out = await createOrInitiatePayment(
        {
          planId,
          paymentMethod: "crypto",
          provider: providerId,
          country: user?.countryIso || "",
          currency: "USDT",
          idempotencyKey: idem,
        },
        { headers: { "Idempotency-Key": idem } }
      );
      setPaymentId(String(out?.paymentId || ""));
      const ci = out?.metadata?.crypto || out?.crypto || null;
      setCryptoInfo(ci);
      if (!ci?.address) {
        setError("Crypto wallet was not returned by backend. Check backend logs and /api/payments/health/crypto.");
        return;
      }
      setInfo("Send USDT to the wallet shown, then confirm.");
      setCreatedOnce(true);
    } catch (e) {
      setError(e?.message || "Failed to create crypto payment");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!isAuthed || !planId) return;
    if (createdOnce) return;
    void createInstructions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed, planId, providerId, user?.countryIso]);

  const confirm = async () => {
    if (!paymentId) return;
    setError("");
    setInfo("");
    setBusy(true);
    try {
      const res = await axios.post(`/payment/confirm/${encodeURIComponent(paymentId)}`, { txHash: txHash.trim() || undefined });
      const out = res?.data?.data || res?.data || {};
      const st = String(out?.status || "").toLowerCase();
      if (st === "succeeded") {
        router.push(`/pay-success?paymentId=${encodeURIComponent(paymentId)}`);
        return;
      }
      if (st === "failed" || st === "expired" || st === "cancelled") {
        router.push(`/pay-failed?paymentId=${encodeURIComponent(paymentId)}`);
        return;
      }
      router.push(`/pay-pending?paymentId=${encodeURIComponent(paymentId)}&method=crypto&provider=${encodeURIComponent(providerId)}`);
    } catch (e) {
      setError(e?.message || "Could not confirm yet");
    } finally {
      setBusy(false);
    }
  };

  const copyText = async (label, value) => {
    const v = String(value || "").trim();
    if (!v) return;
    try {
      await navigator.clipboard.writeText(v);
      setInfo(`${label} copied.`);
    } catch {
      // Fallback for older browsers / permissions
      try {
        const ta = document.createElement("textarea");
        ta.value = v;
        ta.setAttribute("readonly", "true");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setInfo(`${label} copied.`);
      } catch {
        setError("Could not copy. Please select and copy manually.");
      }
    }
  };

  if (loading)
    return (
      <PayShell title="Crypto">
        <div className="phone-panel phone-panel-scroll plans-screen">Loading…</div>
      </PayShell>
    );
  if (!isAuthed)
    return (
      <PayShell title="Crypto">
        <div className="phone-panel phone-panel-scroll plans-screen">Sign in to continue.</div>
      </PayShell>
    );
  if (!planId)
    return (
      <PayShell title="Crypto">
        <div className="phone-panel phone-panel-scroll plans-screen">Missing planId. Go back and choose a plan.</div>
      </PayShell>
    );

  return (
    <PayShell title={`Crypto • ${providerId}`}>
      <div className="phone-panel phone-panel-scroll plans-screen">
      <Card title={`Crypto • ${providerId}`}>
        <div className="plans-current-name">{plan?.name || planId}</div>
        <div className="plans-muted" style={{ marginTop: 4 }}>
          Price: ${Number(plan?.price || 0).toFixed((plan?.price || 0) % 1 === 0 ? 0 : 2)}
        </div>
      </Card>

      <Card title="Instructions">
        {error ? <div className="plans-clean-toast">{error}</div> : null}
        {info ? <div className="plans-clean-toast">{info}</div> : null}

        <div className="plans-muted" style={{ marginTop: 6 }}>
          Payment ID (GTN): {paymentId || "—"}
        </div>

        {cryptoInfo ? (
          <div className="plans-muted">
            <div>Amount: {cryptoInfo.expectedAmount} USDT</div>
            <div>Network: TRC20</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ overflowWrap: "anywhere" }}>Wallet: {cryptoInfo.address}</div>
              <button
                type="button"
                className="pay-copy-btn"
                onClick={() => void copyText("Wallet address", cryptoInfo.address)}
              >
                Copy
              </button>
            </div>
            <div className="pay-crypto-countdown">
              <span className="pay-crypto-countdown-label">Pay within</span>
              <span className="pay-crypto-countdown-value">
                {formatPayWindowRemaining(cryptoInfo.expiresAt)}
              </span>
            </div>
          </div>
        ) : (
          <div className="plans-muted">{busy ? "Preparing payment…" : "No crypto instructions yet."}</div>
        )}

        {!cryptoInfo?.address ? (
          <div style={{ marginTop: 12 }}>
            <button type="button" className="plans-pay-now" onClick={() => void createInstructions()} disabled={busy}>
              {busy ? "Generating…" : "Generate Instructions"}
            </button>
          </div>
        ) : null}

        <div className="plans-pay-label" style={{ marginTop: 12 }}>
          Transaction hash (optional)
        </div>
        <input className="plans-pay-input" value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="Paste tx hash (optional)" />

        <div className="plans-pay-actions" style={{ marginTop: 12 }}>
          <button type="button" className="plans-pay-cancel" onClick={() => router.back()} disabled={busy}>
            Back
          </button>
          <button type="button" className="plans-pay-now" onClick={() => void confirm()} disabled={busy || !paymentId}>
            {busy ? "Checking…" : "I Have Paid"}
          </button>
        </div>
      </Card>
      </div>
    </PayShell>
  );
}

