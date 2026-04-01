"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import PayShell from "@/components/PayShell";
import { getPaymentStatus } from "@/services/paymentApi";
import { formatCurrency } from "@/lib/currencyDisplay";
import { useLocalizedUsdPrice } from "@/hooks/useLocalizedUsdPrice";

export default function PaySuccessClient() {
  const sp = useSearchParams();
  const paymentId = sp.get("paymentId") || "";
  const [payment, setPayment] = useState(null);

  useEffect(() => {
    if (!paymentId) return;
    let cancelled = false;
    (async () => {
      try {
        const st = await getPaymentStatus(paymentId);
        if (!cancelled) setPayment(st || null);
      } catch {
        if (!cancelled) setPayment(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paymentId]);

  const displayUsd = useLocalizedUsdPrice(Number(payment?.currency === "USD" ? payment?.amount : 0));
  const amountLine = useMemo(() => {
    if (!payment) return "";
    const c = String(payment.currency || "").toUpperCase();
    const a = Number(payment.amount);
    if (!c || !Number.isFinite(a)) return "";
    if (c === "USD") {
      return `Amount: ${displayUsd.primary}${displayUsd.secondary ? ` ${displayUsd.secondary}` : ""}`;
    }
    if (c === "USDT") {
      return `Amount: ${a} USDT`;
    }
    return `Amount: ${formatCurrency(a, c)}`;
  }, [payment, displayUsd.primary, displayUsd.secondary]);

  return (
    <PayShell title="Success">
      <div className="phone-panel phone-panel-scroll plans-screen">
        <div className="plans-card">
          <div className="plans-section-title">Payment Successful</div>
          <div className="plans-muted">Your subscription is activated.</div>
          {paymentId ? <div className="plans-muted" style={{ marginTop: 8 }}>Payment: {paymentId}</div> : null}
          {amountLine ? <div className="plans-muted" style={{ marginTop: 6 }}>{amountLine}</div> : null}
          <div style={{ marginTop: 12 }}>
            <Link className="plans-upgrade-btn" href="/dashboard?tab=plans">
              Back to Plans
            </Link>
          </div>
        </div>
      </div>
    </PayShell>
  );
}

