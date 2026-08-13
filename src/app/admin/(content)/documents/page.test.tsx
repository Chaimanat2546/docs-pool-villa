import { beforeEach, expect, it, vi } from "vitest";

const { createClient, order, redirect, requireAdmin } = vi.hoisted(() => {
  const calls: string[] = [];
  return {
    createClient: vi.fn(async () => {
      calls.push("legacy-query");
      throw new Error("legacy document query ran");
    }),
    order: calls,
    redirect: vi.fn(() => {
      calls.push("redirect");
      throw new Error("NEXT_REDIRECT");
    }),
    requireAdmin: vi.fn(async () => {
      calls.push("require-admin");
    }),
  };
});

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/components/admin/media-cleanup-banner", () => ({ MediaCleanupBanner: () => null }));
vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin }));
vi.mock("@/lib/server", () => ({ createClient }));

import DocumentsPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
  order.length = 0;
});

it("requires Admin before redirecting the legacy list to Structure", async () => {
  await expect(DocumentsPage()).rejects.toThrow("NEXT_REDIRECT");

  expect(order).toEqual(["require-admin", "redirect"]);
  expect(createClient).not.toHaveBeenCalled();
  expect(redirect).toHaveBeenCalledWith("/admin/structure");
});
