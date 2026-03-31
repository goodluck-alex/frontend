"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function InviteReferralRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard?tab=settings&settingsSection=referral");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] text-gray-600">
      Redirecting to your GTN referral dashboard...
    </div>
  );
}
