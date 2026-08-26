import { requireAdmin } from "@/lib/auth/require-admin";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  await requireAdmin();
  redirect("/admin/structure?mode=reorder");
}
