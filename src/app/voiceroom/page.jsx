"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function VoiceRoomRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard?tab=rooms");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] text-gray-600">
      Redirecting to GTN community voice rooms in the dashboard...
    </div>
  );
}
