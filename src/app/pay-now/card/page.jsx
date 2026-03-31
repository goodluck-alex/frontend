import { Suspense } from "react";
import PayNowCardClient from "./PayNowCardClient";

function Fallback() {
  return <div className="phone-panel phone-panel-scroll plans-screen">Loading…</div>;
}

export default function PayNowCardPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <PayNowCardClient />
    </Suspense>
  );
}