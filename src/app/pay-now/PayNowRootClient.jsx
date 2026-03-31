"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "@/services/api";
import { getPaymentMethods } from "@/services/paymentApi";
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

export default function PayNowRootClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const planId = sp.get("planId") || "";
  const { user, loading, isAuthed } = useAuthedUser();
  const [plan, setPlan] = useState(null);
  const [methods, setMethods] = useState([]);
  const displayPlanPrice = useLocalizedUsdPrice(Number(plan?.price || 0));

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

  useEffect(() => {
    if (!isAuthed) return;
    let cancelled = false;
    (async () => {
      try {
        const out = await getPaymentMethods({ country: user?.countryIso || "", currency: "" });
        const list = Array.isArray(out?.methods) ? out.methods : [];
        if (!cancelled) setMethods(list);
      } catch {
        if (!cancelled) setMethods([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthed, user?.countryIso]);

  const has = useMemo(() => {
    const set = new Set(methods.map((m) => m.method));
    return {
      mobile: set.has("mobile_money"),
      crypto: set.has("crypto"),
      card: set.has("card"),
    };
  }, [methods]);

  if (loading) {
    return (
      <PayShell title="Pay Now">
        <div className="phone-panel phone-panel-scroll plans-screen">Loading…</div>
      </PayShell>
    );
  }

  if (!isAuthed) {
    return (
      <PayShell title="Pay Now">
        <div className="phone-panel phone-panel-scroll plans-screen">
          <Card title="Pay Now">
            <div className="plans-muted">Sign in to continue.</div>
            <div style={{ marginTop: 10 }}>
              <Link className="plans-upgrade-btn" href={`/login?next=${encodeURIComponent(`/pay-now?planId=${planId}`)}`}>
                Go to Login
              </Link>
            </div>
          </Card>
        </div>
      </PayShell>
    );
  }

  if (!planId) {
    return (
      <PayShell title="Pay Now">
        <div className="phone-panel phone-panel-scroll plans-screen">
          <Card title="Pay Now">
            <div className="plans-muted">Missing plan. Go back and choose a plan.</div>
            <div style={{ marginTop: 10 }}>
              <button type="button" className="plans-upgrade-btn" onClick={() => router.push("/dashboard?tab=plans")}>
                Back to Plans
              </button>
            </div>
          </Card>
        </div>
      </PayShell>
    );
  }

  return (
    <PayShell title="Pay Now">
      <div className="phone-panel phone-panel-scroll plans-screen">
        <Card title="Pay Now">
          <div className="plans-current-name">{plan?.name || planId}</div>
          <div className="plans-muted" style={{ marginTop: 4 }}>
            Price: {displayPlanPrice.primary}{" "}
            {displayPlanPrice.secondary ? <span className="plans-muted">{displayPlanPrice.secondary}</span> : null}
          </div>
        </Card>

        <Card title="Payment Categories">
          <div className="plans-pay-choice-grid">
            <Link className={`plans-pay-choice ${has.mobile ? "active" : ""}`} href={`/pay-now/mobile?planId=${encodeURIComponent(planId)}`}>
              Mobile
            </Link>
            <Link className={`plans-pay-choice ${has.crypto ? "active" : ""}`} href={`/pay-now/crypto?planId=${encodeURIComponent(planId)}`}>
              Crypto
            </Link>
            <Link className={`plans-pay-choice ${has.card ? "active" : ""}`} href={`/pay-now/card?planId=${encodeURIComponent(planId)}`}>
              Card
            </Link>
          </div>
          <div className="plans-muted" style={{ marginTop: 10 }}>
            Choose a category to continue.
          </div>
        </Card>
      </div>
    </PayShell>
  );
}
