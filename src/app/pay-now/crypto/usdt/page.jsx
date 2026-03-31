import { Suspense } from "react";
import PayNowCryptoUsdtAliasClient from "./PayNowCryptoUsdtAliasClient";

function Fallback() {
  return <div className="phone-panel phone-panel-scroll plans-screen">Loading…</div>;
}

export default function PayNowCryptoUsdtAliasPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <PayNowCryptoUsdtAliasClient />
    </Suspense>
  );
}