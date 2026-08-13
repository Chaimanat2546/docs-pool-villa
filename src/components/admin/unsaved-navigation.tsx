"use client";

import { Dialog } from "@base-ui/react/dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type UnsavedNavigationContextValue = {
  dirty: boolean;
  registerDirty: (dirty: boolean) => void;
  requestNavigation: (href: string, trigger?: HTMLElement, onApproved?: () => void) => void;
};

type PendingNavigation = {
  href: string;
  onApproved?: () => void;
};

const UnsavedNavigationContext = createContext<UnsavedNavigationContextValue | null>(null);

export function useUnsavedNavigation(): UnsavedNavigationContextValue {
  const context = useContext(UnsavedNavigationContext);
  if (!context) throw new Error("useUnsavedNavigation must be used within UnsavedNavigationProvider");
  return context;
}

export function UnsavedNavigationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [dirty, setDirty] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const bypassRef = useRef(false);

  const registerDirty = useCallback((nextDirty: boolean) => {
    setDirty(nextDirty);
    if (!nextDirty) bypassRef.current = false;
  }, []);

  const requestNavigation = useCallback((href: string, trigger?: HTMLElement, onApproved?: () => void) => {
    if (!dirty || bypassRef.current) {
      bypassRef.current = false;
      onApproved?.();
      router.push(href);
      return;
    }

    triggerRef.current = trigger
      ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setPendingNavigation({ href, onApproved });
  }, [dirty, router]);

  useEffect(() => {
    if (!dirty) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = true;
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  function cancelNavigation() {
    setPendingNavigation(null);
  }

  function confirmNavigation() {
    if (!pendingNavigation) return;
    const { href, onApproved } = pendingNavigation;
    bypassRef.current = true;
    setPendingNavigation(null);
    requestNavigation(href, undefined, onApproved);
  }

  const value = useMemo(() => ({ dirty, registerDirty, requestNavigation }), [dirty, registerDirty, requestNavigation]);

  return (
    <UnsavedNavigationContext.Provider value={value}>
      {children}
      <Dialog.Root open={pendingNavigation !== null} onOpenChange={(open) => { if (!open) cancelNavigation(); }}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-[60] bg-black/40" />
          <Dialog.Popup
            finalFocus={() => triggerRef.current}
            className="fixed left-1/2 top-1/2 z-[70] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card p-6 shadow-xl outline-none"
          >
            <Dialog.Title className="text-lg font-semibold">ออกจากหน้านี้หรือไม่</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-muted-foreground">
              การแก้ไขที่ยังไม่ได้บันทึกจะหายไป
            </Dialog.Description>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Dialog.Close className="inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium">
                แก้ไขต่อ
              </Dialog.Close>
              <button
                type="button"
                onClick={confirmNavigation}
                className="inline-flex min-h-11 items-center rounded-full bg-destructive px-4 text-sm font-medium text-destructive-foreground"
              >
                ออกโดยไม่บันทึก
              </button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </UnsavedNavigationContext.Provider>
  );
}

type GuardedAdminLinkProps = Omit<React.ComponentProps<typeof Link>, "href" | "onNavigate"> & {
  href: string;
  children: React.ReactNode;
  onNavigate?: () => void;
};

function isInternalDestination(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}

function assignRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

export function GuardedAdminLink({ children, href, onClick, onNavigate, ref, target, ...props }: GuardedAdminLinkProps) {
  const { requestNavigation } = useUnsavedNavigation();
  const linkRef = useRef<HTMLAnchorElement>(null);

  return (
    <Link
      {...props}
      ref={(element) => {
        linkRef.current = element;
        assignRef(ref, element);
      }}
      href={href}
      target={target}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented
          || !isInternalDestination(href)
          || target === "_blank"
          || event.button !== 0
          || event.metaKey
          || event.ctrlKey
          || event.shiftKey
          || event.altKey
        ) return;

        event.preventDefault();
        requestNavigation(href, linkRef.current ?? undefined, onNavigate);
      }}
    >
      {children}
    </Link>
  );
}
