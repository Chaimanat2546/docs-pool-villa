import { NextResponse } from "next/server";

import { createClient } from "@/lib/server";

function loginResponse(request: Request, error?: string) {
  const url = new URL("/auth/login", request.url);
  if (error) url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function GET(request: Request): Promise<Response> {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) return loginResponse(request);

  const { data: isAdmin, error: accessError } = await supabase.rpc("doc_is_admin");
  if (accessError || !isAdmin) {
    await supabase.auth.signOut().catch(() => undefined);
    return loginResponse(request, "invalid_credentials");
  }

  return NextResponse.redirect(new URL("/admin/structure?mode=reorder", request.url));
}
