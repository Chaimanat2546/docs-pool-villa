/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { PublicSearchPalette } from "./public-search-palette";

describe("PublicSearchPalette", () => {
  afterEach(cleanup);
  it("opens from its trigger and focuses the live search input", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [] }) }));
    render(<PublicSearchPalette />);

    fireEvent.click(screen.getByRole("button", { name: "ค้นหาคู่มือ" }));

    expect(await screen.findByRole("dialog", { name: "ค้นหาคู่มือ" })).toBeTruthy();
    expect(screen.getByRole("searchbox", { name: "ค้นหาคู่มือ" })).toBe(document.activeElement);
  });

  it("opens with Control K", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [] }) }));
    render(<PublicSearchPalette />);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(await screen.findByRole("dialog", { name: "ค้นหาคู่มือ" })).toBeTruthy();
  });

  it("selects a result with Arrow Down and opens it with Enter", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [{ id: "doc", href: "/guides/account#ตั้งค่า", title: "บัญชี", sectionTitle: "คู่มือ", parentTitle: null, kind: "heading", heading: "ตั้งค่า" }] }) }));
    render(<PublicSearchPalette />);
    fireEvent.click(screen.getByRole("button", { name: "ค้นหาคู่มือ" }));
    await screen.findByText("บัญชี");

    fireEvent.keyDown(screen.getByRole("searchbox", { name: "ค้นหาคู่มือ" }), { key: "ArrowDown" });
    fireEvent.keyDown(screen.getByRole("searchbox", { name: "ค้นหาคู่มือ" }), { key: "Enter" });

    expect(push).toHaveBeenCalledWith("/guides/account#ตั้งค่า");
  });
});
