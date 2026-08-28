import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, redirect } = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn((path: string): never => {
    throw Object.assign(new Error("NEXT_REDIRECT"), {
      digest: `NEXT_REDIRECT;${path}`,
    });
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/server", () => ({ createClient }));

import { requireAdmin } from "./require-admin";

describe("requireAdmin", () => {
  beforeEach(() => {
    createClient.mockReset();
    redirect.mockClear();
  });

  it("redirects a non-admin to the session-termination route", async () => {
    createClient.mockResolvedValue({
      auth: { getClaims: vi.fn().mockResolvedValue({ data: { claims: { sub: "user-id" } }, error: null }) },
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
    });

    await expect(requireAdmin()).rejects.toEqual(expect.objectContaining({ digest: "NEXT_REDIRECT;/auth/admin-only" }));
  });

  it("redirects a guest to login without calling the admin RPC", async () => {
    const rpc = vi.fn();
    createClient.mockResolvedValue({
      auth: { getClaims: vi.fn().mockResolvedValue({ data: { claims: null }, error: null }) },
      rpc,
    });

    await expect(requireAdmin()).rejects.toEqual(expect.objectContaining({ digest: "NEXT_REDIRECT;/auth/login" }));
    expect(rpc).not.toHaveBeenCalled();
  });

  it("resolves for an administrator", async () => {
    createClient.mockResolvedValue({
      auth: { getClaims: vi.fn().mockResolvedValue({ data: { claims: { sub: "admin-id" } }, error: null }) },
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    });

    await expect(requireAdmin()).resolves.toBeUndefined();
  });

  it("throws when the admin RPC returns an error", async () => {
    createClient.mockResolvedValue({
      auth: { getClaims: vi.fn().mockResolvedValue({ data: { claims: { sub: "user-id" } }, error: null }) },
      rpc: vi.fn().mockResolvedValue({ data: null, error: new Error("RPC failed") }),
    });

    await expect(requireAdmin()).rejects.toThrow("ไม่สามารถตรวจสอบสิทธิ์ผู้ดูแลระบบได้");
  });
});
