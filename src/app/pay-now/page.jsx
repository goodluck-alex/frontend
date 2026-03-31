import { Suspense } from "react";
import PayNowRootClient from "./PayNowRootClient";

function Fallback() {
  return <div className="phone-panel phone-panel-scroll plans-screen">Loading…</div>;
}

export default function PayNowRootPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <PayNowRootClient />
    </Suspense>
  );
}

