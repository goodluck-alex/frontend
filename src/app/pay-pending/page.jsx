import { Suspense } from "react";
import PayPendingClient from "./PayPendingClient";

function Fallback() {
  return <div className="phone-panel phone-panel-scroll plans-screen">Loading…</div>;
}

export default function PayPendingPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <PayPendingClient />
    </Suspense>
  );
}