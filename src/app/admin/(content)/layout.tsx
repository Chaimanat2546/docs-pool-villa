import { Suspense } from "react";
import { unstable_rethrow } from "next/navigation";

import {
  AdminExplorerShell,
  AdminExplorerTree,
} from "@/components/admin/explorer/admin-explorer-shell";
import { AdminToastProvider } from "@/components/admin/admin-toast";
import { loadAdminExplorerData } from "@/lib/docs/admin-explorer-server";

import { ContentLoadError } from "./content-load-error";
import Loading from "./loading";

export default function AdminContentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminExplorerShell
      mobileTree={(
        <Suspense fallback={<TreeLoading />}>
          <LoadedAdminExplorerTree closeDrawer />
        </Suspense>
      )}
      desktopTree={(
        <Suspense fallback={<TreeLoading />}>
          <LoadedAdminExplorerTree />
        </Suspense>
      )}
    >
      <Suspense fallback={<Loading />}>
        <AdminExplorerContent>{children}</AdminExplorerContent>
      </Suspense>
    </AdminExplorerShell>
  );
}

export async function AdminExplorerContent({ children }: { children: React.ReactNode }) {
  try {
    await loadAdminExplorerData();
  } catch (error) {
    unstable_rethrow(error);
    return <ContentLoadError />;
  }

  return <AdminToastProvider>{children}</AdminToastProvider>;
}

export async function LoadedAdminExplorerTree({ closeDrawer = false }: { closeDrawer?: boolean }) {
  let sections;
  let creationBlocked = false;
  try {
    const data = await loadAdminExplorerData();
    sections = data.sections;
    creationBlocked = data.pendingSectionOperations.length > 0;
  } catch (error) {
    unstable_rethrow(error);
    return (
      <p role="status" className="break-words p-3 text-sm text-muted-foreground">
        โหลดรายการหมวดไม่สำเร็จ
      </p>
    );
  }

  return <AdminExplorerTree sections={sections} creationBlocked={creationBlocked} closeDrawer={closeDrawer} />;
}

function TreeLoading() {
  return <p role="status" className="p-3 text-sm text-muted-foreground">กำลังโหลดรายการหมวด</p>;
}
