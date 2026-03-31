import { Suspense } from "react";
import WalletsRedirectClient from "./WalletsRedirectClient";

function Fallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] text-gray-600">
      Redirecting…
    </div>
  );
}

export default function WalletsRedirectPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <WalletsRedirectClient />
    </Suspense>
  );
}
