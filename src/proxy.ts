import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/middleware";

// Session refresh only. Authorization remains in Page guards, Server Actions
// and Supabase RLS.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)",
  ],
};
