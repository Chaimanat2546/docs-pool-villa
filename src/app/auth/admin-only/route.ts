import { NextResponse } from "next/server";

import { createClient } from "@/lib/server";

export async function GET(request: Request): Promise<Response> {
  const supabase = await createClient();

  try {
    await supabase.auth.signOut();
  } catch {
    // Redirect even when session cleanup fails; do not expose internal details.
  }

  return NextResponse.redirect(new URL("/auth/login?error=admin_only", request.url));
}
