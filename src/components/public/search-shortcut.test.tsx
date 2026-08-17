// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { SearchShortcut } from "./search-shortcut";

describe("SearchShortcut", () => {
  it("focuses the search input with Control or Command K on the search page", () => {
    window.history.pushState({}, "", "/search");
    render(<><input id="public-search" type="search" aria-label="ค้นหาคู่มือ" /><SearchShortcut /></>);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(screen.getByRole("searchbox", { name: "ค้นหาคู่มือ" })).toBe(document.activeElement);
  });
});
