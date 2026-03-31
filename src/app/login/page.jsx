"use client";

import { Suspense } from "react";
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
  return (
    <Suspense fallback={<AuthFallback />}>
      <GtnAuthForm variant="page" />
    </Suspense>
  );
}
