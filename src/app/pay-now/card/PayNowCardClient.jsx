"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import PayShell from "@/components/PayShell";

function Card({ title, children }) {
  return (
    <div className="plans-card" style={{ marginBottom: 12 }}>
      <div className="plans-section-title">{title}</div>
      {children}
    </div>
  );
}

export default function PayNowCardClient() {
  const sp = useSearchParams();
  const planId = sp.get("planId") || "";

  // Phase 6: card gateway adapter is hosted checkout; brands are placeholders for now.
  return (
    <PayShell title="Card">
      <div className="phone-panel phone-panel-scroll plans-screen">
        <Card title="Card / Bank">
          <div className="plans-pay-choice-grid">
            <Link className="plans-pay-choice" href={`/pay-now/card/visa?planId=${encodeURIComponent(planId)}`}>
              Visa
            </Link>
            <Link className="plans-pay-choice" href={`/pay-now/card/mastercard?planId=${encodeURIComponent(planId)}`}>
              Mastercard
            </Link>
          </div>
          <div className="plans-muted" style={{ marginTop: 10 }}>
            Hosted checkout will open in your browser.
          </div>
        </Card>
      </div>
    </PayShell>
  );
}

