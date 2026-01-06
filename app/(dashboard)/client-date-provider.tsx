"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { getLocalDateString } from "@/lib/date-utils";

/**
 * Client component that ensures the URL always has the user's local date
 * This fixes timezone issues where server (UTC) and client (local) have different dates
 */
export function ClientDateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Only apply to the root dashboard page
    if (pathname !== "/") {
      setIsChecking(false);
      return;
    }

    const currentDate = searchParams.get("date");
    const localDate = getLocalDateString();

    // If no date param or it doesn't match local date, redirect with correct date
    if (!currentDate || currentDate !== localDate) {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.set("date", localDate);
      router.replace(`/?${newParams.toString()}`);
    } else {
      setIsChecking(false);
    }
  }, [pathname, searchParams, router]);

  // Only show loading for the dashboard page during date check
  if (pathname === "/" && isChecking) {
    return null; // Silent load, no flash
  }

  return <>{children}</>;
}
