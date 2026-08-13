import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/middleware";

// Legacy Middleware is retained only because the installed OpenNext adapter
// rejected Next.js Node Proxy in the recorded build. Authorization remains in
// Page guards, Server Actions and Supabase RLS.
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)",
  ],
};
