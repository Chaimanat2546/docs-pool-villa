/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { isValidElement, useState, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { UnsavedNavigationProvider } from "@/components/admin/unsaved-navigation";
import { AdminToastProvider, useAdminToast } from "@/components/admin/admin-toast";

const route = vi.hoisted(() => ({
  loadAdminExplorerData: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  unstableRethrow: vi.fn((error: unknown) => {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
  }),
}));

vi.mock("@/lib/docs/admin-explorer-server", () => ({
  loadAdminExplorerData: route.loadAdminExplorerData,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: route.push, refresh: route.refresh }),
  useSearchParams: () => ({ get: () => null }),
  unstable_rethrow: route.unstableRethrow,
}));

import AdminContentLayout, { AdminExplorerContent, LoadedAdminExplorerTree } from "./layout";
import { AdminExplorerShell, AdminExplorerTree } from "@/components/admin/explorer/admin-explorer-shell";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

it("returns the shared shell immediately while the right-pane route loader remains pending", () => {
  const routeLayout = AdminContentLayout({ children: <p>รายการเอกสาร</p> });
  expect(isValidElement(routeLayout)).toBe(true);
  if (!isValidElement(routeLayout)) return;

  const providerProps = routeLayout.props as { children: ReactElement };
  expect(routeLayout.type).toBe(AdminToastProvider);
  expect(providerProps.children.type).toBe(AdminExplorerShell);

  const shellProps = providerProps.children.props as {
    mobileTree: ReactElement<{ fallback: ReactNode }>;
    desktopTree: ReactElement<{ fallback: ReactNode }>;
    children: ReactElement<{ fallback: ReactNode }>;
  };
  expect(route.loadAdminExplorerData).not.toHaveBeenCalled();

  render(
    <UnsavedNavigationProvider>
      <AdminExplorerShell
        mobileTree={shellProps.mobileTree.props.fallback}
        desktopTree={shellProps.desktopTree.props.fallback}
      >
        {shellProps.children.props.fallback}
      </AdminExplorerShell>
    </UnsavedNavigationProvider>,
  );
  expect(screen.getByRole("region", { name: "พื้นที่จัดการเนื้อหา" })).not.toBeNull();
  expect(screen.getByLabelText("กำลังโหลดพื้นที่จัดการเนื้อหา").getAttribute("aria-busy")).toBe("true");
  expect(screen.queryByText("รายการเอกสาร")).toBeNull();
});

it("keeps the toast provider above the shell while loader content remains unwrapped", async () => {
  route.loadAdminExplorerData.mockResolvedValue({});
  const child = <p>รายการเอกสาร</p>;
  const routeLayout = AdminContentLayout({ children: child });
  const providerProps = routeLayout.props as { children: ReactElement };

  expect(routeLayout.type).toBe(AdminToastProvider);
  expect(providerProps.children.type).toBe(AdminExplorerShell);
  await expect(AdminExplorerContent({ children: child })).resolves.toBe(child);
});

function SuccessfulNavigationHarness() {
  const { showLoading, update } = useAdminToast();
  const [navigated, setNavigated] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          const toastId = showLoading("กำลังบันทึกหมวด");
          update(toastId, "success", "บันทึกหมวดสำเร็จ");
          setNavigated(true);
        }}
      >
        บันทึกหมวด
      </button>
      {navigated ? <p>หมวดที่สร้างแล้ว</p> : <p>ฟอร์มสร้างหมวด</p>}
    </>
  );
}

it("preserves a success toast when route content is replaced after navigation", async () => {
  const user = userEvent.setup();
  render(
    <UnsavedNavigationProvider>
      <AdminToastProvider>
        <AdminExplorerShell
          mobileTree={<AdminExplorerTree sections={[]} closeDrawer />}
          desktopTree={<AdminExplorerTree sections={[]} />}
        >
          <SuccessfulNavigationHarness />
        </AdminExplorerShell>
      </AdminToastProvider>
    </UnsavedNavigationProvider>,
  );

  await user.click(screen.getByRole("button", { name: "บันทึกหมวด" }));

  expect(screen.getByText("หมวดที่สร้างแล้ว")).not.toBeNull();
  expect(screen.getByRole("status").textContent).toContain("บันทึกหมวดสำเร็จ");
});

it("keeps the shared shell mounted and refreshes from a loader failure at the route hierarchy", async () => {
  route.loadAdminExplorerData.mockRejectedValue(new Error("database-secret"));

  const rightPane = await AdminExplorerContent({ children: <p>รายการเอกสาร</p> });
  render(
    <UnsavedNavigationProvider>
      <AdminExplorerShell
        mobileTree={<AdminExplorerTree sections={[]} closeDrawer />}
        desktopTree={<AdminExplorerTree sections={[]} />}
      >
        {rightPane}
      </AdminExplorerShell>
    </UnsavedNavigationProvider>,
  );

  expect(screen.getByRole("region", { name: "พื้นที่จัดการเนื้อหา" })).not.toBeNull();
  expect((await screen.findByRole("alert")).textContent).not.toContain("database-secret");
  await userEvent.click(screen.getByRole("button", { name: "ลองใหม่" }));
  expect(route.refresh).toHaveBeenCalledOnce();
});

it("passes pending section media work through to disable tree creation actions", async () => {
  route.loadAdminExplorerData.mockResolvedValue({
    sections: [{ id: "root", parentId: null, title: "เริ่มต้น", slug: "start", isPublished: true, sortOrder: 0, directDocumentCount: 0 }],
    documents: [],
    pendingSectionOperations: [{ operationId: "operation-1" }],
    cleanupOperation: null,
  });

  const tree = await LoadedAdminExplorerTree({});
  render(<UnsavedNavigationProvider>{tree}</UnsavedNavigationProvider>);

  expect((screen.getByRole("button", { name: "สร้างหมวดหลัก" }) as HTMLButtonElement).disabled).toBe(true);
});

it("does not turn authorization redirects or unrelated failures into a data error", async () => {
  const redirectInterrupt = new Error("NEXT_REDIRECT");
  route.loadAdminExplorerData.mockRejectedValue(redirectInterrupt);

  await expect(AdminExplorerContent({ children: <p>รายการเอกสาร</p> })).rejects.toBe(redirectInterrupt);
});
