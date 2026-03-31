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

export default function PayNowMobileProvider() {
  const { provider } = useParams();
  const sp = useSearchParams();
  const router = useRouter();
  const planId = sp.get("planId") || "";
  const { user, loading, isAuthed } = useAuthedUser();
  const [plan, setPlan] = useState(null);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const providerId = useMemo(() => String(provider || "").trim().toUpperCase(), [provider]);

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

  const pay = async () => {
    setError("");
    if (!planId) return setError("Missing planId.");
    if (!phone.trim()) return setError("Phone is required.");
    setBusy(true);
    try {
      const idem = makeIdempotencyKey();
      const out = await createOrInitiatePayment(
        {
          planId,
          paymentMethod: "mobile_money",
          provider: providerId,
          phone: phone.trim(),
          country: user?.countryIso || "",
          currency: user?.currencyCode || "",
          idempotencyKey: idem,
        },
        { headers: { "Idempotency-Key": idem } }
      );
      const paymentId = out?.paymentId;
      router.push(`/pay-pending?paymentId=${encodeURIComponent(paymentId)}&method=mobile_money&provider=${encodeURIComponent(providerId)}`);
    } catch (e) {
      setError(e?.message || "Payment failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading)
    return (
      <PayShell title="Mobile Money">
        <div className="phone-panel phone-panel-scroll plans-screen">Loading…</div>
      </PayShell>
    );
  if (!isAuthed)
    return (
      <PayShell title="Mobile Money">
        <div className="phone-panel phone-panel-scroll plans-screen">Sign in to continue.</div>
      </PayShell>
    );

  return (
    <PayShell title={`Mobile • ${providerId}`}>
      <div className="phone-panel phone-panel-scroll plans-screen">
      <Card title={`Mobile Money • ${providerId}`}>
        <div className="plans-current-name">{plan?.name || planId}</div>
        <div className="plans-muted" style={{ marginTop: 4 }}>
          Price: ${Number(plan?.price || 0).toFixed((plan?.price || 0) % 1 === 0 ? 0 : 2)}
        </div>
      </Card>

      <Card title="Details">
        <div className="plans-pay-label">Phone Number</div>
        <input className="plans-pay-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
        {error ? <div className="plans-clean-toast" style={{ marginTop: 10 }}>{error}</div> : null}
        <div className="plans-pay-actions" style={{ marginTop: 12 }}>
          <button type="button" className="plans-pay-cancel" onClick={() => router.back()} disabled={busy}>
            Back
          </button>
          <button type="button" className="plans-pay-now" onClick={() => void pay()} disabled={busy}>
            {busy ? "Processing…" : "Pay Now"}
          </button>
        </div>
        <div className="plans-pay-hint">You’ll confirm on your phone by entering your PIN.</div>
      </Card>
      </div>
    </PayShell>
  );
}

