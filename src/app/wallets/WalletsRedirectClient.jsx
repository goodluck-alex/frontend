"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function WalletsRedirectClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Deprecated legacy path: keep redirect for backward compatibility.
    const qs = searchParams.toString();
    const next = `/dashboard?tab=plans${qs ? `&${qs}` : ""}`;
    router.replace(next, { scroll: false });
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] text-gray-600">
      Redirecting…
    </div>
  );
}
