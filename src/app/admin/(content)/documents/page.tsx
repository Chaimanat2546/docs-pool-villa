import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";

export default async function DocumentsPage() {
  await requireAdmin();
  redirect("/admin/structure");
}
