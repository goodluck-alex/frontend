import { Suspense } from "react";
import PaySuccessClient from "./PaySuccessClient";

function Fallback() {
  return <div className="phone-panel phone-panel-scroll plans-screen">Loading…</div>;
}

export default function PaySuccessPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <PaySuccessClient />
    </Suspense>
  );
}