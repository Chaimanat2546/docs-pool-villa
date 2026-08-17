"use client";

import { X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastKind = "success" | "error";

type Toast = {
  id: number;
  kind: ToastKind;
  message: string;
};

type AdminToastContextValue = {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
};

const noopToastContext: AdminToastContextValue = {
  showSuccess: () => undefined,
  showError: () => undefined,
};

const AdminToastContext = createContext<AdminToastContextValue>(noopToastContext);

export function AdminToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);

  const show = useCallback((kind: ToastKind, message: string) => {
    setToast({ id: Date.now(), kind, message });
  }, []);

  useEffect(() => {
    if (!toast || toast.kind !== "success") return;

    const timeout = window.setTimeout(() => setToast(null), 3_000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const value = useMemo<AdminToastContextValue>(
    () => ({
      showSuccess: (message) => show("success", message),
      showError: (message) => show("error", message),
    }),
    [show]
  );

  return (
    <AdminToastContext.Provider value={value}>
      {children}
      {toast && (
        <div className="pointer-events-none fixed left-1/2 top-4 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2">
          <div
            role={toast.kind === "error" ? "alert" : "status"}
            className={`pointer-events-auto flex items-start gap-3 rounded-lg border p-3 text-sm shadow-lg ${
              toast.kind === "error"
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-emerald-600/30 bg-emerald-50 text-emerald-950"
            }`}
          >
            <p className="min-w-0 flex-1 break-words">{toast.message}</p>
            {toast.kind === "error" && (
              <button
                type="button"
                aria-label="ปิดข้อความแจ้งเตือน"
                onClick={() => setToast(null)}
                className="-m-1 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-destructive/10"
              >
                <X aria-hidden="true" size={16} />
              </button>
            )}
          </div>
        </div>
      )}
    </AdminToastContext.Provider>
  );
}

export function useAdminToast(): AdminToastContextValue {
  return useContext(AdminToastContext);
}
