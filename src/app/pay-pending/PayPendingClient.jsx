"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getPaymentStatus } from "@/services/paymentApi";
import PayShell from "@/components/PayShell";

export default function PayPendingClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const paymentId = sp.get("paymentId") || "";
  const provider = sp.get("provider") || "";
  const [status, setStatus] = useState("pending");
  const [info, setInfo] = useState("");

  useEffect(() => {
    if (!paymentId) return;
    let cancelled = false;
    let tries = 0;
    const maxTries = 40; // ~2 minutes

    const tick = async () => {
      tries += 1;
      try {
        const st = await getPaymentStatus(paymentId);
        if (cancelled) return;
        const s = String(st?.status || "").toLowerCase();
        setStatus(s || "pending");
        if (s === "succeeded") {
          router.replace(`/pay-success?paymentId=${encodeURIComponent(paymentId)}`);
          return;
        }
        if (s === "failed" || s === "expired" || s === "cancelled") {
          router.replace(`/pay-failed?paymentId=${encodeURIComponent(paymentId)}`);
          return;
        }
      } catch {
        // ignore, keep polling
      }
      if (!cancelled && tries < maxTries) window.setTimeout(tick, 3000);
    };

    setInfo(provider ? `Awaiting action (${provider})…` : "Awaiting action…");
    tick();
    return () => {
      cancelled = true;
    };
  }, [paymentId, provider, router]);

  if (!paymentId) {
    return (
      <PayShell title="Pending">
        <div className="phone-panel phone-panel-scroll plans-screen">Missing paymentId.</div>
      </PayShell>
    );
  }

  return (
    <PayShell title="Pending">
      <div className="phone-panel phone-panel-scroll plans-screen">
        <div className="plans-card">
          <div className="plans-section-title">Payment Pending</div>
          <div className="plans-muted">{info}</div>
          <div className="plans-muted" style={{ marginTop: 6 }}>
            Status: {status}
          </div>
          <div className="plans-muted" style={{ marginTop: 10 }}>
            Keep this screen open while we confirm.
          </div>
        </div>
      </div>
    </PayShell>
  );
}

