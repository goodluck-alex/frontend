"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PayShell from "@/components/PayShell";
import { startCryptoPayment } from "@/services/paymentApi";

export default function PayNowCryptoUsdtClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const planId = sp.get("planId") || "";
  const provider = "USDT_TRC20";

  const disabled = useMemo(() => !planId, [planId]);

  const start = async () => {
    if (!planId) return;
    const out = await startCryptoPayment({ planId, provider });
    const paymentId = out?.id || out?.paymentId;
    router.push(`/pay-pending?paymentId=${encodeURIComponent(String(paymentId || ""))}&provider=${encodeURIComponent(provider)}`);
  };

  return (
    <PayShell title="USDT">
      <div className="phone-panel phone-panel-scroll plans-screen">
        <div className="plans-card">
          <div className="plans-section-title">USDT (TRC20)</div>
          <div className="plans-muted">Pay with crypto. You’ll be redirected to a pending screen while we confirm.</div>
          <button type="button" className="plans-upgrade-btn" disabled={disabled} onClick={() => void start()}>
            Continue
          </button>
          {!planId ? <div className="plans-muted" style={{ marginTop: 8 }}>Missing planId.</div> : null}
        </div>
      </div>
    </PayShell>
  );
}

