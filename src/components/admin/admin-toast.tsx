"use client";

import { CheckCircle2, CircleX, Info, LoaderCircle, TriangleAlert, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type AdminToastKind = "success" | "info" | "warning" | "error" | "loading";

type Toast = {
  id: string;
  kind: AdminToastKind;
  message: string;
};

type AdminToastContextValue = {
  show: (kind: AdminToastKind, message: string) => string;
  showLoading: (message: string) => string;
  update: (id: string, kind: AdminToastKind, message: string) => void;
  dismiss: (id: string) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
};

const noopToastContext: AdminToastContextValue = {
  show: () => "",
  showLoading: () => "",
  update: () => undefined,
  dismiss: () => undefined,
  showSuccess: () => undefined,
  showError: () => undefined,
};

const AdminToastContext = createContext<AdminToastContextValue>(noopToastContext);

const toastStyles: Record<
  AdminToastKind,
  { className: string; Icon: typeof CheckCircle2; role: "alert" | "status" }
> = {
  success: { className: "border-emerald-600/30 bg-emerald-50 text-emerald-950", Icon: CheckCircle2, role: "status" },
  info: { className: "border-sky-600/30 bg-sky-50 text-sky-950", Icon: Info, role: "status" },
  warning: { className: "border-amber-600/30 bg-amber-50 text-amber-950", Icon: TriangleAlert, role: "alert" },
  error: { className: "border-destructive/30 bg-destructive/10 text-destructive", Icon: CircleX, role: "alert" },
  loading: { className: "border-slate-300 bg-white text-slate-950", Icon: LoaderCircle, role: "status" },
};

function dismissalDelay(kind: AdminToastKind): number | null {
  if (kind === "success" || kind === "info") return 3_000;
  if (kind === "warning") return 5_000;
  return null;
}

export function AdminToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutIds = useRef(new Map<string, number>());

  const clearDismissal = useCallback((id: string) => {
    const timeoutId = timeoutIds.current.get(id);
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      timeoutIds.current.delete(id);
    }
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      clearDismissal(id);
      setToasts((current) => current.filter((toast) => toast.id !== id));
    },
    [clearDismissal]
  );

  const scheduleDismissal = useCallback(
    (id: string, kind: AdminToastKind) => {
      const delay = dismissalDelay(kind);
      if (delay !== null) {
        timeoutIds.current.set(id, window.setTimeout(() => dismiss(id), delay));
      }
    },
    [dismiss]
  );

  const show = useCallback(
    (kind: AdminToastKind, message: string) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { id, kind, message }]);
      scheduleDismissal(id, kind);
      return id;
    },
    [scheduleDismissal]
  );

  const update = useCallback(
    (id: string, kind: AdminToastKind, message: string) => {
      clearDismissal(id);
      setToasts((current) => current.map((toast) => (toast.id === id ? { ...toast, kind, message } : toast)));
      scheduleDismissal(id, kind);
    },
    [clearDismissal, scheduleDismissal]
  );

  useEffect(() => {
    const activeTimeoutIds = timeoutIds.current;

    return () => {
      activeTimeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      activeTimeoutIds.clear();
    };
  }, []);

  const value = useMemo<AdminToastContextValue>(
    () => ({
      show,
      showLoading: (message) => show("loading", message),
      update,
      dismiss,
      showSuccess: (message) => {
        show("success", message);
      },
      showError: (message) => {
        show("error", message);
      },
    }),
    [dismiss, show, update]
  );

  return (
    <AdminToastContext.Provider value={value}>
      {children}
      {toasts.length > 0 && (
        <div className="pointer-events-none fixed left-1/2 top-4 z-50 flex w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-2">
          {toasts.map((toast) => {
            const { Icon, className, role } = toastStyles[toast.kind];
            const isLoading = toast.kind === "loading";

            return (
              <div key={toast.id} role={role} className={`pointer-events-auto flex items-start gap-3 rounded-lg border p-3 text-sm shadow-lg ${className}`}>
                <Icon aria-hidden="true" className={isLoading ? "mt-0.5 size-5 shrink-0 animate-spin" : "mt-0.5 size-5 shrink-0"} />
                <p className="min-w-0 flex-1 break-words">{toast.message}</p>
                {!isLoading && (
              <button
                type="button"
                aria-label="ปิดข้อความแจ้งเตือน"
                    onClick={() => dismiss(toast.id)}
                    className="-m-1 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
              >
                <X aria-hidden="true" size={16} />
              </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AdminToastContext.Provider>
  );
}

export function useAdminToast(): AdminToastContextValue {
  return useContext(AdminToastContext);
}
