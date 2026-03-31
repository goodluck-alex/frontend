"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DialpadRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard#dialpad");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] text-gray-600">
      Redirecting to Dial Pad in your GTN dashboard...
    </div>
  );
}
