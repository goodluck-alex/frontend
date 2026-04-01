"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import axios from "@/services/api";
import { createOrInitiatePayment } from "@/services/paymentApi";
import { useAuthedUser } from "@/lib/useAuthedUser";
import PayShell from "@/components/PayShell";
import { useLocalizedUsdPrice } from "@/hooks/useLocalizedUsdPrice";

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

export default function PayNowCardBrand() {
  const { brand } = useParams();
  const sp = useSearchParams();
  const router = useRouter();
  const planId = sp.get("planId") || "";
  const { user, loading, isAuthed } = useAuthedUser();
  const [plan, setPlan] = useState(null);
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const displayPlanPrice = useLocalizedUsdPrice(Number(plan?.price || 0));

  const brandId = useMemo(() => String(brand || "").trim().toUpperCase(), [brand]);

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

  const start = async () => {
    setError("");
    setBusy(true);
    try {
      const idem = makeIdempotencyKey();
      const out = await createOrInitiatePayment(
        {
          planId,
          paymentMethod: "card",
          provider: "GATEWAY",
          country: user?.countryIso || "",
          currency: "USD",
          metadata: { brand: brandId },
          idempotencyKey: idem,
        },
        { headers: { "Idempotency-Key": idem } }
      );
      const url = String(out?.checkoutUrl || out?.metadata?.checkoutUrl || "");
      setCheckoutUrl(url);
      if (url) {
        try {
          window.open(url, "_blank", "noopener,noreferrer");
        } catch {}
      }
    } catch (e) {
      setError(e?.message || "Failed to start checkout");
    } finally {
      setBusy(false);
    }
  };

  if (loading)
    return (
      <PayShell title="Card">
        <div className="phone-panel phone-panel-scroll plans-screen">Loading…</div>
      </PayShell>
    );
  if (!isAuthed)
    return (
      <PayShell title="Card">
        <div className="phone-panel phone-panel-scroll plans-screen">Sign in to continue.</div>
      </PayShell>
    );

  return (
    <PayShell title={`Card • ${brandId}`}>
      <div className="phone-panel phone-panel-scroll plans-screen">
      <Card title={`Card • ${brandId}`}>
        <div className="plans-current-name">{plan?.name || planId}</div>
        <div className="plans-muted" style={{ marginTop: 4 }}>
          Price: {displayPlanPrice.primary}{" "}
          {displayPlanPrice.secondary ? <span className="plans-muted">{displayPlanPrice.secondary}</span> : null}
        </div>
      </Card>

      <Card title="Hosted Checkout">
        {error ? <div className="plans-clean-toast">{error}</div> : null}
        <div className="plans-muted">Checkout opens in your browser.</div>
        <div className="plans-pay-actions" style={{ marginTop: 12 }}>
          <button type="button" className="plans-pay-cancel" onClick={() => router.back()} disabled={busy}>
            Back
          </button>
          <button type="button" className="plans-pay-now" onClick={() => void start()} disabled={busy || !planId}>
            {busy ? "Preparing…" : "Continue"}
          </button>
        </div>
        {checkoutUrl ? (
          <div style={{ marginTop: 10 }}>
            <a className="plans-pay-now" href={checkoutUrl} style={{ display: "inline-block", textAlign: "center" }}>
              Open Checkout
            </a>
          </div>
        ) : null}
        <div className="plans-muted" style={{ marginTop: 10 }}>
          After payment, return to GTN and we’ll confirm automatically.
        </div>
      </Card>
      </div>
    </PayShell>
  );
}

