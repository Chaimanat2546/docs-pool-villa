import { describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@/lib/server", () => ({ createClient }));

import { GET } from "./route";

describe("GET /auth/post-login", () => {
  it("sends an authenticated administrator directly to the Admin home", async () => {
    createClient.mockResolvedValue({
      auth: { getClaims: vi.fn().mockResolvedValue({ data: { claims: { sub: "admin-id" } }, error: null }) },
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    });

    const response = await GET(new Request("http://localhost/auth/post-login"));

    expect(response.headers.get("location")).toBe("http://localhost/admin/structure?mode=reorder");
  });

  it("signs out a non-admin before returning a generic credential error", async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    createClient.mockResolvedValue({
      auth: {
        getClaims: vi.fn().mockResolvedValue({ data: { claims: { sub: "user-id" } }, error: null }),
        signOut,
      },
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
    });

    const response = await GET(new Request("http://localhost/auth/post-login"));

    expect(signOut).toHaveBeenCalledOnce();
    expect(response.headers.get("location")).toBe("http://localhost/auth/login?error=invalid_credentials");
  });
});
