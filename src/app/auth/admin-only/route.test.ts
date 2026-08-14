import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/server", () => ({ createClient }));

import { GET } from "./route";

describe("GET /auth/admin-only", () => {
  beforeEach(() => {
    createClient.mockReset();
  });

  it("signs out before redirecting to the login page", async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    createClient.mockResolvedValue({ auth: { signOut } });

    const response = await GET(new Request("http://localhost/auth/admin-only"));

    expect(signOut).toHaveBeenCalledOnce();
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/auth/login?error=admin_only");
  });

  it("still redirects to login when session cleanup reports an error", async () => {
    createClient.mockResolvedValue({
      auth: { signOut: vi.fn().mockResolvedValue({ error: { message: "failed" } }) },
    });

    const response = await GET(new Request("http://localhost/auth/admin-only"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/auth/login?error=admin_only");
  });
});
