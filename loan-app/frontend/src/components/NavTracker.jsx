"use client";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { isLoanDetailPath, rememberOrigin } from "../utils/backNavigation";

// Invisible. Remembers the last page the user was on that is NOT a loan's own
// page, so the loan pages' Back button can return to the exact page the user
// came from (see utils/backNavigation.js).
const NavTracker = () => {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    if (!pathname || isLoanDetailPath(pathname)) return;
    rememberOrigin(search ? `${pathname}?${search}` : pathname);
  }, [pathname, search]);

  return null;
};

export default NavTracker;
