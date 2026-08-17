// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => window.location.pathname,
  useRouter: () => ({ push: vi.fn() }),
}));

import { SearchShortcut } from "./search-shortcut";

describe("SearchShortcut", () => {
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
  });

  it("focuses the search input with Control or Command K on the search page", () => {
    window.history.pushState({}, "", "/search");
    render(<><input id="public-search" type="search" aria-label="ค้นหาคู่มือ" /><SearchShortcut /></>);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(screen.getByRole("searchbox", { name: "ค้นหาคู่มือ" })).toBe(document.activeElement);
  });

  it("focuses the search input after navigation requested by the shortcut", () => {
    window.history.pushState({}, "", "/search");
    window.sessionStorage.setItem("docs-search-focus", "1");
    render(<><input id="public-search" type="search" aria-label="ค้นหาคู่มือ" /><SearchShortcut /></>);
    expect(screen.getByRole("searchbox", { name: "ค้นหาคู่มือ" })).toBe(document.activeElement);
  });
});
