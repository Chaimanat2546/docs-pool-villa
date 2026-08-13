/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { UnsavedNavigationProvider } from "@/components/admin/unsaved-navigation";

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

import AdminContentLayout, { AdminExplorerContent } from "./layout";
import { AdminExplorerShell, AdminExplorerTree } from "@/components/admin/explorer/admin-explorer-shell";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

it("returns the shared shell immediately while the right-pane route loader remains pending", () => {
  const routeLayout = AdminContentLayout({ children: <p>รายการเอกสาร</p> });
  expect(isValidElement(routeLayout)).toBe(true);
  if (!isValidElement(routeLayout)) return;

  const shellProps = routeLayout.props as {
    mobileTree: ReactElement<{ fallback: ReactNode }>;
    desktopTree: ReactElement<{ fallback: ReactNode }>;
    children: ReactElement<{ fallback: ReactNode }>;
  };
  expect(routeLayout.type).toBe(AdminExplorerShell);
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

it("does not turn authorization redirects or unrelated failures into a data error", async () => {
  const redirectInterrupt = new Error("NEXT_REDIRECT");
  route.loadAdminExplorerData.mockRejectedValue(redirectInterrupt);

  await expect(AdminExplorerContent({ children: <p>รายการเอกสาร</p> })).rejects.toBe(redirectInterrupt);
});
