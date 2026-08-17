/** @vitest-environment jsdom */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { PublicSearchPalette } from "./public-search-palette";

describe("PublicSearchPalette", () => {
  afterEach(cleanup);
  it("opens from its trigger and focuses the live search input", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [] }) })
    );
    render(<PublicSearchPalette />);

    fireEvent.click(screen.getByRole("button", { name: "ค้นหาคู่มือ" }));

    expect(
      await screen.findByRole("dialog", { name: "ค้นหาคู่มือ" })
    ).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByRole("searchbox", { name: "ค้นหาคู่มือ" })).toBe(
        document.activeElement
      )
    );
  });

  it("opens with Control K", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [] }) })
    );
    render(<PublicSearchPalette />);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(
      await screen.findByRole("dialog", { name: "ค้นหาคู่มือ" })
    ).toBeTruthy();
  });

  it("opens the same dialog from its hero trigger", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [] }) })
    );
    render(<PublicSearchPalette variant="hero" />);

    fireEvent.click(screen.getByRole("button", { name: "ค้นหาคู่มือ" }));

    expect(
      await screen.findByRole("dialog", { name: "ค้นหาคู่มือ" })
    ).toBeTruthy();
  });

  it("does not open while an IME composition is active", () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<PublicSearchPalette />);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true, isComposing: true });

    expect(screen.queryByRole("dialog", { name: "ค้นหาคู่มือ" })).toBeNull();
  });

  it("closes with Escape and returns focus to its trigger", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [] }) })
    );
    render(<PublicSearchPalette />);
    const trigger = screen.getByRole("button", { name: "ค้นหาคู่มือ" });
    fireEvent.click(trigger);
    const input = await screen.findByRole("searchbox", { name: "ค้นหาคู่มือ" });

    fireEvent.keyDown(input, { key: "Escape" });

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "ค้นหาคู่มือ" })).toBeNull()
    );
    await waitFor(() => expect(trigger).toBe(document.activeElement));
  });

  it("groups matching headings under their document rows with icons", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              id: "account",
              href: "/guides/account#ตั้งค่า",
              title: "บัญชี",
              sectionTitle: "คู่มือ",
              parentTitle: null,
              kind: "heading",
              heading: "ตั้งค่า",
              excerpt: "ตั้งค่าบัญชีผู้ใช้และสิทธิ์การเข้าถึง",
            },
            {
              id: "account",
              href: "/guides/account#ความปลอดภัย",
              title: "บัญชี",
              sectionTitle: "คู่มือ",
              parentTitle: null,
              kind: "heading",
              heading: "ความปลอดภัย",
              excerpt: "ตั้งค่าบัญชีผู้ใช้และสิทธิ์การเข้าถึง",
            },
            {
              id: "booking",
              href: "/guides/booking#การยืนยัน",
              title: "การจอง",
              sectionTitle: "คู่มือ",
              parentTitle: null,
              kind: "heading",
              heading: "การยืนยัน",
              excerpt: null,
            },
          ],
        }),
      })
    );
    render(<PublicSearchPalette />);
    fireEvent.click(screen.getByRole("button", { name: "ค้นหาคู่มือ" }));
    await screen.findAllByText("บัญชี");

    expect(screen.getAllByTestId("document-result")).toHaveLength(2);
    expect(screen.getAllByTestId("document-icon")).toHaveLength(2);
    expect(screen.getAllByTestId("heading-result")).toHaveLength(3);
    expect(screen.getAllByTestId("heading-icon")).toHaveLength(3);
    expect(screen.getAllByTestId("heading-result")[0].className).toContain(
      "items-center"
    );
    expect(screen.getAllByTestId("heading-icon")[0].className).not.toContain(
      "mt-0.5"
    );
    expect(screen.getAllByTestId("document-result")[0].textContent).toContain(
      "บัญชี"
    );
    expect(screen.getByTestId("document-excerpt").textContent).toContain(
      "ตั้งค่าบัญชีผู้ใช้และสิทธิ์การเข้าถึง"
    );
    expect(screen.getByTestId("document-excerpt").className).toContain(
      "truncate"
    );
    expect(screen.getAllByTestId("heading-result")[0].textContent).not.toContain(
      "ตั้งค่าบัญชีผู้ใช้และสิทธิ์การเข้าถึง"
    );
  });

  it("does not render a blank document excerpt", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              id: "account",
              href: "/guides/account",
              title: "บัญชี",
              sectionTitle: "คู่มือ",
              parentTitle: null,
              kind: "document",
              excerpt: "   ",
            },
          ],
        }),
      })
    );
    render(<PublicSearchPalette />);
    fireEvent.click(screen.getByRole("button", { name: "ค้นหาคู่มือ" }));
    await screen.findByTestId("document-result");

    expect(screen.queryByTestId("document-excerpt")).toBeNull();
  });

  it("selects a grouped heading row with Arrow Down and Enter", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            items: [
              {
                id: "account",
                href: "/guides/account#ตั้งค่า",
                title: "บัญชี",
                sectionTitle: "คู่มือ",
                parentTitle: null,
                kind: "heading",
                heading: "ตั้งค่า",
              },
            ],
          }),
        })
    );
    render(<PublicSearchPalette />);
    fireEvent.click(screen.getByRole("button", { name: "ค้นหาคู่มือ" }));
    const input = await screen.findByRole("searchbox", { name: "ค้นหาคู่มือ" });
    await screen.findByTestId("heading-result");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    await waitFor(() =>
      expect(
        screen.getByTestId("heading-result").getAttribute("aria-selected")
      ).toBe("true")
    );
    fireEvent.keyDown(input, { key: "Enter" });

    expect(push).toHaveBeenCalledWith("/guides/account#ตั้งค่า");
  });

  it("selects a document result with Arrow Down and opens it with Enter", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            items: [
              {
                id: "doc",
                href: "/guides/account",
                title: "บัญชี",
                sectionTitle: "คู่มือ",
                parentTitle: null,
                kind: "document",
              },
            ],
          }),
        })
    );
    render(<PublicSearchPalette />);
    fireEvent.click(screen.getByRole("button", { name: "ค้นหาคู่มือ" }));
    await screen.findByText("บัญชี");

    fireEvent.keyDown(screen.getByRole("searchbox", { name: "ค้นหาคู่มือ" }), {
      key: "ArrowDown",
    });
    fireEvent.keyDown(screen.getByRole("searchbox", { name: "ค้นหาคู่มือ" }), {
      key: "Enter",
    });

    expect(push).toHaveBeenLastCalledWith("/guides/account");
  });

  it("closes when a document result is clicked", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              id: "doc",
              href: "/guides/account",
              title: "บัญชี",
              sectionTitle: "คู่มือ",
              parentTitle: null,
              kind: "document",
            },
          ],
        }),
      })
    );
    render(<PublicSearchPalette />);
    fireEvent.click(screen.getByRole("button", { name: "ค้นหาคู่มือ" }));
    const result = await screen.findByTestId("document-result");

    fireEvent.click(result);

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "ค้นหาคู่มือ" })).toBeNull()
    );
  });

  it("shows a recoverable error when live search fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    render(<PublicSearchPalette />);
    fireEvent.click(screen.getByRole("button", { name: "ค้นหาคู่มือ" }));

    expect(
      await screen.findByText("ไม่สามารถค้นหาคู่มือได้ ลองพิมพ์อีกครั้ง")
    ).toBeTruthy();
  });

  it("shows a clear empty-result message for a typed query", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [] }) })
    );
    render(<PublicSearchPalette />);
    fireEvent.click(screen.getByRole("button", { name: "ค้นหาคู่มือ" }));
    fireEvent.change(
      await screen.findByRole("searchbox", { name: "ค้นหาคู่มือ" }),
      { target: { value: "ไม่มี" } }
    );

    expect(
      await screen.findByText("ไม่พบเอกสารหรือหัวข้อที่ตรงกับคำค้น")
    ).toBeTruthy();
  });
});
