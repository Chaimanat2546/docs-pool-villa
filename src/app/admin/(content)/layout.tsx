import { AdminExplorerShell } from "@/components/admin/explorer/admin-explorer-shell";
import { loadAdminExplorerData } from "@/lib/docs/admin-explorer-server";

export default async function AdminContentLayout({ children }: { children: React.ReactNode }) {
  const { sections } = await loadAdminExplorerData();
  return <AdminExplorerShell sections={sections}>{children}</AdminExplorerShell>;
}
