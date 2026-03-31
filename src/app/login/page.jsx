"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import GtnAuthForm from "@/components/GtnAuthForm";

function AuthFallback() {
  return (
    <div className="auth-root">
      <div className="auth-card" style={{ textAlign: "center", color: "#94a3b8" }}>
        Loading…
      </div>
    </div>
  );
}

export default function AuthPage() {
  const router = useRouter();
  useEffect(() => {
    try {
      const token = typeof window !== "undefined" ? window.localStorage.getItem("gtn_token") : null;
      if (token) router.replace("/dashboard");
    } catch {
      /* ignore */
    }
  }, [router]);

  return (
    <Suspense fallback={<AuthFallback />}>
      <GtnAuthForm variant="page" />
    </Suspense>
  );
}
