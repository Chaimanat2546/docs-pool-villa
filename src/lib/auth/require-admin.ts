import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/server";

export async function requireAdmin() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    redirect("/auth/login");
  }

  const { data: isAdmin, error: accessError } = await supabase.rpc("doc_is_admin");

  if (accessError) {
    throw new Error("ไม่สามารถตรวจสอบสิทธิ์ผู้ดูแลระบบได้");
  }

  if (!isAdmin) {
    redirect("/");
  }
}
