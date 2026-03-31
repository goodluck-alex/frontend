"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PayShell from "@/components/PayShell";

export default function PayNowCryptoUsdtAliasClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const planId = sp.get("planId") || "";

  useEffect(() => {
    const qs = planId ? `?planId=${encodeURIComponent(planId)}` : "";
    router.replace(`/pay-now/crypto/usdt_trc20${qs}`);
  }, [planId, router]);

  return (
    <PayShell title="Crypto">
      <div className="phone-panel phone-panel-scroll plans-screen">Loading…</div>
    </PayShell>
  );
}

