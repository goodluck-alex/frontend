import { Suspense } from "react";
import PayNowMobileClient from "./PayNowMobileClient";

function Fallback() {
  return <div className="phone-panel phone-panel-scroll plans-screen">Loading…</div>;
}

export default function PayNowMobilePage() {
  return (
    <Suspense fallback={<Fallback />}>
      <PayNowMobileClient />
    </Suspense>
  );
}

