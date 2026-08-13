import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/middleware";

// Legacy Middleware is intentionally retained while OpenNext Cloudflare does
// not support Next.js 16 Node Proxy. Authorization remains in Page/Action/RLS.
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)",
  ],
};
