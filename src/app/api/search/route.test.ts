import { beforeEach, describe, expect, it, vi } from "vitest";

const { getPublicSearchResults } = vi.hoisted(() => ({
  getPublicSearchResults: vi.fn(),
}));

vi.mock("@/lib/docs/public-search", () => ({
  getPublicSearchResults,
  normalizePublicSearchParams: ({ q }: { q?: string }) => ({ query: q?.trim() ?? "", page: 1 }),
}));

import { GET } from "./route";

describe("public palette search route", () => {
  beforeEach(() => {
    getPublicSearchResults.mockReset();
  });

  it("normalizes the query and returns no more than ten results", async () => {
    getPublicSearchResults.mockResolvedValue({
      items: Array.from({ length: 11 }, (_, index) => ({ id: String(index), title: `เอกสาร ${index}` })),
    });

    const response = await GET(new Request("https://docs.test/api/search?q=%20ตั้งค่า%20&page=9"));

    expect(getPublicSearchResults).toHaveBeenCalledWith({ query: "ตั้งค่า", page: 1 });
    expect(response.status).toBe(200);
    expect((await response.json()).items).toHaveLength(10);
  });

  it("marks an empty live-search response as non-cacheable", async () => {
    getPublicSearchResults.mockResolvedValue({ items: [] });

    const response = await GET(new Request("https://docs.test/api/search?q=not-found"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ items: [] });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns a recoverable error when search loading fails", async () => {
    getPublicSearchResults.mockRejectedValue(new Error("database unavailable"));

    const response = await GET(new Request("https://docs.test/api/search?q=ตั้งค่า"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "ไม่สามารถค้นหาคู่มือได้" });
  });
});
