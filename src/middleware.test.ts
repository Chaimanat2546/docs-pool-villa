import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextResponse, type NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { updateSession } = vi.hoisted(() => ({ updateSession: vi.fn() }));

vi.mock("@/lib/middleware", () => ({ updateSession }));

import { config, middleware } from "./middleware";

describe("Middleware session boundary", () => {
  beforeEach(() => updateSession.mockReset());

  it("matches application routes and excludes static image routes", () => {
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: "/admin" })).toBe(true);
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: "/guide/start" })).toBe(true);
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: "/_next/static/chunk.js" })).toBe(false);
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: "/cover.webp" })).toBe(false);
  });

  it("delegates cookie refresh to updateSession", async () => {
    const request = {} as NextRequest;
    const response = NextResponse.next();
    updateSession.mockResolvedValue(response);

    await expect(middleware(request)).resolves.toBe(response);
    expect(updateSession).toHaveBeenCalledOnce();
    expect(updateSession).toHaveBeenCalledWith(request);
  });
});
