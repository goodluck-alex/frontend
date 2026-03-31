"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import PayShell from "@/components/PayShell";

export default function PayFailedClient() {
  const sp = useSearchParams();
  const paymentId = sp.get("paymentId") || "";
  return (
    <PayShell title="Failed">
      <div className="phone-panel phone-panel-scroll plans-screen">
        <div className="plans-card">
          <div className="plans-section-title">Payment Failed</div>
          <div className="plans-muted">Please try again.</div>
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

