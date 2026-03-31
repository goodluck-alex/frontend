"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthedUser } from "@/lib/useAuthedUser";
import { getPaymentMethods } from "@/services/paymentApi";
import PayShell from "@/components/PayShell";

function Card({ title, children }) {
  return (
    <div className="plans-card" style={{ marginBottom: 12 }}>
      <div className="plans-section-title">{title}</div>
      {children}
    </div>
  );
}

export default function PayNowCryptoClient() {
  const sp = useSearchParams();
  const planId = sp.get("planId") || "";
  const { user, loading, isAuthed } = useAuthedUser();
  const [methods, setMethods] = useState([]);

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

  const providers = useMemo(() => {
    const row = methods.find((m) => m.method === "crypto");
    return Array.isArray(row?.providers) ? row.providers : [];
  }, [methods]);

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

  return (
    <PayShell title="Crypto">
      <div className="phone-panel phone-panel-scroll plans-screen">
        <Card title="Crypto">
          <div className="plans-pay-choice-grid">
            {providers.map((p) => (
              <Link
                key={String(p.id)}
                className="plans-pay-choice"
                href={`/pay-now/crypto/${encodeURIComponent(String(p.id).toLowerCase())}?planId=${encodeURIComponent(planId)}`}
              >
                {String(p.id).toUpperCase()}
              </Link>
            ))}
          </div>
          {providers.length === 0 ? <div className="plans-muted">No crypto providers enabled.</div> : null}
        </Card>
      </div>
    </PayShell>
  );
}

