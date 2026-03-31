import { Suspense } from "react";
import PayNowCryptoClient from "./PayNowCryptoClient";

function Fallback() {
  return <div className="phone-panel phone-panel-scroll plans-screen">Loading…</div>;
}

export default function PayNowCryptoPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <PayNowCryptoClient />
    </Suspense>
  );
}