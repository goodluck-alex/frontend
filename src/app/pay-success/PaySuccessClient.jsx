"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import PayShell from "@/components/PayShell";

export default function PaySuccessClient() {
  const sp = useSearchParams();
  const paymentId = sp.get("paymentId") || "";
  return (
    <PayShell title="Success">
      <div className="phone-panel phone-panel-scroll plans-screen">
        <div className="plans-card">
          <div className="plans-section-title">Payment Successful</div>
          <div className="plans-muted">Your subscription is activated.</div>
          {paymentId ? <div className="plans-muted" style={{ marginTop: 8 }}>Payment: {paymentId}</div> : null}
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

