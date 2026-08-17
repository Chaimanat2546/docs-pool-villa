/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/public/public-header", () => ({ PublicHeader: () => <header /> }));
vi.mock("@/components/public/public-search-palette", () => ({
  PublicSearchPalette: ({ variant }: { variant?: string }) => <div data-testid="home-search-palette" data-variant={variant} />,
}));
vi.mock("@/lib/docs/public", () => ({
  getPublicDocsIndex: vi.fn(async () => ({ documents: [], sections: [], recentUpdates: [] })),
}));

import Home from "./page";

describe("Home", () => {
  it("uses the shared hero search palette instead of the removed search form", async () => {
    render(await Home());

    expect(screen.getByTestId("home-search-palette").getAttribute("data-variant")).toBe("hero");
    expect(document.querySelector('form[action="/search"]')).toBeNull();
  });
});
