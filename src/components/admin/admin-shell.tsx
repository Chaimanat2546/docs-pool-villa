"use client";

import { Dialog } from "@base-ui/react/dialog";
import {
  Eye,
  FolderTree,
  Home,
  House,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { createClient } from "@/lib/client";

import {
  GuardedAdminLink,
  UnsavedNavigationProvider,
  useUnsavedNavigation,
} from "./unsaved-navigation";

const adminNavigation = [
  {
    title: "จัดการเนื้อหา",
    href: "/admin/structure",
    matches: ["/admin/structure", "/admin/documents"],
    icon: FolderTree,
  },
] as const;

const sidebarCollapsedStorageKey = "admin-sidebar-collapsed";
const sidebarPreferenceChangeEvent = "admin-sidebar-preference-change";

function subscribeToSidebarPreference(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(sidebarPreferenceChangeEvent, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(sidebarPreferenceChangeEvent, onStoreChange);
  };
}

function getSidebarCollapsedSnapshot() {
  return window.localStorage.getItem(sidebarCollapsedStorageKey) === "true";
}

function getServerSidebarCollapsedSnapshot() {
  return false;
}

type NavigationLinksProps = {
  pathname: string;
  isCollapsed?: boolean;
  onNavigate?: () => void;
  firstLinkRef?: React.Ref<HTMLAnchorElement>;
};

function NavigationLinks({
  pathname,
  isCollapsed = false,
  onNavigate,
  firstLinkRef,
}: NavigationLinksProps) {
  return (
    <>
      {adminNavigation.map(({ title, href, matches, icon: Icon }, index) => (
        <GuardedAdminLink
          key={href}
          href={href}
          title={isCollapsed ? title : undefined}
          aria-current={
            matches.some(
              (match) => pathname === match || pathname.startsWith(`${match}/`)
            )
              ? "page"
              : undefined
          }
          onNavigate={onNavigate}
          ref={index === 0 ? firstLinkRef : undefined}
          className={`flex min-h-11 items-center rounded-lg py-2 text-sm font-medium text-foreground hover:bg-muted aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground ${
            isCollapsed ? "justify-center px-2" : "gap-3 px-3"
          }`}
        >
          <Icon size={18} aria-hidden="true" />
          <span className={isCollapsed ? "sr-only" : undefined}>{title}</span>
        </GuardedAdminLink>
      ))}
    </>
  );
}

type NavigationContentProps = NavigationLinksProps & {
  isSigningOut: boolean;
  onSignOut: () => void;
};

function NavigationContent({
  isCollapsed = false,
  isSigningOut,
  onNavigate,
  onSignOut,
  pathname,
  firstLinkRef,
}: NavigationContentProps) {
  const { requestAction } = useUnsavedNavigation();

  return (
    <>
      <NavigationLinks
        pathname={pathname}
        isCollapsed={isCollapsed}
        onNavigate={onNavigate}
        firstLinkRef={firstLinkRef}
      />
      <GuardedAdminLink
        href="/"
        title={isCollapsed ? "กลับหน้าคู่มือ" : undefined}
        onNavigate={onNavigate}
        className={`mt-auto flex min-h-11 items-center rounded-lg py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground ${
          isCollapsed ? "justify-center px-2" : "px-3"
        }`}
      >
        {isCollapsed ? <Eye size={18} aria-hidden="true" /> : null}
        <span className={isCollapsed ? "sr-only" : undefined}>
          กลับหน้าคู่มือ
        </span>
      </GuardedAdminLink>
      <button
        type="button"
        disabled={isSigningOut}
        onClick={(event) =>
          requestAction(() => {
            onNavigate?.();
            onSignOut();
          }, event.currentTarget)
        }
        title={isCollapsed ? "ออกจากระบบ" : undefined}
        className={`flex min-h-11 items-center rounded-lg py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 ${
          isCollapsed ? "justify-center px-2" : "px-3"
        }`}
      >
        {isCollapsed ? <LogOut size={18} aria-hidden="true" /> : null}
        <span className={isCollapsed ? "sr-only" : undefined}>
          {isSigningOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
        </span>
      </button>
    </>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const isSidebarCollapsed = useSyncExternalStore(
    subscribeToSidebarPreference,
    getSidebarCollapsedSnapshot,
    getServerSidebarCollapsedSnapshot
  );
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const firstMobileLinkRef = useRef<HTMLAnchorElement>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  function toggleSidebar() {
    const nextCollapsed = !isSidebarCollapsed;
    window.localStorage.setItem(
      sidebarCollapsedStorageKey,
      String(nextCollapsed)
    );
    window.dispatchEvent(new Event(sidebarPreferenceChangeEvent));
  }

  async function handleSignOut() {
    setLogoutError(null);
    setIsSigningOut(true);

    try {
      const { error } = await createClient().auth.signOut();
      if (error) {
        if (isMountedRef.current)
          setLogoutError("ออกจากระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
        return;
      }

      router.replace("/auth/login");
      router.refresh();
    } catch {
      if (isMountedRef.current)
        setLogoutError("ออกจากระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      if (isMountedRef.current) setIsSigningOut(false);
    }
  }

  return (
    <UnsavedNavigationProvider>
      <div className="min-h-screen lg:flex">
        <aside
          className={`hidden shrink-0 border-r bg-card transition-[width] duration-200 lg:flex lg:flex-col ${
            isSidebarCollapsed ? "w-20" : "w-64"
          }`}
        >
          <div
            className={`border-b py-5 ${isSidebarCollapsed ? "px-3" : "px-5"}`}
          >
            <div
              className={`flex gap-3 ${
                isSidebarCollapsed
                  ? "flex-col items-center"
                  : "items-center justify-between"
              }`}
            >
              <div className={isSidebarCollapsed ? "sr-only" : undefined}>
                <p className="font-semibold">ระบบจัดการคู่มือ</p>
                <p className="text-sm text-muted-foreground">Baan Pool Villa</p>
              </div>
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label={isSidebarCollapsed ? "ขยาย Sidebar" : "ย่อ Sidebar"}
                title={isSidebarCollapsed ? "ขยาย Sidebar" : "ย่อ Sidebar"}
                className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-muted"
              >
                {isSidebarCollapsed ? (
                  <PanelLeftOpen size={18} aria-hidden="true" />
                ) : (
                  <PanelLeftClose size={18} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
          <nav
            aria-label="เมนูผู้ดูแล"
            className="flex flex-1 flex-col gap-1 p-3"
          >
            <NavigationContent
              pathname={pathname}
              isCollapsed={isSidebarCollapsed}
              isSigningOut={isSigningOut}
              onSignOut={handleSignOut}
            />
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <Dialog.Root
            open={mobileNavigationOpen}
            onOpenChange={setMobileNavigationOpen}
          >
            <div className="border-b bg-card px-4 py-3 lg:hidden">
              <Dialog.Trigger className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium hover:bg-muted">
                <Menu size={18} aria-hidden="true" />
                เมนูผู้ดูแล
              </Dialog.Trigger>
            </div>
            <Dialog.Portal>
              <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50 lg:hidden" />
              <Dialog.Popup
                initialFocus={firstMobileLinkRef}
                className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[calc(100vw-2rem)] flex-col bg-card p-4 shadow-xl outline-none lg:hidden"
              >
                <div className="flex items-center justify-between gap-3">
                  <Dialog.Title className="px-3 py-2 text-lg font-semibold">
                    เมนูผู้ดูแล
                  </Dialog.Title>
                  <Dialog.Close
                    aria-label="ปิดเมนูผู้ดูแล"
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-muted"
                  >
                    <X size={20} aria-hidden="true" />
                  </Dialog.Close>
                </div>
                <nav
                  aria-label="เมนูผู้ดูแล"
                  className="mt-3 flex flex-1 flex-col gap-1"
                >
                  <NavigationContent
                    pathname={pathname}
                    onNavigate={() => setMobileNavigationOpen(false)}
                    firstLinkRef={firstMobileLinkRef}
                    isSigningOut={isSigningOut}
                    onSignOut={handleSignOut}
                  />
                </nav>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>

          {logoutError ? (
            <p
              role="alert"
              className="mx-4 mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {logoutError}
            </p>
          ) : null}

          <div id="main-content" className="min-w-0">
            {children}
          </div>
        </div>
      </div>
    </UnsavedNavigationProvider>
  );
}
