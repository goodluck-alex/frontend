import { Suspense } from "react";
import PayFailedClient from "./PayFailedClient";

function Fallback() {
  return <div className="phone-panel phone-panel-scroll plans-screen">Loading…</div>;
}

export default function PayFailedPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <PayFailedClient />
    </Suspense>
  );
}