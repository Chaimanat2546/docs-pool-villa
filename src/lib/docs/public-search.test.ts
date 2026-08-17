import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { escapeLikePattern, normalizePublicSearchParams, pageCountForTotal } from "./public-search";

describe("public title-search query helpers", () => {
  it("trims a single title query and accepts a positive integer page", () => {
    expect(normalizePublicSearchParams({ q: "  ล็อก  ", page: "2" })).toEqual({ query: "ล็อก", page: 2 });
  });

  it("rejects multi-value queries and invalid page values", () => {
    expect(normalizePublicSearchParams({ q: ["one", "two"], page: "-1" })).toEqual({ query: "", page: 1 });
    expect(normalizePublicSearchParams({ q: "title", page: "1.5" })).toEqual({ query: "title", page: 1 });
  });

  it("limits a query to 200 characters", () => {
    expect(normalizePublicSearchParams({ q: "ก".repeat(201) }).query).toHaveLength(200);
  });

  it("escapes SQL ILIKE wildcard characters", () => {
    expect(escapeLikePattern("%_\\")).toBe("\\%\\_\\\\");
  });

  it("calculates pages at the ten-item boundary", () => {
    expect(pageCountForTotal(0)).toBe(0);
    expect(pageCountForTotal(10)).toBe(1);
    expect(pageCountForTotal(11)).toBe(2);
  });
});
