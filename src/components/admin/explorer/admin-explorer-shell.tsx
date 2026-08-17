"use client";

import { Dialog } from "@base-ui/react/dialog";
import { FolderTree as FolderTreeIcon, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { createContext, useContext, useRef, useState } from "react";

import { useUnsavedNavigation } from "@/components/admin/unsaved-navigation";
import { resolveAdminSectionId, type AdminExplorerSection } from "@/lib/docs/admin-explorer";

import { FolderTree } from "./folder-tree";

type AdminExplorerShellProps = {
  mobileTree: React.ReactNode;
  desktopTree: React.ReactNode;
  children: React.ReactNode;
};

const DEFAULT_TREE_WIDTH = 288;
const MobileDrawerContext = createContext<(() => void) | null>(null);
type CreationNavigationContextValue = {
  creationBlocked: boolean;
  setCreationBlocked: (blocked: boolean) => void;
  rememberCreationOrigin: () => void;
  restoreCreationFocus: () => boolean;
};
const CreationNavigationContext = createContext<CreationNavigationContextValue>({
  creationBlocked: false,
  setCreationBlocked: () => {},
  rememberCreationOrigin: () => {},
  restoreCreationFocus: () => false,
});

export function useCreationNavigation() {
  return useContext(CreationNavigationContext);
}

export function AdminExplorerShell({ mobileTree, desktopTree, children }: AdminExplorerShellProps) {
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false);
  const [treeWidth, setTreeWidth] = useState(DEFAULT_TREE_WIDTH);
  const [creationBlocked, setCreationBlocked] = useState(false);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const creationOriginRef = useRef<HTMLElement | null>(null);

  function rememberCreationOrigin() {
    creationOriginRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }

  function restoreCreationFocus() {
    if (creationOriginRef.current?.isConnected) {
      creationOriginRef.current.focus();
      return true;
    }
    mobileTriggerRef.current?.focus();
    return mobileTriggerRef.current !== null;
  }

  function handleResizeKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    const direction = event.key === "ArrowRight" || event.key === "ArrowUp"
      ? 1
      : event.key === "ArrowLeft" || event.key === "ArrowDown"
        ? -1
        : 0;
    if (direction === 0) return;
    event.preventDefault();
    setTreeWidth((current) => Math.min(384, Math.max(224, current + direction * 16)));
  }

  return (
    <CreationNavigationContext.Provider value={{ creationBlocked, setCreationBlocked, rememberCreationOrigin, restoreCreationFocus }}>
    <section aria-label="พื้นที่จัดการเนื้อหา" className="min-w-0 max-w-full">
      <Dialog.Root open={mobileTreeOpen} onOpenChange={setMobileTreeOpen}>
        <div className="border-b bg-card px-4 py-3 xl:hidden">
          <Dialog.Trigger ref={mobileTriggerRef} className="inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium">
            <FolderTreeIcon className="size-4" aria-hidden="true" />
            เลือกหมวด
          </Dialog.Trigger>
        </div>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50 xl:hidden" />
          <Dialog.Popup
            aria-modal="true"
            className="fixed inset-y-0 left-0 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col bg-card p-4 shadow-xl outline-none xl:hidden"
          >
            <div className="flex items-center justify-between gap-3 border-b pb-3">
              <Dialog.Title className="text-lg font-semibold">หมวดคู่มือ</Dialog.Title>
              <Dialog.Close aria-label="ปิดรายการหมวด" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full">
                <X className="size-5" aria-hidden="true" />
              </Dialog.Close>
            </div>
            <Dialog.Description className="py-3 text-sm text-muted-foreground">
              เลือกหมวดเพื่อจัดการโครงสร้างและเอกสาร
            </Dialog.Description>
            <MobileDrawerContext.Provider value={() => setMobileTreeOpen(false)}>
              <div className="min-h-0 flex-1 overflow-y-auto">{mobileTree}</div>
            </MobileDrawerContext.Provider>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="min-w-0 xl:grid" style={{ gridTemplateColumns: `${treeWidth}px minmax(0,1fr)` }}>
        <aside aria-label="หมวดคู่มือ" className="hidden min-h-[calc(100vh-4rem)] border-r bg-card xl:flex xl:min-w-0 xl:flex-col">
          <div className="border-b px-4 py-4">
            <h2 className="font-semibold">จัดการเนื้อหา</h2>
            <p className="mt-1 text-sm text-muted-foreground">เลือกหมวดจากโครงสร้างคู่มือ</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {desktopTree}
          </div>
          <div className="border-t px-4 py-3">
            <input
              aria-label="ปรับความกว้างรายการหมวด"
              type="range"
              min={224}
              max={384}
              step={16}
              value={treeWidth}
              onChange={(event) => setTreeWidth(Number(event.target.value))}
              onKeyDown={handleResizeKeyDown}
              className="hidden w-full accent-primary xl:block"
            />
          </div>
        </aside>
        <main className="min-w-0 max-w-full">{children}</main>
      </div>
    </section>
    </CreationNavigationContext.Provider>
  );
}

export function AdminExplorerTree({ sections, closeDrawer = false, creationBlocked = false }: { sections: AdminExplorerSection[]; closeDrawer?: boolean; creationBlocked?: boolean }) {
  const searchParams = useSearchParams();
  const { requestNavigation } = useUnsavedNavigation();
  const closeMobileDrawer = useContext(MobileDrawerContext);
  const { creationBlocked: creationBlockedInSession, rememberCreationOrigin } = useCreationNavigation();
  const selectedSectionId = resolveAdminSectionId(sections, searchParams.get("section") ?? undefined);

  function navigate(href: string) {
    if (href.includes("mode=create")) rememberCreationOrigin();
    requestNavigation(href, undefined, closeDrawer ? closeMobileDrawer ?? undefined : undefined);
  }

  return <FolderTree sections={sections} selectedSectionId={selectedSectionId} creationBlocked={creationBlocked || creationBlockedInSession} onNavigate={navigate} />;
}
