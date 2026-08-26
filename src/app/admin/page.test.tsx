import { expect, it, vi } from "vitest";

const { redirect, requireAdmin } = vi.hoisted(() => ({
  redirect: vi.fn(),
  requireAdmin: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin }));

import AdminPage from "./page";

it("sends administrators to reorder mode", async () => {
  await AdminPage();

  expect(redirect).toHaveBeenCalledWith("/admin/structure?mode=reorder");
});
